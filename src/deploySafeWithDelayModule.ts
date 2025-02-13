import { arbitrumSepolia, baseSepolia } from "viem/chains";

import { Chain, encodeFunctionData, parseAbi } from "viem";

import {
  getDelayAddress,
  MODULE_ADDRESS,
  MODULE_FACTORY_ADDRESS,
} from "./services/delayModuleService";

import { SafeConfig } from "./config/safeConfig";
import { getConfig, setupSafeWithDelayModule } from "./services/safeService";

async function deploySafe(chain: Chain) {
  const config = new SafeConfig(chain);
  const smartAccountClient = await config.smartAccountClient();
  const safeAddress = smartAccountClient.account.address;
  const publicClient = config.publicClient();

  const delayCode = await publicClient.getCode({
    address: await getDelayAddress(
      safeAddress,
      config.cooldownDelay,
      config.expiration
    ),
  });

  if (delayCode) {
    await getConfig(
      safeAddress,
      publicClient,
      config.cooldownDelay,
      config.expiration
    );
    return;
  }

  const setupTxs = await setupSafeWithDelayModule(
    config.cooldownDelay,
    config.expiration,
    MODULE_ADDRESS,
    MODULE_FACTORY_ADDRESS,
    config.owners[0].address,
    safeAddress
  );

  const txHash = await smartAccountClient.sendTransaction({
    calls: setupTxs,
  });
  console.log("Deploy safe txHash:", txHash);
  await getConfig(
    safeAddress,
    publicClient,
    config.cooldownDelay,
    config.expiration
  );
  console.log("\n\n\n");
}

async function main() {
  await deploySafe(baseSepolia);
  await deploySafe(arbitrumSepolia);
}

main().catch((error) => {
  console.error(error.message);
});
