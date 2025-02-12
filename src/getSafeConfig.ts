import { Chain, parseAbi } from "viem";
import { SafeConfig } from "./config/safeConfig";

import { arbitrumSepolia, baseSepolia } from "viem/chains";

async function getConfig(chain: Chain) {
  console.log("# ", chain.name);
  const config = new SafeConfig(chain.id);
  await config.initSafeAccount();
  const safeAddress = await config.safeAccount.getAddress();
  const threshold = await config.publicClient.readContract({
    address: safeAddress,
    abi: parseAbi(["function getThreshold() view returns (uint256)"]),
    functionName: "getThreshold",
  });

  const owers = await config.publicClient.readContract({
    address: safeAddress,
    abi: parseAbi(["function getOwners() view returns (address[])"]),
    functionName: "getOwners",
  });

  console.log(
    "Safe address:",
    await safeAddress,
    ", threshold : ",
    threshold,
    ", owners:",
    owers
  );
}

async function main() {
  getConfig(baseSepolia);
  getConfig(arbitrumSepolia);
}

main().catch((error) => {
  console.error(error.message);
});
