import { arbitrumSepolia, baseSepolia } from "viem/chains";

import { privateKeyToAccount, toAccount } from "viem/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import { toSafeSmartAccount } from "permissionless/accounts"
import { SafeSmartAccount } from "permissionless/accounts/safe"
import { createSmartAccountClient } from "permissionless"
import {
  Address,
  createPublicClient,
  Hex,
  http,
  encodeFunctionData,
  parseAbi,
} from "viem";

import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";

import fs from 'fs';

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' });

const USDC_ADDRESS_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

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

  //The co-signer signs and executes the userOp for reimbursement

  let unSignedUserOperationToExecute = await smartAccountClient.prepareUserOperation({
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
    chainId: chain.id,
    owners: owners.map((owner) => toAccount(owner.address)),
    account: coOwner, // the owner that will sign the user operation
    signatures: partialSignatures as Hex,
    ...unSignedUserOperationToExecute,
  })

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