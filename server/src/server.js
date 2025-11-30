import dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import requestWalletRouter from './api/requestWallet.js';
import statusRouter from './api/status.js';
import claimWalletRouter from './api/claimWallet.js';
import { logger } from './utils/logger.js';
import { watchDeposits } from './blockchain/escrowListener.js';
import { batchProcessor } from './redis/queue.js';

// Load environment variables from .env if present.
dotenv.config();

/**
 * Initialize the operator private key used for withdrawals.
 *
 * - If OPERATOR_PRIVATE_KEY is present in the environment, use it and log
 *   the corresponding address.
 * - If it is missing or invalid, generate a new key, store it in
 *   process.env.OPERATOR_PRIVATE_KEY for this process, and log the address.
 */
function initOperatorKey() {
  let privateKey = process.env.OPERATOR_PRIVATE_KEY;

  if (privateKey) {
    // Normalise key to 0x-prefixed format if needed.
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }
    try {
      const wallet = new ethers.Wallet(privateKey);
      process.env.OPERATOR_PRIVATE_KEY = privateKey;
      logger.info('Using operator private key from environment', {
        operatorAddress: wallet.address
      });
      return;
    } catch (err) {
      logger.error('Invalid OPERATOR_PRIVATE_KEY in environment; generating a new one', {
        error: /** @type {Error} */ (err).message
      });
    }
  }

  // Generate a fresh random key for this process only.
  const wallet = ethers.Wallet.createRandom();
  process.env.OPERATOR_PRIVATE_KEY = wallet.privateKey;
  logger.warn(
    'No valid OPERATOR_PRIVATE_KEY found; generated ephemeral operator key for this process',
    {
      operatorAddress: wallet.address
    }
  );
}

// Ensure we always have an operator key for the lifetime of this process.
initOperatorKey();

const app = express();

app.use(express.json());

// API routes
app.use('/api', requestWalletRouter);
app.use('/api', statusRouter);
app.use('/api', claimWalletRouter);

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware (must have 4 args)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  logger.info(`Server listening on port ${PORT}`);

  try {
    await watchDeposits();
  } catch (err) {
    logger.error('Failed to start escrow listener', {
      error: /** @type {Error} */ (err).message
    });
  }

  try {
    await batchProcessor();
  } catch (err) {
    logger.error('Failed to start batch processor', {
      error: /** @type {Error} */ (err).message
    });
  }
});


