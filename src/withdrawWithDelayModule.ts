import { delayModuleABI } from "../abi/delayModule";

import {
    Address,
    createWalletClient,
    encodeFunctionData,
    http,
    parseAbi,
} from "viem";

import { getDelayAddress } from "./services/delayModuleService";

import { SafeConfig } from "./config/safeConfig";

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' });

const usdcAddress = process.env.USDC_ADDRESS as Address;
const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS as Address;

const COOLDOWN_DELAY = 60;
const EXPIRATION = 600;
const MODULE_ADDRESS = "0xd54895b1121a2ee3f37b502f507631fa1331bed6";
const MODULE_FACTORY_ADDRESS = "0x000000000000aDdB49795b0f9bA5BC298cDda236";

const txWithdraw = async (
    delayModuleInstanceAddress: `0x${string}`,
    functionName: "executeNextTx" | "execTransactionFromModule",
    recipientAddress: Address,
    amount: bigint,
): Promise<any> => {

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
            functionName,
            args: [usdcAddress, BigInt(0), transferData, 0],
        }),
    };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function main() {
  const config = new SafeConfig();
  await config.initSafeAccount(smartAccountAddress);

    const ownerClient = createWalletClient({
        account: config.owners[0],
        chain: config.chain,
        transport: http()
    })

    //User starts withdrawal of funds in the safe account

    const delayModuleInstanceAddress = getDelayAddress(
        config.safeAddress,
        COOLDOWN_DELAY,
        EXPIRATION,
        MODULE_ADDRESS,
        MODULE_FACTORY_ADDRESS
    );

    const startWithdrawTx = await txWithdraw(
        delayModuleInstanceAddress,
        "execTransactionFromModule",
        config.owners[0].address,
        BigInt(0.1 * 10 ** 6),
    )
    const txHashStart = await ownerClient.sendTransaction(startWithdrawTx);
    console.log(txHashStart);

    // Wait for 80 seconds before finalizing the withdrawal
    await sleep(80000);

    const finalizeWithdrawTx = await txWithdraw(
        delayModuleInstanceAddress,
        "executeNextTx", 
        config.owners[0].address,
        BigInt(0.1 * 10 ** 6),
    )
    const txHashFinalize = await ownerClient.sendTransaction(finalizeWithdrawTx);
    console.log(txHashFinalize);
}


// Properly handle async execution
main().catch((error) => {
    console.error(error.message);
});