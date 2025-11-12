import { 
  type Address, 
  type Hash, 
  type TransactionReceipt,
  type EstimateGasParameters
} from 'viem';
import { getPublicClient } from './clients.js';

/**
 * Get a transaction by hash for a specific network
 */
export async function getTransaction(hash: Hash, network = 'ethereum') {
  const client = getPublicClient(network);
  return await client.getTransaction({ hash });
}

/**
 * Get a transaction receipt by hash for a specific network
 */
export async function getTransactionReceipt(hash: Hash, network = 'ethereum'): Promise<TransactionReceipt> {
  const client = getPublicClient(network);
  return await client.getTransactionReceipt({ hash });
}

/**
 * Get the transaction count for an address for a specific network
 */
export async function getTransactionCount(address: Address, network = 'ethereum'): Promise<number> {
  const client = getPublicClient(network);
  const count = await client.getTransactionCount({ address });
  return Number(count);
}

/**
 * Estimate gas for a transaction for a specific network
 */
export async function estimateGas(params: EstimateGasParameters, network = 'ethereum'): Promise<bigint> {
  const client = getPublicClient(network);
  return await client.estimateGas(params);
}

/**
 * Get the chain ID for a specific network
 */
export async function getChainId(network = 'ethereum'): Promise<number> {
  const client = getPublicClient(network);
  const chainId = await client.getChainId();
  return Number(chainId);
}

/**
 * Wait for a transaction to be confirmed
 * @param hash Transaction hash
 * @param network Network name or chain ID
 * @param confirmations Number of confirmations to wait for (default: 1)
 * @param timeout Timeout in milliseconds (default: 60000)
 * @returns Transaction receipt
 */
export async function waitForTransaction(
  hash: Hash,
  network = 'ethereum',
  confirmations = 1,
  timeout = 60000
): Promise<TransactionReceipt> {
  const client = getPublicClient(network);
  return await client.waitForTransactionReceipt({
    hash,
    confirmations,
    timeout
  });
}

/**
 * Get current gas price for a network
 * @param network Network name or chain ID
 * @returns Gas price in gwei and wei
 */
export async function getGasPrice(network = 'ethereum'): Promise<{
  wei: bigint;
  gwei: string;
}> {
  const client = getPublicClient(network);
  const gasPriceWei = await client.getGasPrice();

  // Convert to gwei (1 gwei = 1e9 wei)
  const gasPriceGwei = Number(gasPriceWei) / 1e9;

  return {
    wei: gasPriceWei,
    gwei: gasPriceGwei.toFixed(2)
  };
}

/**
 * Get fee history for a network (EIP-1559)
 * @param network Network name or chain ID
 * @param blockCount Number of blocks to analyze
 * @returns Fee history with base fee and priority fees
 */
export async function getFeeHistory(
  network = 'ethereum',
  blockCount = 10
): Promise<{
  baseFeePerGas: string[];
  gasUsedRatio: number[];
  oldestBlock: bigint;
  reward?: string[][];
}> {
  const client = getPublicClient(network);
  const feeHistory = await client.getFeeHistory({
    blockCount,
    rewardPercentiles: [25, 50, 75]
  });

  return {
    baseFeePerGas: feeHistory.baseFeePerGas.map(fee => fee.toString()),
    gasUsedRatio: feeHistory.gasUsedRatio,
    oldestBlock: feeHistory.oldestBlock,
    reward: feeHistory.reward?.map(r => r.map(fee => fee.toString()))
  };
}

/**
 * Get estimated gas fees for a transaction (EIP-1559)
 * @param network Network name or chain ID
 * @returns Estimated max fee per gas and max priority fee per gas
 */
export async function estimateFeesPerGas(network = 'ethereum'): Promise<{
  maxFeePerGas: {
    wei: bigint;
    gwei: string;
  };
  maxPriorityFeePerGas: {
    wei: bigint;
    gwei: string;
  };
}> {
  const client = getPublicClient(network);
  const fees = await client.estimateFeesPerGas();

  return {
    maxFeePerGas: {
      wei: fees.maxFeePerGas,
      gwei: (Number(fees.maxFeePerGas) / 1e9).toFixed(2)
    },
    maxPriorityFeePerGas: {
      wei: fees.maxPriorityFeePerGas,
      gwei: (Number(fees.maxPriorityFeePerGas) / 1e9).toFixed(2)
    }
  };
} 