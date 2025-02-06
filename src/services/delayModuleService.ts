import {
    Address,
    concat,
    encodeAbiParameters,
    encodeFunctionData,
    getContractAddress,
    Hex,
    keccak256,
    pad,
    parseAbi,
    parseAbiParameters,
  } from "viem";

  import { delayModuleABI } from "../../abi/delayModule";
  import { delayModuleFactoryABI } from "../../abi/delayModuleFactory";

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
  
  const setUpDelayModule = async ({
    safe,
    cooldown,
    expiration,
  }: {
    safe: Address;
    cooldown: number;
    expiration: number;
  }): Promise<string> => {
    const setUpArgs = encodeAbiParameters(
      parseAbiParameters(["address", "address", "address", "uint256", "uint256"]),
      [safe, safe, safe, BigInt(cooldown), BigInt(expiration)]
    );
  
    return encodeFunctionData({
      abi: delayModuleABI,
      functionName: "setUp",
      args: [setUpArgs],
    });
  };
  
  const encodeDeployDelayModule = ({
    singletonDelayModule,
    initializer,
    safe,
  }: {
    singletonDelayModule: Address;
    initializer: Hex;
    safe: Address;
  }): string => {
    return encodeFunctionData({
      abi: delayModuleFactoryABI,
      functionName: "deployModule",
      args: [singletonDelayModule, initializer, BigInt(safe)],
    });
  };
  
  const setupDelayTx = async (
    cooldown: number,
    expiration: number,
    moduleAddress: String,
    factoryAddress: `0x${string}`,
    guardianAddress: `0x${string}`,
    safeAddress: `0x${string}`,
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
    ];
  };


  export { 
    getDelayAddress,
    setupDelayTx,
};