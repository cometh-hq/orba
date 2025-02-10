import {
    Address,
    createWalletClient,
    encodeFunctionData,
    parseAbi,
    http,
} from "viem";

import { arbitrumSepolia } from "viem/chains";
import { USDC_ADDRESSES } from "./services/usdcService";
import { SafeConfig } from "./config/safeConfig";

async function main() {
    const config = new SafeConfig(arbitrumSepolia.id);
    await config.initSafeAccount();

    const ownerClient = createWalletClient({
        account: config.owners[0],
        chain: config.chain,
        transport: http()
    })

    const txHash = await ownerClient.sendTransaction(
        {
            to: USDC_ADDRESSES[config.chain.id] as Address,
            value: BigInt(0),
            data: encodeFunctionData({
                abi: parseAbi(["function transfer(address to, uint256 value) external returns (bool)"]),
                functionName: "transfer",
                args: [config.safeAddress, BigInt(2 * 10 ** 6)],
            }),
            chain: config.chain,
        },
    );

    console.log(`Submit send 2 USDC to Safe Smart Account ${config.safeAddress} from owner ${config.owners[0].address} on ${config.chain.name} Chain`);
    console.log(`Tx Hash: ${txHash}`);
}

main().catch((error) => {
    console.error(error.message);
});