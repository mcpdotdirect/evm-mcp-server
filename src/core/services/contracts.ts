import {
  type Address,
  type Hash,
  type Hex,
  type ReadContractParameters,
  type GetLogsParameters,
  type Log
} from 'viem';
import { getPublicClient, getWalletClient } from './clients.js';
import { resolveAddress } from './ens.js';

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
 * Get logs for a specific network
 */
export async function getLogs(params: GetLogsParameters, network = 'ethereum'): Promise<Log[]> {
  const client = getPublicClient(network);
  return await client.getLogs(params);
}

/**
 * Check if an address is a contract
 * @param addressOrEns Address or ENS name to check
 * @param network Network name or chain ID
 * @returns True if the address is a contract, false if it's an EOA
 */
export async function isContract(addressOrEns: string, network = 'ethereum'): Promise<boolean> {
  // Resolve ENS name to address if needed
  const address = await resolveAddress(addressOrEns, network);

  const client = getPublicClient(network);
  const code = await client.getBytecode({ address });
  return code !== undefined && code !== '0x';
}

/**
 * Batch multiple contract read calls into a single RPC request using Multicall3
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