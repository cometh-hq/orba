import { SafeConfig } from "./config/safeConfig";
import { getUSDCBalance } from "./services/usdcService";
import { formatUnits } from "viem";
import { arbitrumSepolia, baseSepolia } from "viem/chains";

async function main() {

    const config = new SafeConfig(arbitrumSepolia.id);
    await config.initSafeAccount();

    const arbitrumBalance = Number(formatUnits(await getUSDCBalance(arbitrumSepolia.id, config) as bigint, 6));
    const baseBalance = Number(formatUnits(await getUSDCBalance(baseSepolia.id, config) as bigint, 6));
    const globalBalance = arbitrumBalance + baseBalance;

    console.log(`Global balance: ${globalBalance} USDC`);
    console.log(`Arbitrum Sepolia lock: ${arbitrumBalance} USDC`);
    console.log(`Base Sepolia lock: ${baseBalance} USDC`);
}

main().catch((error) => {
    console.error(error.message);
});