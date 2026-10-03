import { type Hash } from 'viem';
import { getPublicClient } from './clients.js';

/**
 * Get a transaction by hash for a specific network
 */
export async function getTransaction(hash: Hash, network = 'ethereum') {
  const client = getPublicClient(network);
  return await client.getTransaction({ hash });
}

/**
 * Get the chain ID for a specific network
 */
export async function getChainId(network = 'ethereum'): Promise<number> {
  const client = getPublicClient(network);
  const chainId = await client.getChainId();
  return Number(chainId);
}
