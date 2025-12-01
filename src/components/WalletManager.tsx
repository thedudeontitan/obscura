import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import { useWalletManager } from '../hooks/useWalletManager';

const WalletManager: React.FC = () => {
  const {
    mainAddress,
    tradingAddress,
    currentSession,
    sessions,
    tokenBalance,
    tokenAllowance,
    needsApproval,
    isConnecting,
    isRequestingWallet,
    isClaimingWallet,
    isApproving,
    isDepositing,
    error,
    connectMainWallet,
    disconnectWallet,
    requestPrivateWallet,
    checkSessionStatus,
    claimPrivateWallet,
    removeSession,
    approveTokens,
    depositToEscrow,
    refreshTokenData,
  } = useWalletManager();

  const [showSessions, setShowSessions] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  const handleConnectWallet = async () => {
    try {
      await connectMainWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleRequestPrivateWallet = async () => {
    try {
      const sessionId = await requestPrivateWallet();
      console.log('Requested private wallet, session ID:', sessionId);
    } catch (error) {
      console.error('Failed to request private wallet:', error);
    }
  };

  const handleClaimWallet = async (sessionId: string) => {
    if (!password) {
      setShowPasswordInput(sessionId);
      return;
    }

    try {
      await claimPrivateWallet(sessionId, password);
      setPassword('');
      setShowPasswordInput('');
    } catch (error) {
      console.error('Failed to claim wallet:', error);
    }
  };

  const handleCheckStatus = async (sessionId: string) => {
    try {
      await checkSessionStatus(sessionId);
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleApproveTokens = async () => {
    if (!depositAmount) return;

    try {
      await approveTokens(depositAmount);
    } catch (error) {
      console.error('Failed to approve tokens:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;

    try {
      await depositToEscrow(depositAmount);
      setDepositAmount('');
    } catch (error) {
      console.error('Failed to deposit:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'funded': return 'text-blue-400';
      case 'ready': return 'text-green-400';
      case 'claimed': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <motion.div
      className="bg-gray-800 rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-white mb-4">Wallet Manager</h3>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Main Wallet Connection */}
      <div className="space-y-4">
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-2">Main Wallet</h4>
          {!mainAddress ? (
            <Button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-green-400">Connected:</span>
                <span className="text-white font-mono">{formatAddress(mainAddress)}</span>
              </div>

              {/* Token Balance */}
              <div className="bg-gray-700 rounded p-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">USDC Balance:</span>
                  <span className="text-white">{parseFloat(tokenBalance).toFixed(2)} USDC</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Allowance:</span>
                  <span className="text-white">{parseFloat(tokenAllowance).toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Deposit Section */}
              <div className="bg-gray-700 rounded p-3">
                <h5 className="text-sm font-medium text-white mb-2">Deposit to Escrow</h5>
                <div className="space-y-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount in USDC"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <div className="flex space-x-2">
                    {needsApproval ? (
                      <Button
                        onClick={handleApproveTokens}
                        disabled={isApproving || !depositAmount}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      >
                        {isApproving ? 'Approving...' : 'Approve USDC'}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleDeposit}
                        disabled={isDepositing || !depositAmount}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                      >
                        {isDepositing ? 'Depositing...' : 'Deposit'}
                      </Button>
                    )}
                    <Button
                      onClick={refreshTokenData}
                      className="px-3 bg-gray-600 hover:bg-gray-700 text-white text-sm"
                    >
                      ↻
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleRequestPrivateWallet}
                  disabled={isRequestingWallet}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm"
                >
                  {isRequestingWallet ? 'Requesting...' : 'Request Private Wallet'}
                </Button>
                <Button
                  onClick={disconnectWallet}
                  className="px-3 bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Trading Wallet */}
        {tradingAddress && (
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="text-md font-medium text-white mb-2">Trading Wallet</h4>
            <div className="flex items-center justify-between">
              <span className="text-purple-400">Active:</span>
              <span className="text-white font-mono">{formatAddress(tradingAddress)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This wallet is unlinked from your main address for privacy
            </p>
          </div>
        )}

        {/* Current Session */}
        {currentSession && (
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="text-md font-medium text-white mb-2">Current Session</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <span className={getStatusColor(currentSession.status)}>
                  {currentSession.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Session:</span>
                <span className="text-white font-mono text-xs">
                  {currentSession.sessionId.slice(0, 8)}...
                </span>
              </div>

              {currentSession.status === 'ready' && (
                <div className="mt-3">
                  {showPasswordInput === currentSession.sessionId ? (
                    <div className="space-y-2">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password to decrypt wallet"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleClaimWallet(currentSession.sessionId)}
                          disabled={isClaimingWallet || !password}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                        >
                          {isClaimingWallet ? 'Claiming...' : 'Claim Wallet'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowPasswordInput('');
                            setPassword('');
                          }}
                          className="px-3 bg-gray-600 hover:bg-gray-700 text-white text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowPasswordInput(currentSession.sessionId)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      Claim Trading Wallet
                    </Button>
                  )}
                </div>
              )}

              {(currentSession.status === 'pending' || currentSession.status === 'funded') && (
                <Button
                  onClick={() => handleCheckStatus(currentSession.sessionId)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm mt-2"
                >
                  Check Status
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Session History */}
        {sessions.length > 0 && (
          <div className="border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-white">Session History</h4>
              <Button
                onClick={() => setShowSessions(!showSessions)}
                className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1"
              >
                {showSessions ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showSessions && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between bg-gray-700 rounded p-2 text-sm"
                  >
                    <div>
                      <span className="text-white font-mono text-xs">
                        {session.sessionId.slice(0, 8)}...
                      </span>
                      <span className={`ml-2 ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        onClick={() => handleCheckStatus(session.sessionId)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        Check
                      </Button>
                      <Button
                        onClick={() => removeSession(session.sessionId)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WalletManager;