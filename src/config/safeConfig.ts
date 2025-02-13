import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  http,
  Hex,
  Address,
  Chain,
  parseAbi,
  PrivateKeyAccount,
  PublicClientConfig,
  PublicClient,
} from "viem";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient } from "permissionless";

import * as dotenv from "dotenv";
import {
  getDelayAddress,
  MODULE_ADDRESS,
  MODULE_FACTORY_ADDRESS,
} from "../services/delayModuleService";
import { getEnvVariable } from "./utils";
dotenv.config({ path: ".env.local" });

export class SafeConfig {
  public readonly privateKey: Hex;
  public readonly privateKeyCoOwner: Hex;
  public readonly paymasterUrl: string;
  public readonly bundlerUrl: string;
  public readonly chain: Chain;
  public readonly saltNonce: bigint;
  public readonly owners: PrivateKeyAccount[];
  public readonly cooldownDelay: number;
  public readonly expiration: number;

  constructor(chain: Chain) {
    console.log("# ", chain.name);
    this.privateKey = getEnvVariable("USER_PRIVATE_KEY") as Hex;
    this.privateKeyCoOwner = getEnvVariable("COSIGNER_PRIVATE_KEY") as Hex;

    this.cooldownDelay = parseInt(getEnvVariable("COOLDOWN", "60"));
    this.expiration = parseInt(getEnvVariable("EXPIRATION", "600"));

    this.chain = chain;

    const chainKey = chain.id === 421614 ? "ARBITRUM_SEPOLIA" : "BASE_SEPOLIA";

    this.bundlerUrl = getEnvVariable(`${chainKey}_BUNDLER_URL`);
    this.paymasterUrl = getEnvVariable(`${chainKey}_PAYMASTER_URL`);

    this.saltNonce = BigInt(getEnvVariable("SAFE_SALT_NONCE", "0"));

    const owner = privateKeyToAccount(this.privateKey);
    const coOwner = privateKeyToAccount(this.privateKeyCoOwner);
    this.owners = [owner, coOwner];
  }

  public publicClient(): PublicClient {
    return createPublicClient({
      chain: this.chain,
      transport: http(),
    });
  }

  public async smartAccountClient(): Promise<any> {
    const safeAccount = await toSafeSmartAccount({
      client: this.publicClient(),
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
      owners: this.owners,
      saltNonce: this.saltNonce,
      version: "1.4.1",
    });

    const pimlicoClient = createPimlicoClient({
      transport: http(this.bundlerUrl),
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
    });

    const paymasterClient = createPaymasterClient({
      transport: http(this.paymasterUrl),
    });

    return createSmartAccountClient({
      account: safeAccount,
      chain: this.chain,
      paymaster: paymasterClient,
      bundlerTransport: http(this.bundlerUrl || ""),
      userOperation: {
        estimateFeesPerGas: async () =>
          (await pimlicoClient.getUserOperationGasPrice()).fast,
      },
    });
  }
}
