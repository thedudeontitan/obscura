import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import Button from './Button';
import { useEscrowUnlinker } from '../hooks/useEscrowUnlinker';
import { useNotification } from '../hooks/useNotification';

const EscrowUnlinkingPanel: React.FC = () => {
  const { authenticated } = usePrivy();
  const { address, isConnected } = useAccount();
  const { showNotification } = useNotification();

  const {
    isLoading,
    error,
    currentSession,
    sessionStatus,
    unlinkedWallet,
    isWalletReady,
    requestUnlinkedWallet,
    claimUnlinkedWallet,
    clearSession,
    getUnlinkedSigner,
  } = useEscrowUnlinker();

  const [depositAmount, setDepositAmount] = useState('10'); // Default 10 USDC

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: import.meta.env.VITE_USDC_TOKEN_ADDRESS as `0x${string}`,
  });

  // Get unlinked wallet USDC balance
  const { data: unlinkedUsdcBalance } = useBalance({
    address: unlinkedWallet?.address as `0x${string}`,
    token: import.meta.env.VITE_USDC_TOKEN_ADDRESS as `0x${string}`,
  });

  const formatUsdcBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.00';
    return (Number(balance) / Math.pow(10, 6)).toFixed(2);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'awaiting_deposit':
        return 'text-yellow-400';
      case 'deposit_detected':
        return 'text-blue-400';
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusMessage = (status?: string) => {
    switch (status) {
      case 'awaiting_deposit':
        return 'Waiting for deposit to escrow contract';
      case 'deposit_detected':
        return 'Deposit detected, processing unlinking';
      case 'processing':
        return 'Creating unlinked wallet and transferring funds';
      case 'completed':
        return 'Unlinked wallet ready! You can now claim it';
      case 'failed':
        return 'Unlinking failed. Please try again';
      default:
        return 'No active session';
    }
  };

  const handleRequestWallet = async () => {
    if (!authenticated || !isConnected) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showNotification('Please enter a valid deposit amount', 'error');
      return;
    }

    try {
      await requestUnlinkedWallet(depositAmount);
    } catch (err) {
      console.error('Failed to request wallet:', err);
    }
  };

  const handleClaimWallet = async () => {
    try {
      await claimUnlinkedWallet();
    } catch (err) {
      console.error('Failed to claim wallet:', err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification(`${label} copied to clipboard`, 'success');
  };

  if (!authenticated || !isConnected) {
    return (
      <motion.div
        className="bg-gray-800 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Privacy Protection</h3>
        <div className="text-center text-gray-400 py-8">
          <p>Connect your wallet to enable privacy-protected trading</p>
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
      <h3 className="text-lg font-semibold text-white mb-4">Privacy Protection</h3>

      {/* Current Wallet Info */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Connected Wallet</h4>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Address:</span>
          <button
            onClick={() => copyToClipboard(address || '', 'Address')}
            className="text-blue-400 hover:text-blue-300 font-mono"
          >
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">USDC Balance:</span>
          <span className="text-white">{formatUsdcBalance(usdcBalance?.value)} USDC</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Session Status */}
      {currentSession && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300">Session Status</h4>
            <button
              onClick={clearSession}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Status:</span>
              <span className={getStatusColor(sessionStatus?.status)}>
                {getStatusMessage(sessionStatus?.status)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Unlinked Address:</span>
              <button
                onClick={() => copyToClipboard(currentSession.newAddress, 'Unlinked address')}
                className="text-blue-400 hover:text-blue-300 font-mono"
              >
                {currentSession.newAddress.slice(0, 6)}...{currentSession.newAddress.slice(-4)}
              </button>
            </div>
            {sessionStatus?.depositTxHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Deposit Tx:</span>
                <button
                  onClick={() => window.open(`https://sepolia.basescan.org/tx/${sessionStatus.depositTxHash}`, '_blank')}
                  className="text-blue-400 hover:text-blue-300 font-mono"
                >
                  {sessionStatus.depositTxHash.slice(0, 6)}...{sessionStatus.depositTxHash.slice(-4)}
                </button>
              </div>
            )}
            {sessionStatus?.withdrawTxHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Withdraw Tx:</span>
                <button
                  onClick={() => window.open(`https://sepolia.basescan.org/tx/${sessionStatus.withdrawTxHash}`, '_blank')}
                  className="text-blue-400 hover:text-blue-300 font-mono"
                >
                  {sessionStatus.withdrawTxHash.slice(0, 6)}...{sessionStatus.withdrawTxHash.slice(-4)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlinked Wallet Display */}
      {unlinkedWallet && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <h4 className="text-sm font-medium text-green-300">Unlinked Wallet Ready</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Address:</span>
              <button
                onClick={() => copyToClipboard(unlinkedWallet.address, 'Unlinked address')}
                className="text-green-400 hover:text-green-300 font-mono"
              >
                {unlinkedWallet.address.slice(0, 6)}...{unlinkedWallet.address.slice(-4)}
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">USDC Balance:</span>
              <span className="text-green-400">{formatUsdcBalance(unlinkedUsdcBalance?.value)} USDC</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Private Key:</span>
              <button
                onClick={() => copyToClipboard(unlinkedWallet.privateKey, 'Private key')}
                className="text-green-400 hover:text-green-300 text-xs"
              >
                Copy Private Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {!currentSession && !isWalletReady && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deposit Amount (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="10.00"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum 1 USDC. This amount will be transferred to your unlinked wallet.
              </p>
            </div>

            <Button
              onClick={handleRequestWallet}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
            >
              {isLoading ? 'Creating Unlinked Wallet...' : 'Create Unlinked Wallet'}
            </Button>
          </>
        )}

        {currentSession && sessionStatus?.status === 'completed' && !isWalletReady && (
          <Button
            onClick={handleClaimWallet}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg"
          >
            {isLoading ? 'Claiming Wallet...' : 'Claim Unlinked Wallet'}
          </Button>
        )}

        {isWalletReady && (
          <div className="text-center">
            <p className="text-green-400 text-sm mb-2">
              ✅ Privacy protection active! Use the trading panel to trade anonymously.
            </p>
            <Button
              onClick={clearSession}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 rounded-lg"
            >
              Reset for New Session
            </Button>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">How Privacy Protection Works</h4>
        <ol className="text-xs text-blue-200 space-y-1">
          <li>1. Deposit USDC to escrow contract</li>
          <li>2. Backend creates unlinked wallet after delay</li>
          <li>3. Funds transferred to unlinked wallet</li>
          <li>4. Trade using unlinked wallet (no connection to your identity)</li>
        </ol>
      </div>
    </motion.div>
  );
};

export default EscrowUnlinkingPanel;