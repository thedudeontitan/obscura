### Escrow scripts

This directory contains Foundry scripts to deploy and operate the `EscrowPool` contract.

All commands below assume:

- **Working directory**: `cd /Users/prakharojha/Desktop/me/personal/obscura/contract`
- **RPC URL env var**: `export RPC_URL=<your_rpc_url>`

---

### 1. Deploy the EscrowPool (`DeployEscrow.s.sol`)

- **Purpose**: Deploy a new `EscrowPool` and set the ERC20 token used for escrow.
- **Script**: `script/DeployEscrow.s.sol:DeployEscrow`

**Environment variables**

```bash
export PRIVATE_KEY=<deployer_private_key>          # becomes Escrow owner/operator
export TOKEN_ADDRESS=<erc20_token_address>        # e.g. USDC token
export APPROVE_AMOUNT=<amount_in_token_units>     # e.g. for USDC (6 decimals): 1000e6
export RPC_URL=<your_rpc_url>
```

**Command**

```bash
forge script script/DeployEscrow.s.sol:DeployEscrow \
  --rpc-url $RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The script will:

- Deploy `EscrowPool` with `msg.sender` as owner.
- Log the deployed escrow address.
- Approve `APPROVE_AMOUNT` of `TOKEN_ADDRESS` from the deployer to the escrow.

---

### 2. Approve tokens to the Escrow (`ApproveUSDC.s.sol`) (Optional)
 
- **Purpose**: Approve an ERC20 (e.g. USDC) from an EOA to the `EscrowPool`.
- **Script**: `script/ApproveUSDC.s.sol:ApproveUSDC`

**Environment variables**

```bash
export PRIVATE_KEY=<approver_private_key>         # account giving allowance
export TOKEN_ADDRESS=<erc20_token_address>        # token to approve (USDC, etc.)
export ESCROW_ADDRESS=<deployed_escrow_address>   # EscrowPool contract address
export APPROVE_AMOUNT=<amount_in_token_units>     # e.g. 1 USDC (6 decimals) = 1000000
export RPC_URL=<your_rpc_url>
```

**Command**

```bash
forge script script/ApproveUSDC.s.sol:ApproveUSDC \
  --rpc-url $RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The script will:

- Use the EOA from `PRIVATE_KEY` as `msg.sender`.
- Call `IERC20(TOKEN_ADDRESS).approve(ESCROW_ADDRESS, APPROVE_AMOUNT)`.

---

### 3. Transfer Escrow ownership (`TransferEscrowOwnership.s.sol`)

- **Purpose**: Change the owner/operator of an existing `EscrowPool`.
- **Script**: `script/TransferEscrowOwnership.s.sol:TransferEscrowOwnership`

**Environment variables**

```bash
export PRIVATE_KEY=<current_owner_private_key>    # must be current Escrow owner
export ESCROW_ADDRESS=<deployed_escrow_address>   # EscrowPool contract address
export NEW_OWNER=<new_owner_address>              # address that will become new owner
export RPC_URL=<your_rpc_url>
```

**Command**

```bash
forge script script/TransferEscrowOwnership.s.sol:TransferEscrowOwnership \
  --rpc-url $RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The script will:

- Log the current owner.
- Call `transferOwnership(NEW_OWNER)` on the `EscrowPool`.
- Log the new owner to confirm.

