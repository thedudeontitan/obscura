/**
 * Contract Configuration for Obscura Platform
 */

export interface ContractConfig {
  address: string;
  deploymentBlock?: number;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: {
    escrowPool: ContractConfig;
    perpDex: ContractConfig;
    collateralToken: ContractConfig; // USDC or other ERC20
  };
}

// Base Sepolia Configuration - ONLY supported network
export const BASE_SEPOLIA: NetworkConfig = {
  chainId: 84532,
  name: 'Base Sepolia Testnet',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
  contracts: {
    escrowPool: {
      address: process.env.VITE_ESCROW_POOL_ADDRESS || '0x48FB00E363f13EF4a5D536831CaCa18f42BcAdA3',
      deploymentBlock: 0,
    },
    perpDex: {
      address: process.env.VITE_PERP_DEX_ADDRESS || '0x5a9a8125eb2e154ce93B161aD9Eb48C8C2f84177',
      deploymentBlock: 0,
    },
    collateralToken: {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
      deploymentBlock: 0,
    },
  },
};

// Local Development Configuration
export const LOCAL: NetworkConfig = {
  chainId: 31337,
  name: 'Local',
  rpcUrl: 'http://127.0.0.1:8545',
  blockExplorer: 'http://localhost:8545',
  contracts: {
    escrowPool: {
      address: process.env.VITE_ESCROW_POOL_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      deploymentBlock: 0,
    },
    perpDex: {
      address: process.env.VITE_PERP_DEX_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      deploymentBlock: 0,
    },
    collateralToken: {
      address: process.env.VITE_COLLATERAL_TOKEN_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      deploymentBlock: 0,
    },
  },
};

// Network configurations map
export const NETWORKS: Record<number, NetworkConfig> = {
  [BASE_SEPOLIA.chainId]: BASE_SEPOLIA,
  [LOCAL.chainId]: LOCAL,
};

// Default network
export const DEFAULT_NETWORK = BASE_SEPOLIA;

/**
 * Get network configuration by chain ID - Base Sepolia only
 */
export function getNetworkConfig(chainId: number): NetworkConfig {
  if (chainId === BASE_SEPOLIA.chainId) {
    return NETWORKS[chainId];
  }
  // Always return Base Sepolia as default if unsupported network
  return DEFAULT_NETWORK;
}

/**
 * Get current network configuration
 */
export function getCurrentNetworkConfig(): NetworkConfig {
  if (typeof window !== 'undefined' && window.ethereum?.chainId) {
    const chainId = parseInt(window.ethereum.chainId, 16);
    return getNetworkConfig(chainId);
  }
  return DEFAULT_NETWORK;
}

/**
 * Market constants matching the smart contract
 */
export const MARKETS = {
  BTC: '0x4254430000000000000000000000000000000000000000000000000000000000', // bytes32("BTC")
  ETH: '0x4554480000000000000000000000000000000000000000000000000000000000', // bytes32("ETH")
  SOL: '0x534f4c0000000000000000000000000000000000000000000000000000000000', // bytes32("SOL")
  MNT: '0x4d4e540000000000000000000000000000000000000000000000000000000000', // bytes32("MNT")
} as const;

/**
 * Convert market symbol to bytes32
 */
export function marketToBytes32(market: string): string {
  const bytes32 = '0x' + Buffer.from(market.toUpperCase().padEnd(32, '\0')).toString('hex');
  return bytes32;
}

/**
 * Convert bytes32 to market symbol
 */
export function bytes32ToMarket(bytes32: string): string {
  return Buffer.from(bytes32.slice(2), 'hex').toString().replace(/\0/g, '');
}

/**
 * Trading constants
 */
export const TRADING_CONSTANTS = {
  MAX_LEVERAGE: 10,
  TRADING_FEE_BPS: 10, // 0.1%
  BASIS_POINTS: 10000,
  PRICE_TIMEOUT: 60, // seconds
  MIN_COLLATERAL: '1000000', // 1 USDC (6 decimals)
} as const;

/**
 * Check if the current chain is supported (Base Sepolia only)
 */
export function isSupportedNetwork(chainId: number): boolean {
  return chainId === BASE_SEPOLIA.chainId;
}

/**
 * Get network name by chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1: return 'Ethereum Mainnet';
    case 8453: return 'Base Mainnet';
    case 84532: return 'Base Sepolia Testnet';
    case 137: return 'Polygon';
    case 42161: return 'Arbitrum';
    case 10: return 'Optimism';
    default: return `Chain ID: ${chainId}`;
  }
}

/**
 * Token configuration
 */
export const TOKEN_CONFIG = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    coingeckoId: 'weth',
  },
} as const;