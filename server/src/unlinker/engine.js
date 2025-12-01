import { v4 as uuidv4 } from 'uuid';
import { memdb } from '../db/memdb.js';
import { randomInt } from '../utils/rand.js';
import { logger } from '../utils/logger.js';
import { pushJob } from '../redis/queue.js';

/**
 * Unlinking engine responsible for normalizing withdrawal amounts and
 * scheduling delayed withdrawals via the Redis-backed queue.
 *
 * @module unlinker/engine
 */

/**
 * Enqueue a withdrawal job for a given session.
 *
 * Steps:
 *  1. Calculate normalized amount:
 *       normalizedAmount = expectedAmount * (1 + randomFloat(-0.00003, 0.00004))
 *     implemented using integer math with parts-per-million jitter.
 *  2. generate executeAfter = now + random(1–60 seconds)
 *  3. Create a job in memdb.pendingWithdrawals
 *  4. Push job ID into Redis queue "pending_withdraws"
 *  5. Update session.status = "withdrawal_queued"
 *
 * @param {import('../db/memdb.js').Session} session
 * @returns {Promise<void>}
 */
export async function enqueueWithdrawal(session) {
  if (!session.newAddress) {
    throw new Error('Session is missing newAddress for withdrawal');
  }

  const expected = BigInt(session.expectedAmount);

  // Jitter in parts-per-million corresponding to [-0.00003, 0.00004]
  const jitterPpm = randomInt(-30, 40);
  const normalizedAmount =
    expected + (expected * BigInt(jitterPpm)) / 1_000_000n;

  const executeAfter =
    Date.now() + randomInt(1, 10) * 1000; // 1–60 seconds in the future

  const jobId = uuidv4();

  /** @type {import('../db/memdb.js').WithdrawalJob} */
  const job = {
    id: jobId,
    sessionToken: session.sessionToken,
    newAddress: session.newAddress,
    normalizedAmount,
    depositId: session.depositId || null,
    executeAfter,
    status: 'pending'
  };

  memdb.pendingWithdrawals[jobId] = job;

  await pushJob(jobId);

  session.status = 'withdrawal_queued';
  session.updatedAt = new Date().toISOString();

  logger.info('Enqueued withdrawal job', {
    jobId,
    sessionToken: session.sessionToken,
    newAddress: session.newAddress,
    normalizedAmount: normalizedAmount.toString(),
    depositId: job.depositId,
    executeAfter
  });
}


