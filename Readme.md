### Obscura: Privacy-Preserving Unlinker for Perp Trading

Obscura is a privacy layer that sits between a user’s funding wallet and a perpetuals trading account.  
It uses an on-chain ERC20 escrow pool plus an unlinker backend to break the visible link between deposits and the wallet that actually trades.

---

### TL;DR

- **Goal**: Let users fund a perp DEX account without exposing which EOA funded which trading wallet on-chain.  
- **How**: Users deposit into a shared ERC20 escrow; an unlinker service generates fresh wallets inside a simulated TEE, then withdraws to them with randomized timing and amounts.  
- **Result**: The trading wallet looks like just another address funded from a pool, not obviously tied to the depositor.

---

### Problem

Perp DEX users typically fund their trading accounts from their main wallet.  
On-chain, this creates an obvious link between identity-bearing EOAs and the wallets that hold open positions, balances, and liquidations.

---

### Solution

Obscura inserts a narrow, auditable unlinking layer between user deposits and trading accounts:

- **Escrow contract** on Base Sepolia accepts ERC20 deposits and exposes an operator-only `operatorWithdraw` function.
- **Unlinker backend** listens for `Deposited` events, matches them to user sessions, and schedules delayed withdrawals.
- **TEE simulator** generates new private keys inside a simulated trusted environment, encrypts them for the user, and returns a simple attestation report.
- **Jittered withdrawals**: amount and timing are slightly randomized to avoid easy one-to-one matching of deposits and withdrawals.
- **Frontend** (Ouro Finance UI) represents the perp trading app this unlinker is meant to feed.

---

### How It Works (End-to-End Flow)

1. **Request unlinker wallet**  
   - User signs a message with their main EOA and calls `POST /api/request-wallet`.  
   - Backend verifies the signature, creates a session, and asks the TEE simulator to generate a fresh unlinker address.  
   - Backend optionally pre-funds the new address with a small amount of gas.

2. **User deposits to escrow**  
   - User approves and calls `deposit(amount)` on `EscrowPool`, sending USDC (or another ERC20) from their main wallet.

3. **Backend detects deposit**  
   - `escrowListener` watches `Deposited` events.  
   - When a deposit matches a session (address + amount within tolerance), the session is marked as funded and a withdrawal job is enqueued.

4. **Jittered withdrawal**  
   - A Redis-backed batch processor waits a random delay, slightly jitters the withdrawal amount, and calls `operatorWithdraw` to the unlinker address.

5. **User claims unlinker wallet**  
   - Via `GET /api/claim-wallet`, the user retrieves the unlinker address, encrypted private key blob, and attestation report.  
   - They can now import or use this wallet as their trading account without an obvious on-chain link to the funding EOA.

---

### Components

- **Smart contract (`EscrowPool.sol`)**
  - Token-agnostic ERC20 escrow pool (Ownable, Pausable, ReentrancyGuard).
  - Sequential `depositId`, `Deposited` and `Withdrawn` events, replay-protected `operatorWithdraw` via `jobId`.

- **Backend (`server/`)**
  - Node, Express, Ethers, Redis, Winston.
  - Routes:
    - `POST /api/request-wallet` – create or reuse an unlinker wallet for a user.
    - `GET /api/status` – check session state (without exposing the key).
    - `GET /api/claim-wallet` – return unlinker address, encrypted key, and attestation.
  - Background workers:
    - `watchDeposits` – listens to escrow events, matches deposits to sessions.
    - `batchProcessor` – jittered, batched withdrawals via `sendFundsToNewAddress`.

- **TEE simulator (`server/src/tee/tee.js`)**
  - Generates Ethereum private keys in-process.
  - Returns:
    - `encryptedKeyForUser` (AES-256-GCM, ephemeral key),
    - `attestationReport` (JSON),
    - `newAddress`,
    - opaque `keyRef` for internal signing.

- **Frontend (`src/`)**
  - React, TypeScript, Vite, Tailwind.
  - “Ouro Finance” perp-trading UI that this unlinker layer is designed to serve.

---

### Tech Stack

- **Smart contracts**: Solidity, Foundry, OpenZeppelin  
- **Backend**: Node.js, Express, Ethers v6, Redis, Winston  
- **Frontend**: React 18, React Router, Tailwind, Framer Motion  
- **Chain**: Base Sepolia (escrow and gas funding in the current deployment)

---

### Running Locally (Minimal Flow)

- **Prerequisites**
  - Node 20+, pnpm, Redis, Foundry, and a Base Sepolia RPC URL with a funded operator key.

- **1. Deploy escrow contract**

```bash
cd contract
# Configure env vars
export PRIVATE_KEY=<deployer_pk>
export TOKEN_ADDRESS=<erc20_token_address>
export APPROVE_AMOUNT=<amount_in_token_units>
export RPC_URL=<base_sepolia_rpc>

forge script script/DeployEscrow.s.sol:DeployEscrow \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
```

- **2. Configure backend**

Create `server/.env`:

```bash
CHAIN_RPC=<base_sepolia_rpc>
ESCROW_CONTRACT_ADDRESS=<deployed_escrow_address>
OPERATOR_PRIVATE_KEY=<same_pk_or_dedicated_operator_pk>
REDIS_URL=redis://127.0.0.1:6379
```

- **3. Start services**

```bash
# Start Redis separately, then:
cd server
pnpm install
pnpm start
```

Optional end-to-end script:

```bash
cd server
node test-escrow-flow.js
```

- **4. Run frontend**

```bash
cd ..
pnpm install
pnpm dev
```

---

### Hackathon Scope

For this hackathon submission, the focus is on the unlinking layer: the `EscrowPool` contract, the event-driven unlinker backend, the TEE simulation and attestation flow, and an example perp trading UI that this privacy layer can sit in front of.

