# Orba: Safe Account as Resource Lock

## What is OneBalance?  
OneBalance is a Chain Abstraction Toolkit designed to simplify cross-chain interactions by utilizing **Credible Accounts**. These accounts enable users to manage funds across multiple blockchains efficiently, allowing for secure deposits and controlled, permissioned withdrawals without relying on global consensus mechanisms.

More details can be found in the official documentation:  
- [Getting Started with OneBalance and Privy](https://docs.onebalance.io/chain-abstraction-toolkit/getting-started-with-onebalance-and-privy)  
- [Initializing and Depositing onto the OneBalance Smart Account](https://docs.onebalance.io/chain-abstraction-toolkit/getting-started-with-onebalance-and-privy/step-3-initializing-and-depositing-onto-the-onebalance-smart-account)  

## Safe and Delay Module as Resource Lock  
A **resource lock** ensures that assets remain escrowed until specific conditions or an expiry time are met.  
This prevents double-spending and maintains execution integrity in cross-chain transactions.

This repository demonstrates how to use **Safe Smart Accounts** and a **Delay Module** as a resource lock.

### 1. Safe Smart Accounts  
- A multi-signature wallet where ownership is shared between the **user** and a **co-signer**.  
- Transactions require signatures from both parties. User will initiate a transaction, the co-signer will validate it if certains conditions are met.

### 2. Delay Module  
- Enforces a **cooldown period** before a transaction can be executed.  
- Prevents immediate fund access.
- The user has the right to propose a transaction to the delay module, allowing them to retrieve their funds after the cooldown period.  

## Use Case

The user has **10 USDC** on **Arbitrum** and wants to deposit **8 USDC** on **Base**.  

### Setup

1. **Initialize Wallets**  
   - Send **User Operations** that enable the **Delay Module** and deploy **Safes** with the **user** and a **co-signer** as owners on **Arbitrum** and **Base**. The **Delay Module** is enabled on the Safes.  

2. **User Deposits Funds on Abritrum**  
   - The user sends **10 USDC** on **Arbitrum** to the **Safe**.

### User wants to deposit 8 USDC on Base Aave.

1. **User prepares a UserOp for the co-signer, allowing him to receive 8 USDC on Arbitrum** 
   - The user crafts a **UserOp** to send **8 USDC** on **Arbitrum**, where the funds are locked, to the **co-signer** and signs it.  
   - This signed UserOp serves as collateral for the co-signer’s reimbursement.  
   - The co-signer holds onto this signed UserOp until the deposit on **Base Aave** is completed.  

2. **Co-signer authorizes withdrawal on Base**  
   - The co-signer signs a **withdrawal request**, authorizing the user to receive **8 USDC** on **Base** from the co-signer.  

3. **User initiates withdrawal and deposit on Base Aave**  
   - The user crafts another **UserOp** to call the **withdrawal function** on **Base** using the request signed by the co-signer, retrieve **8 USDC**, and deposit it into **Aave**.  

4. **User requests co-signer’s approval**  
   - The user requests the co-signer's **signature** for this UserOp.
   - Co-signer sign it.

5. **Execution on Base**  
   - The **UserOp**, signed by both the user and the co-signer, is sent to **Base** to execute:  
     - Withdraw **8 USDC** from the co-signer.  
     - Deposit **8 USDC** into **Aave**.  

6. **Co-signer reimbursement**
   - The signed **UserOp**, authorizing the co-signer to receive **8 USDC** on **Arbitrum**, is signed by the co-signer and executed on **Arbitrum** to **reimburse** him.  

# Setup and Usage Instructions

## Install Dependencies

Run the following command to install the required dependencies:

```sh
yarn install
```

## Configure Environment Variables

Copy the `.env.example` file to `.env.local` and set your values as follows:

```sh
USER_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
COSIGNER_PRIVATE_KEY=<YOUR_PRIVATE_KEY_COOWNER>

ARBITRUM_SEPOLIA_BUNDLER_URL=<YOUR_BUNDLER_URL>
ARBITRUM_SEPOLIA_PAYMASTER_URL=<YOUR_PAYMASTER_URL>

BASE_SEPOLIA_BUNDLER_URL=<YOUR_BUNDLER_URL>
BASE_SEPOLIA_PAYMASTER_URL=<YOUR_PAYMASTER_URL>
BASE_SEPOLIA_RPC=<YOUR_BASE_SEPOLIA_RPC>

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

You will get
```sh
#  Base Sepolia
Safe address: 0xb4407F7Fc369e77C8D2889D7085f4d790c2bDF7a , threshold :  2n , owners: [
  '0x529439479855D81E28aDb3a3704471545E14760b',
  '0x758350fad04225c8dF96aD2Ed234121938b35ECD'
]
Delay Module:  0xC6A9Dd6ab4643E6C8DFa7CB7DCAaeb451CC9f956
#  Arbitrum Sepolia
Safe address: 0xb4407F7Fc369e77C8D2889D7085f4d790c2bDF7a , threshold :  2n , owners: [
  '0x529439479855D81E28aDb3a3704471545E14760b',
  '0x758350fad04225c8dF96aD2Ed234121938b35ECD'
]
Delay Module:  0xC6A9Dd6ab4643E6C8DFa7CB7DCAaeb451CC9f956
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
