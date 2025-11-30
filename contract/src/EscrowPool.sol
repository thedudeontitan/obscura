// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EscrowPool
 * @notice Token-based escrow pool used by a privacy-preserving unlinker system.
 *
 * @dev
 * - Accepts deposits from any sender for a configured ERC20 token.
 * - Stores deposits in a mapping keyed by a monotonically increasing depositId.
 * - Only the owner (operator) can withdraw funds from the pool.
 * - Withdrawals are protected against reentrancy and replay via jobId tracking.
 * - Contract can be paused/unpaused by the owner for emergency control.
 */
contract EscrowPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /**
     * @dev Structure representing a single deposit.
     *
     * @param depositor  Address that initiated the deposit.
     * @param amount     Amount of tokens deposited.
     * @param timestamp  Block timestamp when the deposit was recorded.
     */
    struct DepositRecord {
        address depositor;
        uint256 amount;
        uint256 timestamp;
    }

    /// @notice Mapping of depositId => DepositRecord.
    mapping(uint256 => DepositRecord) public deposits;

    /// @notice Next deposit id to be assigned. Starts at 1 for convenience.
    uint256 public nextDepositId = 1;

    /// @notice ERC20 token being escrowed.
    IERC20 public token;

    /// @notice Tracks if a given jobId has already been used in a withdrawal.
    mapping(bytes32 => bool) public jobUsed;

    /// @notice Emitted when a new deposit is made into the escrow.
    event Deposited(address indexed from, uint256 amount, uint256 depositId);

    /// @notice Emitted when the operator withdraws tokens from the escrow.
    event Withdrawn(address indexed to, uint256 amount, uint256 indexed depositId, bytes32 jobId);

    /**
     * @notice Constructor.
     * @param initialOwner Address that will be assigned as contract owner/operator.
     * @param tokenAddress Address of the ERC20 token to be escrowed (can be zero, then set later).
     */
    constructor(address initialOwner, address tokenAddress) Ownable(initialOwner) {
        if (tokenAddress != address(0)) {
            token = IERC20(tokenAddress);
        }
    }

    /**
     * @notice Sets or updates the ERC20 token used by this escrow pool.
     * @dev Only callable by the owner.
     *      Cannot set to the zero address.
     * @param tokenAddress Address of the new ERC20 token.
     */
    function setToken(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "EscrowPool: token is zero address");
        token = IERC20(tokenAddress);
    }

    /**
     * @notice Deposits a specified amount of tokens into the escrow pool.
     *
     * @dev
     * - Caller must have approved this contract to spend at least `amount` tokens.
     * - Records the deposit in `deposits` mapping keyed by `depositId`.
     * - Emits a {Deposited} event.
     *
     * @param amount Amount of tokens to deposit.
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(address(token) != address(0), "EscrowPool: token not set");
        require(amount > 0, "EscrowPool: amount is zero");

        uint256 depositId = nextDepositId;
        nextDepositId = depositId + 1;

        // Effects
        deposits[depositId] = DepositRecord({
            depositor: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        });

        // Interactions
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount, depositId);
    }

    /**
     * @notice Operator-only function to withdraw tokens from the contract to a recipient.
     *
     * @dev
     * - Only the owner/operator may call.
     * - Protected by nonReentrant and whenNotPaused.
     * - Prevents replay attacks by ensuring each `jobId` is only used once.
     * - Prevents sending more than the contract's token balance.
     *
     * @param to         Recipient address for withdrawn tokens.
     * @param amount     Amount of tokens to transfer.
     * @param depositId  Associated depositId for off-chain linking/auditing.
     * @param jobId      Unique job identifier (must not have been used before).
     */
    function operatorWithdraw(
        address to,
        uint256 amount,
        uint256 depositId,
        bytes32 jobId
    ) external onlyOwner nonReentrant whenNotPaused {
        require(address(token) != address(0), "EscrowPool: token not set");
        require(to != address(0), "EscrowPool: to is zero address");
        require(amount > 0, "EscrowPool: amount is zero");
        require(!jobUsed[jobId], "EscrowPool: jobId already used");

        uint256 balance = token.balanceOf(address(this));
        require(amount <= balance, "EscrowPool: insufficient balance");

        // Mark jobId as used BEFORE external call to prevent replay on reentrancy.
        jobUsed[jobId] = true;

        token.safeTransfer(to, amount);

        emit Withdrawn(to, amount, depositId, jobId);
    }

    /**
     * @notice Pause the contract, disabling deposits and withdrawals.
     * @dev Only callable by owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract, re-enabling deposits and withdrawals.
     * @dev Only callable by owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}


