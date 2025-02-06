import { arbitrumSepolia } from "viem/chains";

import { privateKeyToAccount, toAccount } from "viem/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import { toSafeSmartAccount } from "permissionless/accounts"
import { SafeSmartAccount } from "permissionless/accounts/safe"
import { createSmartAccountClient } from "permissionless"
import {
  Address,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  Hex,
  http,
  parseAbi,
} from "viem";

import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";

import fs from 'fs';

import * as dotenv from 'dotenv'
dotenv.config()

const USDC_ADDRESS_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const privateKeyCoOwner = process.env.PRIVATE_KEY_COOWNER;
  const paymasterUrl = process.env.PAYMASTER_URL;
  const bundlerUrl = process.env.BUNDLER_URL;
  const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS as Address;

  if (!privateKey) {
    throw new Error("Please specify a private key");
  }

  if (!privateKeyCoOwner) {
    throw new Error("Please specify a co-owner private key");
  }

  const chain = arbitrumSepolia;
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

  // User sends 10 USDC to SafeSmartAccount

  const ownerClient = createWalletClient({
    account: owner,
    chain,
    transport: http()
  })

  const hash = await ownerClient.sendTransaction(
    {
      to: USDC_ADDRESS_ARB_SEPOLIA,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: parseAbi(["function transfer(address to, uint256 value) external returns (bool)"]),
        functionName: "transfer",
        args: [safeAccount.address, BigInt(0.2 * 10 ** 6)], // 0.2 USDC with 6 decimals
      }),
    }
  )

  console.log("txHash", hash);

  //User crafts a UserOp: sends 8 USDC on Arbitrum to the co-signer

  const unSignedUserOperation = await smartAccountClient.prepareUserOperation({
    calls: [
      {
        to: USDC_ADDRESS_ARB_SEPOLIA,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: parseAbi(["function transfer(address to, uint256 value) external returns (bool)"]),
          functionName: "transfer",
          args: [coOwner.address, BigInt(0.1 * 10 ** 6)], // 0.1 USDC with 6 decimals
        }),
      },
    ],
  })

  let partialSignatures = await SafeSmartAccount.signUserOperation({
    version: "1.4.1",
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    chainId: arbitrumSepolia.id,
    owners: owners.map((owner) => toAccount(owner.address)),
    account: owner, // the owner that will sign the user operation
    ...unSignedUserOperation,
  })

  console.log("partialSignatures", partialSignatures as Hex);
  console.log("unSignedUserOperation", unSignedUserOperation);

  //Save in a json file

  const dataToSave = {
    unSignedUserOperation: Object.fromEntries(
      Object.entries(unSignedUserOperation).map(([key, value]) => [
        key,
        value === undefined ? null : value, // Replace undefined with null
      ])
    ),
    partialSignatures
  };

  const jsonString = JSON.stringify(dataToSave, (key, value) =>
    typeof value === "bigint" ? value.toString() : value,
    2
  );

  fs.writeFileSync('reimburseUserOperation.json', jsonString, 'utf-8');

  console.log('User operation and signatures saved to reimburseUserOperation.json');
}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});