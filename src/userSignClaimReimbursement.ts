import { arbitrumSepolia } from "viem/chains";
import { toAccount } from "viem/accounts";
import { SafeSmartAccount } from "permissionless/accounts/safe";
import { Address, encodeFunctionData, parseAbi } from "viem";

import { entryPoint07Address } from "viem/account-abstraction";

import { SafeConfig } from "./config/safeConfig";
import { USDC_ADDRESSES } from "./services/usdcService";

import fs from "fs";

const usdcAddress = USDC_ADDRESSES[arbitrumSepolia.id] as Address;

async function main() {
  const config = new SafeConfig(arbitrumSepolia);
  const smartAccountClient = await config.smartAccountClient();

  const usdAmount = 0.5;

  const unSignedUserOperation = await smartAccountClient.prepareUserOperation({
    calls: [
      {
        to: usdcAddress,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: parseAbi([
            "function transfer(address to, uint256 value) external returns (bool)",
          ]),
          functionName: "transfer",
          args: [config.owners[1].address, BigInt(usdAmount * 10 ** 6)], // 1 USDC with 6 decimals
        }),
      },
    ],
  });

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

  //Save in a json file

  const dataToSave = {
    unSignedUserOperation: Object.fromEntries(
      Object.entries(unSignedUserOperation).map(([key, value]) => [
        key,
        value === undefined ? null : value, // Replace undefined with null
      ])
    ),
    partialSignatures,
  };

  const jsonString = JSON.stringify(
    dataToSave,
    (key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );

  fs.writeFileSync("claim-userop-signed.json", jsonString, "utf-8");

  console.log(
    `Send ${usdAmount} USDC to ${config.owners[1].address} on ${config.chain.name}`
  );
  const unSignedUserOperationToJson = JSON.stringify(
    unSignedUserOperation,
    (key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );

  console.log(`USER_OPERATION: ${unSignedUserOperationToJson}`);
  console.log(`User Signature: ${partialSignatures}`);
  console.log(`Saved on ./claim-userop-signed.json`);
}

main().catch((error) => {
  console.error(error.message);
});
