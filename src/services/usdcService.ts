import { arbitrumSepolia, baseSepolia } from "viem/chains";
import { createPublicClient, http, parseAbi, Address } from "viem";

const USDC_ADDRESSES: Record<number, Address> = {
    421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

const baseSepoliaAavePoolAddress = "0xbE781D7Bdf469f3d94a62Cdcc407aCe106AEcA74";

const publicClients: Record<number, ReturnType<typeof createPublicClient>> = {
    421614: createPublicClient({ chain: arbitrumSepolia, transport: http() }),
    84532: createPublicClient({ chain: baseSepolia, transport: http() }),
};

const getUSDCBalance = async (chainId: number, address: Address): Promise<bigint> => {
    const balance = await publicClients[chainId].readContract({
        address: USDC_ADDRESSES[chainId],
        abi: parseAbi([
            "function balanceOf(address owner) view returns (uint256)",
        ]),
        functionName: "balanceOf",
        args: [address],
    });

    return balance as bigint; // 6 decimals
}

export {
    getUSDCBalance,
    USDC_ADDRESSES,
    baseSepoliaAavePoolAddress,
};