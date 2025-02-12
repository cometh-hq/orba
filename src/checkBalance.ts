import { SafeConfig } from "./config/safeConfig";
import { getEnvVariable } from "./config/utils";
import { getUSDCBalance } from "./services/usdcService";
import { Address, Chain, formatUnits } from "viem";
import { arbitrumSepolia, baseSepolia } from "viem/chains";

async function getBalance(chain: Chain) {
  const config = new SafeConfig(chain.id);
  await config.init();

  const balance = Number(
    formatUnits(
      (await getUSDCBalance(arbitrumSepolia.id, config.safeAddress)) as bigint,
      6
    )
  );
  console.log(`Lock: ${balance} USDC`);
  return balance;
}

async function main() {
  const fundProvider = getEnvVariable("FUND_PROVIDER_ADDRESS") as Address;
  const fundProviderBalance = formatUnits(
    (await getUSDCBalance(arbitrumSepolia.id, fundProvider)) as bigint,
    6
  );
  console.log(`Fund provider base balance: ${fundProviderBalance} USDC`);

  const arbitrumBalance = await getBalance(arbitrumSepolia);
  const baseBalance = await getBalance(baseSepolia);
  const globalBalance = arbitrumBalance + baseBalance;
  console.log(`Global balance: ${globalBalance} USDC`);
}

main().catch((error) => {
  console.error(error.message);
});
