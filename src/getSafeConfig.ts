import { SafeConfig } from "./config/safeConfig";

import { arbitrumSepolia, baseSepolia } from "viem/chains";

async function main() {
  await (await new SafeConfig(baseSepolia.id).init()).getConfig();
  await (await new SafeConfig(arbitrumSepolia.id).init()).getConfig();
}

main().catch((error) => {
  console.error(error.message);
});
