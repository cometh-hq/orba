import { arbitrumSepolia, baseSepolia } from "viem/chains";

import { delayModuleABI } from "../abi/delayModule";

import { privateKeyToAccount } from "viem/accounts"
import { toSafeSmartAccount } from "permissionless/accounts"
import {
    Address,
    concat,
    createPublicClient,
    createWalletClient,
    encodeAbiParameters,
    encodeFunctionData,
    getContractAddress,
    Hex,
    http,
    keccak256,
    pad,
    parseAbi,
    parseAbiParameters,
} from "viem";

import {
    entryPoint07Address,
} from "viem/account-abstraction";

import * as dotenv from 'dotenv'
dotenv.config()

const USDC_ADDRESS_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

const COOLDOWN_DELAY = 60;
const EXPIRATION = 600;
const MODULE_ADDRESS = "0xd54895b1121a2ee3f37b502f507631fa1331bed6";
const MODULE_FACTORY_ADDRESS = "0x000000000000aDdB49795b0f9bA5BC298cDda236";


const getDelayAddress = (
    safe: Address,
    cooldown: number,
    expiration: number,
    moduleAddress: String,
    factoryAddress: `0x${string}`
): Address => {
    const args = encodeFunctionData({
        abi: delayModuleABI,
        functionName: "setUp",
        args: [
            encodeAbiParameters(
                parseAbiParameters("address, address, address, uint256, uint256"),
                [safe, safe, safe, BigInt(cooldown), BigInt(expiration)]
            ),
        ],
    });

    const initializer = args;

    const code = concat([
        "0x602d8060093d393df3363d3d373d3d3d363d73" as Hex,
        moduleAddress.slice(2) as Hex,
        "5af43d82803e903d91602b57fd5bf3" as Hex,
    ]);

    const salt = keccak256(
        concat([keccak256(initializer), pad(safe, { size: 32 })])
    );

    return getContractAddress({
        bytecode: code,
        from: factoryAddress,
        salt,
        opcode: "CREATE2",
    });
};

const startWithdraw = async (
    moduleFactoryAddress: `0x${string}`,
    delayModuleAddress: `0x${string}`,
    safeAddress: `0x${string}`,
    cooldown: number,
    expiration: number,
    recipientAddress: Address,
    amount: bigint,
): Promise<any> => {

    const delayModuleInstanceAddress = getDelayAddress(
        safeAddress,
        cooldown,
        expiration,
        delayModuleAddress,
        moduleFactoryAddress
    );

    console.log("delayModuleInstanceAddress", delayModuleInstanceAddress);

    // Encode the data for the USDC transfer
    const transferData = encodeFunctionData({
        abi: parseAbi(["function transfer(address to, uint256 amount) public returns (bool)"]),
        functionName: "transfer",
        args: [recipientAddress, amount],
    });

    return {
        to: delayModuleInstanceAddress,
        value: BigInt(0),
        data: encodeFunctionData({
            abi: delayModuleABI,
            functionName: "execTransactionFromModule",
            args: [USDC_ADDRESS_ARB_SEPOLIA, BigInt(0), transferData, 0],
        }),
    }
};

const finalizeWithdraw = async (
    moduleFactoryAddress: `0x${string}`,
    delayModuleAddress: `0x${string}`,
    safeAddress: `0x${string}`,
    cooldown: number,
    expiration: number,
    recipientAddress: Address,
    amount: bigint,
): Promise<any> => {

    const delayModuleInstanceAddress = getDelayAddress(
        safeAddress,
        cooldown,
        expiration,
        delayModuleAddress,
        moduleFactoryAddress
    );

    // Encode data for the USDC transfer
    const transferData = encodeFunctionData({
        abi: parseAbi(["function transfer(address to, uint256 amount) public returns (bool)"]),
        functionName: "transfer",
        args: [recipientAddress, amount],
    });

    return {
        to: delayModuleInstanceAddress,
        value: BigInt(0),
        data: encodeFunctionData({
            abi: delayModuleABI,
            functionName: "executeNextTx",
            args: [USDC_ADDRESS_ARB_SEPOLIA, BigInt(0), transferData, 0],
        }),
    };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function main() {
    const privateKey = process.env.PRIVATE_KEY;
    const privateKeyCoOwner = process.env.PRIVATE_KEY_COOWNER;

    if (!privateKey) {
        throw new Error("Please specify a private key");
    }

    if (!privateKeyCoOwner) {
        throw new Error("Please specify a co-owner private key");
    }

    const chain = arbitrumSepolia;
    const owner = privateKeyToAccount(privateKey as Hex);
    const coOwner = privateKeyToAccount(privateKeyCoOwner as Hex);
    const owners = [owner, coOwner];
    const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS as Address;

    const publicClient = createPublicClient({
        chain: chain,
        transport: http(),
    });

    const safeAccount = await toSafeSmartAccount({
        client: publicClient,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
        },
        owners,
        version: "1.4.1",
        address: smartAccountAddress,
    });

    const safeAddress = await safeAccount.getAddress();
    console.log("smartAccountAddress", safeAddress);

    const ownerClient = createWalletClient({
        account: owner,
        chain,
        transport: http()
    })

    //User starts withdrawal of funds in the safe account

    const startWithdrawTx = await startWithdraw(
        MODULE_FACTORY_ADDRESS,
        MODULE_ADDRESS,
        safeAddress,
        COOLDOWN_DELAY,
        EXPIRATION,
        owner.address,
        BigInt(0.1 * 10 ** 6),
    )
    const txHashStart = await ownerClient.sendTransaction(startWithdrawTx);
    console.log(txHashStart);

    // Wait for 80 seconds before finalizing the withdrawal
    await sleep(80000);

    const finalizeWithdrawTx = await finalizeWithdraw(
        MODULE_FACTORY_ADDRESS,
        MODULE_ADDRESS,
        safeAddress,
        COOLDOWN_DELAY,
        EXPIRATION,
        owner.address,
        BigInt(0.1 * 10 ** 6),
    )
    const txHashFinalize = await ownerClient.sendTransaction(finalizeWithdrawTx);
    console.log(txHashFinalize);
}


// Properly handle async execution
main().catch((error) => {
    console.error(error.message);
});