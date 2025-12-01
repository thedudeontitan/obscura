// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ObscuraPerpetualDEX is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    struct Position {
        address trader;
        uint256 size;
        uint256 margin;
        uint256 leverage;
        uint256 entryPrice;
        bool isLong;
        bool isOpen;
    }

    struct PriceData {
        bytes32 market;
        uint256 price;
        uint256 timestamp;
    }

    struct PositionVars {
        uint256 margin;
        uint256 fee;
        uint256 price;
        uint256 mntPrice;
    }

    // Constants
    uint256 public constant MAX_LEVERAGE = 10;
    uint256 public constant TRADING_FEE = 10; // 0.1% fee
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRICE_TIMEOUT = 60;

    // Market constants
    bytes32 public constant MNT_MARKET = "MNT";
    bytes32 public constant BTC_MARKET = "BTC";
    bytes32 public constant ETH_MARKET = "ETH";
    bytes32 public constant SOL_MARKET = "SOL";

    // State variables
    mapping(bytes32 => bool) public supportedMarkets;
    mapping(address => mapping(bytes32 => Position[])) public positions;

    // Collateral token (e.g., USDC from EscrowPool)
    IERC20 public collateralToken;

    event PositionOpened(
        address indexed trader,
        bytes32 indexed market,
        uint256 size,
        uint256 margin,
        uint256 leverage,
        bool isLong,
        uint256 entryPrice
    );

    event PositionClosed(
        address indexed trader,
        bytes32 indexed market,
        uint256 indexed positionId,
        uint256 pnl,
        uint256 exitPrice
    );

    constructor(address _collateralToken, address _owner) Ownable(_owner) {
        require(_collateralToken != address(0), "Invalid collateral token");
        collateralToken = IERC20(_collateralToken);

        supportedMarkets[ETH_MARKET] = true;
        supportedMarkets[BTC_MARKET] = true;
        supportedMarkets[SOL_MARKET] = true;
        supportedMarkets[MNT_MARKET] = true;
    }

    /**
     * @notice Updates the collateral token address
     * @param _collateralToken New collateral token address
     */
    function setCollateralToken(address _collateralToken) external onlyOwner {
        require(_collateralToken != address(0), "Invalid collateral token");
        collateralToken = IERC20(_collateralToken);
    }

    function _getPrice(
        bytes32 market,
        PriceData[] calldata priceData
    ) internal view returns (uint256) {
        for (uint i = 0; i < priceData.length; i++) {
            if (priceData[i].market == market) {
                require(
                    priceData[i].timestamp + PRICE_TIMEOUT >= block.timestamp,
                    "Price too old"
                );
                require(priceData[i].price > 0, "Invalid price");
                return priceData[i].price;
            }
        }
        revert("Price not found");
    }

    function openPosition(
        bytes32 market,
        uint256 size,
        uint256 leverage,
        bool isLong,
        PriceData[] calldata priceData,
        uint256 collateralAmount
    ) external nonReentrant {
        require(supportedMarkets[market], "Market not supported");
        require(leverage > 0 && leverage <= MAX_LEVERAGE, "Invalid leverage");

        require(collateralAmount > 0, "Invalid collateral amount");

        PositionVars memory vars;
        vars.price = _getPrice(market, priceData);

        // Calculate required margin and fees
        vars.margin = size / leverage; // Simplified: margin = position size / leverage
        vars.fee = (size * TRADING_FEE) / BASIS_POINTS; // Trading fee

        uint256 totalRequired = vars.margin + vars.fee;
        require(collateralAmount >= totalRequired, "Insufficient collateral");

        // Transfer collateral from user to contract
        collateralToken.safeTransferFrom(
            msg.sender,
            address(this),
            totalRequired
        );

        positions[msg.sender][market].push(
            Position({
                trader: msg.sender,
                size: size,
                margin: vars.margin,
                leverage: leverage,
                entryPrice: vars.price,
                isLong: isLong,
                isOpen: true
            })
        );

        emit PositionOpened(
            msg.sender,
            market,
            size,
            vars.margin,
            leverage,
            isLong,
            vars.price
        );

        // Return excess collateral if provided
        uint256 excess = collateralAmount - totalRequired;
        if (excess > 0) {
            collateralToken.safeTransfer(msg.sender, excess);
        }
    }

    function closePosition(
        bytes32 market,
        uint256 positionId,
        PriceData[] calldata priceData
    ) external nonReentrant {
        require(
            positionId < positions[msg.sender][market].length,
            "Invalid position"
        );
        Position storage position = positions[msg.sender][market][positionId];
        require(position.isOpen, "Position closed");
        require(position.trader == msg.sender, "Not owner");

        uint256 exitPrice = _getPrice(market, priceData);

        uint256 pnl = calculatePnL(position, exitPrice);
        uint256 returnAmount = position.margin + pnl;

        position.isOpen = false;

        // Transfer final settlement to trader
        if (returnAmount > 0) {
            collateralToken.safeTransfer(msg.sender, returnAmount);
        }

        emit PositionClosed(msg.sender, market, positionId, pnl, exitPrice);
    }

    function calculatePnL(
        Position memory position,
        uint256 currentPrice
    ) public pure returns (uint256) {
        if (position.isLong) {
            return
                currentPrice > position.entryPrice
                    ? (position.size * (currentPrice - position.entryPrice)) /
                        position.entryPrice /
                        position.leverage
                    : (position.size * (position.entryPrice - currentPrice)) /
                        position.entryPrice /
                        position.leverage;
        } else {
            return
                currentPrice < position.entryPrice
                    ? (position.size * (position.entryPrice - currentPrice)) /
                        position.entryPrice /
                        position.leverage
                    : (position.size * (currentPrice - position.entryPrice)) /
                        position.entryPrice /
                        position.leverage;
        }
    }

    /**
     * @notice Emergency withdraw function for owner
     * @param token Token to withdraw (use address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    receive() external payable {}
}
