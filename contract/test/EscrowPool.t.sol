// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {EscrowPool} from "../src/EscrowPool.sol";
import {MockERC20} from "./MockERC20.sol";

contract EscrowPoolTest is Test {
    EscrowPool internal escrow;
    MockERC20 internal token;

    address internal owner = address(0xA11CE);
    address internal user1 = address(0xBEEF);
    address internal user2 = address(0xCAFE);

    uint256 internal constant INITIAL_MINT = 1_000_000e18;

    // Mirror EscrowPool events for vm.expectEmit
    event Deposited(address indexed from, uint256 amount, uint256 depositId);
    event Withdrawn(address indexed to, uint256 amount, uint256 indexed depositId, bytes32 jobId);

    function setUp() public {
        vm.prank(owner);
        token = new MockERC20("MockToken", "MTK", 18);
        token.mint(user1, INITIAL_MINT);
        token.mint(user2, INITIAL_MINT);

        vm.prank(owner);
        escrow = new EscrowPool(owner, address(token));
    }

    // -----------------------
    // Helper functions
    // -----------------------

    function _depositFrom(address depositor, uint256 amount) internal returns (uint256 depositId) {
        vm.startPrank(depositor);
        token.approve(address(escrow), amount);
        escrow.deposit(amount);
        vm.stopPrank();

        depositId = escrow.nextDepositId() - 1;
    }

    // -----------------------
    // Unit tests
    // -----------------------

    function testDepositWorks() public {
        uint256 amount = 100e18;

        uint256 userBalanceBefore = token.balanceOf(user1);
        uint256 escrowBalanceBefore = token.balanceOf(address(escrow));

        vm.startPrank(user1);
        token.approve(address(escrow), amount);
        vm.expectEmit(true, false, false, true);
        emit Deposited(user1, amount, 1);
        escrow.deposit(amount);
        vm.stopPrank();

        uint256 userBalanceAfter = token.balanceOf(user1);
        uint256 escrowBalanceAfter = token.balanceOf(address(escrow));

        assertEq(userBalanceBefore - amount, userBalanceAfter, "User balance should decrease");
        assertEq(escrowBalanceBefore + amount, escrowBalanceAfter, "Escrow balance should increase");

        (address depositor, uint256 storedAmount, uint256 timestamp) = escrow.deposits(1);
        assertEq(depositor, user1, "Depositor mismatch");
        assertEq(storedAmount, amount, "Stored amount mismatch");
        assertGt(timestamp, 0, "Timestamp not set");
    }

    function testOperatorWithdrawWorks() public {
        uint256 amount = 200e18;
        uint256 depositId = _depositFrom(user1, amount);

        bytes32 jobId = keccak256("job-1");
        uint256 recipientBalanceBefore = token.balanceOf(user2);
        uint256 escrowBalanceBefore = token.balanceOf(address(escrow));

        vm.startPrank(owner);
        vm.expectEmit(true, false, true, true);
        emit Withdrawn(user2, amount, depositId, jobId);
        escrow.operatorWithdraw(user2, amount, depositId, jobId);
        vm.stopPrank();

        uint256 recipientBalanceAfter = token.balanceOf(user2);
        uint256 escrowBalanceAfter = token.balanceOf(address(escrow));

        assertEq(recipientBalanceBefore + amount, recipientBalanceAfter, "Recipient should receive amount");
        assertEq(escrowBalanceBefore - amount, escrowBalanceAfter, "Escrow balance should decrease");
        assertTrue(escrow.jobUsed(jobId), "JobId should be marked used");
    }

    function testOnlyOwnerCanWithdraw() public {
        uint256 amount = 50e18;
        uint256 depositId = _depositFrom(user1, amount);
        bytes32 jobId = keccak256("job-only-owner");

        vm.prank(user1);
        vm.expectRevert(); // onlyOwner revert
        escrow.operatorWithdraw(user2, amount, depositId, jobId);
    }

    function testCannotWithdrawToZeroAddress() public {
        uint256 amount = 100e18;
        uint256 depositId = _depositFrom(user1, amount);
        bytes32 jobId = keccak256("job-zero");

        vm.prank(owner);
        vm.expectRevert(bytes("EscrowPool: to is zero address"));
        escrow.operatorWithdraw(address(0), amount, depositId, jobId);
    }

    function testCantWithdrawMoreThanBalance() public {
        uint256 amount = 100e18;
        uint256 depositId = _depositFrom(user1, amount);
        bytes32 jobId = keccak256("job-too-much");

        vm.prank(owner);
        vm.expectRevert(bytes("EscrowPool: insufficient balance"));
        escrow.operatorWithdraw(user2, amount + 1, depositId, jobId);
    }

    function testReplayPrevention_jobIdAlreadyUsed() public {
        uint256 amount = 100e18;
        uint256 depositId = _depositFrom(user1, amount);
        bytes32 jobId = keccak256("job-replay");

        vm.startPrank(owner);
        escrow.operatorWithdraw(user2, amount, depositId, jobId);

        vm.expectRevert(bytes("EscrowPool: jobId already used"));
        escrow.operatorWithdraw(user2, amount, depositId, jobId);
        vm.stopPrank();
    }

    function testPauseStopsDeposit() public {
        vm.prank(owner);
        escrow.pause();

        vm.startPrank(user1);
        token.approve(address(escrow), 10e18);
        vm.expectRevert("Pausable: paused");
        escrow.deposit(10e18);
        vm.stopPrank();
    }

    function testPauseStopsWithdraw() public {
        uint256 amount = 100e18;
        uint256 depositId = _depositFrom(user1, amount);
        bytes32 jobId = keccak256("job-pause");

        vm.prank(owner);
        escrow.pause();

        vm.prank(owner);
        vm.expectRevert("Pausable: paused");
        escrow.operatorWithdraw(user2, amount, depositId, jobId);
    }

    // -----------------------
    // Fuzz tests
    // -----------------------

    function testFuzz_DepositAndWithdraw(uint256 amount) public {
        amount = bound(amount, 1e6, 1_000_000e18); // Avoid dust and overflow

        // Mint sufficient balance to a random user
        address depositor = address(0xDEAD);
        token.mint(depositor, amount);

        uint256 depositId;
        vm.startPrank(depositor);
        token.approve(address(escrow), amount);
        escrow.deposit(amount);
        vm.stopPrank();

        depositId = escrow.nextDepositId() - 1;

        bytes32 jobId = keccak256(abi.encodePacked("fuzz-withdraw", amount));

        vm.prank(owner);
        escrow.operatorWithdraw(user2, amount, depositId, jobId);

        assertEq(token.balanceOf(user2), amount, "Recipient should have withdrawn amount");
        assertTrue(escrow.jobUsed(jobId), "JobId should be marked used");
    }

    function testFuzz_RandomDepositAddresses(address depositor, uint256 amount) public {
        vm.assume(depositor != address(0));

        amount = bound(amount, 1e6, 1_000_000e18);

        token.mint(depositor, amount);

        vm.startPrank(depositor);
        token.approve(address(escrow), amount);
        escrow.deposit(amount);
        vm.stopPrank();

        uint256 depositId = escrow.nextDepositId() - 1;

        (address storedDepositor, uint256 storedAmount, ) = escrow.deposits(depositId);
        assertEq(storedDepositor, depositor, "Depositor mismatch");
        assertEq(storedAmount, amount, "Amount mismatch");
    }
}


