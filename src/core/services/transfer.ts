import { 
  parseUnits,
  type Address, 
  type Hash, 
  type Hex,
  getContract
} from 'viem';
import { getPublicClient, getWalletClient } from './clients.js';
import { resolveAddress } from './ens.js';

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

/** Parse a non-negative amount without rounding away fractional base units. */
export function parseExactAmount(amount: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error('Amount must be a non-negative decimal string');
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error('Invalid token decimals');
  }
  const fraction = (amount.split('.')[1] ?? '').replace(/0+$/, '');
  if (fraction.length > decimals) {
    throw new Error(`Amount exceeds ${decimals} decimal places; rounding is not allowed`);
  }
  const raw = parseUnits(amount, decimals);
  if (raw >= 2n ** 256n) {
    throw new Error('Amount exceeds uint256');
  }
  return raw;
}

export type TokenAmount = {
  raw: bigint;
  formatted: string;
  decimals: number;
};

/** Resolve token precision before confirmation and retain the exact execution amount. */
export async function prepareERC20Amount(
  tokenAddress: Address,
  amount: string,
  network = 'ethereum'
): Promise<TokenAmount> {
  const decimals = await getPublicClient(network).readContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    functionName: 'decimals'
  });
  return { raw: parseExactAmount(amount, decimals), formatted: amount, decimals };
}

/**
 * Transfer a chain's native token to an address
 * @param privateKey Sender's private key
 * @param toAddressOrEns Recipient address or ENS name
 * @param amount Amount to send in whole native-token units
 * @param network Network name or chain ID
 * @returns Transaction hash
 */
export async function transferETH(
  privateKey: string | Hex,
  toAddressOrEns: string,
  amount: string, // in whole native-token units
  network = 'ethereum'
): Promise<Hash> {
  // Resolve ENS name to address if needed
  const toAddress = await resolveAddress(toAddressOrEns, network);
  
  // Ensure the private key has 0x prefix
  const formattedKey = typeof privateKey === 'string' && !privateKey.startsWith('0x')
    ? `0x${privateKey}` as Hex
    : privateKey as Hex;
  
  const client = getWalletClient(formattedKey, network);
  const amountWei = parseExactAmount(amount, 18);
  
  return client.sendTransaction({
    to: toAddress,
    value: amountWei,
    account: client.account!,
    chain: client.chain
  });
}

/**
 * Transfer ERC20 tokens to an address
 * @param tokenAddressOrEns Token contract address or ENS name
 * @param toAddressOrEns Recipient address or ENS name
 * @param amount Exact token amount prepared before confirmation
 * @param privateKey Sender's private key
 * @param network Network name or chain ID
 * @returns Transaction details
 */
export async function transferERC20(
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  amount: TokenAmount,
  privateKey: string | `0x${string}`,
  network: string = 'ethereum'
): Promise<{
  txHash: Hash;
  amount: {
    raw: bigint;
    formatted: string;
  };
  token: {
    symbol: string;
    decimals: number;
  };
}> {
  // Resolve ENS names to addresses if needed
  const tokenAddress = await resolveAddress(tokenAddressOrEns, network) as Address;
  const toAddress = await resolveAddress(toAddressOrEns, network) as Address;
  
  // Ensure the private key has 0x prefix
  const formattedKey = typeof privateKey === 'string' && !privateKey.startsWith('0x')
    ? `0x${privateKey}` as `0x${string}`
    : privateKey as `0x${string}`;
  
  // Get token details
  const publicClient = getPublicClient(network);
  const contract = getContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    client: publicClient,
  });
  
  // Preserve the precision and base units that were confirmed.
  const decimals = amount.decimals;
  const symbol = await contract.read.symbol();
  
  // Use the exact base units prepared before confirmation.
  const rawAmount = amount.raw;
  
  // Create wallet client for sending the transaction
  const walletClient = getWalletClient(formattedKey, network);
  
  // Send the transaction
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    functionName: 'transfer',
    args: [toAddress, rawAmount],
    account: walletClient.account!,
    chain: walletClient.chain
  });
  
  return {
    txHash: hash,
    amount: {
      raw: rawAmount,
      formatted: amount.formatted
    },
    token: {
      symbol,
      decimals
    }
  };
}

/**
 * Approve ERC20 token spending
 * @param tokenAddressOrEns Token contract address or ENS name
 * @param spenderAddressOrEns Spender address or ENS name
 * @param amount Exact token amount prepared before confirmation
 * @param privateKey Owner's private key
 * @param network Network name or chain ID
 * @returns Transaction hash
 */
export async function approveERC20(
  tokenAddressOrEns: string,
  spenderAddressOrEns: string,
  amount: TokenAmount,
  privateKey: string | `0x${string}`,
  network: string = 'ethereum'
): Promise<Hash> {
  // Resolve ENS names to addresses if needed
  const tokenAddress = await resolveAddress(tokenAddressOrEns, network) as Address;
  const spenderAddress = await resolveAddress(spenderAddressOrEns, network) as Address;
  
  // Ensure the private key has 0x prefix
  const formattedKey = typeof privateKey === 'string' && !privateKey.startsWith('0x')
    ? `0x${privateKey}` as `0x${string}`
    : privateKey as `0x${string}`;
  
  // Use the base units bound to the accepted confirmation, without re-reading decimals.
  const rawAmount = amount.raw;
  
  // Create wallet client for sending the transaction
  const walletClient = getWalletClient(formattedKey, network);
  
  // Send the transaction
  return walletClient.writeContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    functionName: 'approve',
    args: [spenderAddress, rawAmount],
    account: walletClient.account!,
    chain: walletClient.chain
  });
}
