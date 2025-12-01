import crypto from 'crypto';
import { ethers } from 'ethers';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Very lightweight in-process simulation of a TEE (Trusted Execution Environment).
 * In production this would be backed by real enclave hardware and remote attestation.
 *
 * @module tee/tee
 */

/**
 * Internal map of key references to raw private keys.
 * This allows us to support signMessageInsideTEE with opaque key references.
 *
 * @type {Map<string, string>}
 */
const keyStore = new Map();

/**
 * Encrypt a value with AES-256-GCM using a random ephemeral key.
 * The ephemeral key is concatenated with IV and authTag and base64-encoded.
 *
 * NOTE: This is purely for simulation and NOT secure for production.
 *
 * @param {Buffer} plaintext
 * @returns {string} Base64-encoded blob containing ephemeralKey|iv|authTag|ciphertext.
 */
function encryptForUser(plaintext) {
  const ephemeralKey = randomBytes(32); // 256-bit key
  const iv = randomBytes(12); // 96-bit nonce for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', ephemeralKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const blob = Buffer.concat([ephemeralKey, iv, authTag, ciphertext]);
  return blob.toString('base64');
}

/**
 * Generate a new Ethereum private key inside the "TEE".
 *
 * @returns {{
 *   encryptedKeyForUser: string,
 *   attestationReport: string,
 *   newAddress: string,
 *   keyRef: string
 * }} Encrypted key, dummy attestation, new address and internal key reference.
 */
export function generatePrivateKeyInsideTEE() {
  // Generate a random private key compatible with Ethereum.
  const privateKey = `0x${randomBytes(32).toString('hex')}`;
  const wallet = new ethers.Wallet(privateKey);

  const keyRef = crypto.randomUUID();
  keyStore.set(keyRef, privateKey);

  const encryptedKeyForUser = encryptForUser(Buffer.from(privateKey.replace(/^0x/, ''), 'hex'));

  /** @type {string} */
  const attestationReport = JSON.stringify({
    tee: 'mock-tee',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    note: 'This is a dummy attestation report. Do NOT use in production.'
  });

  logger.info('TEE generated new key pair', { address: wallet.address });

  return {
    encryptedKeyForUser,
    attestationReport,
    newAddress: wallet.address,
    keyRef
  };
}

/**
 * Sign an arbitrary message inside the "TEE".
 *
 * @param {string} keyRef - Opaque key reference returned by generatePrivateKeyInsideTEE.
 * @param {string} message - Message to sign.
 * @returns {Promise<string>} The ECDSA signature.
 */
export async function signMessageInsideTEE(keyRef, message) {
  const privateKey = keyStore.get(keyRef);
  if (!privateKey) {
    throw new Error('Unknown keyRef for TEE signing');
  }
  const wallet = new ethers.Wallet(privateKey);
  return wallet.signMessage(message);
}


