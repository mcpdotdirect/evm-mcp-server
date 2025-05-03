import { normalize, namehash } from 'viem/ens';
import { type Address, type Chain, type Hash, type TransactionReceipt } from './types.js';
import { getClients } from './utils.js';
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
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the value of the text record, or null if not set.
 */
export async function getEnsTextRecord(
  name: string,
  key: string,
  network: string | Chain = mainnet
): Promise<string | null> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    return await publicClient.getEnsText({
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
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction hash of the operation.
 */
export async function setEnsTextRecord(
  name: string,
  key: string,
  value: string | null,
  network: string | Chain = mainnet
): Promise<Hash> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient, walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: SetEnsTextRecord_NoAccount_001]');
    }
    const resolverAddress = await publicClient.getEnsResolver({
      name: normalizedEns,
    });
    return await walletClient.writeContract({
      address: resolverAddress as `0x${string}`,
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [namehash(normalizedEns), key, value || ''],
      account: walletClient.account,
      chain: walletClient.chain,
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
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction receipt of the operation.
 */
export async function setEnsAddressRecord(
  name: string,
  address: Address | null,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedEns = normalize(name);
    if (address && !isAddress(address)) {
      throw new Error(
        `Invalid Ethereum address: "${address}" [Error Code: SetEnsAddressRecord_InvalidInput_001]`
      );
    }
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: SetEnsAddressRecord_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: walletClient.address,
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
      chain: walletClient.chain,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to set ENS address record for "${name}". Reason: ${message} [Error Code: SetEnsAddressRecord_General_001]`
    );
  }
} 