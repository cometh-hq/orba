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

const MODULE_ADDRESS = "0xd54895b1121a2ee3f37b502f507631fa1331bed6";
const MODULE_FACTORY_ADDRESS = "0x000000000000aDdB49795b0f9bA5BC298cDda236";

const getDelayAddress = (
  safe: Address,
  cooldown: number,
  expiration: number,
  moduleAddress: String = MODULE_ADDRESS,
  factoryAddress: `0x${string}` = MODULE_FACTORY_ADDRESS
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

const delayTx = async (
  usdcAddress: Address,
  delayModuleInstanceAddress: Address,
  functionName: "executeNextTx" | "execTransactionFromModule",
  recipientAddress: Address,
  amount: bigint
): Promise<any> => {
  // Encode data for the USDC transfer
  const transferData = encodeFunctionData({
    abi: parseAbi([
      "function transfer(address to, uint256 amount) public returns (bool)",
    ]),
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

export {
  getDelayAddress,
  encodeDeployDelayModule,
  setUpDelayModule,
  delayTx,
  MODULE_ADDRESS,
  MODULE_FACTORY_ADDRESS,
};
