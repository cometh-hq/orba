import fs from "fs";
import { Hex } from "viem";
import { UserOperation } from "viem/_types/account-abstraction";

function getClaimFundUserOp(): {
  unSignedUserOperation: UserOperation;
  partialSignatures: Hex;
} {
  const fileName = "claim-userop-signed.json";
  const fileContent = fs.readFileSync(fileName, "utf-8");

  return JSON.parse(fileContent, (key, value) => {
    if (value === null) return undefined; // Convert null back to undefined
    if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value); // Convert stringified BigInt back
    return value;
  });
}

function getEnvVariable(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export { getEnvVariable, getClaimFundUserOp };
