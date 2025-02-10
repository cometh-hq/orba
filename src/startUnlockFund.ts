import {
    Address,
    createWalletClient,
    formatUnits,
    http,
} from "viem";

import { arbitrumSepolia } from "viem/chains";

import {
    delayTx,
    getDelayAddress,
    MODULE_ADDRESS,
    MODULE_FACTORY_ADDRESS
} from "./services/delayModuleService";

import { getUSDCBalance, USDC_ADDRESSES } from "./services/usdcService";

import { SafeConfig } from "./config/safeConfig";

async function main() {
    const config = new SafeConfig(arbitrumSepolia.id);
    await config.initSafeAccount();

    const ownerClient = createWalletClient({
        account: config.owners[0],
        chain: config.chain,
        transport: http()
    })

    const amountToWithdraw = await getUSDCBalance(config.chain.id, config.safeAddress);

    const delayModuleInstanceAddress = getDelayAddress(
        config.safeAddress,
        config.cooldownDelay,
        config.expiration,
        MODULE_ADDRESS,
        MODULE_FACTORY_ADDRESS
    );

    const startWithdrawTx = await delayTx(
        USDC_ADDRESSES[config.chain.id] as Address,
        delayModuleInstanceAddress,
        "execTransactionFromModule",
        config.owners[0].address,
        amountToWithdraw,
    )

    const txHashStart = await ownerClient.sendTransaction(startWithdrawTx);
    const amountDisplayed = Number(formatUnits(await getUSDCBalance(84532, config.safeAddress) as bigint, 6))

    console.log(`Submit send ${amountDisplayed} USDC to ${config.owners[0].address} Address to Delay Module`);
    console.log(`Tx Hash: ${txHashStart}`);
    console.log(`Start Finalize in ${config.cooldownDelay} seconds.`);

}

main().catch((error) => {
    console.error(error.message);
});