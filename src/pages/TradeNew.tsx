import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useBalance } from 'wagmi';
import TradingViewWidget from "../components/TradingViewWidget";
import EnhancedTradingPanel from "../components/EnhancedTradingPanel";
import EnhancedPositionsList from "../components/EnhancedPositionsList";
import EscrowUnlinkingPanel from "../components/EscrowUnlinkingPanel";
import Orderbook from "../components/Orderbook";
import MarketSelector from "../components/MarketSelector";
import { useOrderbook } from "../hooks/useOrderbook";
import { useEscrowUnlinker } from "../hooks/useEscrowUnlinker";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

interface SymbolData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
}

const symbolsData: Record<string, SymbolData> = {
  'BTC': { symbol: 'BTCUSD', price: 42500, change24h: 1250, changePercent24h: 3.02 },
  'ETH': { symbol: 'ETHUSD', price: 2500, change24h: -45, changePercent24h: -1.77 },
  'SOL': { symbol: 'SOLUSD', price: 95, change24h: 2.3, changePercent24h: 2.48 },
  'MNT': { symbol: 'MNTUSD', price: 0.85, change24h: 0.05, changePercent24h: 6.25 },
};

export default function TradeNew() {
  const { symbol: urlSymbol } = useParams();
  const symbol = urlSymbol?.toUpperCase() || 'BTC';

  const { authenticated } = usePrivy();
  const { address, isConnected: walletConnected } = useAccount();
  const { isWalletReady, unlinkedWallet } = useEscrowUnlinker();

  // Initialize orderbook
  const {
    orderbook,
    isLoading: orderbookLoading,
    error: orderbookError,
    isConnected: orderbookConnected,
  } = useOrderbook({ userAddress: address, symbol });

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: import.meta.env.VITE_USDC_TOKEN_ADDRESS as `0x${string}`,
  });

  const formatUsdcBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.00';
    return (Number(balance) / Math.pow(10, 6)).toFixed(2);
  };

  const symbolData = symbolsData[symbol] || symbolsData['BTC'];
  const tradingViewSymbol = `BINANCE:${symbolData.symbol}`;

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <motion.div
        className="h-[calc(100vh-5rem)]"
        initial="hidden"
        animate="show"
        variants={container}
      >
        {/* Header with symbol info */}
        <motion.div
          className="px-6 py-4 border-b border-gray-700"
          variants={item}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-6">
              {/* Market Selector */}
              <MarketSelector />

              {/* Symbol Info */}
              <div>
                <h1 className="text-2xl font-bold text-white">{symbol}/USD Perpetual</h1>
                <p className="text-gray-400 text-sm">Privacy-preserving trading on Base Sepolia</p>
              </div>

              {/* Price Info */}
              <div className="flex items-center space-x-6">
                <div>
                  <div className="text-2xl font-bold text-white">
                    ${symbolData.price.toLocaleString()}
                  </div>
                  <div className={`text-sm font-medium ${
                    symbolData.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {symbolData.changePercent24h >= 0 ? '+' : ''}{symbolData.change24h.toFixed(2)} ({symbolData.changePercent24h.toFixed(2)}%)
                  </div>
                </div>

                <div className="text-gray-400 text-sm space-y-1">
                  <div>24h High: ${(symbolData.price * 1.05).toFixed(2)}</div>
                  <div>24h Low: ${(symbolData.price * 0.95).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Account Summary */}
            {authenticated && walletConnected && (
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-gray-400 text-sm">USDC Balance</div>
                  <div className="text-white font-semibold">
                    {formatUsdcBalance(usdcBalance?.value)} USDC
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isWalletReady ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    isWalletReady ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {isWalletReady ? 'Privacy Mode' : 'Standard Mode'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Main trading interface */}
        <div className="flex h-[calc(100%-5rem)]">
          {/* Left side - Chart */}
          <motion.div
            className="flex-1 p-6"
            variants={item}
          >
            <TradingViewWidget
              symbol={tradingViewSymbol}
              onIntervalChange={(interval) => {
                console.log('Interval changed to:', interval);
              }}
            />
          </motion.div>

          {/* Right side - Trading panels */}
          <motion.div
            className="w-80 border-l border-gray-700 flex flex-col"
            variants={item}
          >
            {/* Trading Panel */}
            <div className="p-4 border-b border-gray-700">
              <EnhancedTradingPanel symbol={symbol} />
            </div>

            {/* Positions List */}
            <div className="flex-1 p-4 overflow-auto">
              <EnhancedPositionsList />
            </div>
          </motion.div>
        </div>

        {/* Bottom panels - only show when wallet is connected */}
        {authenticated && walletConnected && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700"
            variants={item}
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 max-h-96 overflow-auto">
              {/* Escrow Unlinking Panel */}
              <div>
                <EscrowUnlinkingPanel />
              </div>

              {/* Orderbook */}
              <div>
                <div className="bg-gray-800 rounded-lg">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Order Book</h3>
                  </div>
                  <div className="h-80">
                    <Orderbook
                      orderbook={orderbook}
                      isLoading={orderbookLoading}
                      isConnected={orderbookConnected}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Connection prompt */}
        {!authenticated || !walletConnected ? (
          <motion.div
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2"
            variants={item}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
              <p className="font-medium">Connect your wallet to start trading</p>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}