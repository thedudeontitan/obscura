import express from 'express';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { memdb } from '../db/memdb.js';
import { generatePrivateKeyInsideTEE } from '../tee/tee.js';
import { logger } from '../utils/logger.js';
import { fundAddressWithGas } from '../blockchain/sendFunds.js';

/**
 * Router for /api/request-wallet.
 *
 * @module api/requestWallet
 */

export const requestWalletRouter = express.Router();

/**
 * POST /api/request-wallet
 *
 * Body:
 *  - message: string (the message that was signed)
 *  - signature: string (signature of the message)
 *  - depositAmount: string (expected deposit amount in wei)
 */
requestWalletRouter.post('/request-wallet', async (req, res, next) => {
  try {
    const { message, signature, depositAmount } = req.body || {};

    if (!message || !signature || !depositAmount) {
      return res.status(400).json({
        error: 'Missing required fields: message, signature, depositAmount'
      });
    }

    let userAddress;
    try {
      userAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      logger.warn('Failed to verify user signature', { error: err.message });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const sessionToken = uuidv4();
    const now = new Date().toISOString();

    const { encryptedKeyForUser, attestationReport, newAddress } = generatePrivateKeyInsideTEE();

    const sessionId = uuidv4();

    /** @type {import('../db/memdb.js').Session} */
    const session = {
      id: sessionId,
      sessionToken,
      userAddress: userAddress.toLowerCase(),
      expectedAmount: String(depositAmount),
      status: 'awaiting_deposit',
      newAddress,
      encryptedKeyForUser,
      attestationReport,
      depositTxHash: null,
      withdrawTxHash: null,
      createdAt: now,
      updatedAt: now
    };

    memdb.sessions[sessionToken] = session;

    logger.info('Created new session awaiting deposit', {
      sessionToken,
      userAddress: session.userAddress,
      expectedAmount: session.expectedAmount,
      newAddress
    });

    // Immediately fund the freshly generated wallet with a small amount of gas
    // so it can pay for Base Sepolia transaction fees.
    try {
      const txHash = await fundAddressWithGas(newAddress, '0.01');
      logger.info('Funded new wallet with gas', {
        sessionToken,
        newAddress,
        txHash
      });
    } catch (err) {
      logger.error('Failed to fund new wallet with gas', {
        sessionToken,
        newAddress,
        error: /** @type {Error} */ (err).message
      });
      // Do not fail the API request; the wallet is still valid, just gasless.
    }

    return res.status(201).json({
      sessionToken,
      newAddress
    });
  } catch (err) {
    next(err);
  }
});

export default requestWalletRouter;


