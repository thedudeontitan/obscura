import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import { usePerpTrading } from '../hooks/usePerpTrading';
import { useEscrowUnlinker } from '../hooks/useEscrowUnlinker';

interface TradingPanelProps {
  onPlaceOrder?: (order: {
    type: 'buy' | 'sell';
    price: number;
    amount: number;
  }) => Promise<void>;
  isLoading?: boolean;
  isConnected: boolean;
  symbol?: string;
}

const TradingPanel: React.FC<TradingPanelProps> = ({
  onPlaceOrder,
  isLoading: externalLoading,
  isConnected,
  symbol = 'BTC'
}) => {
  const {
    positions,
    isTrading,
    error: tradingError,
    openPosition,
    closePosition,
    calculateRequirements,
  } = usePerpTrading();

  const { isWalletReady, unlinkedWallet, getUnlinkedSigner } = useEscrowUnlinker();
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [orderMode, setOrderMode] = useState<'limit' | 'market'>('limit');

  const isLoading = externalLoading || isTrading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount) {
      alert('Please enter position size');
      return;
    }

    if (orderMode === 'limit' && !price) {
      alert('Please enter price for limit order');
      return;
    }

    const amountNum = parseFloat(amount);
    const priceNum = orderMode === 'market' ? 50000 : parseFloat(price); // Use mock price for market orders

    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter valid position size');
      return;
    }

    if (orderMode === 'limit' && (isNaN(priceNum) || priceNum <= 0)) {
      alert('Please enter valid price');
      return;
    }

    try {
      // Calculate collateral requirements
      const requirements = calculateRequirements(amount, leverage);

      // Open position on smart contract
      await openPosition({
        market: symbol,
        size: amount,
        leverage,
        isLong: orderType === 'buy',
        collateralAmount: requirements.total,
      });

      // Also call legacy callback if provided
      if (onPlaceOrder) {
        await onPlaceOrder({
          type: orderType,
          price: priceNum,
          amount: amountNum
        });
      }

      // Clear form on success
      setPrice('');
      setAmount('');
    } catch (error) {
      console.error('Failed to place order:', error);
    }
  };

  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : '0.00';

  // Calculate position requirements
  const requirements = amount ? calculateRequirements(amount, leverage) : { margin: '0', fee: '0', total: '0' };

  return (
    <motion.div
      className="bg-gray-800 rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Place Order</h3>
        {isWalletReady && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-green-400 text-xs font-medium">Privacy Mode</span>
          </div>
        )}
      </div>

      {/* Privacy Status */}
      <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
        <div className="flex items-center space-x-2">
          <span className="text-blue-300 text-sm font-medium">
            {isWalletReady ? '🔒 Using unlinked wallet' : '👤 Using connected wallet'}
          </span>
        </div>
        <p className="text-blue-200 text-xs mt-1">
          {isWalletReady
            ? `Trading anonymously from: ${unlinkedWallet?.address?.slice(0, 6)}...${unlinkedWallet?.address?.slice(-4)}`
            : 'Your trades will be linked to your connected wallet'
          }
        </p>
      </div>

      {!isConnected && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-400 text-sm">
            Orderbook disconnected. Orders may not be processed immediately.
          </p>
        </div>
      )}

      {/* Trading Error */}
      {tradingError && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{tradingError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Type Tabs */}
        <div className="flex rounded-lg bg-gray-700 p-1">
          <button
            type="button"
            onClick={() => setOrderType('buy')}
            className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
              orderType === 'buy'
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setOrderType('sell')}
            className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
              orderType === 'sell'
                ? 'bg-red-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Order Mode Tabs */}
        <div className="flex rounded-lg bg-gray-700 p-1">
          <button
            type="button"
            onClick={() => setOrderMode('limit')}
            className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
              orderMode === 'limit'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('market')}
            className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
              orderMode === 'market'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Market
          </button>
        </div>

        {/* Price Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Price (USD)
          </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            disabled={orderMode === 'market'}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            required
          />
          {orderMode === 'market' && (
            <p className="text-xs text-gray-400 mt-1">Market orders execute at current market price</p>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Position Size (USD)
          </label>
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.000"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Leverage Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Leverage: {leverage}x
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1x</span>
            <span>5x</span>
            <span>10x</span>
          </div>
        </div>

        {/* Position Requirements */}
        <div className="p-3 bg-gray-700 rounded-md space-y-2">
          <h4 className="text-sm font-medium text-white">Position Requirements</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Margin Required:</span>
              <span className="text-white">{parseFloat(requirements.margin).toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Trading Fee:</span>
              <span className="text-white">{parseFloat(requirements.fee).toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between border-t border-gray-600 pt-1">
              <span className="text-gray-400">Total Required:</span>
              <span className="text-white font-medium">{parseFloat(requirements.total).toFixed(2)} USDC</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className={`w-full ${
            orderType === 'buy'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } text-white font-medium py-3 rounded-lg transition-colors`}
          disabled={isLoading || !isConnected}
        >
          {isLoading ? 'Placing Order...' : (
            <>
              {isWalletReady && '🔒 '}
              {`${orderType === 'buy' ? 'Buy' : 'Sell'} ${orderMode === 'limit' ? 'Limit' : 'Market'}`}
              {isWalletReady && ' (Private)'}
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
};

export default TradingPanel;