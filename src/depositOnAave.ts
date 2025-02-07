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

import { baseSepolia } from "viem/chains";

import {
  entryPoint07Address,
} from "viem/account-abstraction";

import { USDC_ADDRESSES, baseSepoliaAavePoolAddress } from './services/usdcService';

const usdcAddress = USDC_ADDRESSES[baseSepolia.id] as Address;

async function main() {

  const config = new SafeConfig(baseSepolia.id);
  await config.initSafeAccount();
  //User crafts a UserOp: deposit 0.1 USDC on Aave

  const approve = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [baseSepoliaAavePoolAddress as `0x${string}`, BigInt(0.1 * 10 ** 6)],
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
        to: baseSepoliaAavePoolAddress as `0x${string}`,
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

  console.log(`Deposit 2 USDC on ${config.chain.name}`);
  const unSignedUserOperationToJson = JSON.stringify(unSignedUserOperation, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
    2
  );
  console.log(`USER_OPERATION: ${unSignedUserOperationToJson}`);
  console.log(`User Signature: ${partialSignatures}`);
  console.log(`Co-signer Signature: ${finalSignature}`);
  console.log(`Transaction Hash: ${receipt.receipt.transactionHash}`);

}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});