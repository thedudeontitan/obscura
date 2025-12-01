/**
 * PerpDex Smart Contract Service
 * Handles perpetual trading operations
 */

import { ethers } from 'ethers';
import { PerpDexABI, ERC20ABI } from '../contracts/abis';
import { getCurrentNetworkConfig, MARKETS, marketToBytes32, TRADING_CONSTANTS } from '../contracts/config';

export interface Position {
  trader: string;
  size: string;
  margin: string;
  leverage: number;
  entryPrice: string;
  isLong: boolean;
  isOpen: boolean;
  positionId: number;
  market: string;
}

export interface PriceData {
  market: string;
  price: string;
  timestamp: number;
}

export interface OpenPositionParams {
  market: string;
  size: string;
  leverage: number;
  isLong: boolean;
  collateralAmount: string;
  priceData: PriceData[];
}

export interface ClosePositionParams {
  market: string;
  positionId: number;
  priceData: PriceData[];
}

export interface TradeResult {
  txHash: string;
  receipt: ethers.TransactionReceipt;
  positionId?: number;
  position?: Position;
}

export class PerpDexService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private perpContract: ethers.Contract;
  private tokenContract: ethers.Contract;
  private networkConfig = getCurrentNetworkConfig();

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;

    this.perpContract = new ethers.Contract(
      this.networkConfig.contracts.perpDex.address,
      PerpDexABI,
      signer || provider
    );

    this.tokenContract = new ethers.Contract(
      this.networkConfig.contracts.collateralToken.address,
      ERC20ABI,
      signer || provider
    );
  }

  /**
   * Get user positions for a specific market
   */
  async getUserPositions(userAddress: string, market: string): Promise<Position[]> {
    try {
      const marketBytes32 = marketToBytes32(market);
      const positions: Position[] = [];

      // Get positions by querying events or iterating through known positions
      // For simplicity, we'll try to get positions by index until we hit an error
      let positionId = 0;
      while (positionId < 100) { // Reasonable limit
        try {
          const position = await this.perpContract.positions(userAddress, marketBytes32, positionId);

          if (position.trader === ethers.ZeroAddress) {
            break; // No more positions
          }

          positions.push({
            trader: position.trader,
            size: position.size.toString(),
            margin: position.margin.toString(),
            leverage: Number(position.leverage),
            entryPrice: position.entryPrice.toString(),
            isLong: position.isLong,
            isOpen: position.isOpen,
            positionId,
            market,
          });

          positionId++;
        } catch {
          break; // No position at this index
        }
      }

      return positions.filter(p => p.isOpen);
    } catch (error) {
      console.error('Failed to get user positions:', error);
      throw new Error('Failed to fetch user positions');
    }
  }

  /**
   * Get all open positions for a user across all markets
   */
  async getAllUserPositions(userAddress: string): Promise<Position[]> {
    try {
      const allPositions: Position[] = [];
      const markets = Object.keys(MARKETS);

      for (const market of markets) {
        try {
          const positions = await this.getUserPositions(userAddress, market);
          allPositions.push(...positions);
        } catch (error) {
          console.error(`Failed to get positions for market ${market}:`, error);
        }
      }

      return allPositions;
    } catch (error) {
      console.error('Failed to get all user positions:', error);
      throw new Error('Failed to fetch all user positions');
    }
  }

  /**
   * Calculate position requirements (margin, fees)
   */
  calculatePositionRequirements(size: string, leverage: number): {
    margin: string;
    fee: string;
    total: string;
  } {
    const sizeNum = parseFloat(size);
    const margin = sizeNum / leverage;
    const fee = (sizeNum * TRADING_CONSTANTS.TRADING_FEE_BPS) / TRADING_CONSTANTS.BASIS_POINTS;
    const total = margin + fee;

    return {
      margin: margin.toString(),
      fee: fee.toString(),
      total: total.toString(),
    };
  }

  /**
   * Check token allowance and balance for trading
   */
  async checkTradingRequirements(userAddress: string, requiredAmount: string): Promise<{
    hasBalance: boolean;
    hasAllowance: boolean;
    balance: string;
    allowance: string;
    decimals: number;
  }> {
    try {
      const [balance, allowance, decimals] = await Promise.all([
        this.tokenContract.balanceOf(userAddress),
        this.tokenContract.allowance(userAddress, this.perpContract.target),
        this.tokenContract.decimals(),
      ]);

      const requiredWei = ethers.parseUnits(requiredAmount, decimals);

      return {
        hasBalance: balance >= requiredWei,
        hasAllowance: allowance >= requiredWei,
        balance: ethers.formatUnits(balance, decimals),
        allowance: ethers.formatUnits(allowance, decimals),
        decimals: Number(decimals),
      };
    } catch (error) {
      console.error('Failed to check trading requirements:', error);
      throw new Error('Failed to check trading requirements');
    }
  }

  /**
   * Approve tokens for trading
   */
  async approveCollateral(amount: string): Promise<ethers.TransactionReceipt> {
    if (!this.signer) {
      throw new Error('Signer required for approval');
    }

    try {
      const decimals = await this.tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);

      const tx = await this.tokenContract.approve(this.perpContract.target, amountWei);
      console.log('Approval transaction sent:', tx.hash);

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Approval transaction failed');
      }

      console.log('Collateral approved for trading');
      return receipt;
    } catch (error) {
      console.error('Failed to approve collateral:', error);
      throw new Error(`Failed to approve collateral: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Open a new position
   */
  async openPosition(params: OpenPositionParams): Promise<TradeResult> {
    if (!this.signer) {
      throw new Error('Signer required for opening position');
    }

    try {
      const marketBytes32 = marketToBytes32(params.market);
      const decimals = await this.tokenContract.decimals();
      const collateralWei = ethers.parseUnits(params.collateralAmount, decimals);

      // Format price data for contract
      const priceDataFormatted = params.priceData.map(pd => ({
        market: marketToBytes32(pd.market),
        price: ethers.parseUnits(pd.price, 8), // Prices are 8 decimals
        timestamp: pd.timestamp,
      }));

      // Check requirements
      const requirements = await this.checkTradingRequirements(
        await this.signer.getAddress(),
        params.collateralAmount
      );

      if (!requirements.hasBalance) {
        throw new Error('Insufficient collateral balance');
      }

      if (!requirements.hasAllowance) {
        throw new Error('Insufficient collateral allowance. Please approve tokens first.');
      }

      const sizeWei = ethers.parseUnits(params.size, 8);

      const tx = await this.perpContract.openPosition(
        marketBytes32,
        sizeWei,
        params.leverage,
        params.isLong,
        priceDataFormatted,
        collateralWei
      );

      console.log('Open position transaction sent:', tx.hash);

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Parse position opened event to get position ID
      const positionEvent = receipt.logs.find(log => {
        try {
          const parsed = this.perpContract.interface.parseLog(log);
          return parsed?.name === 'PositionOpened';
        } catch {
          return false;
        }
      });

      let positionId = 0;
      if (positionEvent) {
        // Position ID is typically the next available ID
        const userAddress = await this.signer.getAddress();
        const positions = await this.getUserPositions(userAddress, params.market);
        positionId = positions.length - 1; // Most recent position
      }

      console.log('Position opened successfully:', { positionId, market: params.market });

      return {
        txHash: tx.hash,
        receipt,
        positionId,
      };
    } catch (error) {
      console.error('Failed to open position:', error);
      throw new Error(`Failed to open position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close an existing position
   */
  async closePosition(params: ClosePositionParams): Promise<TradeResult> {
    if (!this.signer) {
      throw new Error('Signer required for closing position');
    }

    try {
      const marketBytes32 = marketToBytes32(params.market);

      // Format price data for contract
      const priceDataFormatted = params.priceData.map(pd => ({
        market: marketToBytes32(pd.market),
        price: ethers.parseUnits(pd.price, 8), // Prices are 8 decimals
        timestamp: pd.timestamp,
      }));

      const tx = await this.perpContract.closePosition(
        marketBytes32,
        params.positionId,
        priceDataFormatted
      );

      console.log('Close position transaction sent:', tx.hash);

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      console.log('Position closed successfully:', { positionId: params.positionId, market: params.market });

      return {
        txHash: tx.hash,
        receipt,
        positionId: params.positionId,
      };
    } catch (error) {
      console.error('Failed to close position:', error);
      throw new Error(`Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate PnL for a position
   */
  async calculatePnL(position: Position, currentPrice: string): Promise<string> {
    try {
      const positionStruct = {
        trader: position.trader,
        size: position.size,
        margin: position.margin,
        leverage: position.leverage,
        entryPrice: position.entryPrice,
        isLong: position.isLong,
        isOpen: position.isOpen,
      };

      const currentPriceWei = ethers.parseUnits(currentPrice, 8);
      const pnl = await this.perpContract.calculatePnL(positionStruct, currentPriceWei);

      return ethers.formatUnits(pnl, 8);
    } catch (error) {
      console.error('Failed to calculate PnL:', error);
      throw new Error('Failed to calculate PnL');
    }
  }

  /**
   * Check if a market is supported
   */
  async isMarketSupported(market: string): Promise<boolean> {
    try {
      const marketBytes32 = marketToBytes32(market);
      return await this.perpContract.supportedMarkets(marketBytes32);
    } catch (error) {
      console.error('Failed to check market support:', error);
      return false;
    }
  }

  /**
   * Get trading constants
   */
  async getTradingConstants(): Promise<{
    maxLeverage: number;
    tradingFee: number;
    basisPoints: number;
  }> {
    try {
      const [maxLeverage, tradingFee] = await Promise.all([
        this.perpContract.MAX_LEVERAGE(),
        this.perpContract.TRADING_FEE(),
      ]);

      return {
        maxLeverage: Number(maxLeverage),
        tradingFee: Number(tradingFee),
        basisPoints: TRADING_CONSTANTS.BASIS_POINTS,
      };
    } catch (error) {
      console.error('Failed to get trading constants:', error);
      return {
        maxLeverage: TRADING_CONSTANTS.MAX_LEVERAGE,
        tradingFee: TRADING_CONSTANTS.TRADING_FEE_BPS,
        basisPoints: TRADING_CONSTANTS.BASIS_POINTS,
      };
    }
  }

  /**
   * Listen for position events
   */
  onPositionOpened(callback: (event: any) => void): () => void {
    const filter = this.perpContract.filters.PositionOpened();

    const handleEvent = (trader: string, market: string, size: bigint, margin: bigint, leverage: bigint, isLong: boolean, entryPrice: bigint, event: any) => {
      callback({
        trader,
        market,
        size: size.toString(),
        margin: margin.toString(),
        leverage: Number(leverage),
        isLong,
        entryPrice: entryPrice.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    };

    this.perpContract.on(filter, handleEvent);

    return () => {
      this.perpContract.off(filter, handleEvent);
    };
  }

  /**
   * Listen for position closed events
   */
  onPositionClosed(callback: (event: any) => void): () => void {
    const filter = this.perpContract.filters.PositionClosed();

    const handleEvent = (trader: string, market: string, positionId: bigint, pnl: bigint, exitPrice: bigint, event: any) => {
      callback({
        trader,
        market,
        positionId: Number(positionId),
        pnl: pnl.toString(),
        exitPrice: exitPrice.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    };

    this.perpContract.on(filter, handleEvent);

    return () => {
      this.perpContract.off(filter, handleEvent);
    };
  }

  /**
   * Get contract addresses
   */
  getAddresses() {
    return {
      perpDex: this.perpContract.target,
      collateralToken: this.tokenContract.target,
    };
  }
}