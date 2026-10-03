import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  type PublicClient,
  type WalletClient,
  type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChain, getRpcUrl } from '../chains.js';

// Cache for clients to avoid recreating them for each request
const clientCache = new Map<string, PublicClient>();

/**
 * Get a public client for a specific network
 */
export function getPublicClient(network = 'ethereum'): PublicClient {
  const cacheKey = String(network);
  
  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  // Create a new client
  const chain = getChain(network);
  const rpcUrl = getRpcUrl(network);
  
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
  
  // Cache the client
  clientCache.set(cacheKey, client);
  
  return client;
}

/**
 * Create a wallet client for a specific network and private key
 */
export function getWalletClient(privateKey: Hex, network = 'ethereum'): WalletClient {
  const chain = getChain(network);
  const rpcUrl = getRpcUrl(network);
  const account = privateKeyToAccount(privateKey);
  
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });
}
