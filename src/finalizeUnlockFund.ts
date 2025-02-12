import { Address, createWalletClient, formatUnits, http } from "viem";

import { arbitrumSepolia } from "viem/chains";

import {
  delayTx,
  getDelayAddress,
  MODULE_ADDRESS,
  MODULE_FACTORY_ADDRESS,
} from "./services/delayModuleService";

import { getUSDCBalance, USDC_ADDRESSES } from "./services/usdcService";

import { SafeConfig } from "./config/safeConfig";

async function main() {
  const config = new SafeConfig(arbitrumSepolia.id);
  await config.init();

  const safeAddress = await config.getAccountAddress();

  const ownerClient = createWalletClient({
    account: config.owners[0],
    chain: config.chain,
    transport: http(),
  });

  const amountToWithdraw = await getUSDCBalance(config.chain.id, safeAddress);

  const delayModuleInstanceAddress = getDelayAddress(
    safeAddress,
    config.cooldownDelay,
    config.expiration,
    MODULE_ADDRESS,
    MODULE_FACTORY_ADDRESS
  );

  const finalizeWithdrawTx = await delayTx(
    USDC_ADDRESSES[config.chain.id] as Address,
    delayModuleInstanceAddress,
    "executeNextTx",
    config.owners[0].address,
    amountToWithdraw
  );
  const txHashFinalize = await ownerClient.sendTransaction(finalizeWithdrawTx);

  console.log(`Finalize withdraw`);
  console.log(`Tx Hash: ${txHashFinalize}`);
}

main().catch((error) => {
  console.error(error.message);
});
