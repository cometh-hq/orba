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







