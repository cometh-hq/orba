// Get the environment configuration from .env file
//
// To make use of automatic environment setup:
// - Duplicate .env.example file and name it .env
// - Fill in the environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import "hardhat-deploy";
import { HttpNetworkAccountsUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-verify";

const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC;

// Set your preferred authentication method
//
// If you prefer using a mnemonic, set a MNEMONIC environment variable
// to a valid mnemonic
const MNEMONIC = process.env.MNEMONIC;

// If you prefer to be authenticated using a private key, set a DEPLOYER_PRIVATE_KEY environment variable
const PRIVATE_KEY = process.env.USER_PRIVATE_KEY;

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
  ? { mnemonic: MNEMONIC }
  : PRIVATE_KEY
  ? [PRIVATE_KEY]
  : undefined;

if (accounts == null) {
  console.warn(
    "Could not find MNEMONIC or PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example."
  );
}

if (!BASE_SEPOLIA_RPC) {
  console.warn(
    "Could not find BASE_RPC environment variable. It will not be possible to execute transactions"
  );
}

const config = {
  paths: {
    cache: "cache/hardhat",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    base_sepolia: {
      url: BASE_SEPOLIA_RPC,
      accounts: accounts,
      chainId: 84532,
    },
    hardhat: {
      // Need this for testing because TestHelperOz5.sol is exceeding the compiled contract size limit
      allowUnlimitedContractSize: true,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // wallet address of index[0], of the mnemonic in .env
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      arbitrum_sepolia: process.env.ARBISCAN_SEP_API_KEY,
      base_sepolia: process.env.BASESCAN_SEP_API_KEY,
    },
    customChains: [
      {
        network: "arbitrum_sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/",
        },
      },
    ],
  },
};

export default config;
