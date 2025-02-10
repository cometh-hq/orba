import {
    Address,
    createWalletClient,
    encodeFunctionData,
    parseAbi,
    http,
} from "viem";

import { baseSepolia } from "viem/chains";
import { USDC_ADDRESSES } from "./services/usdcService";
import { SafeConfig } from "./config/safeConfig";

async function main() {
    const config = new SafeConfig(baseSepolia.id);
    await config.initSafeAccount();

    const fundProvider = config.getEnvVariable("FUND_PROVIDER_ADDRESS") as Address;

    const coOwnerClient = createWalletClient({
        account: config.owners[1],
        chain: config.chain,
        transport: http()
    })

    const txHash = await coOwnerClient.sendTransaction(
        {
            to: USDC_ADDRESSES[config.chain.id] as Address,
            value: BigInt(0),
            data: encodeFunctionData({
                abi: parseAbi(["function transfer(address to, uint256 value) external returns (bool)"]),
                functionName: "transfer",
                args: [fundProvider, BigInt(2 * 10 ** 6)],
            }),
            chain: config.chain,
        },
    );

    console.log(`Submit send 2 USDC to Fund Provider ${fundProvider} from co-signer ${config.owners[1].address} on ${config.chain.name} Chain`);
    console.log(`Tx Hash: ${txHash}`);
}

main().catch((error) => {
    console.error(error.message);
});