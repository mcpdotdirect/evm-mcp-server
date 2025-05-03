import { normalize, namehash } from 'viem/ens';
import { type Address, type Chain, type Hash } from './types.js';
import { getClients } from './utils.js';
import { mainnet } from 'viem/chains';

/**
 * Gets the ownership history of an ENS name.
 * @param name The ENS name to query.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to an array of ownership records.
 */
export async function getEnsOwnershipHistory(
  name: string,
  network: string | Chain = mainnet
): Promise<Array<{
  owner: Address;
  timestamp: number;
  transactionHash: Hash;
}>> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const result = await publicClient.readContract({
      address: publicClient.address,
      abi: [
        {
          inputs: [
            { name: 'node', type: 'bytes32' },
          ],
          name: 'getOwnershipHistory',
          outputs: [
            {
              components: [
                { name: 'owner', type: 'address' },
                { name: 'timestamp', type: 'uint256' },
                { name: 'transactionHash', type: 'bytes32' },
              ],
              name: 'history',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'getOwnershipHistory',
      args: [namehash(normalizedEns)],
    });
    return result[0].map((record: any) => ({
      owner: record.owner as Address,
      timestamp: Number(record.timestamp),
      transactionHash: record.transactionHash as Hash,
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get ownership history for "${name}". Reason: ${message} [Error Code: GetEnsOwnershipHistory_General_001]`
    );
  }
}

/**
 * Gets the address record history of an ENS name.
 * @param name The ENS name to query.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to an array of address records.
 */
export async function getEnsAddressHistory(
  name: string,
  network: string | Chain = mainnet
): Promise<Array<{
  address: Address;
  timestamp: number;
  transactionHash: Hash;
}>> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const result = await publicClient.readContract({
      address: publicClient.address,
      abi: [
        {
          inputs: [
            { name: 'node', type: 'bytes32' },
          ],
          name: 'getAddressHistory',
          outputs: [
            {
              components: [
                { name: 'address', type: 'address' },
                { name: 'timestamp', type: 'uint256' },
                { name: 'transactionHash', type: 'bytes32' },
              ],
              name: 'history',
              type: 'tuple[]',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'getAddressHistory',
      args: [namehash(normalizedEns)],
    });
    return result[0].map((record: any) => ({
      address: record.address as Address,
      timestamp: Number(record.timestamp),
      transactionHash: record.transactionHash as Hash,
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get address history for "${name}". Reason: ${message} [Error Code: GetEnsAddressHistory_General_001]`
    );
  }
} 