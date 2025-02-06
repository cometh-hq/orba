import {
  encodeFunctionData,
  parseAbi,
} from "viem";

import { setupDelayTx } from "./services/delayModuleService";
import { SafeConfig } from "./config/safeConfig";

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' });

const COOLDOWN_DELAY = 60;
const EXPIRATION = 600;
const MODULE_ADDRESS = "0xd54895b1121a2ee3f37b502f507631fa1331bed6";
const MODULE_FACTORY_ADDRESS = "0x000000000000aDdB49795b0f9bA5BC298cDda236";

async function main() {

  const config = new SafeConfig();
  await config.initSafeAccount();

  const setupTxs = await setupDelayTx(
    COOLDOWN_DELAY,
    EXPIRATION,
    MODULE_ADDRESS,
    MODULE_FACTORY_ADDRESS,
    config.owners[0].address,
    config.safeAddress,
  );

  const txHash = await config.smartAccountClient.sendTransaction({ calls: setupTxs });
  console.log(txHash);

  //Change threshold to 2

  const txHashTreshold = await config.smartAccountClient.sendTransaction({
    calls: [
      {
        to: config.safeAddress,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: parseAbi([
            "function changeThreshold(uint256 _threshold) external"
          ]),
          functionName: 'changeThreshold',
          args: [BigInt(2)],
        }),
      }]
  });

  console.log(txHashTreshold);

console.log(`Safe : ${config.safeAddress} deployed for ${config.owners[0].address} with ${config.owners[1].address} as co signer`);
console.log(`Delay Module: ${MODULE_ADDRESS} activated with ${config.owners[0].address} as executor, ${COOLDOWN_DELAY} seconds of cooldown and ${EXPIRATION} seconds of expiration.`);
console.log(`Available on Base and Arbitrum sepolia.`);


}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});