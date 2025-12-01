// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {EscrowPool} from "../src/EscrowPool.sol";

/**
 * @title TransferEscrowOwnership
 * @notice Foundry script to transfer ownership of an existing EscrowPool contract.
 *
 * @dev
 * Environment variables:
 *  - PRIVATE_KEY      : private key of the CURRENT owner of the EscrowPool
 *  - ESCROW_ADDRESS   : address of the deployed EscrowPool contract
 *  - NEW_OWNER        : address that should become the new owner/operator
 *
 * Example:
 *  export PRIVATE_KEY=<current_owner_private_key>
 *  export ESCROW_ADDRESS=0xb026b365D912DcaaFAf8faC3491DCABe61E52587
 *  export NEW_OWNER=0x1234567890abcdef1234567890abcdef12345678
 *
 *  forge script script/TransferEscrowOwnership.s.sol:TransferEscrowOwnership \
 *      --rpc-url $RPC_URL \
 *      --broadcast \
 *      --private-key $PRIVATE_KEY
 */
contract TransferEscrowOwnership is Script {
    function run() external {
        // Load configuration from environment variables
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_ADDRESS");
        address newOwner = vm.envAddress("NEW_OWNER");

        vm.startBroadcast(pk);

        EscrowPool escrow = EscrowPool(escrowAddress);

        // Log current owner for visibility
        address currentOwner = escrow.owner();
        console2.log("Current owner:", currentOwner);
        console2.log("Transferring ownership of EscrowPool at", escrowAddress, "to", newOwner);

        // This will revert if msg.sender (derived from PRIVATE_KEY) is not the current owner
        escrow.transferOwnership(newOwner);

        // Log the new owner to confirm
        console2.log("New owner:", escrow.owner());

        vm.stopBroadcast();
    }
}


