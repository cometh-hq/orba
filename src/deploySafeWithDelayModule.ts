import { arbitrumSepolia, baseSepolia } from "viem/chains";

import { Chain, encodeFunctionData, parseAbi } from "viem";

import {
  MODULE_ADDRESS,
  MODULE_FACTORY_ADDRESS,
} from "./services/delayModuleService";

import { SafeConfig } from "./config/safeConfig";
import { setupSafeWithDelayModule } from "./services/safeService";

async function deploySafe(chain: Chain) {
  const config = new SafeConfig(chain.id);
  await config.init();

  const delayCode = await config.publicClient.getCode({
    address: await config.getDelayAddress(),
  });

  if (delayCode) {
    await config.getConfig();
    return;
  }

  const setupTxs = await setupSafeWithDelayModule(
    config.cooldownDelay,
    config.expiration,
    MODULE_ADDRESS,
    MODULE_FACTORY_ADDRESS,
    config.owners[0].address,
    await config.getAccountAddress()
  );

  const txHash = await config.smartAccountClient.sendTransaction({
    calls: setupTxs,
  });
  console.log("Deploy safe txHash:", txHash);
  await config.getConfig();
  console.log("\n\n\n");
}

async function main() {
  await deploySafe(baseSepolia);
  await deploySafe(arbitrumSepolia);
}

main().catch((error) => {
  console.error(error.message);
});
