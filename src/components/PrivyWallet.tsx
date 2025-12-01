import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { formatEther } from 'viem';
import { motion } from 'framer-motion';
import Button from './Button';

const PrivyWallet: React.FC = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Get ETH balance
  const { data: balance } = useBalance({
    address,
  });

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: import.meta.env.VITE_USDC_TOKEN_ADDRESS as `0x${string}`,
  });

  const formatBalance = (balance: bigint | undefined, decimals: number = 18) => {
    if (!balance) return '0.00';
    if (decimals === 18) {
      return parseFloat(formatEther(balance)).toFixed(4);
    } else {
      return (Number(balance) / Math.pow(10, decimals)).toFixed(2);
    }
  };

  const handleLogout = () => {
    disconnect();
    logout();
  };

  if (!authenticated || !isConnected) {
    return (
      <motion.div
        className="bg-gray-800 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Connect Wallet</h3>
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Connect your wallet to start privacy-protected trading
          </p>
          <Button
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
          >
            Connect Wallet
          </Button>
        </div>
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Wallet</h3>
        <Button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm"
        >
          Disconnect
        </Button>
      </div>

      {/* User Info */}
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.email?.address?.charAt(0).toUpperCase() ||
               user?.wallet?.address?.slice(2, 4).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-white text-sm font-medium">
              {user?.email?.address || 'Wallet User'}
            </p>
            <p className="text-gray-400 text-xs">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
            </p>
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="space-y-3">
        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">ETH Balance:</span>
            <span className="text-white">{formatBalance(balance?.value)} ETH</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">USDC Balance:</span>
            <span className="text-white">{formatBalance(usdcBalance?.value, 6)} USDC</span>
          </div>
        </div>

        {/* Network Info */}
        <div className="bg-gray-700 rounded p-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Network:</span>
            <span className="text-green-400">Base Sepolia</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Chain ID:</span>
            <span className="text-gray-300">84532</span>
          </div>
        </div>

        {/* Privacy Status */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-blue-300 text-sm font-medium">
              Privacy Protection Active
            </span>
          </div>
          <p className="text-blue-200 text-xs mt-1">
            Your trading activity will be unlinked from this wallet
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => window.open(`https://sepolia.basescan.org/address/${address}`, '_blank')}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
          >
            View on Explorer
          </Button>
          <Button
            onClick={() => navigator.clipboard.writeText(address || '')}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
          >
            Copy Address
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PrivyWallet;