import { Address, encodeFunctionData, Hex, parseAbi, PublicClient } from "viem";
import {
  getDelayAddress,
  setUpDelayModule,
  encodeDeployDelayModule,
} from "./delayModuleService";

const setupSafeWithDelayModule = async (
  cooldown: number,
  expiration: number,
  moduleAddress: String,
  factoryAddress: `0x${string}`,
  guardianAddress: `0x${string}`,
  safeAddress: `0x${string}`
): Promise<Array<any>> => {
  const delayModuleInitializer = await setUpDelayModule({
    safe: safeAddress,
    cooldown,
    expiration,
  });

  const delayModuleInstanceAddress = getDelayAddress(
    safeAddress,
    cooldown,
    expiration,
    moduleAddress,
    factoryAddress
  );

  return [
    {
      to: factoryAddress,
      value: BigInt(0),
      data: await encodeDeployDelayModule({
        singletonDelayModule: moduleAddress as Address,
        initializer: delayModuleInitializer as Hex,
        safe: safeAddress,
      }),
    },
    {
      to: safeAddress,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: parseAbi(["function enableModule(address module) public"]),
        functionName: "enableModule",
        args: [delayModuleInstanceAddress],
      }),
    },
    {
      to: delayModuleInstanceAddress,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: parseAbi(["function enableModule(address module) public"]),
        functionName: "enableModule",
        args: [guardianAddress],
      }),
    },
    {
      to: safeAddress,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: parseAbi([
          "function changeThreshold(uint256 _threshold) external",
        ]),
        functionName: "changeThreshold",
        args: [BigInt(2)],
      }),
    },
  ];
};

const getConfig = async (
  address: `0x${string}`,
  publicClient: PublicClient,
  cooldown: number,
  expiration: number
) => {
  const threshold = await publicClient.readContract({
    address: address,
    abi: parseAbi(["function getThreshold() view returns (uint256)"]),
    functionName: "getThreshold",
  });

  const owers = await publicClient.readContract({
    address: address,
    abi: parseAbi(["function getOwners() view returns (address[])"]),
    functionName: "getOwners",
  });

  console.log(
    "Safe address:",
    await address,
    ", threshold : ",
    threshold,
    ", owners:",
    owers
  );

  console.log(
    "Delay Module: ",
    await getDelayAddress(address, cooldown, expiration)
  );
};

export { setupSafeWithDelayModule, getConfig };
