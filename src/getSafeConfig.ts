import { SafeConfig } from "./config/safeConfig";

import { arbitrumSepolia, baseSepolia, Chain } from "viem/chains";
import { getConfig } from "./services/safeService";

async function getConf(chain: Chain) {
  const config = new SafeConfig(chain);
  const smartAccountClient = await config.smartAccountClient();
  const safeAddress = smartAccountClient.account.address;
  const publicClient = config.publicClient();
  await getConfig(
    safeAddress,
    publicClient,
    config.cooldownDelay,
    config.expiration
  );
}

async function main() {
  await getConf(baseSepolia);
  await getConf(arbitrumSepolia);
}

main().catch((error) => {
  console.error(error.message);
});
