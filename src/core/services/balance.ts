import {
  formatEther,
  formatUnits,
  type Address,
  type Abi,
  getContract,
  type Chain,
} from 'viem';
import { mainnet } from 'viem/chains';
import { getPublicClient } from './clients.js';
import { readContract } from './contracts.js';
import { resolveAddress } from './ens.js';

// Standard ERC20 ABI (minimal for reading)
const erc20Abi = [
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
    inputs: [{ type: 'address', name: 'account' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
  {
    inputs: [{ type: 'address', name: 'owner' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'ownerOf',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Standard ERC1155 ABI (minimal for reading)
const erc1155Abi = [
  {
    inputs: [
      { type: 'address', name: 'account' },
      { type: 'uint256', name: 'id' },
    ],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get the ETH balance for an address
 * @param addressOrEns Ethereum address or ENS name
 * @param network Network name or chain ID. Defaults to Ethereum mainnet.
 * @returns Balance in wei and ether
 */
export async function getETHBalance(
  addressOrEns: string,
  network: string | Chain = mainnet
): Promise<{ wei: bigint; ether: string }> {
  try {
    // Resolve ENS name to address if needed
    const address = await resolveAddress(addressOrEns, network);

    const client = getPublicClient(network);
    const balance = await client.getBalance({ address });

    return {
      wei: balance,
      ether: formatEther(balance),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ETH balance for "${addressOrEns}". Reason: ${message} [Error Code: GetETHBalance_General_001]`
    );
  }
}

/**
 * Get the balance of an ERC20 token for an address
 * @param tokenAddressOrEns Token contract address or ENS name
 * @param ownerAddressOrEns Owner address or ENS name
 * @param network Network name or chain ID. Defaults to Ethereum mainnet.
 * @returns Token balance with formatting information
 */
export async function getERC20Balance(
  tokenAddressOrEns: string,
  ownerAddressOrEns: string,
  network: string | Chain = mainnet
): Promise<{
  raw: bigint;
  formatted: string;
  token: {
    symbol: string;
    decimals: number;
  };
}> {
  try {
    // Resolve ENS names to addresses if needed
    const tokenAddress = await resolveAddress(tokenAddressOrEns, network);
    const ownerAddress = await resolveAddress(ownerAddressOrEns, network);

    const publicClient = getPublicClient(network);

    const contract = getContract({
      address: tokenAddress,
      abi: erc20Abi,
      client: publicClient,
    });

    const [balance, symbol, decimals] = await Promise.all([
      contract.read.balanceOf([ownerAddress]),
      contract.read.symbol(),
      contract.read.decimals(),
    ]);

    return {
      raw: balance,
      formatted: formatUnits(balance, decimals),
      token: {
        symbol,
        decimals,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ERC20 balance for token "${tokenAddressOrEns}" and owner "${ownerAddressOrEns}". Reason: ${message} [Error Code: GetERC20Balance_General_001]`
    );
  }
}

/**
 * Check if an address owns a specific NFT (ERC721)
 * @param tokenAddressOrEns NFT contract address or ENS name
 * @param ownerAddressOrEns Owner address or ENS name
 * @param tokenId Token ID to check
 * @param network Network name or chain ID. Defaults to Ethereum mainnet.
 * @returns True if the address owns the NFT
 */
export async function isNFTOwner(
  tokenAddressOrEns: string,
  ownerAddressOrEns: string,
  tokenId: bigint,
  network: string | Chain = mainnet
): Promise<boolean> {
  try {
    // Resolve ENS names to addresses if needed
    const tokenAddress = await resolveAddress(tokenAddressOrEns, network);
    const ownerAddress = await resolveAddress(ownerAddressOrEns, network);

    const actualOwner = (await readContract(
      {
        address: tokenAddress,
        abi: erc721Abi,
        functionName: 'ownerOf',
        args: [tokenId],
      },
      network
    )) as Address;

    return actualOwner.toLowerCase() === ownerAddress.toLowerCase();
  } catch (error: unknown) {
    // Check if the error indicates the token doesn't exist or owner query reverted,
    // which implies the ownerAddressOrEns is not the owner.
    // Specific error messages/codes depend on the RPC provider and contract implementation.
    // For now, re-throw a generic error, but this could be refined.
    const message = error instanceof Error ? error.message : String(error);
    // Example: A common error is 'ERC721: owner query for nonexistent token'
    if (message.includes('nonexistent token')) {
        return false; // Token doesn't exist, so the address can't be the owner.
    }
    // Consider logging the original error for debugging if needed: console.error(error);
    throw new Error(
      `Failed to check NFT ownership for token "${tokenAddressOrEns}", owner "${ownerAddressOrEns}", tokenId ${tokenId}. Reason: ${message} [Error Code: IsNFTOwner_General_001]`
    );
  }
}

/**
 * Get the number of NFTs (ERC721) owned by an address for a specific collection
 * @param tokenAddressOrEns NFT contract address or ENS name
 * @param ownerAddressOrEns Owner address or ENS name
 * @param network Network name or chain ID. Defaults to Ethereum mainnet.
 * @returns Number of NFTs owned
 */
export async function getERC721Balance(
  tokenAddressOrEns: string,
  ownerAddressOrEns: string,
  network: string | Chain = mainnet
): Promise<bigint> {
  try {
    // Resolve ENS names to addresses if needed
    const tokenAddress = await resolveAddress(tokenAddressOrEns, network);
    const ownerAddress = await resolveAddress(ownerAddressOrEns, network);

    return (await readContract(
      {
        address: tokenAddress,
        abi: erc721Abi,
        functionName: 'balanceOf',
        args: [ownerAddress],
      },
      network
    )) as Promise<bigint>;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ERC721 balance for token "${tokenAddressOrEns}" and owner "${ownerAddressOrEns}". Reason: ${message} [Error Code: GetERC721Balance_General_001]`
    );
  }
}

/**
 * Get the balance of an ERC1155 token for an address
 * @param tokenAddressOrEns ERC1155 contract address or ENS name
 * @param ownerAddressOrEns Owner address or ENS name
 * @param tokenId Token ID to check
 * @param network Network name or chain ID. Defaults to Ethereum mainnet.
 * @returns Token balance
 */
export async function getERC1155Balance(
  tokenAddressOrEns: string,
  ownerAddressOrEns: string,
  tokenId: bigint,
  network: string | Chain = mainnet
): Promise<bigint> {
  try {
    // Resolve ENS names to addresses if needed
    const tokenAddress = await resolveAddress(tokenAddressOrEns, network);
    const ownerAddress = await resolveAddress(ownerAddressOrEns, network);

    return (await readContract(
      {
        address: tokenAddress,
        abi: erc1155Abi,
        functionName: 'balanceOf',
        args: [ownerAddress, tokenId],
      },
      network
    )) as Promise<bigint>;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ERC1155 balance for token "${tokenAddressOrEns}", owner "${ownerAddressOrEns}", tokenId ${tokenId}. Reason: ${message} [Error Code: GetERC1155Balance_General_001]`
    );
  }
}