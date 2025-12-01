/**
 * Simplified crypto utilities for TEE encrypted private key handling
 */

/**
 * Mock decryption for TEE-encrypted private keys
 * In production, this would use proper WebCrypto APIs with the TEE attestation
 */
export function mockDecryptPrivateKey(encryptedKeyForUser: string): string {
  try {
    // This is a simplified mock implementation
    // In production, you would:
    // 1. Verify the TEE attestation report
    // 2. Extract the ephemeral key, IV, auth tag, and ciphertext
    // 3. Use WebCrypto APIs to decrypt with AES-256-GCM
    // 4. Return the decrypted 32-byte private key

    const buf = Buffer.from(encryptedKeyForUser, 'base64');

    if (buf.length < 32 + 12 + 16 + 32) {
      throw new Error('Invalid encrypted key format');
    }

    // For now, return a deterministic private key based on the encrypted data
    // This allows the demo to work while maintaining the same "unlinked" address
    const hash = Array.from(buf.slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create a valid private key from the hash
    const privateKey = '0x' + hash;

    return privateKey;
  } catch (error) {
    throw new Error(`Failed to decrypt private key: ${(error as Error).message}`);
  }
}

/**
 * Validate that a private key is properly formatted
 */
export function validatePrivateKey(privateKey: string): boolean {
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    return false;
  }

  try {
    // Check if it's valid hex
    BigInt(privateKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a secure random private key (for testing only)
 */
export function generateMockPrivateKey(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return '0x' + hex;
}