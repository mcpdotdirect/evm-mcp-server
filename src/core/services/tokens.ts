import {
  type Address,
  // type Hex, // Removed if unused locally, keep if used elsewhere in the file
  // type Hash, // Removed if unused locally, keep if used elsewhere in the file
  type Chain, // Added Chain type for network parameter
  formatUnits,
  getContract,
} from 'viem';
import { mainnet } from 'viem/chains'; // Import mainnet for default chain
import { getPublicClient } from './clients.js';

// Standard ERC20 ABI (minimal for reading)
const erc20Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'tokenURI',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Standard ERC1155 ABI (minimal for reading)
const erc1155Abi = [
  {
    inputs: [{ type: 'uint256', name: 'id' }],
    name: 'uri',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Retrieves core information for an ERC20 token contract.
 *
 * @param tokenAddress - The address of the ERC20 token contract.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to an object containing the token's name, symbol, decimals, total supply (raw and formatted).
 * @throws Throws an error if fetching token information fails (e.g., network issues, invalid address, contract doesn't support standard ERC20 functions).
 * @example
 * const usdcInfo = await getERC20TokenInfo('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'); // Mainnet USDC
 * const daiInfo = await getERC20TokenInfo('0x6B175474E89094C44Da98b954EedeAC495271d0F', mainnet);
 */
export async function getERC20TokenInfo(
  tokenAddress: Address,
  network: string | Chain = mainnet
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  formattedTotalSupply: string;
}> {
  const networkIdentifier = typeof network === 'string' ? network : network.name ?? `Chain ID ${network.id}`;
  try {
    const publicClient = getPublicClient(network);

    const contract = getContract({
      address: tokenAddress,
      abi: erc20Abi,
      client: publicClient,
    });

    // Fetch all properties concurrently
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.read.name(),
      contract.read.symbol(),
      contract.read.decimals(),
      contract.read.totalSupply(),
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply,
      formattedTotalSupply: formatUnits(totalSupply, decimals),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ERC20 token info for ${tokenAddress} on network "${networkIdentifier}". Reason: ${message} [Error Code: GetERC20Info_General_001]`
    );
  }
}

/**
 * Retrieves metadata for a specific ERC721 token (NFT).
 *
 * @param tokenAddress - The address of the ERC721 token contract.
 * @param tokenId - The ID of the specific token.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to an object containing the collection's name, symbol, and the specific token's URI.
 * @throws Throws an error if fetching token metadata fails (e.g., network issues, invalid address/tokenId, contract doesn't support standard ERC721 functions).
 * @example
 * const baycMetadata = await getERC721TokenMetadata('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', 1n); // BAYC #1 on Mainnet
 * const punkMetadata = await getERC721TokenMetadata('0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB', 100n, mainnet); // CryptoPunk #100
 */
export async function getERC721TokenMetadata(
  tokenAddress: Address,
  tokenId: bigint,
  network: string | Chain = mainnet
): Promise<{
  name: string;
  symbol: string;
  tokenURI: string;
}> {
  const networkIdentifier = typeof network === 'string' ? network : network.name ?? `Chain ID ${network.id}`;
  try {
    const publicClient = getPublicClient(network);

    const contract = getContract({
      address: tokenAddress,
      abi: erc721Abi,
      client: publicClient,
    });

    // Fetch all properties concurrently
    const [name, symbol, tokenURI] = await Promise.all([
      contract.read.name(),
      contract.read.symbol(),
      contract.read.tokenURI([tokenId]), // Pass tokenId as an array element
    ]);

    return {
      name,
      symbol,
      tokenURI,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ERC721 token metadata for token ID ${tokenId} at ${tokenAddress} on network "${networkIdentifier}". Reason: ${message} [Error Code: GetERC721Metadata_General_001]`
    );
  }
}

/**
 * Retrieves the URI for a specific ERC1155 token type.
 * Note: ERC1155 contracts often don't have collection-wide 'name' or 'symbol' functions.
 * The URI typically points to a JSON file containing metadata for that token ID.
 *
 * @param tokenAddress - The address of the ERC1155 token contract.
 * @param tokenId - The ID of the specific token type.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the token's URI string.
 * @throws Throws an error if fetching the token URI fails (e.g., network issues, invalid address/tokenId, contract doesn't support the standard ERC1155 'uri' function).
 * @example
 * const ensTokenURI = await getERC1155TokenURI('0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85', 12345n); // Example ENS (.eth) token on Mainnet
 * const gameItemURI = await getERC1155TokenURI('0x...', 99n, 'polygon');
 */
export async function getERC1155TokenURI(
  tokenAddress: Address,
  tokenId: bigint,
  network: string | Chain = mainnet
): Promise<string> {
  const networkIdentifier = typeof network === 'string' ? network : network.name ?? `Chain ID ${network.id}`;
  try {
    const publicClient = getPublicClient(network);

    const contract = getContract({
      address: tokenAddress,
      abi: erc1155Abi,
      client: publicClient,
    });

    // Fetch the URI
    const uri = await contract.read.uri([tokenId]); // Pass tokenId as an array element
    return uri;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ERC1155 token URI for token ID ${tokenId} at ${tokenAddress} on network "${networkIdentifier}". Reason: ${message} [Error Code: GetERC1155URI_General_001]`
    );
  }
}