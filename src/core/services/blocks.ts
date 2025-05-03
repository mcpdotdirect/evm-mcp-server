import {
  type Hash,
  type Block,
  type Chain, // Added Chain type for better network parameter typing
} from 'viem';
import { mainnet } from 'viem/chains'; // Import mainnet for default chain object
import { getPublicClient } from './clients.js';

/**
 * Retrieves the current block number for a specified network.
 *
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the latest block number as a bigint.
 * @throws Throws an error if fetching the block number fails, including network or client issues.
 * @example
 * const blockNumber = await getBlockNumber(); // Defaults to mainnet
 * const polygonBlockNumber = await getBlockNumber('polygon');
 * const optimismBlockNumber = await getBlockNumber(optimism); // Using Chain object
 */
export async function getBlockNumber(network: string | Chain = mainnet): Promise<bigint> {
  try {
    const client = getPublicClient(network);
    return await client.getBlockNumber();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Attempt to get a user-friendly network identifier
    const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
    // Provide a more informative error message with context and an error code
    throw new Error(
      `Failed to get block number for network "${networkIdentifier}". Reason: ${message} [Error Code: GetBlockNumber_General_001]`
    );
  }
}

/**
 * Retrieves a specific block by its number from a specified network.
 * Note: viem's `getBlock` can return `null` if the block is not found.
 *
 * @param blockNumber - The block number to retrieve (as a bigint).
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the Block object, or null if the block is not found.
 * @throws Throws an error if fetching the block fails for reasons other than not being found (e.g., network issues).
 * @example
 * const block = await getBlockByNumber(12345678n); // Mainnet block
 * const polygonBlock = await getBlockByNumber(98765432n, 'polygon');
 */
export async function getBlockByNumber(
  blockNumber: bigint, // Changed type from number to bigint for consistency with viem
  network: string | Chain = mainnet
): Promise<Block | null> { // Updated return type to reflect potential null return
  try {
    const client = getPublicClient(network);
    // `getBlock` returns `Block | null` according to viem types
    const block = await client.getBlock({ blockNumber });
    return block;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
    throw new Error(
      `Failed to get block by number ${blockNumber} for network "${networkIdentifier}". Reason: ${message} [Error Code: GetBlockByNumber_General_001]`
    );
  }
}

/**
 * Retrieves a specific block by its hash from a specified network.
 * Note: viem's `getBlock` can return `null` if the block is not found.
 *
 * @param blockHash - The hash of the block to retrieve.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the Block object, or null if the block is not found.
 * @throws Throws an error if fetching the block fails for reasons other than not being found (e.g., network issues).
 * @example
 * const block = await getBlockByHash('0x...'); // Mainnet block by hash
 * const arbitrumBlock = await getBlockByHash('0x...', 'arbitrum');
 */
export async function getBlockByHash(
  blockHash: Hash,
  network: string | Chain = mainnet
): Promise<Block | null> { // Updated return type to reflect potential null return
  try {
    const client = getPublicClient(network);
    // `getBlock` returns `Block | null` according to viem types
    const block = await client.getBlock({ blockHash });
    return block;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
    throw new Error(
      `Failed to get block by hash ${blockHash} for network "${networkIdentifier}". Reason: ${message} [Error Code: GetBlockByHash_General_001]`
    );
  }
}

/**
 * Retrieves the latest block from a specified network.
 *
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the latest Block object.
 * @throws Throws an error if fetching the latest block fails (e.g., network issues, node errors).
 * @example
 * const latestBlock = await getLatestBlock(); // Mainnet latest block
 * const latestPolygonBlock = await getLatestBlock('polygon');
 */
export async function getLatestBlock(network: string | Chain = mainnet): Promise<Block> {
  try {
    const client = getPublicClient(network);
    // Fetch the latest block by calling getBlock without specific identifiers
    const block = await client.getBlock();
    // Add a runtime check for robustness, although viem types suggest non-null for latest.
    if (!block) {
        const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
        // Throw a specific error if null is unexpectedly returned
        throw new Error(`Received null instead of the latest block object for network "${networkIdentifier}". This might indicate an issue with the RPC node or network. [Error Code: GetLatestBlock_NullResult_001]`);
    }
    return block;
  } catch (error: unknown) {
    // Avoid re-wrapping the custom error thrown above
    if (error instanceof Error && error.message.includes('[Error Code: GetLatestBlock_NullResult_001]')) {
        throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
    throw new Error(
      `Failed to get the latest block for network "${networkIdentifier}". Reason: ${message} [Error Code: GetLatestBlock_General_001]`
    );
  }
}