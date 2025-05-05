import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';
import { type PublicClient } from './types.js';
import { namehash, normalize } from 'viem/ens';

// ENS Registry ABI
const REGISTRY_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' }
    ],
    name: 'owner',
    outputs: [
      { name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' }
    ],
    name: 'resolver',
    outputs: [
      { name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ENS Resolver ABI
const RESOLVER_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' }
    ],
    name: 'addr',
    outputs: [
      { name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' }
    ],
    name: 'name',
    outputs: [
      { name: '', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ENS Contract Addresses
const ENS_CONTRACTS = {
  mainnet: {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    publicResolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41'
  }
} as const;

/**
 * Gets the owner of an ENS name
 * @param name The ENS name
 * @param client The public client to use for the query
 * @returns The owner's address
 */
async function getOwner(
  name: string,
  client: PublicClient
): Promise<`0x${string}`> {
  try {
    const node = namehash(name);
    return await client.readContract({
      address: ENS_CONTRACTS.mainnet.registry as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: 'owner',
      args: [node]
    });
  } catch (error) {
    throw new Error(`Failed to get owner: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets the resolver address for an ENS name
 * @param name The ENS name
 * @param client The public client to use for the query
 * @returns The resolver's address
 */
async function getResolver(
  name: string,
  client: PublicClient
): Promise<`0x${string}`> {
  try {
    const node = namehash(name);
    return await client.readContract({
      address: ENS_CONTRACTS.mainnet.registry as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: 'resolver',
      args: [node]
    });
  } catch (error) {
    throw new Error(`Failed to get resolver: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets the address for an ENS name
 * @param name The ENS name
 * @param client The public client to use for the query
 * @returns The address
 */
async function getAddress(
  name: string,
  client: PublicClient
): Promise<`0x${string}`> {
  try {
    const node = namehash(name);
    const resolver = await getResolver(name, client);
    if (resolver === '0x0000000000000000000000000000000000000000') {
      throw new Error('No resolver set for this name');
    }
    return await client.readContract({
      address: resolver,
      abi: RESOLVER_ABI,
      functionName: 'addr',
      args: [node]
    });
  } catch (error) {
    throw new Error(`Failed to get address: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets the name for an address
 * @param address The address
 * @param client The public client to use for the query
 * @returns The ENS name
 */
async function getName(
  address: `0x${string}`,
  client: PublicClient
): Promise<string> {
  try {
    const reverseNode = namehash(`${address.slice(2)}.addr.reverse`);
    const resolver = await getResolver(`${address.slice(2)}.addr.reverse`, client);
    if (resolver === '0x0000000000000000000000000000000000000000') {
      throw new Error('No reverse record set for this address');
    }
    return await client.readContract({
      address: resolver,
      abi: RESOLVER_ABI,
      functionName: 'name',
      args: [reverseNode]
    });
  } catch (error) {
    throw new Error(`Failed to get name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets all names owned by an address
 * @param address The address to query
 * @param client The public client to use for the query
 * @returns Array of owned names
 */
async function getNamesByAddress(
  address: `0x${string}`,
  client: PublicClient
): Promise<string[]> {
  // Note: This is a simplified version. In reality, you would need to:
  // 1. Query the ENS subgraph for all names owned by the address
  // 2. Or maintain your own index of names
  // 3. Or use a service like Etherscan's API
  
  // For now, we'll just return the reverse record if it exists
  try {
    const name = await getName(address, client);
    return [name];
  } catch {
    return [];
  }
}

/**
 * Gets all addresses for a name
 * @param name The name to query
 * @param client The public client to use for the query
 * @returns Array of addresses
 */
async function getAddressesByName(
  name: string,
  client: PublicClient
): Promise<`0x${string}`[]> {
  try {
    const address = await getAddress(name, client);
    return [address];
  } catch {
    return [];
  }
}

async function main() {
  console.log('ENS Name Query Tool');
  console.log('==================');

  // Get the query parameter
  const query = process.argv[2];
  if (!query) {
    console.error('Please provide an ENS name or Ethereum address to query');
    process.exit(1);
  }

  try {
    const { publicClient } = await getClients(mainnet);

    // Check if the query is an address
    if (query.startsWith('0x') && query.length === 42) {
      console.log(`\nQuerying names for address: ${query}`);
      
      // Get names owned by address
      const names = await getNamesByAddress(query as `0x${string}`, publicClient);
      
      if (names.length === 0) {
        console.log('No names found for this address');
      } else {
        console.log('\nNames owned by address:');
        names.forEach(name => console.log(`- ${name}`));
      }

      // Get reverse record
      try {
        const reverseName = await getName(query as `0x${string}`, publicClient);
        console.log(`\nReverse record: ${reverseName}`);
      } catch {
        console.log('\nNo reverse record set');
      }

    } else {
      // Query is a name
      console.log(`\nQuerying information for name: ${query}`);
      
      // Get owner
      try {
        const owner = await getOwner(query, publicClient);
        console.log(`\nOwner: ${owner}`);
      } catch (error) {
        console.log('\nOwner: Not found or invalid name');
      }

      // Get address
      try {
        const address = await getAddress(query, publicClient);
        console.log(`Address: ${address}`);
      } catch (error) {
        console.log('Address: Not set');
      }

      // Get resolver
      try {
        const resolver = await getResolver(query, publicClient);
        console.log(`Resolver: ${resolver}`);
      } catch (error) {
        console.log('Resolver: Not set');
      }
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 