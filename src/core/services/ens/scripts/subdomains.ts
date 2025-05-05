import { normalize, labelhash, namehash } from 'viem/ens';
import { type Address, type Chain, type TransactionReceipt } from './types.js';
import { getClients } from './utils.js';
import { mainnet } from 'viem/chains';
import { isAddress } from 'viem';

/**
 * Creates a subdomain under an existing ENS name.
 * @param parentName The parent ENS name (e.g., 'example.eth').
 * @param label The subdomain label (e.g., 'sub' for 'sub.example.eth').
 * @param owner The Ethereum address to set as the owner of the subdomain.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction receipt of the operation.
 */
export async function createEnsSubdomain(
  parentName: string,
  label: string,
  owner: Address,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedParent = normalize(parentName);
    const normalizedLabel = normalize(label);
    if (!isAddress(owner)) {
      throw new Error(
        `Invalid owner address: "${owner}" [Error Code: CreateEnsSubdomain_InvalidInput_001]`
      );
    }
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: CreateEnsSubdomain_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: walletClient.address,
      abi: [
        {
          inputs: [
            { name: 'parentNode', type: 'bytes32' },
            { name: 'label', type: 'bytes32' },
            { name: 'owner', type: 'address' },
          ],
          name: 'setSubnodeOwner',
          outputs: [{ name: 'node', type: 'bytes32' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'setSubnodeOwner',
      args: [namehash(normalizedParent), labelhash(normalizedLabel), owner],
      account: walletClient.account,
      chain: walletClient.chain,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create subdomain "${label}" under "${parentName}". Reason: ${message} [Error Code: CreateEnsSubdomain_General_001]`
    );
  }
}

/**
 * Sets the resolver for a subdomain.
 * @param parentName The parent ENS name (e.g., 'example.eth').
 * @param label The subdomain label (e.g., 'sub').
 * @param resolver The Ethereum address to set as the resolver for the subdomain.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction receipt of the operation.
 */
export async function setSubdomainResolver(
  parentName: string,
  label: string,
  resolver: Address,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedParent = normalize(parentName);
    const normalizedLabel = normalize(label);
    if (!isAddress(resolver)) {
      throw new Error(
        `Invalid resolver address: "${resolver}" [Error Code: SetSubdomainResolver_InvalidInput_001]`
      );
    }
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: SetSubdomainResolver_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: walletClient.address,
      abi: [
        {
          inputs: [
            { name: 'parentNode', type: 'bytes32' },
            { name: 'label', type: 'bytes32' },
            { name: 'resolver', type: 'address' },
          ],
          name: 'setSubnodeResolver',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'setSubnodeResolver',
      args: [namehash(normalizedParent), labelhash(normalizedLabel), resolver],
      account: walletClient.account,
      chain: walletClient.chain,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to set subdomain resolver for "${label}" under "${parentName}". Reason: ${message} [Error Code: SetSubdomainResolver_General_001]`
    );
  }
}

/**
 * Checks if a name is a valid subdomain of a parent ENS name.
 * @param subdomain The potential subdomain (e.g., 'sub.example.eth').
 * @param parentName The parent ENS name (e.g., 'example.eth').
 * @returns true if the subdomain is valid and hierarchically under the parent, false otherwise.
 */
export function isValidSubdomain(subdomain: string, parentName: string): boolean {
  try {
    const normalizedSubdomain = normalize(subdomain);
    const normalizedParent = normalize(parentName);
    if (!normalizedSubdomain.endsWith(`.${normalizedParent}`) && normalizedSubdomain !== normalizedParent) {
      return false;
    }
    const subdomainLabels = normalizedSubdomain.split('.');
    const parentLabels = normalizedParent.split('.');
    return subdomainLabels.length > parentLabels.length;
  } catch {
    return false;
  }
} 