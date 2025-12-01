import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import { usePerpTrading } from '../hooks/usePerpTrading';

const PositionsList: React.FC = () => {
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

  if (isLoading && positions.length === 0) {
    return (
      <motion.div
        className="bg-gray-800 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Your Positions</h3>
        <div className="text-center text-gray-400">Loading positions...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gray-800 rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-white mb-4">Your Positions</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {positions.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <p>No open positions</p>
          <p className="text-sm mt-2">Open your first position using the trading panel</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((position, index) => (
            <div
              key={`${position.market}-${position.positionId}`}
              className="bg-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{position.market}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      position.isLong
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {position.isLong ? 'LONG' : 'SHORT'} {position.leverage}x
                  </span>
                </div>
                <Button
                  onClick={() => closePosition(position.positionId, position.market)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                  disabled={isLoading}
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Size</div>
                  <div className="text-white">${formatPrice(position.size)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Entry Price</div>
                  <div className="text-white">${formatPrice(position.entryPrice)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Margin</div>
                  <div className="text-white">{formatPrice(position.margin)} USDC</div>
                </div>
                <div>
                  <div className="text-gray-400">Current P&L</div>
                  <div className="text-gray-500">-</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PositionsList;