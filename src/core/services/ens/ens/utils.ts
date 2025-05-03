import { getPublicClient, getWalletClient } from '../clients.js';
import { type PublicClient, type WalletClient, type Chain } from './types.js';
import { mainnet } from 'viem/chains';

// ENS Registry address
export const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;

/**
 * Utility function to get initialized clients for a network
 * @param network Network name or chain
 * @returns Object containing public and wallet clients
 */
export async function getClients(network: string | Chain = mainnet) {
  const publicClient = getPublicClient(typeof network === 'string' ? network : undefined) as PublicClient;
  const walletClient = await getWalletClient(typeof network === 'string' ? network : undefined) as WalletClient;
  return { publicClient, walletClient };
} 