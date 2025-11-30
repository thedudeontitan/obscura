import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getSymbolPrice } from "../utils/GetSymbolPrice";

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

const marketCard = {
  hidden: { scale: 0.8, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
  sparklineData: number[];
  category: string;
}

const initialMarkets: Omit<MarketData, 'price'>[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    change24h: -3.83,
    icon: "/eth.png",
    sparklineData: [4200, 4150, 4100, 4050, 4000, 4020, 4071],
    category: "L1/L2"
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    change24h: -1.65,
    icon: "/btc.png",
    sparklineData: [115000, 114500, 114000, 113800, 113500, 113600, 113651],
    category: "L1/L2"
  },
  {
    symbol: "SOL",
    name: "Solana",
    change24h: -2.67,
    icon: "/sol.png",
    sparklineData: [205, 203, 201, 199, 197, 198, 198.86],
    category: "L1/L2"
  },
];

const categories = ["All", "AI", "Meme", "L1/L2", "Forex", "Metals"];

const MiniChart = ({ data, isPositive }: { data: number[], isPositive: boolean }) => {
  const width = 100;
  const height = 40;
  const padding = 5;

  if (!data || data.length < 2) return <div className="w-[100px] h-[40px]" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = padding + ((max - value) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#a3be8c' : '#bf616a'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function Markets() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true);
      try {
        const marketsWithPrices = await Promise.all(
          initialMarkets.map(async (market) => {
            try {
              const price = await getSymbolPrice(`${market.symbol}USD`);
              return { ...market, price };
            } catch (error) {
              console.error(`Failed to fetch price for ${market.symbol}:`, error);
              return { ...market, price: 0 };
            }
          })
        );
        setMarkets(marketsWithPrices);
      } catch (error) {
        console.error("Error fetching market prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredMarkets(markets);
    } else {
      setFilteredMarkets(markets.filter(market => market.category === selectedCategory));
    }
  }, [selectedCategory, markets]);

  const handleMarketClick = (symbol: string) => {
    navigate(`/trade/${symbol}USD`);
  };

  return (
    <motion.div
      className="min-h-screen pt-20"
      style={{
        backgroundColor: '#242931',
        color: '#eceff4'
      }}
      initial="hidden"
      animate="show"
      variants={container}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div className="mb-8" variants={item}>
          <h1 className="text-4xl font-bold mb-2">Discover</h1>
        </motion.div>

        {/* Category Filters */}
        <motion.div className="flex items-center space-x-6 mb-8" variants={item}>
          <motion.div
            className="flex items-center space-x-1"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <span className="text-lg">⭐</span>
          </motion.div>
          {categories.map((category, index) => (
            <motion.button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? 'text-white'
                  : 'hover:opacity-80'
              }`}
              style={{
                color: selectedCategory === category
                  ? '#eceff4'
                  : '#d8dee9',
                backgroundColor: selectedCategory === category
                  ? '#3b4252'
                  : 'transparent'
              }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {category}
            </motion.button>
          ))}
        </motion.div>

        {/* Market Table */}
        <motion.div
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: '#242931',
            border: '1px solid #434c5e'
          }}
          variants={item}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Table Header */}
          <motion.div
            className="grid grid-cols-4 px-6 py-4 border-b"
            style={{
              borderColor: '#434c5e'
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-sm font-medium" style={{
              color: '#d8dee9'
            }}>
              Market
            </div>
            <div className="text-sm font-medium text-right" style={{
              color: '#d8dee9'
            }}>
              Price
            </div>
            <div className="text-sm font-medium text-right" style={{
              color: '#d8dee9'
            }}>
              24h Change
            </div>
            <div className="text-sm font-medium text-right" style={{
              color: '#d8dee9'
            }}>
              Last 24h
            </div>
          </motion.div>

          {/* Market Rows */}
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-lg" style={{ color: '#d8dee9' }}>
                  Loading market data...
                </div>
              </div>
            ) : filteredMarkets.map((market, index) => (
              <motion.div
                key={market.symbol}
                onClick={() => handleMarketClick(market.symbol)}
                className="grid grid-cols-4 px-6 py-4 cursor-pointer transition-colors hover:opacity-80 border-b"
                style={{
                  borderColor: '#4c566a'
                }}
                variants={marketCard}
                initial="hidden"
                animate="show"
                transition={{ delay: index * 0.1 }}
                whileHover={{
                  scale: 1.02,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Market Info */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{
                    backgroundColor: '#3b4252'
                  }}>
                    {market.icon.startsWith('/') ? (
                      <img src={market.icon} alt={market.name} className="w-6 h-6" />
                    ) : (
                      market.icon
                    )}
                  </div>
                  <div>
                    <div className="font-semibold" style={{
                      color: '#eceff4'
                    }}>
                      {market.symbol}
                    </div>
                    <div className="text-sm" style={{
                      color: '#d8dee9'
                    }}>
                      {market.name}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right font-medium" style={{
                  color: '#eceff4'
                }}>
                  ${market.price.toLocaleString(undefined, {
                    minimumFractionDigits: market.price < 1 ? 6 : 2,
                    maximumFractionDigits: market.price < 1 ? 8 : 2
                  })}
                </div>

                {/* 24h Change */}
                <div className="text-right font-medium" style={{
                  color: market.change24h >= 0
                    ? '#a3be8c'
                    : '#bf616a'
                }}>
                  {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                </div>

                {/* Mini Chart */}
                <div className="flex justify-end">
                  <MiniChart
                    data={market.sparklineData}
                    isPositive={market.change24h >= 0}
                  />
                </div>
              </motion.div>
            ))}
            {!loading && filteredMarkets.length === 0 && (
              <div className="flex justify-center items-center py-12">
                <div className="text-lg" style={{ color: '#d8dee9' }}>
                  No markets found for this category
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          className="mt-8 text-center"
          variants={item}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <p className="text-sm" style={{
            color: '#d8dee9'
          }}>
            Real-time market data • Updated every second
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}