import { 
  parseEther,
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
  const amountWei = parseEther(amount);
  
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
 * @param amount Amount to send (in token units)
 * @param privateKey Sender's private key
 * @param network Network name or chain ID
 * @returns Transaction details
 */
export async function transferERC20(
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  amount: string,
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
  
  // Get token decimals and symbol
  const decimals = await contract.read.decimals();
  const symbol = await contract.read.symbol();
  
  // Parse the amount with the correct number of decimals
  const rawAmount = parseUnits(amount, decimals);
  
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
      formatted: amount
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
 * @param amount Amount to approve (in token units)
 * @param privateKey Owner's private key
 * @param network Network name or chain ID
 * @returns Transaction hash
 */
export async function approveERC20(
  tokenAddressOrEns: string,
  spenderAddressOrEns: string,
  amount: string,
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
  
  // Get token details
  const publicClient = getPublicClient(network);
  const contract = getContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    client: publicClient,
  });
  
  // Get token decimals
  const decimals = await contract.read.decimals();
  
  // Parse the amount with the correct number of decimals
  const rawAmount = parseUnits(amount, decimals);
  
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
