import express from 'express';
import { memdb } from '../db/memdb.js';
import { logger } from '../utils/logger.js';

/**
 * Router for /api/claim-wallet.
 *
 * @module api/claimWallet
 */

export const claimWalletRouter = express.Router();

/**
 * GET /api/claim-wallet?sessionToken=xxx
 *
 * Returns the unlinker-generated wallet details:
 *  - newAddress
 *  - encryptedKeyForUser
 *  - attestationReport
 */
claimWalletRouter.get('/claim-wallet', async (req, res, next) => {
  try {
    const { sessionToken } = req.query;
    if (!sessionToken || typeof sessionToken !== 'string') {
      return res.status(400).json({ error: 'sessionToken is required' });
    }

    const session = memdb.sessions[sessionToken];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { newAddress, encryptedKeyForUser, attestationReport } = session;

    if (!newAddress || !encryptedKeyForUser || !attestationReport) {
      return res.status(409).json({
        error: 'Wallet not yet generated or session in invalid state'
      });
    }

    logger.info('Wallet claimed for session', {
      sessionToken,
      status: session.status
    });

    return res.json({
      newAddress,
      encryptedKeyForUser,
      attestationReport
    });
  } catch (err) {
    next(err);
  }
});

export default claimWalletRouter;


