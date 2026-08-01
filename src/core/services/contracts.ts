import {
  type Address,
  type Hash,
  type Hex,
  type ReadContractParameters
} from 'viem';
import { getPublicClient, getWalletClient } from './clients.js';

/**
 * Read from a contract for a specific network
 */
export async function readContract(params: ReadContractParameters, network = 'ethereum') {
  const client = getPublicClient(network);
  return await client.readContract(params);
}

/**
 * Write to a contract for a specific network
 */
export async function writeContract(
  privateKey: Hex, 
  params: Record<string, any>, 
  network = 'ethereum'
): Promise<Hash> {
  const client = getWalletClient(privateKey, network);
  return await client.writeContract(params as any);
}

/**
 * Batch contract reads through Viem and Multicall3.
 * Viem may split large batches, and the selected chain needs a configured deployment.
 * @param contracts Array of contract calls to batch
 * @param allowFailure If true, returns partial results even if some calls fail
 * @param network Network name or chain ID
 * @returns Array of results with status
 */
export async function multicall(
  contracts: Array<{
    address: Address;
    abi: any[];
    functionName: string;
    args?: any[];
  }>,
  allowFailure = true,
  network = 'ethereum'
): Promise<any> {
  const client = getPublicClient(network);

  return await client.multicall({
    contracts: contracts as any,
    allowFailure
  });
}
