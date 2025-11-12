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
 * Get contract events/logs with filters
 * @param addressOrEns Contract address or ENS name
 * @param eventAbi Event ABI definition
 * @param fromBlock Starting block number or 'latest'
 * @param toBlock Ending block number or 'latest'
 * @param network Network name or chain ID
 * @returns Array of event logs
 */
export async function getContractEvents(
  addressOrEns: string,
  eventAbi: any,
  fromBlock: bigint | 'latest' = 'latest',
  toBlock: bigint | 'latest' = 'latest',
  network = 'ethereum'
): Promise<Log[]> {
  // Resolve ENS name to address if needed
  const address = await resolveAddress(addressOrEns, network);

  const client = getPublicClient(network);
  return await client.getLogs({
    address,
    event: eventAbi,
    fromBlock,
    toBlock
  });
}

/**
 * Batch read multiple contract calls
 * @param calls Array of contract read calls
 * @param network Network name or chain ID
 * @returns Array of results
 */
export async function batchReadContracts(
  calls: ReadContractParameters[],
  network = 'ethereum'
): Promise<any[]> {
  const client = getPublicClient(network);

  // Execute all calls in parallel
  const results = await Promise.allSettled(
    calls.map(call => client.readContract(call))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        result: result.value
      };
    } else {
      return {
        success: false,
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
} 