import { type Address, getContract } from 'viem';
import { getPublicClient } from './clients.js';

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'tokenURI',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * Get ERC721 token metadata
 */
export async function getERC721TokenMetadata(
  tokenAddress: Address,
  tokenId: bigint,
  network: string = 'ethereum'
): Promise<{
  name: string;
  symbol: string;
  tokenURI: string;
}> {
  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: erc721Abi,
    client: publicClient,
  });

  const [name, symbol, tokenURI] = await Promise.all([
    contract.read.name(),
    contract.read.symbol(),
    contract.read.tokenURI([tokenId])
  ]);

  return {
    name,
    symbol,
    tokenURI
  };
}
