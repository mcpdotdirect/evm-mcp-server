import { normalize, namehash } from 'viem/ens';
import { type Address, type Chain, type Hash, type TransactionReceipt, type PublicClient } from './types.js';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';
import { isAddress } from 'viem';

// Common ABI definitions
const RESOLVER_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    name: 'setText',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'addr', type: 'address' },
    ],
    name: 'setAddr',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Retrieves a specific text record associated with an ENS name.
 * @param name The ENS name to query.
 * @param key The key of the text record to retrieve.
 * @param client The public client to use for the query.
 * @returns A Promise that resolves to the value of the text record, or null if not set.
 */
export async function getEnsTextRecord(
  name: string,
  key: string,
  client: PublicClient
): Promise<string | null> {
  try {
    const normalizedEns = normalize(name);
    return await client.getEnsText({
      name: normalizedEns,
      key,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ENS text record "${key}" for "${name}". Reason: ${message} [Error Code: GetEnsTextRecord_General_001]`
    );
  }
}

/**
 * Sets a text record for an ENS name.
 * @param name The ENS name to update.
 * @param key The key of the text record to set.
 * @param value The value to set for the text record, or null to clear it.
 * @param client The public client to use for the query.
 * @returns A Promise that resolves to the transaction hash of the operation.
 */
export async function setEnsTextRecord(
  name: string,
  key: string,
  value: string | null,
  client: PublicClient
): Promise<Hash> {
  try {
    const normalizedEns = normalize(name);
    const { walletClient } = await getClients(client.chain);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: SetEnsTextRecord_NoAccount_001]');
    }
    const resolverAddress = await client.getEnsResolver({
      name: normalizedEns,
    });
    return await walletClient.writeContract({
      address: resolverAddress as `0x${string}`,
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [namehash(normalizedEns), key, value || ''],
      account: walletClient.account,
      chain: client.chain,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to set ENS text record "${key}" for "${name}". Reason: ${message} [Error Code: SetEnsTextRecord_General_001]`
    );
  }
}

/**
 * Sets the Ethereum address record for an ENS name.
 * @param name The ENS name to update.
 * @param address The Ethereum address to set, or null to clear it.
 * @param client The public client to use for the query.
 * @returns A Promise that resolves to the transaction receipt of the operation.
 */
export async function setEnsAddressRecord(
  name: string,
  address: Address | null,
  client: PublicClient
): Promise<TransactionReceipt> {
  try {
    const normalizedEns = normalize(name);
    if (address && !isAddress(address)) {
      throw new Error(
        `Invalid Ethereum address: "${address}" [Error Code: SetEnsAddressRecord_InvalidInput_001]`
      );
    }
    const { walletClient } = await getClients(client.chain);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: SetEnsAddressRecord_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: client.address,
      abi: [
        {
          inputs: [
            { name: 'node', type: 'bytes32' },
            { name: 'addr', type: 'address' },
          ],
          name: 'setAddr',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'setAddr',
      args: [namehash(normalizedEns), address || '0x0000000000000000000000000000000000000000'],
      account: walletClient.account,
      chain: client.chain,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to set ENS address record for "${name}". Reason: ${message} [Error Code: SetEnsAddressRecord_General_001]`
    );
  }
}

/**
 * Gets the most recent ENS name registrations
 * @param count The number of recent registrations to fetch (default: 10)
 * @param client The public client to use for the query.
 * @returns A Promise that resolves to an array of recent registrations
 */
export async function getRecentRegistrations(
  count: number = 10,
  client: PublicClient
): Promise<Array<{
  name: string;
  owner: Address;
  blockNumber: bigint;
  transactionHash: Hash;
}>> {
  try {
    // ENS Registry contract address
    const registryAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;
    
    // Get the latest block number
    const latestBlock = await client.getBlockNumber();
    
    // Query for NewOwner events
    const logs = await client.getLogs({
      address: registryAddress,
      event: {
        type: 'event',
        name: 'NewOwner',
        inputs: [
          { type: 'bytes32', name: 'node', indexed: true },
          { type: 'bytes32', name: 'label', indexed: true },
          { type: 'address', name: 'owner' }
        ]
      },
      fromBlock: latestBlock - BigInt(10000), // Look back 10k blocks
      toBlock: latestBlock
    });

    // Process the logs and get the most recent registrations
    const registrations = await Promise.all(
      logs.slice(-count).map(async (log) => {
        const label = log.args.label;
        const node = log.args.node;
        const owner = log.args.owner;
        
        // Get the name from the label
        const name = await client.getEnsName({
          address: owner,
          blockNumber: log.blockNumber
        });

        return {
          name: name || 'unknown.eth',
          owner: owner,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        };
      })
    );

    return registrations.reverse(); // Return most recent first
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get recent registrations. Reason: ${message} [Error Code: GetRecentRegistrations_General_001]`
    );
  }
} 