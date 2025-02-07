import { arbitrumSepolia, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, Hex, Address, Account } from "viem";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPaymasterClient, entryPoint07Address } from "viem/account-abstraction";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient } from "permissionless";

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export class SafeConfig {
  public readonly privateKey: Hex;
  public readonly privateKeyCoOwner: Hex;
  public readonly paymasterUrl: string;
  public readonly bundlerUrl: string;
  public readonly chain: any;
  public readonly saltNonce: bigint;
  public readonly owners: Account[];
  public readonly cooldownDelay: number;
  public readonly expiration: number;
  public readonly publicClient: any;
  public readonly pimlicoClient: any;
  public readonly paymasterClient: any;
  public safeAccount: any;
  public safeAddress: Address;
  public gas: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
  public smartAccountClient: any;

  constructor(chainId: number) {
    this.privateKey = this.getEnvVariable("USER_PRIVATE_KEY") as Hex;
    this.privateKeyCoOwner = this.getEnvVariable("COSIGNER_PRIVATE_KEY") as Hex;

    this.cooldownDelay = parseInt(this.getEnvVariable("COOLDOWN", "60"));
    this.expiration = parseInt(this.getEnvVariable("EXPIRATION", "600"));

    this.chain = this.getChain(chainId);

    const chainKey = chainId === 421614 ? "ARBITRUM_SEPOLIA" : "BASE_SEPOLIA";

    this.bundlerUrl = this.getEnvVariable(`${chainKey}_BUNDLER_URL`);
    this.paymasterUrl = this.getEnvVariable(`${chainKey}_PAYMASTER_URL`);

    this.saltNonce = BigInt(this.getEnvVariable("SAFE_SALT_NONCE", "0"));

    const owner = privateKeyToAccount(this.privateKey)
    const coOwner = privateKeyToAccount(this.privateKeyCoOwner);
    this.owners = [owner, coOwner];

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

  private getEnvVariable(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
  }

  public async initSafeAccount() {

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
    this.safeAddress = await this.safeAccount.getAddress();

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
  }

  public async getGasPrice() {
    return (await this.pimlicoClient.getUserOperationGasPrice()).fast;
  }
}