import BigNumber from "bignumber.js";

// Pyth Network price feed IDs
enum PythID {
  BTCUSD = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETHUSD = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOLUSD = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  ALGOUSD = "0xfa17ceaf30d19ba51112fdcc750cc83454776f47fb0112e4af07f15f4bb1ebc0",
  MNTUSD = "0x9a6a7e44ec6c2fdc5e237b1cd53d2e75e4b3e3e9e4b3e3e9e4b3e3e9e4b3e3e9" // Placeholder for MNT
}

// CoinGecko API as backup
const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  MNT: 'mantle'
};

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h?: number;
  marketCap?: number;
  lastUpdate: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

type PriceUpdateCallback = (update: PriceUpdate) => void;

class PriceService {
  private priceCache = new Map<string, PriceData>();
  private subscribers = new Map<string, Set<PriceUpdateCallback>>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();
  private isStarted = false;

  /**
   * Get current price for a symbol using Pyth Network
   */
  async getSymbolPrice(symbol: string): Promise<number> {
    try {
      const pythID = PythID[symbol as keyof typeof PythID];

      if (!pythID) {
        // Fallback to CoinGecko for unsupported symbols
        return await this.getCoinGeckoPrice(symbol);
      }

      const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=${pythID}`);

      if (!res.ok) {
        throw new Error(`Pyth API error: ${res.status}`);
      }

      const data = await res.json();

      if (!data.parsed || data.parsed.length === 0) {
        throw new Error('No price data received from Pyth');
      }

      const priceRaw: string = data.parsed[0].price.price;
      const expo: number = data.parsed[0].price.expo;

      const price = new BigNumber(priceRaw);
      let finalPrice: BigNumber;

      if (expo >= 0) {
        finalPrice = price.multipliedBy(new BigNumber(10).pow(expo));
      } else {
        finalPrice = price.dividedBy(new BigNumber(10).pow(-expo));
      }

      return parseFloat(finalPrice.toFixed());
    } catch (error) {
      console.warn(`Error fetching Pyth price for ${symbol}, falling back to CoinGecko:`, error);
      return await this.getCoinGeckoPrice(symbol);
    }
  }

  /**
   * Fallback price fetching using CoinGecko API
   */
  async getCoinGeckoPrice(symbol: string): Promise<number> {
    try {
      const coinId = COINGECKO_IDS[symbol as keyof typeof COINGECKO_IDS];
      if (!coinId) {
        throw new Error(`Unsupported symbol: ${symbol}`);
      }

      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!res.ok) {
        throw new Error(`CoinGecko API error: ${res.status}`);
      }

      const data = await res.json();
      return data[coinId]?.usd || 0;
    } catch (error) {
      console.error(`Error fetching CoinGecko price for ${symbol}:`, error);
      // Return cached price or fallback
      return this.priceCache.get(symbol)?.price || this.getFallbackPrice(symbol);
    }
  }

  /**
   * Get detailed price data with 24h changes
   */
  async getPriceData(symbol: string): Promise<PriceData> {
    try {
      const coinId = COINGECKO_IDS[symbol as keyof typeof COINGECKO_IDS];
      if (!coinId) {
        throw new Error(`Unsupported symbol: ${symbol}`);
      }

      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      );

      if (!res.ok) {
        throw new Error(`CoinGecko API error: ${res.status}`);
      }

      const data = await res.json();
      const coinData = data[coinId];

      if (!coinData) {
        throw new Error(`No data for ${symbol}`);
      }

      const priceData: PriceData = {
        symbol,
        price: coinData.usd || 0,
        change24h: coinData.usd_24h_change || 0,
        changePercent24h: coinData.usd_24h_change || 0,
        volume24h: coinData.usd_24h_vol || 0,
        marketCap: coinData.usd_market_cap || 0,
        lastUpdate: Date.now()
      };

      // Cache the result
      this.priceCache.set(symbol, priceData);

      return priceData;
    } catch (error) {
      console.error(`Error fetching price data for ${symbol}:`, error);

      // Return cached data if available
      const cached = this.priceCache.get(symbol);
      if (cached) {
        return cached;
      }

      // Return fallback data
      return {
        symbol,
        price: this.getFallbackPrice(symbol),
        change24h: 0,
        changePercent24h: 0,
        lastUpdate: Date.now()
      };
    }
  }

  /**
   * Subscribe to real-time price updates for a symbol
   */
  subscribe(symbol: string, callback: PriceUpdateCallback): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }

    this.subscribers.get(symbol)!.add(callback);

    // Start updates for this symbol if not already started
    this.startPriceUpdates(symbol);

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);

        // Stop updates if no more subscribers
        if (symbolSubscribers.size === 0) {
          this.stopPriceUpdates(symbol);
        }
      }
    };
  }

  /**
   * Start real-time price updates for a symbol
   */
  private startPriceUpdates(symbol: string) {
    if (this.updateIntervals.has(symbol)) {
      return; // Already started
    }

    // Initial fetch
    this.fetchAndNotify(symbol);

    // Set up interval updates (every 5 seconds for real-time feel)
    const interval = setInterval(() => {
      this.fetchAndNotify(symbol);
    }, 5000);

    this.updateIntervals.set(symbol, interval);
  }

  /**
   * Stop price updates for a symbol
   */
  private stopPriceUpdates(symbol: string) {
    const interval = this.updateIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(interval);
    }
  }

  /**
   * Fetch price and notify subscribers
   */
  private async fetchAndNotify(symbol: string) {
    try {
      const price = await this.getSymbolPrice(symbol);
      const update: PriceUpdate = {
        symbol,
        price,
        timestamp: Date.now()
      };

      // Notify all subscribers
      const subscribers = this.subscribers.get(symbol);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in price update callback:', error);
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching price update for ${symbol}:`, error);
    }
  }

  /**
   * Get fallback price for offline scenarios
   */
  private getFallbackPrice(symbol: string): number {
    const fallbackPrices: Record<string, number> = {
      BTC: 42000,
      ETH: 2500,
      SOL: 95,
      MNT: 0.85
    };
    return fallbackPrices[symbol] || 1;
  }

  /**
   * Get multiple symbols at once
   */
  async getMultiplePrices(symbols: string[]): Promise<Record<string, PriceData>> {
    const promises = symbols.map(symbol =>
      this.getPriceData(symbol).then(data => [symbol, data] as const)
    );

    const results = await Promise.allSettled(promises);
    const priceMap: Record<string, PriceData> = {};

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const [symbol, data] = result.value;
        priceMap[symbol] = data;
      } else {
        const symbol = symbols[index];
        console.error(`Failed to fetch price for ${symbol}:`, result.reason);
        // Add fallback data
        priceMap[symbol] = {
          symbol,
          price: this.getFallbackPrice(symbol),
          change24h: 0,
          changePercent24h: 0,
          lastUpdate: Date.now()
        };
      }
    });

    return priceMap;
  }

  /**
   * Cleanup all subscriptions and intervals
   */
  cleanup() {
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    this.subscribers.clear();
    this.priceCache.clear();
  }
}

// Export singleton instance
export const priceService = new PriceService();