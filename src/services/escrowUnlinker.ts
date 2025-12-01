import { ethers } from 'ethers';

export interface SessionData {
  sessionToken: string;
  newAddress: string;
}

export interface WalletData {
  newAddress: string;
  encryptedKeyForUser: string;
  attestationReport: string;
}

export interface SessionStatus {
  status: 'awaiting_deposit' | 'deposit_detected' | 'processing' | 'completed' | 'failed';
  depositTxHash?: string;
  withdrawTxHash?: string;
  userAddress?: string;
  expectedAmount?: string;
}

/**
 * Service for managing the escrow unlinking flow
 */
export class EscrowUnlinkerService {
  private backendUrl: string;

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || import.meta.env.VITE_BACKEND_URL || '';
  }

  /**
   * Step 1: Request a new unlinked wallet
   */
  async requestWallet(
    signer: ethers.Signer,
    depositAmount: string
  ): Promise<SessionData> {
    const address = await signer.getAddress();
    const message = `obscura unlinker request ${Date.now()} ${address}`;

    // Sign the message
    const signature = await signer.signMessage(message);

    const response = await fetch(`${this.backendUrl}/api/request-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        signature,
        depositAmount: ethers.parseUnits(depositAmount, 6).toString(), // USDC has 6 decimals
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      sessionToken: data.sessionToken,
      newAddress: data.newAddress,
    };
  }

  /**
   * Step 2: Check session status
   */
  async getSessionStatus(sessionToken: string): Promise<SessionStatus> {
    const response = await fetch(
      `${this.backendUrl}/api/status?sessionToken=${encodeURIComponent(sessionToken)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Status check failed with status ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Step 3: Claim the unlinked wallet after processing is complete
   */
  async claimWallet(sessionToken: string): Promise<WalletData> {
    const response = await fetch(
      `${this.backendUrl}/api/claim-wallet?sessionToken=${encodeURIComponent(sessionToken)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Claim failed with status ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Decrypt the private key from the TEE-encrypted format
   */
  decryptPrivateKey(encryptedKeyForUser: string): string {
    try {
      const buf = Buffer.from(encryptedKeyForUser, 'base64');

      if (buf.length < 32 + 12 + 16 + 1) {
        throw new Error('Encrypted key blob too short');
      }

      const ephemeralKey = buf.subarray(0, 32);
      const iv = buf.subarray(32, 44);
      const authTag = buf.subarray(44, 60);
      const ciphertext = buf.subarray(60);

      const crypto = globalThis.crypto;
      if (!crypto || !crypto.subtle) {
        throw new Error('WebCrypto not available');
      }

      // Note: This is a simplified version. In production, you'd need proper WebCrypto implementation
      // For now, we'll return the encrypted key as-is and handle decryption in the hook
      return encryptedKeyForUser;
    } catch (error) {
      throw new Error(`Failed to decrypt private key: ${(error as Error).message}`);
    }
  }

  /**
   * Create a wallet instance from decrypted private key
   */
  createWalletFromKey(privateKey: string, provider?: ethers.Provider): ethers.Wallet {
    const wallet = new ethers.Wallet(privateKey);
    return provider ? wallet.connect(provider) : wallet;
  }

  /**
   * Poll session status until completion
   */
  async pollSessionUntilComplete(
    sessionToken: string,
    maxAttempts: number = 24,
    intervalMs: number = 5000
  ): Promise<SessionStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getSessionStatus(sessionToken);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Session polling timeout - maximum attempts reached');
  }
}

export const escrowUnlinkerService = new EscrowUnlinkerService();