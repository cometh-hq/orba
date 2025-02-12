import { arbitrumSepolia, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  http,
  Hex,
  Address,
  Account,
  Chain,
  parseAbi,
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
  public readonly owners: Account[];
  public readonly cooldownDelay: number;
  public readonly expiration: number;
  public readonly publicClient: any;
  public readonly pimlicoClient: any;
  public readonly paymasterClient: any;
  public safeAccount: any;

  public gas: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
  public smartAccountClient: any;

  constructor(chainId: number) {
    this.privateKey = getEnvVariable("USER_PRIVATE_KEY") as Hex;
    this.privateKeyCoOwner = getEnvVariable("COSIGNER_PRIVATE_KEY") as Hex;

    this.cooldownDelay = parseInt(getEnvVariable("COOLDOWN", "60"));
    this.expiration = parseInt(getEnvVariable("EXPIRATION", "600"));

    this.chain = this.getChain(chainId);

    const chainKey = chainId === 421614 ? "ARBITRUM_SEPOLIA" : "BASE_SEPOLIA";

    this.bundlerUrl = getEnvVariable(`${chainKey}_BUNDLER_URL`);
    this.paymasterUrl = getEnvVariable(`${chainKey}_PAYMASTER_URL`);

    this.saltNonce = BigInt(getEnvVariable("SAFE_SALT_NONCE", "0"));

    const owner = privateKeyToAccount(this.privateKey);
    const coOwner = privateKeyToAccount(this.privateKeyCoOwner);
    this.owners = [owner, coOwner];

    this.gas = {
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    };

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(),
    });

    this.pimlicoClient = createPimlicoClient({
      transport: http(this.bundlerUrl),
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
    });

    this.paymasterClient = createPaymasterClient({
      transport: http(this.paymasterUrl),
    });
  }

  private getChain(chainId: number) {
    if (chainId === 421614) {
      return arbitrumSepolia;
    } else if (chainId === 84532) {
      return baseSepolia;
    } else {
      throw new Error("Invalid Chain ID");
    }
  }

  public async getAccountAddress() {
    return await this.safeAccount.getAddress();
  }

  public async init(): Promise<SafeConfig> {
    console.log("# ", this.chain.name);
    const safeAddress = process.env.SMART_ACCOUNT_ADDRESS as Address;

    this.safeAccount = await toSafeSmartAccount({
      client: this.publicClient,
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
      owners: this.owners,
      saltNonce: this.saltNonce,
      version: "1.4.1",
      ...(safeAddress ? { address: safeAddress } : {}),
    });

    this.gas = (await this.pimlicoClient.getUserOperationGasPrice()).fast;

    this.smartAccountClient = createSmartAccountClient({
      account: this.safeAccount,
      chain: this.chain,
      paymaster: this.paymasterClient,
      bundlerTransport: http(this.bundlerUrl || ""),
      userOperation: {
        estimateFeesPerGas: async () => this.gas,
      },
    });
    return this;
  }

  public async getConfig() {
    const safeAddress = await this.getAccountAddress();
    const threshold = await this.publicClient.readContract({
      address: safeAddress,
      abi: parseAbi(["function getThreshold() view returns (uint256)"]),
      functionName: "getThreshold",
    });

    const owers = await this.publicClient.readContract({
      address: safeAddress,
      abi: parseAbi(["function getOwners() view returns (address[])"]),
      functionName: "getOwners",
    });

    console.log(
      "Safe address:",
      await safeAddress,
      ", threshold : ",
      threshold,
      ", owners:",
      owers
    );

    console.log("Delay Module: ", await this.getDelayAddress());
  }

  public async getDelayAddress() {
    return getDelayAddress(
      await this.getAccountAddress(),
      this.cooldownDelay,
      this.expiration,
      MODULE_ADDRESS,
      MODULE_FACTORY_ADDRESS
    );
  }

  public async getGasPrice() {
    return (await this.pimlicoClient.getUserOperationGasPrice()).fast;
  }
}
