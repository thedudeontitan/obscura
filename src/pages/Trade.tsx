import React from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useOrderbook } from "../hooks/useOrderbook";
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import TradingPanel from "../components/TradingPanel";
import Orderbook from "../components/Orderbook";
import PrivyWallet from "../components/PrivyWallet";
import EscrowUnlinkingPanel from "../components/EscrowUnlinkingPanel";
import PositionsList from "../components/PositionsList";

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

export default function Trade() {
  const { symbol } = useParams();

  // Get Privy authentication state
  const { authenticated } = usePrivy();
  const { address, isConnected: walletConnected } = useAccount();

  // Initialize orderbook with wallet address
  const {
    orderbook,
    isLoading,
    error,
    isConnected,
    placeOrder
  } = useOrderbook({ userAddress: address, symbol });

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <motion.div
        className="container mx-auto px-6 py-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Trading: {symbol || "Select Asset"}</h1>
          <p className="text-gray-400">
            {authenticated && walletConnected
              ? "Wallet connected - Ready for privacy-protected trading"
              : "Connect your wallet to start trading"
            }
          </p>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div variants={item} className="mb-6">
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Top Section - Chart and Wallet Management */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chart Section */}
            <motion.div variants={item} className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Chart</h2>
                <div className="h-96 bg-gray-700 rounded flex items-center justify-center">
                  <p className="text-gray-400">Trading chart placeholder</p>
                </div>
              </div>
            </motion.div>

            {/* Wallet Manager */}
            <motion.div variants={item}>
              <PrivyWallet />
            </motion.div>

            {/* Escrow Unlinking Panel */}
            <motion.div variants={item}>
              <EscrowUnlinkingPanel />
            </motion.div>
          </div>

          {/* Trading Section - Only show when wallet is connected */}
          {authenticated && walletConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trading Panel */}
              <motion.div variants={item}>
                <TradingPanel
                  onPlaceOrder={placeOrder}
                  isLoading={isLoading}
                  isConnected={isConnected}
                  symbol={symbol?.toUpperCase() || 'BTC'}
                />
              </motion.div>

              {/* Positions */}
              <motion.div variants={item}>
                <PositionsList />
              </motion.div>

              {/* Orderbook */}
              <motion.div variants={item}>
                <Orderbook
                  orderbook={orderbook}
                  isLoading={isLoading}
                  isConnected={isConnected}
                />
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}