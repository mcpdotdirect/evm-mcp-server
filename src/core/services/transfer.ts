import {
  parseEther,
  parseUnits,
  type Address,
  type Hash,
  type Hex,
  getContract,
  type PublicClient, // Added for type clarity
  type WalletClient, // Added for type clarity
} from 'viem';
import { getPublicClient, getWalletClient } from './clients.js';
// Removed unused getChain import
import { resolveAddress } from './ens.js';

// --- ABIs remain unchanged ---

// Standard ERC20 ABI for transfers
const erc20TransferAbi = [
  {
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' }
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' }
    ],
    name: 'approve',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Standard ERC721 ABI for transfers
const erc721TransferAbi = [
  {
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'tokenId' }
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
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
    name: 'ownerOf',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC1155 ABI for transfers
const erc1155TransferAbi = [
  {
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'id' },
      { type: 'uint256', name: 'amount' },
      { type: 'bytes', name: 'data' }
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { type: 'address', name: 'account' },
      { type: 'uint256', name: 'id' }
    ],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;


// --- Helper Functions ---

/**
 * Ensures the private key string starts with '0x'.
 * @param key Private key as string or Hex.
 * @returns Private key as Hex.
 */
const ensureHexPrefix = (key: string | Hex): Hex => {
  if (typeof key === 'string' && !key.startsWith('0x')) {
    return `0x${key}` as Hex;
  }
  return key as Hex; // Already Hex or starts with 0x
};

/**
 * Resolves multiple addresses or ENS names concurrently.
 * @param addresses An object mapping labels to addresses/ENS names.
 * @param network Network name or chain ID.
 * @returns A promise resolving to an object mapping labels to resolved Addresses.
 * @throws If any address/ENS name fails to resolve.
 */
async function resolveMultipleAddresses(
  addresses: Record<string, string>,
  network: string
): Promise<Record<string, Address>> {
  const resolved: Record<string, Address> = {};
  const promises: Promise<void>[] = [];
  const errors: string[] = [];

  for (const label in addresses) {
    promises.push(
      resolveAddress(addresses[label], network)
        .then(addr => { resolved[label] = addr; })
        .catch(err => {
          errors.push(`Failed to resolve ${label} ('${addresses[label]}'): ${err.message}`);
        })
    );
  }

  await Promise.all(promises);

  if (errors.length > 0) {
    throw new Error(`Address resolution failed:\n- ${errors.join('\n- ')}`);
  }

  return resolved;
}


// --- Transfer Functions ---

/**
 * Transfer ETH to an address.
 * @param privateKey Sender's private key.
 * @param toAddressOrEns Recipient address or ENS name.
 * @param amount Amount to send in ETH string format (e.g., "0.1").
 * @param network Network name or chain ID (defaults to 'ethereum').
 * @returns Transaction hash.
 * @throws If address resolution or transaction fails.
 */
export async function transferETH(
  privateKey: string | Hex,
  toAddressOrEns: string,
  amount: string, // in ether
  network = 'ethereum'
): Promise<Hash> {
  let toAddress: Address;
  try {
    toAddress = await resolveAddress(toAddressOrEns, network);
  } catch (error: any) {
    console.error(`[transferETH] Failed to resolve recipient address/ENS '${toAddressOrEns}': ${error.message}`);
    throw new Error(`Invalid recipient address or ENS name: ${toAddressOrEns}`);
  }

  const formattedKey = ensureHexPrefix(privateKey);
  const walletClient = getWalletClient(formattedKey, network);
  const amountWei = parseEther(amount); // Can throw error if amount is invalid format

  if (!walletClient.account) {
      throw new Error("Wallet client account is not available. Check private key.");
  }

  try {
    const txHash = await walletClient.sendTransaction({
      to: toAddress,
      value: amountWei,
      account: walletClient.account, // Already checked for existence
      chain: walletClient.chain
    });
    console.log(`[transferETH] ETH transfer initiated. Tx Hash: ${txHash}`);
    return txHash;
  } catch (error: any) {
    console.error(`[transferETH] Transaction failed: ${error.message}`);
    // Consider logging more details from the error object if available
    throw new Error(`Failed to transfer ETH to ${toAddress}: ${error.shortMessage || error.message}`);
  }
}

/**
 * Transfer ERC20 tokens to an address.
 * @param tokenAddressOrEns Token contract address or ENS name.
 * @param toAddressOrEns Recipient address or ENS name.
 * @param amount Amount to send (in token's standard unit, e.g., "100").
 * @param privateKey Sender's private key.
 * @param network Network name or chain ID (defaults to 'ethereum').
 * @returns Transaction details including hash, amount, and token info.
 * @throws If address resolution, token detail fetching, or transaction fails.
 */
export async function transferERC20(
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  amount: string,
  privateKey: string | Hex,
  network: string = 'ethereum'
): Promise<{
  txHash: Hash;
  amount: {
    raw: bigint;
    formatted: string; // The input amount string
  };
  token: {
    symbol: string;
    decimals: number;
  };
}> {
  let resolvedAddresses: { tokenAddress: Address; toAddress: Address };
  try {
    resolvedAddresses = await resolveMultipleAddresses(
      { tokenAddress: tokenAddressOrEns, toAddress: toAddressOrEns },
      network
    );
  } catch (error: any) {
      console.error(`[transferERC20] Failed to resolve addresses: ${error.message}`);
      throw new Error(`Invalid token or recipient address/ENS name provided.`);
  }
  const { tokenAddress, toAddress } = resolvedAddresses;

  const formattedKey = ensureHexPrefix(privateKey);
  const publicClient = getPublicClient(network);
  const walletClient = getWalletClient(formattedKey, network);

  if (!walletClient.account) {
      throw new Error("Wallet client account is not available. Check private key.");
  }

  const contract = getContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    client: { public: publicClient }, // Use public client for reads
  });

  let decimals: number;
  let symbol: string;
  try {
    // Fetch token details concurrently
    [decimals, symbol] = await Promise.all([
      contract.read.decimals(),
      contract.read.symbol()
    ]);
    console.log(`[transferERC20] Token: ${symbol}, Decimals: ${decimals}`);
  } catch (error: any) {
    console.error(`[transferERC20] Failed to fetch token details for ${tokenAddress}: ${error.message}`);
    throw new Error(`Could not retrieve token details for ${tokenAddress}. Ensure it's a valid ERC20 contract.`);
  }

  let rawAmount: bigint;
  try {
      rawAmount = parseUnits(amount, decimals); // Can throw if amount format is wrong
  } catch (error: any) {
      console.error(`[transferERC20] Invalid amount format "${amount}" for ${decimals} decimals: ${error.message}`);
      throw new Error(`Invalid amount format: ${amount}`);
  }


  try {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20TransferAbi,
      functionName: 'transfer',
      args: [toAddress, rawAmount],
      account: walletClient.account,
      chain: walletClient.chain
    });
    console.log(`[transferERC20] ${symbol} transfer initiated. Tx Hash: ${hash}`);

    return {
      txHash: hash,
      amount: { raw: rawAmount, formatted: amount },
      token: { symbol, decimals }
    };
  } catch (error: any) {
    console.error(`[transferERC20] Transaction failed: ${error.message}`);
    throw new Error(`Failed to transfer ${amount} ${symbol} to ${toAddress}: ${error.shortMessage || error.message}`);
  }
}

/**
 * Approve ERC20 token spending for a spender.
 * @param tokenAddressOrEns Token contract address or ENS name.
 * @param spenderAddressOrEns Spender address or ENS name.
 * @param amount Amount to approve (in token's standard unit, e.g., "1000").
 * @param privateKey Owner's private key.
 * @param network Network name or chain ID (defaults to 'ethereum').
 * @returns Transaction details including hash, amount, and token info.
 * @throws If address resolution, token detail fetching, or transaction fails.
 */
export async function approveERC20(
  tokenAddressOrEns: string,
  spenderAddressOrEns: string,
  amount: string,
  privateKey: string | Hex,
  network: string = 'ethereum'
): Promise<{
  txHash: Hash;
  amount: {
    raw: bigint;
    formatted: string; // The input amount string
  };
  token: {
    symbol: string;
    decimals: number;
  };
}> {
    let resolvedAddresses: { tokenAddress: Address; spenderAddress: Address };
    try {
      resolvedAddresses = await resolveMultipleAddresses(
        { tokenAddress: tokenAddressOrEns, spenderAddress: spenderAddressOrEns },
        network
      );
    } catch (error: any) {
        console.error(`[approveERC20] Failed to resolve addresses: ${error.message}`);
        throw new Error(`Invalid token or spender address/ENS name provided.`);
    }
    const { tokenAddress, spenderAddress } = resolvedAddresses;

    const formattedKey = ensureHexPrefix(privateKey);
    const publicClient = getPublicClient(network);
    const walletClient = getWalletClient(formattedKey, network);

    if (!walletClient.account) {
        throw new Error("Wallet client account is not available. Check private key.");
    }

    const contract = getContract({
      address: tokenAddress,
      abi: erc20TransferAbi,
      client: { public: publicClient }, // Use public client for reads
    });

    let decimals: number;
    let symbol: string;
    try {
      [decimals, symbol] = await Promise.all([
        contract.read.decimals(),
        contract.read.symbol()
      ]);
      console.log(`[approveERC20] Token: ${symbol}, Decimals: ${decimals}`);
    } catch (error: any) {
      console.error(`[approveERC20] Failed to fetch token details for ${tokenAddress}: ${error.message}`);
      throw new Error(`Could not retrieve token details for ${tokenAddress}. Ensure it's a valid ERC20 contract.`);
    }

    let rawAmount: bigint;
    try {
        rawAmount = parseUnits(amount, decimals);
    } catch (error: any) {
        console.error(`[approveERC20] Invalid amount format "${amount}" for ${decimals} decimals: ${error.message}`);
        throw new Error(`Invalid amount format: ${amount}`);
    }

    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20TransferAbi,
        functionName: 'approve',
        args: [spenderAddress, rawAmount],
        account: walletClient.account,
        chain: walletClient.chain
      });
      console.log(`[approveERC20] ${symbol} approval for ${spenderAddress} initiated. Tx Hash: ${hash}`);

      return {
        txHash: hash,
        amount: { raw: rawAmount, formatted: amount },
        token: { symbol, decimals }
      };
    } catch (error: any) {
      console.error(`[approveERC20] Transaction failed: ${error.message}`);
      throw new Error(`Failed to approve ${amount} ${symbol} for ${spenderAddress}: ${error.shortMessage || error.message}`);
    }
}

/**
 * Transfer an NFT (ERC721) to an address.
 * @param tokenAddressOrEns NFT contract address or ENS name.
 * @param toAddressOrEns Recipient address or ENS name.
 * @param tokenId The specific ID of the token to transfer (as bigint).
 * @param privateKey Owner's private key.
 * @param network Network name or chain ID (defaults to 'ethereum').
 * @returns Transaction details including hash, token ID, and token metadata.
 * @throws If address resolution or transaction fails. Metadata fetching errors are logged as warnings.
 */
export async function transferERC721(
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  tokenId: bigint,
  privateKey: string | Hex,
  network: string = 'ethereum'
): Promise<{
  txHash: Hash;
  tokenId: string; // Return as string
  token: {
    name: string;
    symbol: string;
  };
}> {
    let resolvedAddresses: { tokenAddress: Address; toAddress: Address };
    try {
      resolvedAddresses = await resolveMultipleAddresses(
        { tokenAddress: tokenAddressOrEns, toAddress: toAddressOrEns },
        network
      );
    } catch (error: any) {
        console.error(`[transferERC721] Failed to resolve addresses: ${error.message}`);
        throw new Error(`Invalid token or recipient address/ENS name provided.`);
    }
    const { tokenAddress, toAddress } = resolvedAddresses;

    const formattedKey = ensureHexPrefix(privateKey);
    const publicClient = getPublicClient(network); // Needed for metadata later
    const walletClient = getWalletClient(formattedKey, network);

    if (!walletClient.account) {
        throw new Error("Wallet client account is not available. Check private key.");
    }
    const fromAddress = walletClient.account.address;

    let txHash: Hash;
    try {
      txHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc721TransferAbi,
        functionName: 'transferFrom',
        args: [fromAddress, toAddress, tokenId],
        account: walletClient.account,
        chain: walletClient.chain
      });
      console.log(`[transferERC721] Transfer initiated for token ID ${tokenId}. Tx Hash: ${txHash}`);
    } catch (error: any) {
      console.error(`[transferERC721] Transaction failed: ${error.message}`);
      throw new Error(`Failed to transfer NFT #${tokenId} from ${fromAddress} to ${toAddress}: ${error.shortMessage || error.message}`);
    }

    // Attempt to get token metadata after initiating transfer
    const contract = getContract({
      address: tokenAddress,
      abi: erc721TransferAbi,
      client: { public: publicClient },
    });

    let name = 'Unknown';
    let symbol = 'NFT';
    try {
      // Fetch concurrently, provide defaults on failure
      [name, symbol] = await Promise.all([
        contract.read.name().catch(() => 'Unknown'), // Default on error
        contract.read.symbol().catch(() => 'NFT')    // Default on error
      ]);
      console.log(`[transferERC721] Token Metadata: Name='${name}', Symbol='${symbol}'`);
    } catch (error: any) {
      // Should be caught by individual catches, but log just in case
      console.warn(`[transferERC721] Warning: Unexpected error fetching NFT metadata for ${tokenAddress}: ${error.message}`);
    }

    return {
      txHash,
      tokenId: tokenId.toString(),
      token: { name, symbol }
    };
}

/**
 * Transfer ERC1155 tokens to an address.
 * @param tokenAddressOrEns Token contract address or ENS name.
 * @param toAddressOrEns Recipient address or ENS name.
 * @param tokenId The specific ID of the token type to transfer (as bigint).
 * @param amount Amount to transfer (as a string representing an integer).
 * @param privateKey Owner's private key.
 * @param network Network name or chain ID (defaults to 'ethereum').
 * @returns Transaction details including hash, token ID, and amount.
 * @throws If address resolution, amount parsing, or transaction fails.
 */
export async function transferERC1155(
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  tokenId: bigint,
  amount: string, // Keep as string input for consistency
  privateKey: string | Hex,
  network: string = 'ethereum'
): Promise<{
  txHash: Hash;
  tokenId: string; // Return as string
  amount: string;  // Return original string amount
}> {
    let resolvedAddresses: { tokenAddress: Address; toAddress: Address };
    try {
      resolvedAddresses = await resolveMultipleAddresses(
        { tokenAddress: tokenAddressOrEns, toAddress: toAddressOrEns },
        network
      );
    } catch (error: any) {
        console.error(`[transferERC1155] Failed to resolve addresses: ${error.message}`);
        throw new Error(`Invalid token or recipient address/ENS name provided.`);
    }
    const { tokenAddress, toAddress } = resolvedAddresses;

    const formattedKey = ensureHexPrefix(privateKey);
    const walletClient = getWalletClient(formattedKey, network);

    if (!walletClient.account) {
        throw new Error("Wallet client account is not available. Check private key.");
    }
    const fromAddress = walletClient.account.address;

    let amountBigInt: bigint;
    try {
      amountBigInt = BigInt(amount); // Validate amount string can be converted
      if (amountBigInt <= 0n) {
        throw new Error("Amount must be a positive integer.");
      }
    } catch (error: any) {
        console.error(`[transferERC1155] Invalid amount specified: ${amount}. ${error.message}`);
        throw new Error(`Invalid amount: ${amount}. Must be a positive integer string.`);
    }

    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc1155TransferAbi,
        functionName: 'safeTransferFrom',
        // data field is typically '0x' unless specific receiver logic is needed
        args: [fromAddress, toAddress, tokenId, amountBigInt, '0x'],
        account: walletClient.account,
        chain: walletClient.chain
      });
      console.log(`[transferERC1155] Transfer initiated for ${amount} of token ID ${tokenId}. Tx Hash: ${hash}`);

      return {
        txHash: hash,
        tokenId: tokenId.toString(),
        amount // Return the original valid string amount
      };
    } catch (error: any) {
      console.error(`[transferERC1155] Transaction failed: ${error.message}`);
      throw new Error(`Failed to transfer ${amount} of token ID ${tokenId} to ${toAddress}: ${error.shortMessage || error.message}`);
    }
}