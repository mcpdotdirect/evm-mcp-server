import {
  type Address,
  type Hash,
  type Transaction, // Added Transaction type for return value
  type TransactionReceipt,
  type EstimateGasParameters,
  type Chain, // Added Chain type for network parameter consistency
} from 'viem';
import { mainnet } from 'viem/chains'; // Import mainnet for default chain
import { getPublicClient } from './clients.js';

// Helper function for consistent network identifier in errors
function getNetworkIdentifier(network: string | Chain): string {
  return typeof network === 'string' ? network : network.name ?? `Chain ID ${network.id}`;
}

/**
 * Retrieves a transaction by its hash from a specified network.
 * Note: viem's `getTransaction` can return `null` if the transaction is not found or not yet mined.
 *
 * @param hash - The hash of the transaction to retrieve.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the Transaction object, or null if not found.
 * @throws Throws an error if fetching the transaction fails for reasons other than not being found (e.g., network issues).
 * @example
 * const tx = await getTransaction('0x...'); // Mainnet transaction
 * const polygonTx = await getTransaction('0x...', 'polygon');
 */
export async function getTransaction(
  hash: Hash,
  network: string | Chain = mainnet
): Promise<Transaction | null> { // Updated return type
  const networkIdentifier = getNetworkIdentifier(network);
  try {
    const client = getPublicClient(network);
    // `getTransaction` returns `Transaction | null` according to viem types
    const transaction = await client.getTransaction({ hash });
    return transaction;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get transaction ${hash} on network "${networkIdentifier}". Reason: ${message} [Error Code: GetTransaction_General_001]`
    );
  }
}

/**
 * Retrieves the receipt of a transaction by its hash from a specified network.
 * Waits for the transaction to be mined if it hasn't been already.
 * Note: viem's `getTransactionReceipt` can return `null` if the transaction is not found (e.g., hash is incorrect).
 *
 * @param hash - The hash of the transaction.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the TransactionReceipt object, or null if not found.
 * @throws Throws an error if fetching the transaction receipt fails (e.g., network issues, timeout).
 * @example
 * const receipt = await getTransactionReceipt('0x...'); // Mainnet receipt
 * const polygonReceipt = await getTransactionReceipt('0x...', 'polygon');
 */
export async function getTransactionReceipt(
  hash: Hash,
  network: string | Chain = mainnet
): Promise<TransactionReceipt | null> { // Updated return type
  const networkIdentifier = getNetworkIdentifier(network);
  try {
    const client = getPublicClient(network);
    // `getTransactionReceipt` returns `TransactionReceipt | null` according to viem types
    const receipt = await client.getTransactionReceipt({ hash });
    return receipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get transaction receipt for ${hash} on network "${networkIdentifier}". Reason: ${message} [Error Code: GetTransactionReceipt_General_001]`
    );
  }
}

/**
 * Retrieves the number of transactions sent from an address (nonce) on a specific network.
 *
 * @param address - The address to get the transaction count for.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the transaction count (nonce) as a number.
 * @throws Throws an error if fetching the transaction count fails (e.g., network issues, invalid address).
 * @example
 * const nonce = await getTransactionCount('0x...'); // Mainnet nonce
 * const polygonNonce = await getTransactionCount('0x...', 'polygon');
 */
export async function getTransactionCount(
  address: Address,
  network: string | Chain = mainnet
): Promise<number> {
  const networkIdentifier = getNetworkIdentifier(network);
  try {
    const client = getPublicClient(network);
    // `getTransactionCount` returns `number` directly
    const count = await client.getTransactionCount({ address });
    return count; // No need for Number() conversion
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get transaction count for address ${address} on network "${networkIdentifier}". Reason: ${message} [Error Code: GetTransactionCount_General_001]`
    );
  }
}

/**
 * Estimates the gas required for a transaction on a specific network.
 *
 * @param params - Parameters for the gas estimation, including `account`, `to`, `data`, `value`, etc.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the estimated gas amount as a bigint.
 * @throws Throws an error if gas estimation fails (e.g., transaction would revert, network issues, insufficient funds).
 * @example
 * const estimatedGas = await estimateGas({ account: '0x...', to: '0x...', value: parseEther('1') }); // Mainnet estimate
 * const polygonGas = await estimateGas({ account: '0x...', to: '0x...', data: '0x...' }, 'polygon');
 */
export async function estimateGas(
  params: EstimateGasParameters,
  network: string | Chain = mainnet
): Promise<bigint> {
  const networkIdentifier = getNetworkIdentifier(network);
  try {
    const client = getPublicClient(network);
    return await client.estimateGas(params);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Include relevant params in error if possible/safe (avoid logging private keys if `account` is an object)
    const toAddress = params.to ? `to ${params.to}` : '';
    const fromAddress = typeof params.account === 'string' ? `from ${params.account}` : (params.account?.address ? `from ${params.account.address}` : '');
    throw new Error(
      `Failed to estimate gas ${fromAddress} ${toAddress} on network "${networkIdentifier}". Reason: ${message} [Error Code: EstimateGas_General_001]`
    );
  }
}

/**
 * Retrieves the chain ID of the connected network client.
 *
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the chain ID as a number.
 * @throws Throws an error if fetching the chain ID fails (e.g., network issues).
 * @example
 * const chainId = await getChainId(); // Mainnet chain ID
 * const polygonChainId = await getChainId('polygon');
 */
export async function getChainId(network: string | Chain = mainnet): Promise<number> {
  const networkIdentifier = getNetworkIdentifier(network);
  try {
    const client = getPublicClient(network);
    // `getChainId` returns `number` directly
    const chainId = await client.getChainId();
    return chainId; // No need for Number() conversion
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get chain ID for network "${networkIdentifier}". Reason: ${message} [Error Code: GetChainId_General_001]`
    );
  }
}