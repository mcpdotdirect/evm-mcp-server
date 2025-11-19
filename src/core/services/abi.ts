import { type Address } from 'viem';

/**
 * Fetch contract ABI from Etherscan API
 * Requires ETHERSCAN_API_KEY environment variable to be set
 *
 * @param contractAddress The contract address to fetch ABI for
 * @param network The network to use (etherscan, polygonscan, etc.)
 * @returns The contract ABI as a JSON string
 */
export async function fetchContractABI(
  contractAddress: Address,
  network: string = 'ethereum'
): Promise<string> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    throw new Error('ETHERSCAN_API_KEY environment variable is not set. Set it to fetch contract ABIs.');
  }

  // Map network names to Etherscan-compatible API domains
  const networkMap: { [key: string]: string } = {
    'ethereum': 'https://api.etherscan.io',
    'sepolia': 'https://api-sepolia.etherscan.io',
    'polygon': 'https://api.polygonscan.com',
    'mumbai': 'https://api-testnet.polygonscan.com',
    'arbitrum': 'https://api.arbiscan.io',
    'arbitrum-sepolia': 'https://api-sepolia.arbiscan.io',
    'optimism': 'https://api-optimistic.etherscan.io',
    'optimism-sepolia': 'https://api-sepolia-optimistic.etherscan.io',
    'base': 'https://api.basescan.org',
    'base-sepolia': 'https://api-sepolia.basescan.org',
    'avalanche': 'https://api.snowtrace.io',
    'avalanche-fuji': 'https://api-testnet.snowtrace.io',
  };

  const apiUrl = networkMap[network.toLowerCase()];
  if (!apiUrl) {
    throw new Error(`Network "${network}" is not supported for ABI fetching. Supported: ${Object.keys(networkMap).join(', ')}`);
  }

  try {
    const url = new URL(`${apiUrl}/api`);
    url.searchParams.set('module', 'contract');
    url.searchParams.set('action', 'getabi');
    url.searchParams.set('address', contractAddress);
    url.searchParams.set('apikey', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json() as any;

    if (data.status === '0') {
      throw new Error(data.result || 'Failed to fetch ABI from block explorer');
    }

    if (!data.result) {
      throw new Error('No ABI found for this contract. Contract might not be verified.');
    }

    return data.result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ABI: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse and validate an ABI JSON string
 * @param abiJson The ABI as a JSON string
 * @returns Parsed ABI array
 */
export function parseABI(abiJson: string): any[] {
  try {
    const abi = JSON.parse(abiJson);
    if (!Array.isArray(abi)) {
      throw new Error('ABI must be a JSON array');
    }
    return abi;
  } catch (error) {
    throw new Error(`Invalid ABI JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get list of readable functions from an ABI
 * @param abi The contract ABI
 * @returns Array of read-only function names
 */
export function getReadableFunctions(abi: any[]): string[] {
  return abi
    .filter(item =>
      item.type === 'function' &&
      (item.stateMutability === 'view' || item.stateMutability === 'pure')
    )
    .map(item => item.name)
    .filter(Boolean);
}

/**
 * Get a specific function from an ABI
 * @param abi The contract ABI
 * @param functionName The function name to find
 * @returns The function ABI object
 */
export function getFunctionFromABI(abi: any[], functionName: string): any {
  const fn = abi.find(item =>
    item.type === 'function' && item.name === functionName
  );

  if (!fn) {
    throw new Error(`Function "${functionName}" not found in ABI`);
  }

  return fn;
}
