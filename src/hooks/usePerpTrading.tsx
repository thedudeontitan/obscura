import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { PerpDexService, Position, OpenPositionParams, ClosePositionParams } from '../services/perpDex';
import { useWalletManager } from './useWalletManager';

export interface TradingState {
  positions: Position[];
  isLoading: boolean;
  isTrading: boolean;
  error: string | null;
}

export interface UsePerpTradingReturn extends TradingState {
  openPosition: (params: Omit<OpenPositionParams, 'priceData'>) => Promise<void>;
  closePosition: (positionId: number, market: string) => Promise<void>;
  refreshPositions: () => Promise<void>;
  calculateRequirements: (size: string, leverage: number) => { margin: string; fee: string; total: string };
}

export function usePerpTrading(): UsePerpTradingReturn {
  const [state, setState] = useState<TradingState>({
    positions: [],
    isLoading: false,
    isTrading: false,
    error: null,
  });

  const { tradingAddress, perpService } = useWalletManager();

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const refreshPositions = useCallback(async () => {
    if (!tradingAddress || !perpService) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const positions = await perpService.getAllUserPositions(tradingAddress);
      setState(prev => ({ ...prev, positions, isLoading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch positions');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [tradingAddress, perpService, setError]);

  const calculateRequirements = useCallback((size: string, leverage: number) => {
    if (!perpService) {
      return { margin: '0', fee: '0', total: '0' };
    }
    return perpService.calculatePositionRequirements(size, leverage);
  }, [perpService]);

  // Mock price data generator (in production, fetch from oracle/API)
  const generatePriceData = useCallback((market: string, price: string) => {
    return [
      {
        market,
        price,
        timestamp: Math.floor(Date.now() / 1000),
      },
      // Add MNT price if needed (for contract compatibility)
      {
        market: 'MNT',
        price: '1.00', // Assume 1 USD for simplicity
        timestamp: Math.floor(Date.now() / 1000),
      },
    ];
  }, []);

  const openPosition = useCallback(async (params: Omit<OpenPositionParams, 'priceData'>) => {
    if (!perpService) {
      setError('Trading service not available. Please connect your wallet.');
      return;
    }

    setState(prev => ({ ...prev, isTrading: true, error: null }));

    try {
      // Generate mock price data (in production, fetch from price oracle)
      const currentPrice = '50000'; // Mock BTC price
      const priceData = generatePriceData(params.market, currentPrice);

      // Check trading requirements
      const userAddress = tradingAddress;
      if (!userAddress) {
        throw new Error('Trading wallet not available');
      }

      const requirements = await perpService.checkTradingRequirements(userAddress, params.collateralAmount);

      if (!requirements.hasBalance) {
        throw new Error('Insufficient USDC balance for trading');
      }

      if (!requirements.hasAllowance) {
        // Auto-approve if needed
        await perpService.approveCollateral(params.collateralAmount);
      }

      // Open position with price data
      const result = await perpService.openPosition({
        ...params,
        priceData,
      });

      console.log('Position opened:', result);

      // Refresh positions
      await refreshPositions();

      setState(prev => ({ ...prev, isTrading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to open position');
      setState(prev => ({ ...prev, isTrading: false }));
      throw error;
    }
  }, [perpService, tradingAddress, generatePriceData, refreshPositions, setError]);

  const closePosition = useCallback(async (positionId: number, market: string) => {
    if (!perpService) {
      setError('Trading service not available. Please connect your wallet.');
      return;
    }

    setState(prev => ({ ...prev, isTrading: true, error: null }));

    try {
      // Generate mock price data for closing
      const currentPrice = '51000'; // Mock current price
      const priceData = generatePriceData(market, currentPrice);

      const result = await perpService.closePosition({
        market,
        positionId,
        priceData,
      });

      console.log('Position closed:', result);

      // Refresh positions
      await refreshPositions();

      setState(prev => ({ ...prev, isTrading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to close position');
      setState(prev => ({ ...prev, isTrading: false }));
    }
  }, [perpService, generatePriceData, refreshPositions, setError]);

  // Auto-refresh positions when trading wallet becomes available
  useEffect(() => {
    if (tradingAddress && perpService) {
      refreshPositions();
    }
  }, [tradingAddress, perpService, refreshPositions]);

  // Set up position event listeners
  useEffect(() => {
    if (!perpService || !tradingAddress) {
      return;
    }

    const unsubscribeOpened = perpService.onPositionOpened((event) => {
      if (event.trader.toLowerCase() === tradingAddress.toLowerCase()) {
        console.log('Position opened event:', event);
        refreshPositions();
      }
    });

    const unsubscribeClosed = perpService.onPositionClosed((event) => {
      if (event.trader.toLowerCase() === tradingAddress.toLowerCase()) {
        console.log('Position closed event:', event);
        refreshPositions();
      }
    });

    return () => {
      unsubscribeOpened();
      unsubscribeClosed();
    };
  }, [perpService, tradingAddress, refreshPositions]);

  return {
    ...state,
    openPosition,
    closePosition,
    refreshPositions,
    calculateRequirements,
  };
}