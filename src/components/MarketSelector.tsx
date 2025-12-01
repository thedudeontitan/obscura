import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';

interface Market {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: string;
}

const markets: Market[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 42500, change24h: 3.02, volume24h: '$2.8B' },
  { symbol: 'ETH', name: 'Ethereum', price: 2500, change24h: -1.77, volume24h: '$1.2B' },
  { symbol: 'SOL', name: 'Solana', price: 95, change24h: 2.48, volume24h: '$456M' },
  { symbol: 'MNT', name: 'Mantle', price: 0.85, change24h: 6.25, volume24h: '$89M' },
];

const MarketSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { symbol: urlSymbol } = useParams();
  const currentSymbol = urlSymbol?.toUpperCase() || 'BTC';

  const currentMarket = markets.find(m => m.symbol === currentSymbol) || markets[0];

  const handleMarketSelect = (symbol: string) => {
    navigate(`/trade/${symbol.toLowerCase()}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Market Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-xs">{currentMarket.symbol}</span>
        </div>
        <div className="text-left">
          <div className="text-white font-semibold text-sm">{currentMarket.symbol}/USD</div>
          <div className={`text-xs ${currentMarket.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {currentMarket.change24h >= 0 ? '+' : ''}{currentMarket.change24h.toFixed(2)}%
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              className="absolute top-full left-0 mt-1 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="p-2">
                <div className="text-gray-400 text-xs font-medium uppercase tracking-wide px-3 py-2">
                  Markets
                </div>
                {markets.map((market, index) => (
                  <motion.button
                    key={market.symbol}
                    onClick={() => handleMarketSelect(market.symbol)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      market.symbol === currentSymbol
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'hover:bg-gray-700'
                    }`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{market.symbol}</span>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium text-sm">{market.symbol}/USD</div>
                        <div className="text-gray-400 text-xs">{market.name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-white font-medium text-sm">
                        ${market.price.toLocaleString()}
                      </div>
                      <div className={`text-xs ${market.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-700 p-3">
                <div className="text-center">
                  <button
                    onClick={() => {
                      navigate('/markets');
                      setIsOpen(false);
                    }}
                    className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                  >
                    View All Markets →
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketSelector;