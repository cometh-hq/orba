# One Balance with Safe Smart Account and Delay module

## What is One Balance
OneBalance is a Chain Abstraction Toolkit designed to simplify cross-chain interactions by utilizing Credible Accounts. These accounts enable users to manage funds across multiple blockchains efficiently, allowing for secure deposits and controlled, permissioned withdrawals without relying on global consensus mechanisms. 

More details can be found in the official documentation:
- [Getting Started with One Balance and Privy](https://docs.onebalance.io/chain-abstraction-toolkit/getting-started-with-onebalance-and-privy)
- [Initializing and Depositing onto the One Balance Smart Account](https://docs.onebalance.io/chain-abstraction-toolkit/getting-started-with-onebalance-and-privy/step-3-initializing-and-depositing-onto-the-onebalance-smart-account)

## Purpose of this POC
In OneBalance, the **Lock Module** secures user funds by enforcing **resource locks**, ensuring that assets remain escrowed until specific conditions or an expiry time are met. This prevents double-spending and maintains execution integrity in cross-chain transactions.  

This POC aims to replace OneBalance’s **Lock Module** with a combination of **Safe Smart Accounts** and a **Delay Module**, providing similar security guarantees with Safe accounts.  

## How the Replacement Works  

### OneBalance Lock Module  
In OneBalance, a **Resource Lock** holds funds within the user’s **Credible Account** until:  
- A fulfillment condition is met.  
- The lock expires.  
- A solver executes the state transition.  

This mechanism ensures solvers are not griefed by users attempting to cancel or modify transactions mid-execution.  

### Safe Smart Accounts & Delay Module  
Instead of OneBalance’s **resource lock**, this POC achieves similar functionality using:  
1. **Safe Smart Accounts**  
   - A multi-signature wallet where ownership is shared between the **user** and **OneBalance’s co-signer**.  
   - Transactions require signatures from both parties to ensure security.  

2. **Delay Module**  
   - Enforces a **cooldown period** before funds can be withdrawn.  
   - Sets an **expiration** to finalize or cancel the withdrawal.  
   - Prevents immediate fund access, mimicking OneBalance’s time-lock mechanism.  

### Workflow Comparison  

| Feature                   | OneBalance Lock Module            | Safe Smart Account + Delay Module |
|---------------------------|----------------------------------|-----------------------------------|
| Lock Mechanism            | Resource Lock                   | Delay Module                     |
| Ownership                 | Credible Account                | Safe Smart Account (user + co-signer) |
| Execution Control         | Solvers execute transactions    | User + co-signer sign transactions |
| Time-Locked Withdrawals   | Lock expires after a set time   | Withdrawal delay (cooldown) |
| Modification Flexibility  | Resource locks prevent changes  | User can modify Safe after cooldown |


## Glossary

### Resource Lock

A **Resource Lock** is a credible commitment made by a user to escrow some state based on specific conditions or an expiry time. It ensures that a certain amount of assets remains locked until either the conditions are met or the expiration time is reached.
A user can specify a **lock** amount, a **fulfillment condition**, and an **expiry** time. This prevents double-spending and ensures that solvers (executors of the request) are not griefed during execution.

### Credible Commitment

A **Credible Commitment** is a guarantee made by a user’s account about what messages it will and won’t sign. This prevents equivocation (contradicting previous commitments) and ensures reliability in cross-chain interactions.

### Credible Account

A Credible Account operates in a **secure environment** chosen by the user and functions as its own **rollup**, maintaining user states across chains. It ensures that transactions follow predefined rules, preventing double-spending and equivocation.

Each **OneBalance account** functions like its own **rollup**, managing user states across multiple chains. It wraps these states in a virtual environment that:
- Issues **state transition requests** as **resource locks**.
- Executes these transitions through **cross-chain execution proofs**.
- Is secured by a **credible commitment machine**, ensuring commitments remain valid.


# Setup and Usage Instructions

## Install Dependencies

Run the following command to install the required dependencies:

```sh
yarn install
```

## Configure Environment Variables

Copy the `.env.example` file to `.env.local` and set your values as follows:

```
USER_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
COSIGNER_PRIVATE_KEY=<YOUR_PRIVATE_KEY_COOWNER>

ARBITRUM_SEPOLIA_BUNDLER_URL=<YOUR_BUNDLER_URL>
ARBITRUM_SEPOLIA_PAYMASTER_URL=<YOUR_PAYMASTER_URL>

BASE_SEPOLIA_BUNDLER_URL=<YOUR_BUNDLER_URL>
BASE_SEPOLIA_PAYMASTER_URL=<YOUR_PAYMASTER_URL>

COOLDOWN=20
EXPIRATION=60

SAFE_SALT_NONCE=0
```

## Setup Safe Account

Deploy a safe for the user and co-signer keys as owners. The safe is configured with a threshold of 2.

A **Delay Module** is configured, allowing the user key to execute a transaction after a cooldown. This module locks user funds in the safe for a lock period equal to the cooldown.

Run the following command:

```sh
yarn deploy-safe
```

Add the user safe address to your `.env.local`:

```
SMART_ACCOUNT_ADDRESS=<YOUR_SMART_ACCOUNT_ADDRESS>
```

## Setup Fund Provider

Deploy the Fund Provider on Base with the co-signer key. The Fund Provider will be used to provide USDC to the Safe account.

Disclaimer: The Fund Provider contract is for demonstration purposes only and is not intended for production use.

Run the following command:

```sh
yarn deploy-bank
```

Add the Fund Provider address to your `.env.local`:

```
FUND_PROVIDER_ADDRESS=<YOUR_FUND_PROVIDER_ADDRESS>
```

## Send USDC to the Safe on Arbitrum

You can get USDC for the user from the Circle faucet here: [https://faucet.circle.com/](https://faucet.circle.com/)

Fund the Safe with USDC on Arbitrum. The Safe Smart Account will receive 2 USDC from the user's address on the Arbitrum chain.

Run the following command:

```sh
yarn fund-safe
```

## Send USDC to the Fund Provider on Base

You can get USDC for the co-signer from the Circle faucet here: [https://faucet.circle.com/](https://faucet.circle.com/)

Fund the Fund Provider with USDC on Base. The Fund Provider will receive 2 USDC from the co-signer's address on the Base chain.

Run the following command:

```sh
yarn fund-bank
```

### Check Balance

To check your balance, run:

```sh
yarn check-balance
```

## User Signs Claim for USDC Reimbursement on Arbitrum Sepolia

Run the following command to sign the claim for reimbursement:

```sh
yarn user-sign-claim-reimbursement
```

## Withdraw and deposit USDC on AAVE Base

Withdraw 2 USDC from the Fund Provider on Base Sepolia and deposit into AAVE.

Run the following command:

```sh
yarn withdraw-and-deposit-on-aave
```

## Co-Signer Claims Funds on Arbitrum

To claim the funds on Arbitrum, the co-signer needs to run the following command:

```sh
yarn claim-reimbursement
```

## User Starts Unlocking Funds on Arbitrum

To start unlocking the funds, run:

```sh
yarn start-unlock-fund
```

## User Finalizes Unlocking Funds on Arbitrum

To finalize unlocking the funds, run:

```sh
yarn finalize-unlock-fund
```