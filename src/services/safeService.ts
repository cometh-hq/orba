import { Address, encodeFunctionData, Hex, parseAbi } from "viem";
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

export { setupSafeWithDelayModule };
