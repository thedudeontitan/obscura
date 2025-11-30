import { ethers } from 'ethers';
import { memdb } from '../db/memdb.js';
import { logger } from '../utils/logger.js';
import { enqueueWithdrawal } from '../unlinker/engine.js';
import { ESCROW_ABI } from './sendFunds.js';

/**
 * Escrow listener watches for Deposited events on the escrow contract and,
 * when deposits match open sessions, triggers the unlinking pipeline.
 *
 * @module blockchain/escrowListener
 */

/**
 * Start watching deposit events on the escrow contract.
 *
 * @returns {Promise<void>}
 */
export async function watchDeposits() {
  const rpcUrl = process.env.CHAIN_RPC;
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    logger.warn(
      'CHAIN_RPC or ESCROW_CONTRACT_ADDRESS not set; escrow listener will not start'
    );
    return;
  }

  if (!ethers.isAddress(contractAddress)) {
    logger.error(
      `ESCROW_CONTRACT_ADDRESS is invalid: "${contractAddress}". It must be a 0x-prefixed hex address, not ENS. Escrow listener will not start.`
    );
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ESCROW_ABI, provider);

  logger.info('Starting escrow deposit listener', {
    rpcUrl,
    contractAddress
  });

  contract.on(
    'Deposited',
    /**
     * @param {string} from
     * @param {bigint} amount
     * @param {bigint} depositId
     * @param {import('ethers').EventLog} event
     */
    async (from, amount, depositId, event) => {
      try {
        const fromLc = from.toLowerCase();
        logger.info('Detected Deposited event', {
          from: fromLc,
          amount: amount.toString(),
          depositId: depositId.toString(),
          txHash: event.log.transactionHash
        });

        // Find matching session based on address and amount with small tolerance.
        const sessions = Object.values(memdb.sessions);

        for (const session of sessions) {
          if (session.userAddress !== fromLc) continue;
          if (session.status !== 'awaiting_deposit') continue;

          let expected;
          try {
            expected = BigInt(session.expectedAmount);
          } catch {
            continue;
          }

          const diff = expected > amount ? expected - amount : amount - expected;
          // Allow small tolerance of 0.01% of expected amount, minimum 1 wei.
          const tolerance = expected / 10_000n || 1n;
          if (diff > tolerance) continue;

          session.status = 'deposit_detected';
          session.depositTxHash = event.log.transactionHash;
          session.updatedAt = new Date().toISOString();

          logger.info('Matched deposit to session', {
            sessionToken: session.sessionToken,
            expectedAmount: session.expectedAmount,
            depositAmount: amount.toString()
          });

          // Trigger unlinking pipeline (uses expectedAmount internally).
          await enqueueWithdrawal(session);
        }
      } catch (err) {
        logger.error('Error handling Deposited event', {
          error: /** @type {Error} */ (err).message
        });
      }
    }
  );
}


