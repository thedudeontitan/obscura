import React from 'react';
import { motion } from 'framer-motion';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import Button from './Button';
import { isSupportedNetwork, getNetworkName } from '../contracts/config';

const NetworkChecker: React.FC = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  // If not connected, don't show network warning
  if (!isConnected) {
    return null;
  }

  // If already on supported network (Base Sepolia), don't show anything
  if (isSupportedNetwork(chainId)) {
    return null;
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: baseSepolia.id });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-orange-500/50"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Wrong Network</h3>
            <p className="text-gray-300 text-sm mb-4">
              Obscura only supports Base Sepolia testnet. Please switch your network to continue.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Current Network:</span>
                <span className="text-orange-400 font-medium">
                  {getNetworkName(chainId)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Required Network:</span>
                <span className="text-green-400 font-medium">Base Sepolia</span>
              </div>
            </div>

            <Button
              onClick={handleSwitchNetwork}
              disabled={isPending}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded-lg"
            >
              {isPending ? 'Switching...' : 'Switch to Base Sepolia'}
            </Button>

            <div className="text-xs text-gray-400">
              <p>Network Details:</p>
              <div className="mt-1 space-y-1">
                <p>• Chain ID: 84532</p>
                <p>• RPC URL: https://sepolia.base.org</p>
                <p>• Currency: ETH</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NetworkChecker;