import React from 'react';
import { motion } from 'framer-motion';
import { OrderbookResponse } from '../services/orderbook';

interface OrderbookProps {
  orderbook: OrderbookResponse | null;
  isLoading: boolean;
  isConnected: boolean;
}

const Orderbook: React.FC<OrderbookProps> = ({ orderbook, isLoading, isConnected }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Order Book</h3>
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-400">Loading orderbook...</div>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  return (
    <motion.div
      className="bg-gray-800 rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Order Book</h3>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Sell Orders (Red) */}
        <div>
          <div className="text-xs text-gray-400 mb-2">SELL ORDERS</div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Price</span>
            <span>Amount</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {orderbook?.sellOrders.length ? (
              orderbook.sellOrders.slice(0, 10).map((order, index) => (
                <motion.div
                  key={order.id}
                  className="flex justify-between text-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="text-red-400">${formatPrice(order.price)}</span>
                  <span className="text-gray-300">{order.amount}</span>
                </motion.div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">No sell orders</div>
            )}
          </div>
        </div>

        {/* Spread */}
        <div className="border-t border-gray-700 pt-2">
          <div className="text-center text-xs text-gray-400">
            {orderbook?.sellOrders.length && orderbook?.buyOrders.length ? (
              <>
                Spread: $
                {formatPrice(
                  Math.abs(
                    orderbook.sellOrders[0].price - orderbook.buyOrders[0].price
                  )
                )}
              </>
            ) : (
              'No spread data'
            )}
          </div>
        </div>

        {/* Buy Orders (Green) */}
        <div>
          <div className="text-xs text-gray-400 mb-2">BUY ORDERS</div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Price</span>
            <span>Amount</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {orderbook?.buyOrders.length ? (
              orderbook.buyOrders.slice(0, 10).map((order, index) => (
                <motion.div
                  key={order.id}
                  className="flex justify-between text-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="text-green-400">${formatPrice(order.price)}</span>
                  <span className="text-gray-300">{order.amount}</span>
                </motion.div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">No buy orders</div>
            )}
          </div>
        </div>
      </div>

      {!orderbook && !isLoading && (
        <div className="text-center text-gray-500 mt-8">
          No orderbook data available
        </div>
      )}
    </motion.div>
  );
};

export default Orderbook;