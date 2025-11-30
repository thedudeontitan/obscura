import express from 'express';
import { memdb } from '../db/memdb.js';
import { logger } from '../utils/logger.js';

/**
 * Router for /api/status.
 *
 * @module api/status
 */

export const statusRouter = express.Router();

/**
 * GET /api/status?sessionToken=xxx
 *
 * Returns the full session object minus the encrypted private key.
 */
statusRouter.get('/status', async (req, res, next) => {
  try {
    const { sessionToken } = req.query;
    if (!sessionToken || typeof sessionToken !== 'string') {
      return res.status(400).json({ error: 'sessionToken is required' });
    }

    const session = memdb.sessions[sessionToken];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { encryptedKeyForUser, ...safeSession } = session;

    logger.info('Fetched session status', {
      sessionToken,
      status: session.status
    });

    return res.json(safeSession);
  } catch (err) {
    next(err);
  }
});

export default statusRouter;


