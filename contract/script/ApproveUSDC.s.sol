// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ApproveUSDC
 * @notice Foundry script to approve USDC (or any ERC20) from an EOA to the EscrowPool contract.
 *
 * @dev
 * Environment variables:
 *  - PRIVATE_KEY      : private key of the account that will approve the tokens
 *  - USDC_ADDRESS     : address of the USDC (or ERC20) token contract
 *  - ESCROW_ADDRESS   : address of the deployed EscrowPool contract
 *  - APPROVE_AMOUNT   : amount in token's smallest units (e.g. for USDC with 6 decimals, 1 USDC = 1_000_000)
 *
 * Example (using your escrow address):
 *  export PRIVATE_KEY=<your_private_key>
 *  export USDC_ADDRESS=<usdc_testnet_address>
 *  export ESCROW_ADDRESS=0xb026b365D912DcaaFAf8faC3491DCABe61E52587
 *  export APPROVE_AMOUNT=1000000   # 1 USDC (6 decimals)
 *
 *  forge script script/ApproveUSDC.s.sol:ApproveUSDC \
 *      --rpc-url $RPC_URL \
 *      --broadcast \
 *      --private-key $PRIVATE_KEY
 */
contract ApproveUSDC is Script {
    function run() external {
        // Load configuration from environment variables
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("TOKEN_ADDRESS");
        address escrow = vm.envAddress("ESCROW_ADDRESS");
        uint256 amount = vm.envUint("APPROVE_AMOUNT");

        vm.startBroadcast(pk);

        // msg.sender during broadcast is the EOA derived from PRIVATE_KEY
        IERC20(usdc).approve(escrow, amount);

        vm.stopBroadcast();
    }
}


