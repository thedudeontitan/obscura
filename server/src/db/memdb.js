/**
 * In-memory object "database" for sessions and pending withdrawals.
 *
 * This is intentionally simple and non-persistent. In production you would
 * replace this with a real database.
 *
 * @module db/memdb
 */

/**
 * @typedef {'awaiting_deposit'|'deposit_detected'|'wallet_generated'|'withdrawal_queued'|'completed'} SessionStatus
 */

/**
 * @typedef {Object} Session
 * @property {string} id - Internal session ID.
 * @property {string} sessionToken - Public session token returned to the user.
 * @property {string} userAddress - User's Ethereum address.
 * @property {string} expectedAmount - Expected deposit amount (wei as decimal string).
 * @property {SessionStatus} status - Current session status.
 * @property {string|null} newAddress - Fresh unlinker-generated address.
 * @property {string|null} encryptedKeyForUser - Encrypted private key blob.
 * @property {string|null} attestationReport - TEE attestation report (dummy string).
 * @property {string|null} depositTxHash - Detected deposit transaction hash.
 * @property {string|null} withdrawTxHash - Withdrawal transaction hash.
 * @property {string} createdAt - ISO timestamp.
 * @property {string} updatedAt - ISO timestamp.
 */

/**
 * @typedef {Object} WithdrawalJob
 * @property {string} id - Job ID.
 * @property {string} sessionToken - Related session token.
 * @property {string} newAddress - Withdrawal destination address.
 * @property {bigint} normalizedAmount - Amount to withdraw (wei as bigint).
 * @property {number} executeAfter - Unix timestamp (ms) when this job becomes eligible.
 * @property {'pending'|'completed'|'failed'} status - Job status.
 */

/**
 * Simple in-memory database object.
 *
 * @type {{
 *   sessions: Record<string, Session>,
 *   pendingWithdrawals: Record<string, WithdrawalJob>
 * }}
 */
export const memdb = {
  sessions: {},
  pendingWithdrawals: {}
};


