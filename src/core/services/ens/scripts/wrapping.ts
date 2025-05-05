import { normalize, namehash } from 'viem/ens';
import { type Address, type Chain, type TransactionReceipt } from './types.js';
import { getClients } from './utils.js';
import { mainnet } from 'viem/chains';

/**
 * Wraps an ENS name into an NFT.
 * @param name The ENS name to wrap.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction receipt of the operation.
 */
export async function wrapEnsName(
  name: string,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedEns = normalize(name);
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: WrapEnsName_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: walletClient.address,
      abi: [
        {
          inputs: [
            { name: 'node', type: 'bytes32' },
          ],
          name: 'wrap',
          outputs: [{ name: 'tokenId', type: 'uint256' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'wrap',
      args: [namehash(normalizedEns)],
      account: walletClient.account,
      chain: walletClient.chain,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to wrap ENS name "${name}". Reason: ${message} [Error Code: WrapEnsName_General_001]`
    );
  }
}

/**
 * Unwraps an ENS name from NFT.
 * @param name The ENS name to unwrap.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction receipt of the operation.
 */
export async function unwrapEnsName(
  name: string,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedEns = normalize(name);
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: UnwrapEnsName_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: walletClient.address,
      abi: [
        {
          inputs: [
            { name: 'node', type: 'bytes32' },
          ],
          name: 'unwrap',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'unwrap',
      args: [namehash(normalizedEns)],
      account: walletClient.account,
      chain: walletClient.chain,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to unwrap ENS name "${name}". Reason: ${message} [Error Code: UnwrapEnsName_General_001]`
    );
  }
}

/**
 * Gets wrapped name details.
 * @param name The ENS name to query.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to an object containing tokenId, owner, and expiry.
 */
export async function getWrappedNameDetails(
  name: string,
  network: string | Chain = mainnet
): Promise<{
  tokenId: bigint;
  owner: Address;
  expiry: number;
}> {
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
          name: 'wrappedNameDetails',
          outputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'owner', type: 'address' },
            { name: 'expiry', type: 'uint256' },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'wrappedNameDetails',
      args: [namehash(normalizedEns)],
    });
    return {
      tokenId: result[0] as bigint,
      owner: result[1] as Address,
      expiry: Number(result[2])
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get wrapped name details for "${name}". Reason: ${message} [Error Code: GetWrappedNameDetails_General_001]`
    );
  }
} 