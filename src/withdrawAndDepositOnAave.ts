import { AAVE_POOL_ABI } from "../abi/aavePool";

import { toAccount } from "viem/accounts";
import { SafeSmartAccount } from "permissionless/accounts/safe";

import { SafeConfig } from "./config/safeConfig";

import {
  encodeFunctionData,
  Hex,
  erc20Abi,
  Address,
  createWalletClient,
  http,
  parseAbi,
} from "viem";

import { baseSepolia } from "viem/chains";

import { entryPoint07Address } from "viem/account-abstraction";

import {
  USDC_ADDRESSES,
  baseSepoliaAavePoolAddress,
  getUSDCBalance,
} from "./services/usdcService";
import { getEnvVariable } from "./config/utils";

const usdcAddress = USDC_ADDRESSES[baseSepolia.id] as Address;

async function main() {
  const config = new SafeConfig(baseSepolia.id);
  await config.init();

  const fundProvider = getEnvVariable("FUND_PROVIDER_ADDRESS") as Address;

  //Co-signer signs the withdrawal request

  const coSignerClient = createWalletClient({
    account: config.owners[1],
    chain: config.chain,
    transport: http(),
  });

  const withdrawalHash = await config.publicClient.readContract({
    address: fundProvider as `0x${string}`,
    abi: parseAbi([
      "function getWithdrawalHash(address to, uint256 amount) external view returns (bytes32)",
    ]),
    functionName: "getWithdrawalHash",
    args: [config.safeAddress, BigInt(2 * 10 ** 6)],
  });

  const withdrawalSignature = await coSignerClient.signMessage({
    message: { raw: withdrawalHash },
  });

  //User crafts a UserOp: withdraws 2 USDC from the fund provider and deposits them on Aave

  const approve = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [baseSepoliaAavePoolAddress as `0x${string}`, BigInt(2 * 10 ** 6)],
  });

  const supplyData = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "deposit",
    args: [usdcAddress, BigInt(2 * 10 ** 6), config.safeAddress, 0],
  });

  const withdrawData = encodeFunctionData({
    abi: parseAbi([
      "function withdraw(address to, uint256 amount, bytes signature) external",
    ]),
    functionName: "withdraw",
    args: [config.safeAddress, BigInt(2 * 10 ** 6), withdrawalSignature],
  });

  const balanceFundProvider = await getUSDCBalance(
    baseSepolia.id,
    fundProvider
  );
  if (balanceFundProvider < BigInt(2 * 10 ** 6)) {
    throw new Error("Not enough USDC in the fund provider.");
  }

  const unSignedUserOperation =
    await config.smartAccountClient.prepareUserOperation({
      calls: [
        {
          data: withdrawData,
          to: fundProvider as `0x${string}`,
          value: BigInt(0),
        },
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
    });

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
  });

  //Co-signer signs the userOp

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
  });

  //The userOp is sent to the network

  const userOpHash = await config.smartAccountClient.sendUserOperation({
    ...unSignedUserOperation,
    signature: finalSignature,
  });

  const receipt = await config.smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  console.log(`Deposit 2 USDC on ${config.chain.name}`);
  const unSignedUserOperationToJson = JSON.stringify(
    unSignedUserOperation,
    (key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
  console.log(`USER_OPERATION: ${unSignedUserOperationToJson}`);
  console.log(`User Signature: ${partialSignatures}`);
  console.log(`Co-signer Signature: ${finalSignature}`);
  console.log(`Transaction Hash: ${receipt.receipt.transactionHash}`);
}

main().catch((error) => {
  console.error(error.message);
});
