import { getClients } from '../utils.js';
import { namehash, labelhash } from 'viem/ens';
import { GraphQLClient } from 'graphql-request';
import { LRUCache } from 'lru-cache';
import { RateLimiter } from 'limiter';

// Cache configuration
const CACHE_CONFIG = {
  max: 1000, // Maximum number of items in cache
  ttl: 1000 * 60 * 5, // 5 minutes TTL
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  tokensPerInterval: 10,
  interval: 'second'
};

// Performance metrics
interface QueryMetrics {
  queryType: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

// Initialize caches and rate limiters
const queryCache = new LRUCache<string, any>(CACHE_CONFIG);
const metrics: QueryMetrics[] = [];
const rateLimiter = new RateLimiter(RATE_LIMIT_CONFIG);

// Contract addresses
const CONTRACTS = {
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  nameWrapper: '0xD4416b13d2B3a9aBae7AcD5D6C2BbDBE25686401',
  baseRegistrar: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
  subgraph: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens'
} as const;

// Types for query results
type QueryResult = {
  name: string;
  owner?: string;
  resolver?: string;
  address?: string;
  registrationDate?: Date;
  expiryDate?: Date;
  wrapped?: boolean;
  ownedNames?: string[];
  textRecords?: Record<string, string>;
  contentHash?: string;
  reverseRecord?: string;
  subdomains?: string[];
  allRecords?: {
    texts?: Record<string, string>;
    addresses?: Record<string, string>;
    contentHash?: string;
  };
};

// Available query types
type QueryType = 
  | 'owner'
  | 'resolver'
  | 'address'
  | 'registration'
  | 'wrapped'
  | 'ownedNames'
  | 'textRecords'
  | 'contentHash'
  | 'reverseRecord'
  | 'subdomains'
  | 'allRecords';

// Query configuration
type QueryConfig = {
  name: string;
  queries: QueryType[];
};

// Initialize GraphQL client
const graphClient = new GraphQLClient(CONTRACTS.subgraph);

// Query handlers with caching and metrics
const queryHandlers: Record<QueryType, (name: string, client: any) => Promise<any>> = {
  owner: async (name: string, client: any) => {
    const cacheKey = `owner:${name}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();
    try {
      await rateLimiter.removeTokens(1);
      const node = namehash(name);
      const result = await client.readContract({
        address: CONTRACTS.registry as `0x${string}`,
        abi: [{
          inputs: [{ name: 'node', type: 'bytes32' }],
          name: 'owner',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'owner',
        args: [node]
      });
      
      queryCache.set(cacheKey, result);
      metrics.push({
        queryType: 'owner',
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date()
      });
      
      return result;
    } catch (error) {
      metrics.push({
        queryType: 'owner',
        duration: Date.now() - startTime,
        success: false,
        timestamp: new Date()
      });
      throw error;
    }
  },

  resolver: async (name: string, client: any) => {
    const node = namehash(name);
    return await client.readContract({
      address: CONTRACTS.registry as `0x${string}`,
      abi: [{
        inputs: [{ name: 'node', type: 'bytes32' }],
        name: 'resolver',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
      }],
      functionName: 'resolver',
      args: [node]
    });
  },

  address: async (name: string, client: any) => {
    const node = namehash(name);
    const resolver = await queryHandlers.resolver(name, client);
    if (resolver === '0x0000000000000000000000000000000000000000') {
      return 'Not set';
    }
    return await client.readContract({
      address: resolver as `0x${string}`,
      abi: [{
        inputs: [{ name: 'node', type: 'bytes32' }],
        name: 'addr',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
      }],
      functionName: 'addr',
      args: [node]
    });
  },

  registration: async (name: string, client: any) => {
    const cacheKey = `registration:${name}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();
    try {
      await rateLimiter.removeTokens(1);
      // Only works for .eth second-level names
      if (!name.endsWith('.eth') || name.split('.').length !== 2) {
        return null;
      }

      const label = name.split('.')[0];
      const tokenId = BigInt('0x' + labelhash(label).slice(2));
      
      // Get registration data from BaseRegistrar
      const [nameExpires, available] = await Promise.all([
        client.readContract({
          address: CONTRACTS.baseRegistrar as `0x${string}`,
          abi: [{
            inputs: [{ name: 'id', type: 'uint256' }],
            name: 'nameExpires',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }],
          functionName: 'nameExpires',
          args: [tokenId]
        }),
        client.readContract({
          address: CONTRACTS.baseRegistrar as `0x${string}`,
          abi: [{
            inputs: [{ name: 'id', type: 'uint256' }],
            name: 'available',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'view',
            type: 'function'
          }],
          functionName: 'available',
          args: [tokenId]
        })
      ]);

      // If name is available or expired, try to get historical data from subgraph
      if (available || nameExpires === 0n) {
        const query = `
          query GetRegistration($tokenId: String!) {
            registration(id: $tokenId) {
              registrationDate
              expiryDate
            }
          }
        `;
        
        const data = await graphClient.request(query, { tokenId: tokenId.toString() });
        if (data.registration) {
          const result = {
            registrationDate: new Date(Number(data.registration.registrationDate) * 1000),
            expiryDate: new Date(Number(data.registration.expiryDate) * 1000),
            status: 'expired'
          };
          
          queryCache.set(cacheKey, result);
          metrics.push({
            queryType: 'registration',
            duration: Date.now() - startTime,
            success: true,
            timestamp: new Date()
          });
          
          return result;
        }
        return null;
      }

      // For active registrations, get registration date from subgraph
      const query = `
        query GetRegistration($tokenId: String!) {
          registration(id: $tokenId) {
            registrationDate
          }
        }
      `;
      
      const data = await graphClient.request(query, { tokenId: tokenId.toString() });
      
      const result = {
        registrationDate: data.registration ? 
          new Date(Number(data.registration.registrationDate) * 1000) : 
          null,
        expiryDate: new Date(Number(nameExpires) * 1000),
        status: 'active'
      };
      
      queryCache.set(cacheKey, result);
      metrics.push({
        queryType: 'registration',
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date()
      });
      
      return result;
    } catch (error) {
      metrics.push({
        queryType: 'registration',
        duration: Date.now() - startTime,
        success: false,
        timestamp: new Date()
      });
      throw error;
    }
  },

  wrapped: async (name: string, client: any) => {
    try {
      const node = namehash(name);
      const owner = await client.readContract({
        address: CONTRACTS.nameWrapper as `0x${string}`,
        abi: [{
          inputs: [{ name: 'node', type: 'bytes32' }],
          name: 'ownerOf',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'ownerOf',
        args: [node]
      });
      return owner !== '0x0000000000000000000000000000000000000000';
    } catch {
      return false;
    }
  },

  ownedNames: async (name: string, client: any) => {
    try {
      const owner = await queryHandlers.address(name, client);
      if (owner === 'Not set') return [];

      const query = `
        query GetOwnedNames($owner: String!) {
          domains(where: { owner: $owner }) {
            name
          }
        }
      `;
      
      const data = await graphClient.request(query, { owner: owner.toLowerCase() });
      return data.domains.map((domain: any) => domain.name);
    } catch {
      return [];
    }
  },

  textRecords: async (name: string, client: any) => {
    const node = namehash(name);
    const resolver = await queryHandlers.resolver(name, client);
    if (resolver === '0x0000000000000000000000000000000000000000') {
      return {};
    }
    
    const textKeys = [
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
    ];

    const records: Record<string, string> = {};
    for (const key of textKeys) {
      try {
        const value = await client.readContract({
          address: resolver as `0x${string}`,
          abi: [{
            inputs: [
              { name: 'node', type: 'bytes32' },
              { name: 'key', type: 'string' }
            ],
            name: 'text',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function'
          }],
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
  },

  contentHash: async (name: string, client: any) => {
    const node = namehash(name);
    const resolver = await queryHandlers.resolver(name, client);
    if (resolver === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    try {
      return await client.readContract({
        address: resolver as `0x${string}`,
        abi: [{
          inputs: [{ name: 'node', type: 'bytes32' }],
          name: 'contenthash',
          outputs: [{ name: '', type: 'bytes' }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'contenthash',
        args: [node]
      });
    } catch {
      return null;
    }
  },

  reverseRecord: async (name: string, client: any) => {
    const address = await queryHandlers.address(name, client);
    if (address === 'Not set') return null;

    const reverseNode = namehash(`${address.slice(2)}.addr.reverse`);
    const resolver = await client.readContract({
      address: CONTRACTS.registry as `0x${string}`,
      abi: [{
        inputs: [{ name: 'node', type: 'bytes32' }],
        name: 'resolver',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
      }],
      functionName: 'resolver',
      args: [reverseNode]
    });

    if (resolver === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    try {
      return await client.readContract({
        address: resolver as `0x${string}`,
        abi: [{
          inputs: [{ name: 'node', type: 'bytes32' }],
          name: 'name',
          outputs: [{ name: '', type: 'string' }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'name',
        args: [reverseNode]
      });
    } catch {
      return null;
    }
  },

  subdomains: async (name: string, client: any) => {
    try {
      const query = `
        query GetSubdomains($name: String!) {
          domain(id: "${namehash(name)}") {
            subdomains {
              name
            }
          }
        }
      `;
      
      const data = await graphClient.request(query, { name });
      return data.domain.subdomains.map((subdomain: any) => subdomain.name);
    } catch {
      return [];
    }
  },

  allRecords: async (name: string, client: any) => {
    const [textRecords, contentHash] = await Promise.all([
      queryHandlers.textRecords(name, client),
      queryHandlers.contentHash(name, client)
    ]);

    const node = namehash(name);
    const resolver = await queryHandlers.resolver(name, client);
    const addresses: Record<string, string> = {};

    if (resolver !== '0x0000000000000000000000000000000000000000') {
      // Common coin types
      const coinTypes = {
        ETH: 60,
        BTC: 0,
        LTC: 2,
        DOGE: 3,
        XRP: 144,
        BCH: 145,
        DOT: 354,
        SOL: 501
      };

      for (const [coin, type] of Object.entries(coinTypes)) {
        try {
          const addr = await client.readContract({
            address: resolver as `0x${string}`,
            abi: [{
              inputs: [
                { name: 'node', type: 'bytes32' },
                { name: 'coinType', type: 'uint256' }
              ],
              name: 'addr',
              outputs: [{ name: '', type: 'bytes' }],
              stateMutability: 'view',
              type: 'function'
            }],
            functionName: 'addr',
            args: [node, BigInt(type)]
          });
          if (addr) {
            addresses[coin] = addr;
          }
        } catch {
          // Skip if address doesn't exist
        }
      }
    }

    return {
      texts: textRecords,
      addresses,
      contentHash
    };
  }
};

// Add metrics export function
export function getQueryMetrics(): QueryMetrics[] {
  return metrics;
}

// Add cache statistics
export function getCacheStats() {
  const entries = Array.from(queryCache.entries());
  const timestamps = entries.map(([_, value]) => value.timestamp).filter(Boolean);
  
  return {
    size: queryCache.size,
    hits: queryCache.stats.hits,
    misses: queryCache.stats.misses,
    ratio: queryCache.stats.hits / (queryCache.stats.hits + queryCache.stats.misses),
    evictions: queryCache.stats.evictions,
    oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
    newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null
  };
}

// Main query executor with batch processing
export async function executeQueries(configs: QueryConfig[]): Promise<QueryResult[]> {
  const { publicClient } = await getClients('mainnet');
  const results: QueryResult[] = [];
  
  // Process queries in batches of 5
  const batchSize = 5;
  for (let i = 0; i < configs.length; i += batchSize) {
    const batch = configs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (config) => {
        const result: QueryResult = { name: config.name };
        
        for (const query of config.queries) {
          try {
            const handler = queryHandlers[query];
            const value = await handler(config.name, publicClient);
            
            switch (query) {
              case 'owner':
                result.owner = value;
                break;
              case 'resolver':
                result.resolver = value;
                break;
              case 'address':
                result.address = value;
                break;
              case 'registration':
                if (value) {
                  result.registrationDate = value.registrationDate;
                  result.expiryDate = value.expiryDate;
                }
                break;
              case 'wrapped':
                result.wrapped = value;
                break;
              case 'ownedNames':
                result.ownedNames = value;
                break;
              case 'textRecords':
                result.textRecords = value;
                break;
              case 'contentHash':
                result.contentHash = value;
                break;
              case 'reverseRecord':
                result.reverseRecord = value;
                break;
              case 'subdomains':
                result.subdomains = value;
                break;
              case 'allRecords':
                result.allRecords = value;
                break;
            }
          } catch (error) {
            console.error(`Error executing query ${query} for ${config.name}:`, error);
          }
        }
        
        return result;
      })
    );
    
    results.push(...batchResults);
  }
  
  return results;
} 