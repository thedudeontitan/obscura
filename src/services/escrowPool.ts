/**
 * EscrowPool Smart Contract Service
 * Handles privacy-preserving deposits and withdrawals
 */

import { ethers } from 'ethers';
import { EscrowPoolABI, ERC20ABI } from '../contracts/abis';
import { getCurrentNetworkConfig, TOKEN_CONFIG } from '../contracts/config';

export interface DepositRecord {
  depositor: string;
  amount: string;
  timestamp: number;
  depositId: number;
}

export interface DepositResult {
  txHash: string;
  depositId: number;
  amount: string;
  receipt: ethers.TransactionReceipt;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  allowance: string;
}

export class EscrowPoolService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private escrowContract: ethers.Contract;
  private tokenContract: ethers.Contract;
  private networkConfig = getCurrentNetworkConfig();

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;

    this.escrowContract = new ethers.Contract(
      this.networkConfig.contracts.escrowPool.address,
      EscrowPoolABI,
      signer || provider
    );

    this.tokenContract = new ethers.Contract(
      this.networkConfig.contracts.collateralToken.address,
      ERC20ABI,
      signer || provider
    );
  }

  /**
   * Get token information (balance, allowance, etc.)
   */
  async getTokenInfo(userAddress: string): Promise<TokenInfo> {
    try {
      const [balance, allowance, decimals, symbol] = await Promise.all([
        this.tokenContract.balanceOf(userAddress),
        this.tokenContract.allowance(userAddress, this.escrowContract.target),
        this.tokenContract.decimals(),
        this.tokenContract.symbol(),
      ]);

      return {
        address: this.networkConfig.contracts.collateralToken.address,
        symbol,
        decimals: Number(decimals),
        balance: ethers.formatUnits(balance, decimals),
        allowance: ethers.formatUnits(allowance, decimals),
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      throw new Error('Failed to fetch token information');
    }
  }

  /**
   * Approve tokens for escrow contract
   */
  async approveTokens(amount: string, decimals: number = 6): Promise<ethers.TransactionReceipt> {
    if (!this.signer) {
      throw new Error('Signer required for approval');
    }

    try {
      const amountWei = ethers.parseUnits(amount, decimals);
      const tx = await this.tokenContract.approve(this.escrowContract.target, amountWei);

      console.log('Approval transaction sent:', tx.hash);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction failed');
      }

      console.log('Tokens approved successfully');
      return receipt;
    } catch (error) {
      console.error('Failed to approve tokens:', error);
      throw new Error('Failed to approve tokens for escrow');
    }
  }

  /**
   * Deposit tokens to escrow pool
   */
  async deposit(amount: string, decimals: number = 6): Promise<DepositResult> {
    if (!this.signer) {
      throw new Error('Signer required for deposit');
    }

    try {
      const amountWei = ethers.parseUnits(amount, decimals);

      // Check allowance first
      const userAddress = await this.signer.getAddress();
      const allowance = await this.tokenContract.allowance(userAddress, this.escrowContract.target);

      if (allowance < amountWei) {
        throw new Error('Insufficient token allowance. Please approve tokens first.');
      }

      // Get next deposit ID
      const nextDepositId = await this.escrowContract.nextDepositId();

      // Execute deposit
      const tx = await this.escrowContract.deposit(amountWei);
      console.log('Deposit transaction sent:', tx.hash);

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Parse deposit event
      const depositEvent = receipt.logs.find(log => {
        try {
          const parsed = this.escrowContract.interface.parseLog(log);
          return parsed?.name === 'Deposited';
        } catch {
          return false;
        }
      });

      let depositId = Number(nextDepositId);
      if (depositEvent) {
        const parsed = this.escrowContract.interface.parseLog(depositEvent);
        depositId = Number(parsed?.args?.depositId || nextDepositId);
      }

      console.log('Deposit successful:', { depositId, amount, txHash: tx.hash });

      return {
        txHash: tx.hash,
        depositId,
        amount,
        receipt,
      };
    } catch (error) {
      console.error('Failed to deposit:', error);
      throw new Error(`Failed to deposit to escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get deposit record by ID
   */
  async getDeposit(depositId: number): Promise<DepositRecord> {
    try {
      const deposit = await this.escrowContract.deposits(depositId);

      return {
        depositor: deposit.depositor,
        amount: deposit.amount.toString(),
        timestamp: Number(deposit.timestamp),
        depositId,
      };
    } catch (error) {
      console.error('Failed to get deposit:', error);
      throw new Error('Failed to fetch deposit record');
    }
  }

  /**
   * Get next deposit ID
   */
  async getNextDepositId(): Promise<number> {
    try {
      const nextId = await this.escrowContract.nextDepositId();
      return Number(nextId);
    } catch (error) {
      console.error('Failed to get next deposit ID:', error);
      throw new Error('Failed to fetch next deposit ID');
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      // This would need to be added to ABI if the contract exposes paused state
      // For now, we'll assume it's not paused
      return false;
    } catch (error) {
      console.error('Failed to check pause status:', error);
      return false;
    }
  }

  /**
   * Listen for deposit events
   */
  onDeposit(callback: (event: any) => void): () => void {
    const filter = this.escrowContract.filters.Deposited();

    const handleEvent = (from: string, amount: bigint, depositId: bigint, event: any) => {
      callback({
        from,
        amount: amount.toString(),
        depositId: Number(depositId),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    };

    this.escrowContract.on(filter, handleEvent);

    // Return cleanup function
    return () => {
      this.escrowContract.off(filter, handleEvent);
    };
  }

  /**
   * Listen for withdrawal events
   */
  onWithdrawal(callback: (event: any) => void): () => void {
    const filter = this.escrowContract.filters.Withdrawn();

    const handleEvent = (to: string, amount: bigint, depositId: bigint, jobId: string, event: any) => {
      callback({
        to,
        amount: amount.toString(),
        depositId: Number(depositId),
        jobId,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    };

    this.escrowContract.on(filter, handleEvent);

    // Return cleanup function
    return () => {
      this.escrowContract.off(filter, handleEvent);
    };
  }

  /**
   * Get contract addresses
   */
  getAddresses() {
    return {
      escrowPool: this.escrowContract.target,
      collateralToken: this.tokenContract.target,
    };
  }

  /**
   * Check if user needs to deposit for a session
   */
  async checkDepositRequirement(sessionId: string, userAddress: string): Promise<{
    needsDeposit: boolean;
    depositAmount?: string;
    depositId?: number;
  }> {
    try {
      // This would typically check with the backend service
      // to see if a deposit is required for the session
      // For now, we'll return a simple check
      return {
        needsDeposit: false,
      };
    } catch (error) {
      console.error('Failed to check deposit requirement:', error);
      throw new Error('Failed to check deposit requirement');
    }
  }
}