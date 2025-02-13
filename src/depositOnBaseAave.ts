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
  SignMessageReturnType,
} from "viem";

import { baseSepolia } from "viem/chains";

import { entryPoint07Address } from "viem/account-abstraction";

import {
  USDC_ADDRESSES,
  baseSepoliaAavePoolAddress,
  getUSDCBalance,
} from "./services/usdcService";
import { getClaimFundUserOp, getEnvVariable } from "./config/utils";

const usdcAddress = USDC_ADDRESSES[baseSepolia.id] as Address;
const fundProvider = getEnvVariable("FUND_PROVIDER_ADDRESS") as Address;
const usdAmount = 0.5;

async function coSignerSignWithdrawalRequest(
  config: SafeConfig
): Promise<SignMessageReturnType> {
  const smartAccountClient = await config.smartAccountClient();
  const safeAddress = smartAccountClient.account.address;
  const publicClient = config.publicClient();

  //Co-signer signs the withdrawal request

  const coSignerClient = createWalletClient({
    account: config.owners[1],
    chain: config.chain,
    transport: http(),
  });

  const withdrawalHash = await publicClient.readContract({
    address: fundProvider as `0x${string}`,
    abi: parseAbi([
      "function getWithdrawalHash(address to, uint256 amount) external view returns (bytes32)",
    ]),
    functionName: "getWithdrawalHash",
    args: [safeAddress, BigInt(usdAmount * 10 ** 6)],
  });

  const reimbursementUserOp = getClaimFundUserOp();

  // Simple test: just verify that the file exists. Normally, the co-signer should perform additional checks.
  if (!reimbursementUserOp) {
    throw Error("No reimbursement");
  }

  return await coSignerClient.signMessage({
    message: { raw: withdrawalHash },
  });
}

async function main() {
  const config = new SafeConfig(baseSepolia);
  const smartAccountClient = await config.smartAccountClient();
  const safeAddress = smartAccountClient.account.address;
  const publicClient = config.publicClient();

  // CO SIGNER Verify the claim user operation has beein signer then provide a signed withdrawal request.
  const withdrawalSignature = await coSignerSignWithdrawalRequest(config);

  const approve = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [
      baseSepoliaAavePoolAddress as `0x${string}`,
      BigInt(usdAmount * 10 ** 6),
    ],
  });

  const supplyData = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "deposit",
    args: [usdcAddress, BigInt(usdAmount * 10 ** 6), safeAddress, 0],
  });

  const withdrawData = encodeFunctionData({
    abi: parseAbi([
      "function withdraw(address to, uint256 amount, bytes signature) external",
    ]),
    functionName: "withdraw",
    args: [safeAddress, BigInt(usdAmount * 10 ** 6), withdrawalSignature],
  });

  const balanceFundProvider = await getUSDCBalance(publicClient, fundProvider);
  if (balanceFundProvider < BigInt(usdAmount * 10 ** 6)) {
    throw new Error("Not enough USDC in the fund provider.");
  }

  const unSignedUserOperation = await smartAccountClient.prepareUserOperation({
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

  const userOpHash = await smartAccountClient.sendUserOperation({
    ...unSignedUserOperation,
    signature: finalSignature,
  });

  const receipt = await smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  console.log(`Deposit ${usdAmount} USDC on ${config.chain.name}`);
  console.log(`Transaction Hash: ${receipt.receipt.transactionHash}`);
  return;
}

main().catch((error) => {
  console.error(error.message);
});
