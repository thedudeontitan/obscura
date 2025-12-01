import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';

/**
 * Escrow contract ABI used for both listening and sending.
 *
 * NOTE: This must match the deployed EscrowPool.sol contract.
 *
 * @type {string[]}
 */
export const ESCROW_ABI = [
  'event Deposited(address indexed from,uint256 amount,uint256 depositId)',
  'function operatorWithdraw(address to,uint256 amount,uint256 depositId,bytes32 jobId) external'
];

/**
 * Send funds from the escrow contract to a new unlinker-generated address.
 *
 * @param {string} newAddress - Destination address.
 * @param {bigint} amount - Amount to withdraw in wei.
 * @param {string|null} depositIdString - Escrow depositId associated with this withdrawal (stringified uint256).
 * @param {string} jobId - Local job ID, used to derive a unique on-chain jobId bytes32.
 * @returns {Promise<string>} Transaction hash.
 */
export async function sendFundsToNewAddress(newAddress, amount, depositIdString, jobId) {
  const rpcUrl = process.env.CHAIN_RPC;
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY;

  if (!rpcUrl || !contractAddress || !operatorKey) {
    throw new Error(
      'Missing CHAIN_RPC, ESCROW_CONTRACT_ADDRESS or OPERATOR_PRIVATE_KEY env vars'
    );
  }

  if (!ethers.isAddress(contractAddress)) {
    throw new Error(
      `Invalid ESCROW_CONTRACT_ADDRESS: "${contractAddress}". It must be a 0x-prefixed hex address, not ENS.`
    );
  }

  if (!ethers.isAddress(newAddress)) {
    throw new Error(
      `Invalid destination address: "${newAddress}". It must be a 0x-prefixed hex address.`
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(operatorKey, provider);
  const contract = new ethers.Contract(contractAddress, ESCROW_ABI, wallet);

  // Fallback depositId to zero if missing (for older sessions). The contract
  // does not enforce any specific semantics on depositId beyond logging.
  let depositId = 0n;
  if (depositIdString != null) {
    try {
      depositId = BigInt(depositIdString);
    } catch (e) {
      logger.warn('Failed to parse depositId string; defaulting to 0', {
        depositIdString,
        error: /** @type {Error} */ (e).message
      });
    }
  }

  // Derive a deterministic bytes32 jobId from the local UUID.
  const jobIdBytes32 = ethers.id(jobId);

  logger.info('Sending funds to new address', {
    to: newAddress,
    amount: amount.toString(),
    depositId: depositId.toString(),
    jobId,
    jobIdBytes32
  });

  const tx = await contract.operatorWithdraw(newAddress, amount, depositId, jobIdBytes32);
  logger.info('Submitted withdrawal transaction', { hash: tx.hash });

  const receipt = await tx.wait();
  if (receipt.status !== 1n) {
    logger.error('Withdrawal transaction failed', {
      hash: tx.hash,
      status: receipt.status
    });
    throw new Error('Withdrawal transaction failed');
  }

  logger.info('Withdrawal transaction confirmed', { hash: tx.hash });
  return tx.hash;
}

/**
 * Fund a freshly generated address with a small amount of native gas token
 * (Base Sepolia ETH in this deployment) so it can pay for its own transactions.
 *
 * By default this sends 0.01 ETH unless a different amount is specified.
 *
 * @param {string} newAddress - Destination address to fund.
 * @param {string} [amountEther='0.01'] - Amount in ETH as a decimal string.
 * @returns {Promise<string>} Transaction hash.
 */
export async function fundAddressWithGas(newAddress, amountEther = '0.01') {
  const rpcUrl = process.env.CHAIN_RPC;
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY;

  if (!rpcUrl || !operatorKey) {
    throw new Error('Missing CHAIN_RPC or OPERATOR_PRIVATE_KEY env vars');
  }

  if (!ethers.isAddress(newAddress)) {
    throw new Error(
      `Invalid destination address for gas funding: "${newAddress}". It must be a 0x-prefixed hex address.`
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(operatorKey, provider);

  const value = ethers.parseEther(amountEther);

  logger.info('Funding new wallet with gas', {
    to: newAddress,
    amountEther
  });

  const tx = await wallet.sendTransaction({
    to: newAddress,
    value
  });

  logger.info('Submitted gas funding transaction', { hash: tx.hash });

  const receipt = await tx.wait();
  if (receipt.status !== 1n) {
    logger.error('Gas funding transaction failed', {
      hash: tx.hash,
      status: receipt.status
    });
    throw new Error('Gas funding transaction failed');
  }

  logger.info('Gas funding transaction confirmed', { hash: tx.hash });
  return tx.hash;
}



