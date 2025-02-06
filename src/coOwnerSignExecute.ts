import { toAccount } from "viem/accounts"
import { SafeSmartAccount } from "permissionless/accounts/safe"
import {
  Address,
  Hex,
  encodeFunctionData,
  parseAbi,
} from "viem";

import {
  entryPoint07Address,
} from "viem/account-abstraction";

import { SafeConfig } from './config/safeConfig';

import fs from 'fs';

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' });

const usdcAddress = process.env.USDC_ADDRESS as Address;
const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS as Address;

async function main() {

  const config = new SafeConfig();
  await config.initSafeAccount(smartAccountAddress);
  
  //The co-signer signs and executes the userOp for reimbursement
  let unSignedUserOperationToExecute = await config.smartAccountClient.prepareUserOperation({
    calls: [
      {
        to: usdcAddress,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: parseAbi(["function transfer(address to, uint256 value) external returns (bool)"]),
          functionName: "transfer",
          args: [config.owners[1].address, BigInt(0.1 * 10 ** 6)], // 0.1 USDC with 6 decimals
        }),
      },
    ],
  })

  const fileContent = fs.readFileSync('reimburseUserOperation.json', 'utf-8');

  const { unSignedUserOperation, partialSignatures }: { unSignedUserOperation: typeof unSignedUserOperationToExecute, partialSignatures: Hex } = JSON.parse(fileContent, (key, value) => {
    if (value === null) return undefined; // Convert null back to undefined
    if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value); // Convert stringified BigInt back
    return value;
  });

  console.log("Loaded User Operation:", unSignedUserOperation);
  console.log("Loaded Partial Signatures:", partialSignatures);

  unSignedUserOperationToExecute = {
    ...unSignedUserOperationToExecute,
    ...unSignedUserOperation,
  };

  const finalSignature = await SafeSmartAccount.signUserOperation({
    version: "1.4.1",
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    chainId: config.chain.id,
    owners: config.owners.map((owner) => toAccount(owner.address)),
    account: config.owners[1], // the owner that will sign the user operation
    signatures: partialSignatures as Hex,
    ...unSignedUserOperationToExecute,
  })

  const userOpHash = await config.smartAccountClient.sendUserOperation({
    ...unSignedUserOperation,
    signature: finalSignature,
  })

  const receipt = await config.smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  })

  console.log(receipt.receipt.transactionHash);

}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});