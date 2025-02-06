import { AAVE_POOL_ABI } from "../abi/aavePool";

import { toAccount } from "viem/accounts"
import { SafeSmartAccount } from "permissionless/accounts/safe"

import { SafeConfig } from "./config/safeConfig";

import {
  encodeFunctionData,
  Hex,
  erc20Abi,
  Address,
} from "viem";

import {
  entryPoint07Address,
} from "viem/account-abstraction";

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' });

const usdcAddress = process.env.USDC_ADDRESS as Address;
const aavePoolAddress = process.env.AAVE_POOL_ADDRESS as Address;
const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS as Address;

async function main() {

  const config = new SafeConfig();
  await config.initSafeAccount(smartAccountAddress);
  //User crafts a UserOp: deposit 0.1 USDC on Aave

  const approve = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [aavePoolAddress as `0x${string}`, BigInt(0.1 * 10 ** 6)],
  });

  const supplyData = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "deposit",
    args: [usdcAddress, BigInt(0.1 * 10 ** 6), config.safeAddress, 0],
  });


  const unSignedUserOperation = await config.smartAccountClient.prepareUserOperation({
    calls: [
      // {
      //   data: withdrawData,
      //   to: FUND_PROVIDER_CONTRACT as `0x${string}`,
      //   value: BigInt(0),
      // },
      {
        data: approve,
        to: usdcAddress as `0x${string}`,
        value: BigInt(0),
      },
      {
        data: supplyData,
        to: aavePoolAddress as `0x${string}`,
        value: BigInt(0),
      },
    ],
  })

  //User signs the userOp

  let partialSignatures = await SafeSmartAccount.signUserOperation({
    version: "1.4.1",
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    chainId: config.chain.id,
    owners: config.owners.map((owner) => toAccount(owner.address)),
    account: config.owners[0], // the owner that will sign the user operation
    ...unSignedUserOperation,
  })

  console.log("partialSignatures", partialSignatures as Hex);
  console.log("unSignedUserOperation", unSignedUserOperation);

  //The co-signer signs the userOp

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
    ...unSignedUserOperation,
  })

  //the userOp is sent to the network

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