import 'dotenv/config';
import crypto from 'crypto';
import { ethers } from 'ethers';

const {
  CHAIN_RPC,
  ESCROW_CONTRACT_ADDRESS,
  USDC_TOKEN_ADDRESS,
  USDC_DECIMALS,
  BACKEND_URL,
  TEST_USER_PRIVATE_KEY
} = process.env;

// Address to receive USDC back from the unlinker wallet (testnet sink)
const RETURN_USDC_TO = '0x325E5Bd3d7d12cA076D0A8f9f5Be7d1De1dd4c83';

const backendBaseUrl = BACKEND_URL || 'https://a814b95f67a3e08b65fb0c413f3dc917b80bea39-3000.dstack-pha-prod7.phala.network';

if (!CHAIN_RPC) {
  throw new Error('CHAIN_RPC env var is required');
}

if (!ESCROW_CONTRACT_ADDRESS) {
  throw new Error('ESCROW_CONTRACT_ADDRESS env var is required');
}

if (!USDC_TOKEN_ADDRESS) {
  throw new Error('USDC_TOKEN_ADDRESS env var is required');
}

// 1. Take a private key (from env TEST_USER_PRIVATE_KEY or CLI argument)
const rawUserPk = TEST_USER_PRIVATE_KEY || process.argv[2];
if (!rawUserPk) {
  throw new Error(
    'Provide the depositor private key via TEST_USER_PRIVATE_KEY env var or as the first CLI argument'
  );
}

const userPrivateKey = rawUserPk.startsWith('0x') ? rawUserPk : `0x${rawUserPk}`;

// Minimal ERC20 + EscrowPool ABIs for this test
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
  'function transfer(address to,uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
];

const ESCROW_POOL_ABI = ['function deposit(uint256 amount) external'];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Decode the mock TEE encrypted private key produced by generatePrivateKeyInsideTEE().
 *
 * The format is:
 *   base64( ephemeralKey(32) | iv(12) | authTag(16) | ciphertext )
 *
 * @param {string} encryptedKeyForUser
 * @returns {string} Ethereum private key (0x-prefixed hex)
 */
function decodeEncryptedPrivateKey(encryptedKeyForUser) {
  const buf = Buffer.from(encryptedKeyForUser, 'base64');
  if (buf.length < 32 + 12 + 16 + 1) {
    throw new Error('Encrypted key blob too short');
  }

  const ephemeralKey = buf.subarray(0, 32);
  const iv = buf.subarray(32, 44);
  const authTag = buf.subarray(44, 60);
  const ciphertext = buf.subarray(60);

  const decipher = crypto.createDecipheriv('aes-256-gcm', ephemeralKey, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // Stored as raw 32-byte key
  return `0x${plaintext.toString('hex')}`;
}

async function main() {
  console.log('--- Escrow end-to-end test script ---');

  const provider = new ethers.JsonRpcProvider(CHAIN_RPC);
  const userWallet = new ethers.Wallet(userPrivateKey, provider);

  console.log('User (depositor) address:', userWallet.address);

  const token = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, userWallet);
  const escrow = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_POOL_ABI, userWallet);

  // Resolve token decimals (defaulting to 6 if call fails)
  let decimals = 6;
  try {
    const onChainDecimals = await token.decimals();
    decimals = Number(onChainDecimals);
  } catch {
    if (USDC_DECIMALS) {
      decimals = Number(USDC_DECIMALS);
    }
  }

  // We test with a small 0.02 USDC deposit
  const depositAmount = ethers.parseUnits('0.02', decimals); // 0.02 USDC

  const [userEthBefore, userTokenBefore] = await Promise.all([
    provider.getBalance(userWallet.address),
    token.balanceOf(userWallet.address)
  ]);

  console.log(
    'User balances before:',
    '\n  ETH   =',
    ethers.formatEther(userEthBefore),
    '\n  USDC =',
    ethers.formatUnits(userTokenBefore, decimals)
  );

  // 3. Create the request to the backend for connecting wallet and depositing 2 USDC
  const message = `obscura unlinker test ${Date.now()}`;
  const signature = await userWallet.signMessage(message);

  console.log('\nCalling /api/request-wallet on backend:', backendBaseUrl);

  const reqWalletResp = await fetch(`${backendBaseUrl}/api/request-wallet`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      signature,
      depositAmount: depositAmount.toString()
    })
  });

  if (!reqWalletResp.ok) {
    const text = await reqWalletResp.text();
    throw new Error(`/api/request-wallet failed: ${reqWalletResp.status} ${text}`);
  }

  const { sessionToken, newAddress: unlinkerAddress } = await reqWalletResp.json();

  console.log('Session created:');
  console.log('  sessionToken    =', sessionToken);
  console.log('  unlinkerAddress =', unlinkerAddress);

  // 4. Make the on-chain deposit into the escrow contract
  console.log('\nApproving escrow contract to spend 0.02 USDC...');
  const approveTx = await token.approve(ESCROW_CONTRACT_ADDRESS, depositAmount);
  console.log('  approve tx hash:', approveTx.hash);
  await approveTx.wait();
  console.log('  approve confirmed');

  console.log('Calling EscrowPool.deposit(0.02 USDC)...');
  const depositTx = await escrow.deposit(depositAmount);
  console.log('  deposit tx hash:', depositTx.hash);
  await depositTx.wait();
  console.log('  deposit confirmed');

  // 5. Give the backend some time to detect the deposit and schedule withdrawal.
  console.log('\nWaiting ~10 seconds for server to detect deposit and queue withdrawal...');
  await sleep(10_000);

  // Optionally poll session status until completed or timeout (~2 minutes).
  const maxStatusChecks = 12;
  for (let i = 0; i < maxStatusChecks; i += 1) {
    const statusResp = await fetch(
      `${backendBaseUrl}/api/status?sessionToken=${encodeURIComponent(sessionToken)}`
    );

    if (!statusResp.ok) {
      const text = await statusResp.text();
      console.warn('  /api/status error:', statusResp.status, text);
      await sleep(10_000);
      continue;
    }

    const statusJson = await statusResp.json();
    console.log(
      `  status check #${i + 1}:`,
      statusJson.status,
      'withdrawTxHash =',
      statusJson.withdrawTxHash
    );

    if (statusJson.status === 'completed') {
      break;
    }

    await sleep(10_000);
  }

  // 6. Receive the new address and private key via /api/claim-wallet,
  //    then after 30 seconds check balances of the newly received account.
  console.log('\nCalling /api/claim-wallet to fetch unlinker wallet details...');
  const claimResp = await fetch(
    `${backendBaseUrl}/api/claim-wallet?sessionToken=${encodeURIComponent(sessionToken)}`
  );

  if (!claimResp.ok) {
    const text = await claimResp.text();
    throw new Error(`/api/claim-wallet failed: ${claimResp.status} ${text}`);
  }

  const claimJson = await claimResp.json();
  const { newAddress, encryptedKeyForUser } = claimJson;

  console.log('Claimed unlinker wallet:');
  console.log('  newAddress         =', newAddress);

  const unlinkerPrivateKey = decodeEncryptedPrivateKey(encryptedKeyForUser);
  const unlinkerWallet = new ethers.Wallet(unlinkerPrivateKey, provider);

  console.log('  derived from pk    =', unlinkerWallet.address);
  console.log('  unlinker priv key  =', unlinkerPrivateKey);

  console.log('\nWaiting 30 seconds before checking unlinker wallet balances...');
  await sleep(30_000);

  const [unlinkerEth, unlinkerToken] = await Promise.all([
    provider.getBalance(unlinkerWallet.address),
    token.balanceOf(unlinkerWallet.address)
  ]);

  console.log('\nUnlinker wallet balances:');
  console.log('  ETH   =', ethers.formatEther(unlinkerEth));
  console.log('  USDC =', ethers.formatUnits(unlinkerToken, decimals));

  // If the unlinker wallet holds any USDC, send it back to the configured address.
  if (unlinkerToken > 0n) {
    console.log(
      `\nTransferring ${ethers.formatUnits(
        unlinkerToken,
        decimals
      )} USDC from unlinker wallet back to ${RETURN_USDC_TO}...`
    );

    const unlinkerTokenContract = new ethers.Contract(
      USDC_TOKEN_ADDRESS,
      ERC20_ABI,
      unlinkerWallet
    );

    const returnTx = await unlinkerTokenContract.transfer(RETURN_USDC_TO, unlinkerToken);
    console.log('  return USDC tx hash:', returnTx.hash);
    await returnTx.wait();
    console.log('  return USDC transfer confirmed');
  } else {
    console.log('\nUnlinker wallet has 0 USDC; no return transfer performed.');
  }

  console.log('\n--- Test script complete ---');
}

main().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});


