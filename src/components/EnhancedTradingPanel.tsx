import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useBalance } from 'wagmi';
import Button from './Button';
import { usePerpTrading } from '../hooks/usePerpTrading';
import { useEscrowUnlinker } from '../hooks/useEscrowUnlinker';

interface EnhancedTradingPanelProps {
  symbol?: string;
}

const EnhancedTradingPanel: React.FC<EnhancedTradingPanelProps> = ({
  symbol = 'BTC'
}) => {
  const { address } = useAccount();
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('100');
  const [leverage, setLeverage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const {
    positions,
    isTrading,
    error: tradingError,
    openPosition,
    calculateRequirements,
  } = usePerpTrading();

  const { isWalletReady, unlinkedWallet } = useEscrowUnlinker();

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: import.meta.env.VITE_USDC_TOKEN_ADDRESS as `0x${string}`,
  });

  const formatUsdcBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.00';
    return (Number(balance) / Math.pow(10, 6)).toFixed(2);
  };

  const requirements = amount ? calculateRequirements(amount, leverage) : { margin: '0', fee: '0', total: '0' };
  const totalRequired = parseFloat(requirements.total);
  const availableBalance = parseFloat(formatUsdcBalance(usdcBalance?.value));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid position size');
      return;
    }

    if (totalRequired > availableBalance) {
      alert(`Insufficient balance. Required: ${totalRequired.toFixed(2)} USDC, Available: ${availableBalance.toFixed(2)} USDC`);
      return;
    }

    setIsLoading(true);
    try {
      await openPosition({
        market: symbol,
        size: amount,
        leverage,
        isLong: orderType === 'BUY',
        collateralAmount: requirements.total,
      });

      // Reset form
      setAmount('100');
    } catch (error) {
      console.error('Failed to open position:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="bg-gray-800 rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Place Order</h3>
          {isWalletReady && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-xs font-medium">Privacy Mode</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Privacy Status */}
        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
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

        {/* Trading Error */}
        {tradingError && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{tradingError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType('BUY')}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                orderType === 'BUY'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Buy / Long
            </button>
            <button
              type="button"
              onClick={() => setOrderType('SELL')}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                orderType === 'SELL'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sell / Short
            </button>
          </div>

          {/* Position Size Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Position Size (USD)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                USD
              </div>
            </div>
          </div>

          {/* Leverage Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Leverage
              </label>
              <span className="text-white font-semibold">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1x</span>
              <span>5x</span>
              <span>10x</span>
            </div>
          </div>

          {/* Account Summary */}
          <div className="bg-gray-700 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium text-white mb-2">Account Summary</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Available Balance:</span>
                <span className="text-white">{availableBalance.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Margin Required:</span>
                <span className="text-white">{parseFloat(requirements.margin).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trading Fee:</span>
                <span className="text-white">{parseFloat(requirements.fee).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between border-t border-gray-600 pt-2">
                <span className="text-gray-400 font-medium">Total Required:</span>
                <span className={`font-semibold ${totalRequired > availableBalance ? 'text-red-400' : 'text-white'}`}>
                  {totalRequired.toFixed(2)} USDC
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || isTrading || totalRequired > availableBalance}
            className={`w-full py-4 font-semibold text-white rounded-lg transition-all ${
              orderType === 'BUY'
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50'
            }`}
          >
            {isLoading || isTrading ? 'Placing Order...' : (
              <>
                {isWalletReady && '🔒 '}
                {orderType === 'BUY' ? 'Buy' : 'Sell'} {symbol}
                {isWalletReady && ' (Private)'}
              </>
            )}
          </Button>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {['25', '50', '100', '250'].map(quickAmount => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount)}
                className="py-2 px-3 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                ${quickAmount}
              </button>
            ))}
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default EnhancedTradingPanel;