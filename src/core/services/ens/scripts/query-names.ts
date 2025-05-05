import { getClients } from '../utils.js';
import { mainnet, goerli } from 'viem/chains';
import { type PublicClient } from './types.js';
import { namehash, normalize } from 'viem/ens';
import { GraphQLClient } from 'graphql-request';

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
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' }
    ],
    name: 'text',
    outputs: [
      { name: '', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'coinType', type: 'uint256' }
    ],
    name: 'addr',
    outputs: [
      { name: '', type: 'bytes' }
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
  },
  goerli: {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    publicResolver: '0x4B1488B7a6B320d2D721406204aBc3eeAa9AD329'
  }
} as const;

// ENS Subgraph URLs
const SUBGRAPH_URLS = {
  mainnet: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
  goerli: 'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli'
} as const;

// Common text record keys
const TEXT_RECORDS = [
  'url',
  'email',
  'avatar',
  'description',
  'notice',
  'keywords',
  'com.twitter',
  'com.github',
  'com.discord',
  'com.reddit',
  'com.telegram',
  'org.website',
  'io.github',
  'io.keybase'
] as const;

// Common coin types
const COIN_TYPES = {
  ETH: 60,
  BTC: 0,
  LTC: 2,
  DOGE: 3,
  XRP: 144,
  BCH: 145,
  DOT: 354,
  SOL: 501
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
 * Gets text records for an ENS name
 * @param name The ENS name
 * @param client The public client to use for the query
 * @returns Object containing text records
 */
async function getTextRecords(
  name: string,
  client: PublicClient
): Promise<Record<string, string>> {
  try {
    const node = namehash(name);
    const resolver = await getResolver(name, client);
    if (resolver === '0x0000000000000000000000000000000000000000') {
      throw new Error('No resolver set for this name');
    }

    const records: Record<string, string> = {};
    for (const key of TEXT_RECORDS) {
      try {
        const value = await client.readContract({
          address: resolver,
          abi: RESOLVER_ABI,
          functionName: 'text',
          args: [node, key]
        });
        if (value) {
          records[key] = value;
        }
      } catch {
        // Skip if record doesn't exist
      }
    }
    return records;
  } catch (error) {
    throw new Error(`Failed to get text records: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets multi-coin addresses for an ENS name
 * @param name The ENS name
 * @param client The public client to use for the query
 * @returns Object containing addresses by coin type
 */
async function getMultiCoinAddresses(
  name: string,
  client: PublicClient
): Promise<Record<string, string>> {
  try {
    const node = namehash(name);
    const resolver = await getResolver(name, client);
    if (resolver === '0x0000000000000000000000000000000000000000') {
      throw new Error('No resolver set for this name');
    }

    const addresses: Record<string, string> = {};
    for (const [coin, type] of Object.entries(COIN_TYPES)) {
      try {
        const value = await client.readContract({
          address: resolver,
          abi: RESOLVER_ABI,
          functionName: 'addr',
          args: [node, BigInt(type)]
        });
        if (value) {
          addresses[coin] = value;
        }
      } catch {
        // Skip if address doesn't exist
      }
    }
    return addresses;
  } catch (error) {
    throw new Error(`Failed to get multi-coin addresses: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets all names owned by an address using the ENS subgraph
 * @param address The address to query
 * @param network The network to query (mainnet or goerli)
 * @returns Array of owned names
 */
async function getNamesByAddressFromSubgraph(
  address: `0x${string}`,
  network: 'mainnet' | 'goerli'
): Promise<string[]> {
  try {
    const client = new GraphQLClient(SUBGRAPH_URLS[network]);
    const query = `
      query GetNames($address: String!) {
        domains(where: { owner: $address }) {
          name
        }
      }
    `;
    const result = await client.request(query, { address: address.toLowerCase() });
    return result.domains.map((domain: { name: string }) => domain.name);
  } catch (error) {
    throw new Error(`Failed to query subgraph: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('ENS Name Query Tool');
  console.log('==================');

  // Get the query parameters
  const network = process.argv[2] === 'goerli' ? 'goerli' : 'mainnet';
  const query = process.argv[3];
  const batch = process.argv[4] === '--batch';

  if (!query) {
    console.error('Please provide an ENS name or Ethereum address to query');
    console.error('Usage:');
    console.error('  Query single name/address:');
    console.error('    bun run src/core/services/ens/scripts/query-names.ts [network] <name|address>');
    console.error('  Query multiple names/addresses:');
    console.error('    bun run src/core/services/ens/scripts/query-names.ts [network] <name1|address1,name2|address2,...> --batch');
    console.error('\nExamples:');
    console.error('  Query a single name:');
    console.error('    bun run src/core/services/ens/scripts/query-names.ts mainnet vitalik.eth');
    console.error('  Query a single address:');
    console.error('    bun run src/core/services/ens/scripts/query-names.ts goerli 0x1234...');
    console.error('  Batch query multiple names:');
    console.error('    bun run src/core/services/ens/scripts/query-names.ts mainnet vitalik.eth,example.eth --batch');
    process.exit(1);
  }

  try {
    const { publicClient } = await getClients(network === 'mainnet' ? mainnet : goerli);
    const queries = batch ? query.split(',') : [query];

    for (const q of queries) {
      console.log(`\nQuerying ${q} on ${network}...`);

      // Check if the query is an address
      if (q.startsWith('0x') && q.length === 42) {
        console.log(`\nQuerying names for address: ${q}`);
        
        // Get names from subgraph
        const names = await getNamesByAddressFromSubgraph(q as `0x${string}`, network);
        
        if (names.length === 0) {
          console.log('No names found for this address');
        } else {
          console.log('\nNames owned by address:');
          names.forEach(name => console.log(`- ${name}`));
        }

        // Get reverse record
        try {
          const reverseName = await getName(q as `0x${string}`, publicClient);
          console.log(`\nReverse record: ${reverseName}`);
        } catch {
          console.log('\nNo reverse record set');
        }

      } else {
        // Query is a name
        console.log(`\nQuerying information for name: ${q}`);
        
        // Get owner
        try {
          const owner = await getOwner(q, publicClient);
          console.log(`\nOwner: ${owner}`);
        } catch (error) {
          console.log('\nOwner: Not found or invalid name');
        }

        // Get address
        try {
          const address = await getAddress(q, publicClient);
          console.log(`Address: ${address}`);
        } catch (error) {
          console.log('Address: Not set');
        }

        // Get resolver
        try {
          const resolver = await getResolver(q, publicClient);
          console.log(`Resolver: ${resolver}`);
        } catch (error) {
          console.log('Resolver: Not set');
        }

        // Get text records
        try {
          const textRecords = await getTextRecords(q, publicClient);
          if (Object.keys(textRecords).length > 0) {
            console.log('\nText Records:');
            Object.entries(textRecords).forEach(([key, value]) => {
              console.log(`- ${key}: ${value}`);
            });
          }
        } catch (error) {
          console.log('\nText Records: Not available');
        }

        // Get multi-coin addresses
        try {
          const addresses = await getMultiCoinAddresses(q, publicClient);
          if (Object.keys(addresses).length > 0) {
            console.log('\nMulti-coin Addresses:');
            Object.entries(addresses).forEach(([coin, address]) => {
              console.log(`- ${coin}: ${address}`);
            });
          }
        } catch (error) {
          console.log('\nMulti-coin Addresses: Not available');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 