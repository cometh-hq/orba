import { SafeConfig } from "./config/safeConfig";
import { getEnvVariable } from "./config/utils";
import { getUSDCBalance } from "./services/usdcService";
import { Address, Chain, formatUnits, PublicClient } from "viem";
import { arbitrumSepolia, baseSepolia } from "viem/chains";

async function getBalance(publicCLient: PublicClient, address: `0x${string}`) {
  const balance = Number(
    formatUnits((await getUSDCBalance(publicCLient, address)) as bigint, 6)
  );
  return balance;
}

async function main() {
  const fundProvider = getEnvVariable("FUND_PROVIDER_ADDRESS") as Address;

  const baseConfig = new SafeConfig(baseSepolia);
  const baseConfigSmartAccountClient = await baseConfig.smartAccountClient();
  const baseSafeAddress = baseConfigSmartAccountClient.account.address;
  const baseClient = baseConfig.publicClient();

  const fundProviderBalance = await getBalance(baseClient, fundProvider);
  console.log(`Fund provider base balance: ${fundProviderBalance} USDC`);

  const safeBaseBalance = await getBalance(baseClient, baseSafeAddress);
  console.log(`Safe Lock on base: ${safeBaseBalance} USDC`);

  const arbitrimConfig = new SafeConfig(arbitrumSepolia);
  const arbitrumSmartAccountClient = await arbitrimConfig.smartAccountClient();
  const arbitrumClient = arbitrimConfig.publicClient();
  const arbitrumSafeAddress = arbitrumSmartAccountClient.account.address;

  const safeArbitrumBalance = await getBalance(
    arbitrumClient,
    arbitrumSafeAddress
  );
  console.log(`Safe Lock on arbitrum: ${safeArbitrumBalance} USDC`);
  const globalBalance = safeArbitrumBalance + safeBaseBalance;
  console.log(`Global balance: ${globalBalance} USDC`);
}

main().catch((error) => {
  console.error(error.message);
});
