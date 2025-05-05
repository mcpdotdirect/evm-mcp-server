import { getPublicClient } from '../../clients.js';
import { type PublicClient, type Chain } from './types.js';
import { mainnet } from 'viem/chains';

// ENS Registry address
export const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;

/**
 * Utility function to get initialized clients for a network
 * @param network Network name or chain
 * @returns Object containing public client
 */
export async function getClients(network: string | Chain = mainnet) {
  const publicClient = getPublicClient(typeof network === 'string' ? network : undefined) as PublicClient;
  return { publicClient };
} 