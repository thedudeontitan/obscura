import { createClient } from 'redis';
import { memdb } from '../db/memdb.js';
import { logger } from '../utils/logger.js';
import { randomInt } from '../utils/rand.js';
import { sendFundsToNewAddress } from '../blockchain/sendFunds.js';

/**
 * Redis-backed queue helpers and background batch processor.
 *
 * @module redis/queue
 */

let redisClient = null;
let batchIntervalStarted = false;

/**
 * Connect to Redis using REDIS_URL env var.
 *
 * @returns {Promise<import('redis').RedisClientType>}
 */
export async function connectRedis() {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  redisClient = createClient({ url });
  redisClient.on('error', err => {
    logger.error('Redis client error', { error: err.message });
  });

  await redisClient.connect();
  logger.info('Connected to Redis', { url });
  return redisClient;
}

/**
 * Push a job ID into the Redis list "pending_withdraws".
 *
 * @param {string} jobId
 * @returns {Promise<void>}
 */
export async function pushJob(jobId) {
  const client = await connectRedis();
  await client.rPush('pending_withdraws', jobId);
}

/**
 * Fetch all job IDs currently in the Redis queue.
 *
 * @returns {Promise<string[]>}
 */
export async function popJobs() {
  const client = await connectRedis();
  const jobIds = await client.lRange('pending_withdraws', 0, -1);
  return jobIds;
}

/**
 * Remove a specific job ID from the Redis queue.
 *
 * @param {string} jobId
 * @returns {Promise<void>}
 */
async function removeJob(jobId) {
  const client = await connectRedis();
  await client.lRem('pending_withdraws', 0, jobId);
}

/**
 * Shuffle an array in-place using Fisher–Yates.
 *
 * @template T
 * @param {T[]} arr
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Start the batch processor that runs every 10 seconds.
 *
 *  1. Fetch all jobs where executeAfter < now
 *  2. Shuffle order
 *  3. For each job: call sendFundsToNewAddress()
 *  4. Save withdrawTxHash
 *  5. Mark session.status = "completed"
 *  6. Remove from pendingWithdrawals
 *
 * This function is idempotent; calling it multiple times will only
 * start a single interval.
 *
 * @returns {Promise<void>}
 */
export async function batchProcessor() {
  if (batchIntervalStarted) return;
  batchIntervalStarted = true;

  await connectRedis();

  const intervalMs = 10_000;
  logger.info('Starting withdrawal batch processor', { intervalMs });

  setInterval(async () => {
    const now = Date.now();
    try {
      const jobIds = await popJobs();

      /** @type {import('../db/memdb.js').WithdrawalJob[]} */
      const dueJobs = [];

      for (const jobId of jobIds) {
        const job = memdb.pendingWithdrawals[jobId];
        if (!job) continue;
        if (job.status !== 'pending') continue;
        if (job.executeAfter > now) continue;
        dueJobs.push(job);
      }

      if (!dueJobs.length) {
        return;
      }

      shuffle(dueJobs);

      for (const job of dueJobs) {
        try {
          const txHash = await sendFundsToNewAddress(
            job.newAddress,
            job.normalizedAmount,
            job.depositId,
            job.id
          );

          job.status = 'completed';

          const session = memdb.sessions[job.sessionToken];
          if (session) {
            session.withdrawTxHash = txHash;
            session.status = 'completed';
            session.updatedAt = new Date().toISOString();
          }

          await removeJob(job.id);
          delete memdb.pendingWithdrawals[job.id];

          logger.info('Processed withdrawal job', {
            jobId: job.id,
            txHash
          });
        } catch (err) {
          logger.error('Error processing withdrawal job', {
            jobId: job.id,
            error: /** @type {Error} */ (err).message
          });

          // Simple retry with backoff of 30–120 seconds
          job.status = 'pending';
          job.executeAfter = Date.now() + randomInt(30, 120) * 1000;
        }
      }
    } catch (err) {
      logger.error('Batch processor tick failed', {
        error: /** @type {Error} */ (err).message
      });
    }
  }, intervalMs).unref();
}


