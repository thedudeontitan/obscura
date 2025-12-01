// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {EscrowPool} from "../src/EscrowPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployEscrow
 * @notice Foundry script to deploy the EscrowPool contract.
 *
 * @dev
 * Usage example:
 *  - Set environment variables:
 *      export PRIVATE_KEY=<deployer_private_key>
 *      export TOKEN_ADDRESS=<erc20_token_address>
 *      export APPROVE_AMOUNT=<amount_in_token_units>   # e.g. for USDC (6 decimals): 1000e6
 *  - Run:
 *      forge script script/DeployEscrow.s.sol:DeployEscrow \
 *          --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
 *
 * The deployer (msg.sender during broadcast) becomes the owner/operator.
 */
contract DeployEscrow is Script {
    function run() external {
        // Load deployer private key and token address from environment.
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");

        vm.startBroadcast(deployerKey);

        // msg.sender during broadcast becomes the owner.
        EscrowPool escrow = new EscrowPool(msg.sender, tokenAddress);

        console2.log("EscrowPool deployed at:", address(escrow));
        console2.log("Owner (operator):", msg.sender);
        console2.log("Token:", tokenAddress);

        // Automatically approve the escrow to spend some amount of the deployer's tokens.
        // This makes it easy to immediately call deposit() using the deployer as the first user.
        uint256 approveAmount = vm.envUint("APPROVE_AMOUNT");
        IERC20 token = IERC20(tokenAddress);
        token.approve(address(escrow), approveAmount);
        console2.log("Approved EscrowPool to spend", approveAmount, "tokens from deployer");

        /**
         * Example usage (commented out so script is safe to run on live networks):
         *
         * IERC20 token = IERC20(tokenAddress);
         * uint256 exampleAmount = 1e6; // adjust based on token decimals
         *
         * // Deployer approves escrow to pull tokens
         * token.approve(address(escrow), exampleAmount);
         *
         * // User (here deployer) deposits tokens into the escrow
         * escrow.deposit(exampleAmount);
         *
         * // Operator (owner) withdraws tokens to a recipient
         * address recipient = 0x000000000000000000000000000000000000dEaD;
         * uint256 depositId = 1;
         * bytes32 jobId = keccak256("example-job-id");
         * escrow.operatorWithdraw(recipient, exampleAmount, depositId, jobId);
         */

        vm.stopBroadcast();
    }
}


