import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import { usePerpTrading } from '../hooks/usePerpTrading';

const EnhancedPositionsList: React.FC = () => {
  const {
    positions,
    isLoading,
    closePosition,
    error,
  } = usePerpTrading();

  const formatPrice = (price: string) => {
    return parseFloat(price).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPnL = (pnl: number) => {
    const isProfit = pnl >= 0;
    return {
      value: Math.abs(pnl).toFixed(2),
      isProfit,
      className: isProfit ? 'text-green-400' : 'text-red-400'
    };
  };

  // Mock current prices for demo
  const getCurrentPrice = (market: string) => {
    const prices: Record<string, number> = {
      'BTC': 42500,
      'ETH': 2500,
      'SOL': 95,
      'MNT': 0.85
    };
    return prices[market] || 0;
  };

  if (isLoading && positions.length === 0) {
    return (
      <motion.div
        className="bg-gray-800 rounded-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Open Positions</h3>
        </div>
        <div className="p-6 text-center text-gray-400">Loading positions...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gray-800 rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Open Positions</h3>
          <span className="text-gray-400 text-sm">{positions.length} position{positions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-b border-gray-700">
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Positions List */}
      <div className="divide-y divide-gray-700">
        {positions.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <div className="mb-2">📈</div>
            <p className="font-medium mb-1">No open positions</p>
            <p className="text-sm">Open your first position using the trading panel</p>
          </div>
        ) : (
          positions.map((position, index) => {
            const currentPrice = getCurrentPrice(position.market);
            const entryPrice = parseFloat(position.entryPrice);
            const positionSize = parseFloat(position.size);
            const leverage = position.leverage;

            // Calculate P&L (simplified)
            const priceChange = currentPrice - entryPrice;
            const pnlPercentage = (priceChange / entryPrice) * 100;
            const pnlAmount = (positionSize * pnlPercentage * leverage) / 100;

            const adjustedPnL = position.isLong ? pnlAmount : -pnlAmount;
            const pnlFormatted = formatPnL(adjustedPnL);

            return (
              <motion.div
                key={`${position.market}-${position.positionId}-${index}`}
                className="p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Position Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {position.market.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">{position.market}/USD</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            position.isLong
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {position.isLong ? 'LONG' : 'SHORT'} {leverage}x
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        Position #{position.positionId}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => closePosition(position.positionId, position.market)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                    disabled={isLoading}
                  >
                    Close
                  </Button>
                </div>

                {/* Position Details Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 mb-1">Size</div>
                    <div className="text-white font-medium">${formatPrice(position.size)}</div>
                  </div>

                  <div>
                    <div className="text-gray-400 mb-1">Entry Price</div>
                    <div className="text-white font-medium">${formatPrice(position.entryPrice)}</div>
                  </div>

                  <div>
                    <div className="text-gray-400 mb-1">Current Price</div>
                    <div className="text-white font-medium">${currentPrice.toFixed(2)}</div>
                  </div>

                  <div>
                    <div className="text-gray-400 mb-1">Margin</div>
                    <div className="text-white font-medium">{formatPrice(position.margin)} USDC</div>
                  </div>
                </div>

                {/* P&L Section */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Unrealized P&L</div>
                        <div className={`font-semibold ${pnlFormatted.className}`}>
                          {pnlFormatted.isProfit ? '+' : '-'}${pnlFormatted.value} USDC
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">ROE</div>
                        <div className={`font-semibold ${pnlFormatted.className}`}>
                          {pnlFormatted.isProfit ? '+' : '-'}{Math.abs(pnlPercentage * leverage).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Price Change Indicator */}
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      priceChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {priceChange >= 0 ? '↗' : '↘'} {Math.abs(priceChange).toFixed(2)} ({Math.abs(pnlPercentage).toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Portfolio Summary */}
      {positions.length > 0 && (
        <div className="p-4 border-t border-gray-700 bg-gray-700/30">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Total Positions</div>
              <div className="text-white font-semibold">{positions.length}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Total Margin</div>
              <div className="text-white font-semibold">
                {positions.reduce((sum, pos) => sum + parseFloat(pos.margin), 0).toFixed(2)} USDC
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Total Size</div>
              <div className="text-white font-semibold">
                ${positions.reduce((sum, pos) => sum + parseFloat(pos.size), 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EnhancedPositionsList;