import { toAccount } from "viem/accounts"
import { SafeSmartAccount } from "permissionless/accounts/safe"
import {
  Address,
  Hex,
  encodeFunctionData,
  parseAbi,
} from "viem";

import { arbitrumSepolia } from "viem/chains";

import {
  entryPoint07Address,
} from "viem/account-abstraction";

import { SafeConfig } from './config/safeConfig';
import { USDC_ADDRESSES } from './services/usdcService';

import fs from 'fs';

const usdcAddress = USDC_ADDRESSES[arbitrumSepolia.id] as Address;

async function main() {

  const config = new SafeConfig(arbitrumSepolia.id);
  await config.initSafeAccount();

  let unSignedUserOperationToExecute = await config.smartAccountClient.prepareUserOperation({
    calls: [
      {
        to: usdcAddress,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: parseAbi(["function transfer(address to, uint256 value) external returns (bool)"]),
          functionName: "transfer",
          args: [config.owners[1].address, BigInt(2 * 10 ** 6)], 
        }),
      },
    ],
  })

  const fileName = "claim-userop-signed.json";
  try {
    const fileContent = fs.readFileSync(fileName, "utf-8");

    const { unSignedUserOperation, partialSignatures }: {
      unSignedUserOperation: typeof unSignedUserOperationToExecute;
      partialSignatures: Hex;
    } = JSON.parse(fileContent, (key, value) => {
      if (value === null) return undefined; // Convert null back to undefined
      if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value); // Convert stringified BigInt back
      return value;
    });

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

    const unSignedUserOperationToJson = JSON.stringify(unSignedUserOperationToExecute, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
      2
    );
    console.log(`USER_OPERATION: ${unSignedUserOperationToJson}`);
    console.log(`User Signature: ${partialSignatures}`);
    console.log(`Co-signer Signature: ${finalSignature}`);
    console.log(`Claim Tx Hash: ${receipt.receipt.transactionHash}`);

  } catch (error) {
    if (error instanceof Error && (error as any).code === "ENOENT") {
      console.error(`Error: File '${fileName}' not found.`);
    } else if (error instanceof SyntaxError) {
      console.error(`Error parsing JSON in file '${fileName}':`, error.message);
    } else {
      console.error("Error reading the file:", (error as Error).message);
    }
  }

}

main().catch((error) => {
  console.error(error.message);
});