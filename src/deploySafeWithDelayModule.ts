import { arbitrumSepolia, sepolia } from "viem/chains";
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
  SendTransactionParameters,
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
import { getAction } from "viem/utils";
import { sendTransaction } from "permissionless/actions/smartAccount";

const COOLDOWN_DELAY = 60;
const EXPIRATION = 600;
const MODULE_ADDRESS = "0xd54895b1121a2ee3f37b502f507631fa1331bed6";
const MODULE_FACTORY_ADDRESS = "0x000000000000aDdB49795b0f9bA5BC298cDda236";
const GARDIAN_ADDRESS = "0xF64DA4EFa19b42ef2f897a3D533294b892e6d99E";

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
  const paymasterUrl =
    "https://paymaster.cometh.io/421614/?apikey=k0sIbycgG7svL6XxDyDBdRxalGMixTJy";

  if (!privateKey) {
    throw new Error("Please specify a private key");
  }

  const chain = arbitrumSepolia;
  const owner = privateKeyToAccount(privateKey as Hex);

  const publicClient = createPublicClient({
    chain: chain,
    transport: http(),
  });

  const pimlicoClient = createPimlicoClient({
    transport: http(
      "https://api.pimlico.io/v2/421614/rpc?apikey=pim_aUB5bGRJKqWKR2UrWPk3g3"
    ),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  console.log(`Owner address: ${owner.address}`);

  const paymasterClient = createPaymasterClient({
    transport: http(paymasterUrl),
  });

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    owners: [owner],
    version: "1.4.1",
  });
  const safeAddress = await safeAccount.getAddress();
  console.log("smartAccountAddress", safeAddress);

  const gas = (await pimlicoClient.getUserOperationGasPrice()).fast;
  console.log("gas", gas);

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain: arbitrumSepolia,
    paymaster: paymasterClient,
    bundlerTransport: http(
      "https://api.pimlico.io/v2/421614/rpc?apikey=pim_aUB5bGRJKqWKR2UrWPk3g3"
    ),
    userOperation: {
      estimateFeesPerGas: async () => gas,
    },
  });

  const setupTxs = await setupDelayTx(
    GARDIAN_ADDRESS,
    MODULE_FACTORY_ADDRESS,
    MODULE_ADDRESS,
    safeAddress,
    COOLDOWN_DELAY,
    EXPIRATION
  );

  /*const setupTxsHash = await getAction(
    smartAccountClient,
    sendTransaction,
    "sendTransaction"
  )({
    calls: setupTxs,
  } as unknown as SendTransactionParameters);*/

  //console.log("setupTxsHash", setupTxsHash);

  const txHash = await smartAccountClient.sendTransaction({ calls: setupTxs });

  /* const txHash = await smartAccountClient.sendTransaction({
    to: "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F",
    data: "0x06661abd",
  });*/

  console.log(txHash);
}

// Properly handle async execution
main().catch((error) => {
  console.error(error.message);
});
