import fs from "fs";
import { Hex } from "viem";

function getClaimFundUserOp() {
  const fileName = "claim-userop-signed.json";
  try {
    const fileContent = fs.readFileSync(fileName, "utf-8");

    return JSON.parse(fileContent, (key, value) => {
      if (value === null) return undefined; // Convert null back to undefined
      if (typeof value === "string" && /^\d+$/.test(value))
        return BigInt(value); // Convert stringified BigInt back
      return value;
    });
  } catch (error) {
    if (error instanceof Error && (error as any).code === "ENOENT") {
      console.error(
        `Error: File '${fileName}' not found. Please yarn user-sign-claim-reimbursement`
      );
    } else if (error instanceof SyntaxError) {
      console.error(`Error parsing JSON in file '${fileName}':`, error.message);
    } else {
      console.error("Error reading the file:", (error as Error).message);
    }
  }
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
