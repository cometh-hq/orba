import { arbitrumSepolia, baseSepolia } from "viem/chains";

import { AAVE_POOL_ABI } from "../abi/aavePool";

import { privateKeyToAccount, toAccount } from "viem/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import { toSafeSmartAccount } from "permissionless/accounts"
import { SafeSmartAccount } from "permissionless/accounts/safe"
import { createSmartAccountClient } from "permissionless"
import {
  Address,
  createPublicClient,
  encodeFunctionData,
  Hex,
  http,
  erc20Abi,
} from "viem";

import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' });

const USDC_ADDRESS_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
const aavePoolContractBaseSepolia = "0xbE781D7Bdf469f3d94a62Cdcc407aCe106AEcA74"

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const privateKeyCoOwner = process.env.PRIVATE_KEY_COOWNER;
  const paymasterUrl = process.env.PAYMASTER_URL;
  const bundlerUrl = process.env.BUNDLER_URL;
  const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS as Address;
  const chainId = process.env.CHAIN_ID;

  if (!privateKey) {
    throw new Error("Please specify a private key");
  }

  if (!privateKeyCoOwner) {
    throw new Error("Please specify a co-owner private key");
  }

  let chain
  if (chainId == "421614") {
    chain = arbitrumSepolia;
  } else if (chainId == "84532") {
    chain = baseSepolia;
  } else {
    throw new Error("Chain id");
  }

  const owner = privateKeyToAccount(privateKey as Hex);
  const coOwner = privateKeyToAccount(privateKeyCoOwner as Hex);
  const owners = [owner, coOwner];

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const pimlicoClient = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const paymasterClient = createPaymasterClient({
    transport: http(paymasterUrl),
  });

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    owners,
    version: "1.4.1",
    address: smartAccountAddress,
  });

  const safeAddress = await safeAccount.getAddress();
  console.log("smartAccountAddress", safeAddress);

  const gas = (await pimlicoClient.getUserOperationGasPrice()).fast;
  console.log("gas", gas);

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain,
    paymaster: paymasterClient,
    bundlerTransport: http(bundlerUrl),
    userOperation: {
      estimateFeesPerGas: async () => gas,
    },
  });


  //User crafts a UserOp: deposit 0.1 USDC on Aave

  const approve = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [aavePoolContractBaseSepolia as `0x${string}`, BigInt(0.1 * 10 ** 6)],
  });

  const supplyData = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "deposit",
    args: [USDC_ADDRESS_BASE_SEPOLIA, BigInt(0.1 * 10 ** 6), safeAccount.address, 0],
  });


  const unSignedUserOperation = await smartAccountClient.prepareUserOperation({
    calls: [
      // {
      //   data: withdrawData,
      //   to: FUND_PROVIDER_CONTRACT as `0x${string}`,
      //   value: BigInt(0),
      // },
      {
        data: approve,
        to: USDC_ADDRESS_BASE_SEPOLIA as `0x${string}`,
        value: BigInt(0),
      },
      {
        data: supplyData,
        to: aavePoolContractBaseSepolia as `0x${string}`,
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
    chainId: chain.id,
    owners: owners.map((owner) => toAccount(owner.address)),
    account: owner, // the owner that will sign the user operation
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
    chainId: chain.id,
    owners: owners.map((owner) => toAccount(owner.address)),
    account: coOwner, // the owner that will sign the user operation
    signatures: partialSignatures as Hex,
    ...unSignedUserOperation,
  })

  //the userOp is sent to the network

  const userOpHash = await smartAccountClient.sendUserOperation({
    ...unSignedUserOperation,
    signature: finalSignature,
  })

  const receipt = await smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  })

  console.log(receipt.receipt.transactionHash);

}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});