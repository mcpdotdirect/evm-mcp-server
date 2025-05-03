import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Hex,
  type Address,
  type Chain, // Added Chain type
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains'; // Import mainnet for default chain
import { getChain, getRpcUrl } from '../chains.js';

// Cache for public clients to avoid recreating them for each request
// Key: Network identifier (string name or chain ID)
// Value: PublicClient instance
const publicClientCache = new Map<string | number, PublicClient>();

/**
 * Retrieves a cached or creates a new public client for a specific network.
 * Public clients are stateless and safe to reuse.
 *
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A configured PublicClient instance for the specified network.
 * @throws Throws an error if the network configuration cannot be resolved or the client fails to initialize.
 * @example
 * const mainnetClient = getPublicClient(); // Defaults to mainnet
 * const polygonClient = getPublicClient('polygon');
 * const optimismClient = getPublicClient(optimism); // Using Chain object
 */
export function getPublicClient(network: string | Chain = mainnet): PublicClient {
  // Determine a unique cache key based on network type
  const cacheKey = typeof network === 'string' ? network : network.id;

  // Return cached client if available
  if (publicClientCache.has(cacheKey)) {
    return publicClientCache.get(cacheKey)!;
  }

  try {
    // Resolve chain and RPC URL - these functions should handle invalid network inputs
    const chain = getChain(network);
    const rpcUrl = getRpcUrl(network); // Assumes getRpcUrl can handle Chain object or string/ID

    if (!chain || !rpcUrl) {
      // Added check for safety, although getChain/getRpcUrl should ideally throw
      throw new Error(`Could not resolve chain or RPC URL for network: ${cacheKey}`);
    }

    // Create a new public client
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
      // Consider adding batch options for performance if needed:
      // batch: { multicall: true },
    });

    // Cache the newly created client
    publicClientCache.set(cacheKey, client);

    return client;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Provide a more informative error message
    throw new Error(
      `Failed to create public client for network "${cacheKey}". Reason: ${message} [Error Code: GetPublicClient_Init_001]`
    );
  }
}

/**
 * Creates a new wallet client for a specific network and private key.
 * Wallet clients hold account state and are generally NOT cached/reused.
 * Create a new one for each distinct operation or context requiring a signer.
 *
 * @param privateKey - The private key of the account in hex format (0x...).
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A configured WalletClient instance for the specified account and network.
 * @throws Throws an error if the network configuration cannot be resolved, the private key is invalid, or the client fails to initialize.
 * @example
 * const walletClient = getWalletClient(process.env.PRIVATE_KEY); // Mainnet
 * const polygonWallet = getWalletClient(process.env.PRIVATE_KEY, 'polygon');
 */
export function getWalletClient(
  privateKey: Hex,
  network: string | Chain = mainnet
): WalletClient {
  try {
    // Resolve chain and RPC URL
    const chain = getChain(network);
    const rpcUrl = getRpcUrl(network); // Assumes getRpcUrl can handle Chain object or string/ID

    if (!chain || !rpcUrl) {
      const networkIdentifier = typeof network === 'string' ? network : network.id;
      throw new Error(`Could not resolve chain or RPC URL for network: ${networkIdentifier}`);
    }

    // Derive account from private key
    const account = privateKeyToAccount(privateKey);

    // Create a new wallet client (not cached)
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    return walletClient;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const networkIdentifier = typeof network === 'string' ? network : network.id ?? 'unknown';
    // Provide a more informative error message
    throw new Error(
      `Failed to create wallet client for network "${networkIdentifier}". Reason: ${message} [Error Code: GetWalletClient_Init_001]`
    );
  }
}

/**
 * Derives an Ethereum address from a private key.
 *
 * @param privateKey - The private key in hex format (must start with 0x).
 * @returns The corresponding Ethereum address (checksummed).
 * @throws Throws an error if the private key is invalid.
 * @example
 * const address = getAddressFromPrivateKey('0x...');
 */
export function getAddressFromPrivateKey(privateKey: Hex): Address {
  try {
    const account = privateKeyToAccount(privateKey);
    return account.address;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Provide a more informative error message
    throw new Error(
      `Failed to derive address from private key. Reason: ${message} [Error Code: GetAddress_Derive_001]`
    );
  }
}