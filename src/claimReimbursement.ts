import { toAccount } from "viem/accounts";
import { SafeSmartAccount } from "permissionless/accounts/safe";
import { Address, Hex, encodeFunctionData, parseAbi } from "viem";

import { arbitrumSepolia } from "viem/chains";

import { entryPoint07Address } from "viem/account-abstraction";

import { SafeConfig } from "./config/safeConfig";
import { USDC_ADDRESSES } from "./services/usdcService";

import fs from "fs";
import { getClaimFundUserOp } from "./config/utils";

async function main() {
  const config = new SafeConfig(arbitrumSepolia);
  const smartAccountClient = await config.smartAccountClient();

  try {
    const { unSignedUserOperation, partialSignatures } = getClaimFundUserOp();

    const unSignedUserOperationToExecute = {
      factory: undefined,
      factoryData: undefined,
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
    });

    const userOpHash = await smartAccountClient.sendUserOperation({
      ...unSignedUserOperationToExecute,
      signature: finalSignature,
    });

    const receipt = await smartAccountClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    const unSignedUserOperationToJson = JSON.stringify(
      unSignedUserOperation,
      (key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    );
    console.log(`Claim Tx Hash: ${receipt.receipt.transactionHash}`);
  } catch (error) {
    if (error instanceof Error && (error as any).code === "ENOENT") {
      console.error(
        `Error: no userop signed for reimbursement. Please run yarn user-sign-claim-reimbursement"`
      );
    } else if (error instanceof SyntaxError) {
      console.error(`Error parsing JSON in file`, error.message);
    } else {
      console.error("Error reading the file:", (error as Error).message);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
});
