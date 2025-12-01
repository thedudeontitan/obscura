import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { escrowUnlinkerService, type SessionData, type WalletData, type SessionStatus } from '../services/escrowUnlinker';
import { useNotification } from './useNotification';
import { mockDecryptPrivateKey } from '../utils/crypto';

export interface UnlinkedWallet {
  address: string;
  privateKey: string;
  wallet: ethers.Wallet;
}

export interface EscrowUnlinkingState {
  // Current state
  isLoading: boolean;
  error: string | null;
  currentSession: SessionData | null;
  sessionStatus: SessionStatus | null;
  unlinkedWallet: UnlinkedWallet | null;

  // Actions
  requestUnlinkedWallet: (depositAmount: string) => Promise<void>;
  claimUnlinkedWallet: () => Promise<void>;
  checkSessionStatus: () => Promise<void>;
  clearSession: () => void;

  // Wallet operations
  isWalletReady: boolean;
  getUnlinkedSigner: () => ethers.Wallet | null;
}

/**
 * Hook for managing the escrow unlinking flow
 */
export function useEscrowUnlinker(): EscrowUnlinkingState {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { showNotification } = useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [unlinkedWallet, setUnlinkedWallet] = useState<UnlinkedWallet | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('escrow_unlinking_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setCurrentSession(session);
      } catch (err) {
        console.warn('Failed to restore session from localStorage:', err);
        localStorage.removeItem('escrow_unlinking_session');
      }
    }

    const savedWallet = localStorage.getItem('unlinked_wallet');
    if (savedWallet) {
      try {
        const walletData = JSON.parse(savedWallet);
        // Restore wallet instance
        const wallet = new ethers.Wallet(walletData.privateKey);
        setUnlinkedWallet({
          address: walletData.address,
          privateKey: walletData.privateKey,
          wallet,
        });
      } catch (err) {
        console.warn('Failed to restore unlinked wallet from localStorage:', err);
        localStorage.removeItem('unlinked_wallet');
      }
    }
  }, []);

  // Save session to localStorage
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('escrow_unlinking_session', JSON.stringify(currentSession));
    } else {
      localStorage.removeItem('escrow_unlinking_session');
    }
  }, [currentSession]);

  // Save wallet to localStorage
  useEffect(() => {
    if (unlinkedWallet) {
      localStorage.setItem('unlinked_wallet', JSON.stringify({
        address: unlinkedWallet.address,
        privateKey: unlinkedWallet.privateKey,
      }));
    } else {
      localStorage.removeItem('unlinked_wallet');
    }
  }, [unlinkedWallet]);

  // Auto-poll session status
  useEffect(() => {
    if (!currentSession || sessionStatus?.status === 'completed' || sessionStatus?.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const status = await escrowUnlinkerService.getSessionStatus(currentSession.sessionToken);
        setSessionStatus(status);

        if (status.status === 'completed') {
          showNotification('Unlinked wallet is ready! You can now claim it.', 'success');
        } else if (status.status === 'failed') {
          showNotification('Wallet unlinking failed. Please try again.', 'error');
        }
      } catch (err) {
        console.warn('Failed to poll session status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [currentSession, sessionStatus, showNotification]);

  const requestUnlinkedWallet = useCallback(async (depositAmount: string) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create ethers signer from wagmi wallet client
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();

      // Request wallet from backend
      const session = await escrowUnlinkerService.requestWallet(signer, depositAmount);

      setCurrentSession(session);
      setSessionStatus({ status: 'awaiting_deposit' });

      showNotification(
        `Unlinked wallet created: ${session.newAddress.slice(0, 6)}...${session.newAddress.slice(-4)}`,
        'success'
      );

    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      showNotification(`Failed to request unlinked wallet: ${errorMessage}`, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, showNotification]);

  const claimUnlinkedWallet = useCallback(async () => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletData = await escrowUnlinkerService.claimWallet(currentSession.sessionToken);

      // Decrypt the private key from TEE format
      const decryptedPrivateKey = mockDecryptPrivateKey(walletData.encryptedKeyForUser);
      const wallet = new ethers.Wallet(decryptedPrivateKey);

      const unlinkedWalletData: UnlinkedWallet = {
        address: walletData.newAddress,
        privateKey: decryptedPrivateKey,
        wallet,
      };

      setUnlinkedWallet(unlinkedWalletData);
      showNotification('Unlinked wallet claimed successfully!', 'success');

    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      showNotification(`Failed to claim wallet: ${errorMessage}`, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, showNotification]);

  const checkSessionStatus = useCallback(async () => {
    if (!currentSession) return;

    try {
      const status = await escrowUnlinkerService.getSessionStatus(currentSession.sessionToken);
      setSessionStatus(status);
    } catch (err) {
      console.warn('Failed to check session status:', err);
    }
  }, [currentSession]);

  const clearSession = useCallback(() => {
    setCurrentSession(null);
    setSessionStatus(null);
    setUnlinkedWallet(null);
    setError(null);
    localStorage.removeItem('escrow_unlinking_session');
    localStorage.removeItem('unlinked_wallet');
  }, []);

  const getUnlinkedSigner = useCallback((): ethers.Wallet | null => {
    if (!unlinkedWallet) return null;

    // Connect to provider if needed
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      return unlinkedWallet.wallet.connect(provider);
    }

    return unlinkedWallet.wallet;
  }, [unlinkedWallet]);

  return {
    // State
    isLoading,
    error,
    currentSession,
    sessionStatus,
    unlinkedWallet,

    // Actions
    requestUnlinkedWallet,
    claimUnlinkedWallet,
    checkSessionStatus,
    clearSession,

    // Computed
    isWalletReady: !!unlinkedWallet,
    getUnlinkedSigner,
  };
}