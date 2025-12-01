/**
 * Wallet Management Service for Obscura Privacy Layer
 * Handles encrypted wallet storage and integration with EscrowPool system
 */

import { ethers } from 'ethers';

export interface UnlinkerWallet {
  address: string;
  encryptedPrivateKey: string;
  attestationReport: any;
  sessionId: string;
}

export interface WalletSession {
  sessionId: string;
  status: 'pending' | 'funded' | 'ready' | 'claimed';
  depositAmount: string;
  timestamp: number;
}

const UNLINKER_API_URL = process.env.VITE_UNLINKER_API_URL || 'http://localhost:3001';

/**
 * Request a new unlinker wallet from the privacy layer
 */
export async function requestUnlinkerWallet(
  userAddress: string,
  signature: string
): Promise<{ sessionId: string }> {
  const response = await fetch(`${UNLINKER_API_URL}/api/request-wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userAddress,
      signature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to request wallet: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check the status of a wallet session
 */
export async function getSessionStatus(sessionId: string): Promise<WalletSession> {
  const response = await fetch(`${UNLINKER_API_URL}/api/status?sessionId=${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to get session status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Claim the unlinker wallet after funds have been processed
 */
export async function claimUnlinkerWallet(sessionId: string): Promise<UnlinkerWallet> {
  const response = await fetch(`${UNLINKER_API_URL}/api/claim-wallet?sessionId=${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to claim wallet: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Decrypt and import a wallet for trading
 */
export async function importWallet(
  encryptedPrivateKey: string,
  password: string
): Promise<ethers.Wallet> {
  try {
    // Decrypt the private key using the provided password
    const wallet = await ethers.Wallet.fromEncryptedJson(encryptedPrivateKey, password);
    return wallet;
  } catch (error) {
    throw new Error('Failed to decrypt wallet. Check your password.');
  }
}

/**
 * Create a wallet instance with provider for trading
 */
export function createWalletWithProvider(
  privateKey: string,
  provider: ethers.Provider
): ethers.Wallet {
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Sign a message to prove ownership of the main wallet
 */
export async function signWalletRequest(
  signer: ethers.Signer,
  message: string
): Promise<string> {
  return await signer.signMessage(message);
}

/**
 * Generate a deterministic message for wallet request signing
 */
export function generateWalletRequestMessage(userAddress: string, timestamp: number): string {
  return `Obscura Privacy Layer Wallet Request
Address: ${userAddress}
Timestamp: ${timestamp}
By signing this message, you authorize the creation of a privacy-preserving trading wallet.`;
}

/**
 * Store wallet session info in localStorage
 */
export function storeWalletSession(sessionId: string, session: WalletSession): void {
  localStorage.setItem(`obscura_session_${sessionId}`, JSON.stringify(session));
}

/**
 * Retrieve wallet session info from localStorage
 */
export function getStoredWalletSession(sessionId: string): WalletSession | null {
  const stored = localStorage.getItem(`obscura_session_${sessionId}`);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Store encrypted wallet info securely in localStorage
 */
export function storeEncryptedWallet(address: string, encryptedData: string): void {
  localStorage.setItem(`obscura_wallet_${address}`, encryptedData);
}

/**
 * Retrieve encrypted wallet info from localStorage
 */
export function getStoredEncryptedWallet(address: string): string | null {
  return localStorage.getItem(`obscura_wallet_${address}`);
}

/**
 * List all stored wallet sessions
 */
export function getStoredWalletSessions(): WalletSession[] {
  const sessions: WalletSession[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('obscura_session_')) {
      const sessionData = localStorage.getItem(key);
      if (sessionData) {
        try {
          sessions.push(JSON.parse(sessionData));
        } catch {
          // Skip invalid session data
        }
      }
    }
  }

  return sessions.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Remove wallet session from localStorage
 */
export function removeWalletSession(sessionId: string): void {
  localStorage.removeItem(`obscura_session_${sessionId}`);
}

/**
 * Clear all stored wallet data (for logout/reset)
 */
export function clearWalletData(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('obscura_')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}