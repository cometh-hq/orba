import { arbitrumSepolia, baseSepolia } from "viem/chains";

import {
  encodeFunctionData,
  parseAbi,
} from "viem";

import {
  setupDelayTx,
  MODULE_ADDRESS,
  MODULE_FACTORY_ADDRESS
} from "./services/delayModuleService";

import { SafeConfig } from "./config/safeConfig";

async function main() {

  const arbitrumConfig = new SafeConfig(arbitrumSepolia.id);
  await arbitrumConfig.initSafeAccount();

  const setupTxs = await setupDelayTx(
    arbitrumConfig.cooldownDelay,
    arbitrumConfig.expiration,
    MODULE_ADDRESS,
    MODULE_FACTORY_ADDRESS,
    arbitrumConfig.owners[0].address,
    arbitrumConfig.safeAddress,
  );

  const thresholdTx = [
    {
      to: arbitrumConfig.safeAddress,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: parseAbi([
          "function changeThreshold(uint256 _threshold) external"
        ]),
        functionName: 'changeThreshold',
        args: [BigInt(2)],
      }),
    }];

  const arbitrumTxHash = await arbitrumConfig.smartAccountClient.sendTransaction({ calls: setupTxs });
  console.log('Arbitrum: Delay Module setup txHash:', arbitrumTxHash);

  const arbitrumTxHashTreshold = await arbitrumConfig.smartAccountClient.sendTransaction({
    calls: thresholdTx,
  });

  console.log('Abitrum: Threshold changed to 2 txHash:', arbitrumTxHashTreshold);


  const baseConfig = new SafeConfig(baseSepolia.id);
  await baseConfig.initSafeAccount();

  const baseTxHash = await baseConfig.smartAccountClient.sendTransaction({ calls: setupTxs });
  console.log('Base: Delay Module setup txHash:', baseTxHash);

  const baseTxHashTreshold = await baseConfig.smartAccountClient.sendTransaction({
    calls: thresholdTx,
  });

  console.log('Base: Threshold changed to 2 txHash:', baseTxHashTreshold);


  console.log(`Safe : ${arbitrumConfig.safeAddress} deployed for ${arbitrumConfig.owners[0].address} with ${arbitrumConfig.owners[1].address} as co signer`);
  console.log(`Delay Module: ${MODULE_ADDRESS} activated with ${arbitrumConfig.owners[0].address} as executor, ${arbitrumConfig.cooldownDelay} seconds of cooldown and ${arbitrumConfig.expiration} seconds of expiration.`);
  console.log(`Available on Base and Arbitrum sepolia.`);


}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});