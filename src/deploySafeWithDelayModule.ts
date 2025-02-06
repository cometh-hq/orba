import { arbitrumSepolia, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  Address,
  concat,
  createPublicClient,
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
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient } from "permissionless";
import { delayModuleABI } from "../abi/delayModule";
import { delayModuleFactoryABI } from "../abi/delayModuleFactory";

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' });

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
  guardianAddress: `0x${string}`,
  moduleFactoryAddress: `0x${string}`,
  delayModuleAddress: `0x${string}`,
  safeAddress: `0x${string}`,
  cooldown: number,
  expiration: number
): Promise<Array<any>> => {
  const delayModuleInitializer = await setUpDelayModule({
    safe: safeAddress,
    cooldown: cooldown as number,
    expiration: expiration as number,
  });

  const delayModuleInstanceAddress = getDelayAddress(
    safeAddress,
    cooldown,
    expiration,
    delayModuleAddress,
    moduleFactoryAddress
  );

  return [
    {
      to: moduleFactoryAddress,
      value: BigInt(0),
      data: await encodeDeployDelayModule({
        singletonDelayModule: delayModuleAddress as Address,
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

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const privateKeyCoOwner = process.env.PRIVATE_KEY_COOWNER;
  const paymasterUrl = process.env.PAYMASTER_URL;
  const bundlerUrl = process.env.BUNDLER_URL;
  const chainId = process.env.CHAIN_ID;
  const saltNonce = process.env.SALT_NONCE || 0;

  if (!privateKey) {
    throw new Error("Please specify a private key");
  }

  if (!privateKeyCoOwner) {
    throw new Error("Please specify a co-owner private key");
  }

  let chain
  if (chainId == "421614") {
    chain = arbitrumSepolia;
  } else if (chainId == "84532") {
    chain = baseSepolia;
  } else {
    throw new Error("Chain id");
  }

  const owner = privateKeyToAccount(privateKey as Hex);
  const coOwner = privateKeyToAccount(privateKeyCoOwner as Hex);
  const owners = [owner, coOwner];

  const publicClient = createPublicClient({
    chain: chain,
    transport: http(),
  });

  const pimlicoClient = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const paymasterClient = createPaymasterClient({
    transport: http(paymasterUrl),
  });

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    owners,
    saltNonce: BigInt(saltNonce),
    version: "1.4.1",
  });
  const safeAddress = await safeAccount.getAddress();
  console.log("smartAccountAddress", safeAddress);

  const gas = (await pimlicoClient.getUserOperationGasPrice()).fast;
  console.log("gas", gas);

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain,
    paymaster: paymasterClient,
    bundlerTransport: http(bundlerUrl),
    userOperation: {
      estimateFeesPerGas: async () => gas,
    },
  });

  const setupTxs = await setupDelayTx(
    owner.address,
    MODULE_FACTORY_ADDRESS,
    MODULE_ADDRESS,
    safeAddress,
    COOLDOWN_DELAY,
    EXPIRATION
  );

  console.log("setupTxs", setupTxs);

  const txHash = await smartAccountClient.sendTransaction({ calls: setupTxs });
  console.log(txHash);

  //Change threshold to 2

  const txHashTreshold = await smartAccountClient.sendTransaction({
    calls: [
      {
        to: safeAddress,
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

}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});