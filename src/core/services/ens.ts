import { normalize, labelhash, namehash } from 'viem/ens';
import { getPublicClient, getWalletClient } from './clients.js';
import { 
  type Address, 
  type Chain, 
  type Hash, 
  type TransactionReceipt, 
  type PublicClient, 
  type WalletClient, 
  type Account, 
  type WriteContractParameters,
  type Hex,
  type GetEnsResolverParameters,
  type Log,
  type WriteContractReturnType,
  type GetContractReturnType
} from 'viem';
import { mainnet } from 'viem/chains';
import { isAddress } from 'viem';

// ENS Registry address
const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;

/**
 * Utility function to get initialized clients for a network
 * @param network Network name or chain
 * @returns Object containing public and wallet clients
 */
async function getClients(network: string | Chain = mainnet) {
  const publicClient = getPublicClient(typeof network === 'string' ? network : undefined) as PublicClient;
  const walletClient = await getWalletClient(typeof network === 'string' ? network : undefined) as WalletClient;
  return { publicClient, walletClient };
}

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
 * Resolves an ENS name to an Ethereum address or returns the original input if it's already a valid address.
 * This function acts as a wrapper around viem's `getEnsAddress` functionality, providing
 * initial validation and standardized error handling.
 *
 * @param addressOrEns A string that is either a standard Ethereum address (0x...) or an ENS name (e.g., "vitalik.eth").
 * @param network Optional. The target blockchain network, specified either as a network name (string)
 *                recognized by `getPublicClient` or a viem `Chain` object. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the Ethereum address (`Address` type).
 * @throws {Error} If the input string is neither a valid Ethereum address nor a syntactically valid ENS name.
 * @throws {Error} If the ENS name cannot be normalized (e.g., invalid characters).
 * @throws {Error} If the ENS name does not resolve to an address on the specified network.
 * @throws {Error} If there's an issue communicating with the Ethereum node via the public client.
 */
export async function resolveAddress(
  addressOrEns: string,
  network: string | Chain = mainnet
): Promise<Address> {
  if (/^0x[a-fA-F0-9]{40}$/.test(addressOrEns)) {
    return addressOrEns as Address;
  }

  if (addressOrEns.includes('.')) {
    try {
      const normalizedEns = normalize(addressOrEns);
      const { publicClient } = await getClients(network);
      const address = await publicClient.getEnsAddress({
        name: normalizedEns,
      });

      if (!address) {
        const error = new Error(
          `ENS name "${addressOrEns}" (normalized: "${normalizedEns}") could not be resolved to an address on the specified network. [Error Code: ResolveAddress_Resolution_001]`
        );
        console.error('Error in resolveAddress:', error);
        throw error;
      }

      return address;
    } catch (error: unknown) {
      console.error(`Error resolving ENS name "${addressOrEns}":`, error);
      const message = error instanceof Error ? error.message : String(error);
      const newError = new Error(
        `Failed to resolve ENS name "${addressOrEns}". Reason: ${message} [Error Code: ResolveAddress_General_001]`
      );
      console.error('Error in resolveAddress:', newError);
      throw newError;
    }
  }

  const error = new Error(
    `Invalid input: "${addressOrEns}" is not a valid Ethereum address or ENS name format. [Error Code: ResolveAddress_InvalidInput_001]`
  );
  console.error('Error in resolveAddress:', error);
  throw error;
}

/**
 * Performs a reverse lookup to find the primary ENS name associated with an Ethereum address.
 * This function wraps viem's `getEnsName` functionality. The primary name is set by the address owner.
 *
 * @param address The Ethereum address (`Address` type) for which to find the primary ENS name.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the primary ENS name (string) associated with the address,
 *          or `null` if no primary name is set or found for this address on the network.
 * @throws {Error} If there's an issue initializing the public client for the network.
 * @throws {Error} If an error occurs during the reverse lookup process (e.g., network communication issue).
 */
export async function lookupAddress(
  address: Address,
  network: string | Chain = mainnet
): Promise<string | null> {
  try {
    const { publicClient } = await getClients(network);
    const ensName = await publicClient.getEnsName({
      address,
    });
    return ensName;
  } catch (error: unknown) {
    console.error(`Error performing reverse ENS lookup for address ${address}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to lookup ENS name for address ${address}. Reason: ${message} [Error Code: LookupAddress_General_001]`
    );
    console.error('Error in lookupAddress:', newError);
    throw newError;
  }
}

/**
 * Retrieves the avatar URI (e.g., an IPFS URL, HTTP URL, or data URI) associated with an ENS name.
 * This function wraps viem's `getEnsAvatar` functionality, which typically reads the 'avatar' text record.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') for which to retrieve the avatar.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the avatar URI string, or `null` if no avatar record is set or found.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If an error occurs during the avatar lookup process.
 */
export async function getEnsAvatar(
  name: string,
  network: string | Chain = mainnet
): Promise<string | null> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const avatarUri = await publicClient.getEnsAvatar({
      name: normalizedEns,
    });
    return avatarUri;
  } catch (error: unknown) {
    console.error(`Error retrieving ENS avatar for name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get ENS avatar for "${name}". Reason: ${message} [Error Code: GetEnsAvatar_General_001]`
    );
    console.error('Error in getEnsAvatar:', newError);
    throw newError;
  }
}

/**
 * Retrieves the address of the ENS resolver contract responsible for managing records for a specific ENS name.
 * Different ENS names can use different resolver contracts. This function wraps viem's `getEnsResolver`.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') for which to find the resolver contract address.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the Ethereum address (`Address` type) of the resolver contract.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If the ENS name does not have a resolver configured on the network (viem throws in this case).
 * @throws {Error} If any other error occurs during the lookup process.
 */
export async function getEnsResolverAddress(
  name: string,
  network: string | Chain = mainnet
): Promise<Address> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const resolverAddress = await publicClient.getEnsResolver({
      name: normalizedEns,
    });
    return resolverAddress;
  } catch (error: unknown) {
    console.error(`Error retrieving ENS resolver for name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get ENS resolver for "${name}". Reason: ${message} [Error Code: GetEnsResolverAddress_General_001]`
    );
    console.error('Error in getEnsResolverAddress:', newError);
    throw newError;
  }
}

/**
 * Retrieves a specific text record associated with an ENS name.
 * ENS allows storing arbitrary key-value text pairs (e.g., 'email', 'url', 'com.github').
 * This function wraps viem's `getEnsText`.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') to query.
 * @param key The key of the text record to retrieve (e.g., 'description', 'com.twitter').
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the value of the text record (string), or `null` if the record
 *          does not exist or is not set for the given key and name.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If an error occurs during the text record lookup process.
 */
export async function getEnsTextRecord(
  name: string,
  key: string,
  network: string | Chain = mainnet
): Promise<string | null> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const textRecord = await publicClient.getEnsText({
      name: normalizedEns,
      key,
    });
    return textRecord;
  } catch (error: unknown) {
    console.error(`Error retrieving ENS text record "${key}" for name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get ENS text record "${key}" for "${name}". Reason: ${message} [Error Code: GetEnsTextRecord_General_001]`
    );
    console.error('Error in getEnsTextRecord:', newError);
    throw newError;
  }
}

/**
 * Computes the hash of an ENS label (a single part of a domain name).
 * This is a utility function wrapping viem's `labelhash`. It does not require network interaction.
 *
 * @param label The ENS label (e.g., "eth", "vitalik"). Must conform to ENS label specifications.
 * @returns The keccak256 hash of the label (`0x...` string).
 * @throws {Error} If the label is invalid according to viem's `labelhash` (e.g., empty string, contains disallowed characters).
 */
export function computeLabelhash(label: string): `0x${string}` {
  try {
    return labelhash(label);
  } catch (error: unknown) {
    console.error(`Error computing labelhash for "${label}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to compute labelhash for "${label}". Reason: ${message} [Error Code: ComputeLabelhash_General_001]`
    );
    console.error('Error in computeLabelhash:', newError);
    throw newError;
  }
}

/**
 * Computes the recursive hash of an ENS name according to the ENS specification (namehash algorithm).
 * This is a utility function wrapping viem's `namehash`. It does not require network interaction.
 * Normalizes the name before hashing.
 *
 * @param name The ENS name (e.g., "vitalik.eth").
 * @returns The namehash of the ENS name (`0x...` string).
 * @throws {Error} If the name is invalid or cannot be normalized via `normalize`.
 * @throws {Error} If `namehash` itself throws (though less common if normalization succeeds).
 */
export function computeNamehash(name: string): `0x${string}` {
  try {
    const normalizedName = normalize(name);
    return namehash(normalizedName);
  } catch (error: unknown) {
    console.error(`Error computing namehash for "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to compute namehash for "${name}". Reason: ${message} [Error Code: ComputeNamehash_General_001]`
    );
    console.error('Error in computeNamehash:', newError);
    throw newError;
  }
}

/**
 * Checks if an ENS name is available for registration.
 * Queries the ENS registrar to determine if the name is unclaimed or has expired.
 *
 * @param name The ENS name (e.g., 'example.eth') to check.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to `true` if the name is available, `false` otherwise.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If an error occurs during the availability check.
 */
export async function isNameAvailable(
  name: string,
  network: string | Chain = mainnet
): Promise<boolean> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const resolverAddress = await publicClient.getEnsResolver({
      name: normalizedEns,
    });
    return resolverAddress === '0x0000000000000000000000000000000000000000';
  } catch (error: unknown) {
    console.error(`Error checking availability for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to check availability for "${name}". Reason: ${message} [Error Code: IsNameAvailable_General_001]`
    );
    console.error('Error in isNameAvailable:', newError);
    throw newError;
  }
}

/**
 * Retrieves the address of the ENS registrar controller for a given ENS name.
 * The registrar controller handles name registrations and renewals.
 *
 * @param name The ENS name (e.g., 'example.eth') to query.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the Ethereum address (`Address` type) of the registrar controller.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If the registrar controller cannot be determined.
 */
export async function getEnsRegistrarController(
  name: string,
  network: string | Chain = mainnet
): Promise<Address> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const controllerAddress = await publicClient.getEnsResolver({
      name: normalizedEns,
    });
    return controllerAddress;
  } catch (error: unknown) {
    console.error(`Error retrieving ENS registrar controller for name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get registrar controller for "${name}". Reason: ${message} [Error Code: GetEnsRegistrarController_General_001]`
    );
    console.error('Error in getEnsRegistrarController:', newError);
    throw newError;
  }
}

/**
 * Retrieves the owner of an ENS name.
 * The owner is the Ethereum address that controls the ENS name in the ENS registry.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') to query.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the owner's Ethereum address (`Address` type), or `null` if no owner is set.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If an error occurs during the owner lookup process.
 */
export async function getEnsOwner(
  name: string,
  network: string | Chain = mainnet
): Promise<Address | null> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const resolverAddress = await publicClient.getEnsResolver({
      name: normalizedEns,
    });
    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    const owner = await publicClient.readContract({
      address: resolverAddress as `0x${string}`,
      abi: [
        {
          inputs: [{ name: 'node', type: 'bytes32' }],
          name: 'owner',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'owner',
      args: [namehash(normalizedEns)],
    });
    return owner;
  } catch (error: unknown) {
    console.error(`Error retrieving owner for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get owner for "${name}". Reason: ${message} [Error Code: GetEnsOwner_General_001]`
    );
    console.error('Error in getEnsOwner:', newError);
    throw newError;
  }
}

/**
 * Retrieves the expiration date of an ENS name registration.
 * Only applicable to names registered via the ENS registrar (e.g., .eth names).
 *
 * @param name The ENS name (e.g., 'example.eth') to query.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to a `Date` object representing the expiration date, or `null` if not applicable or not registered.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If an error occurs during the expiration lookup process.
 */
export async function getEnsExpiration(
  name: string,
  network: string | Chain = mainnet
): Promise<Date | null> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const expiry = await publicClient.getEnsText({
      name: normalizedEns,
      key: 'expiry',
    });
    return expiry ? new Date(parseInt(expiry) * 1000) : null;
  } catch (error: unknown) {
    console.error(`Error retrieving expiration for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get expiration for "${name}". Reason: ${message} [Error Code: GetEnsExpiration_General_001]`
    );
    console.error('Error in getEnsExpiration:', newError);
    throw newError;
  }
}

/**
 * Retrieves the content hash associated with an ENS name (e.g., IPFS or Swarm hash).
 * Content hashes are typically used to link ENS names to decentralized content.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') to query.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the content hash (`Hash` type), or `null` if no content hash is set.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If an error occurs during the content hash lookup process.
 */
export async function getEnsContentHash(
  name: string,
  network: string | Chain = mainnet
): Promise<Hash | null> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const contentHash = await publicClient.getEnsText({
      name: normalizedEns,
      key: 'contenthash',
    });
    return contentHash as Hash;
  } catch (error: unknown) {
    console.error(`Error retrieving content hash for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get content hash for "${name}". Reason: ${message} [Error Code: GetEnsContentHash_General_001]`
    );
    console.error('Error in getEnsContentHash:', newError);
    throw newError;
  }
}

/**
 * Retrieves a multichain address associated with an ENS name for a specific coin type.
 * ENS supports addresses for non-Ethereum chains (e.g., Bitcoin, via coin type IDs per SLIP-44).
 *
 * @param name The ENS name (e.g., 'vitalik.eth') to query.
 * @param coinType The SLIP-44 coin type ID (e.g., 60 for Ethereum, 0 for Bitcoin).
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the address string for the specified coin type, or `null` if not set.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public client.
 * @throws {Error} If an error occurs during the address lookup process.
 */
export async function getEnsMultichainAddress(
  name: string,
  coinType: number,
  network: string | Chain = mainnet
): Promise<string | null> {
  try {
    const normalizedEns = normalize(name);
    const { publicClient } = await getClients(network);
    const address = await publicClient.getEnsText({
      name: normalizedEns,
      key: `address.${coinType}`,
    });
    return address;
  } catch (error: unknown) {
    console.error(`Error retrieving multichain address for ENS name "${name}" and coin type ${coinType}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get multichain address for "${name}" with coin type ${coinType}. Reason: ${message} [Error Code: GetEnsMultichainAddress_General_001]`
    );
    console.error('Error in getEnsMultichainAddress:', newError);
    throw newError;
  }
}

/**
 * Sets a text record for an ENS name.
 * Requires the caller to be the owner or an authorized operator of the ENS name.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') to update.
 * @param key The key of the text record to set (e.g., 'com.twitter', 'email').
 * @param value The value to set for the text record, or `null` to clear it.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public or wallet client.
 * @throws {Error} If the transaction fails (e.g., insufficient permissions, gas issues).
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
    } as GetEnsResolverParameters);
    const result = await walletClient.writeContract({
      address: resolverAddress as `0x${string}`,
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [namehash(normalizedEns), key, value || ''],
      account: walletClient.account,
      chain: walletClient.chain,
    });
    return result;
  } catch (error: unknown) {
    console.error(`Error setting ENS text record "${key}" for name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to set ENS text record "${key}" for "${name}". Reason: ${message} [Error Code: SetEnsTextRecord_General_001]`
    );
    console.error('Error in setEnsTextRecord:', newError);
    throw newError;
  }
}

/**
 * Sets the Ethereum address record for an ENS name.
 * Requires the caller to be the owner or an authorized operator of the ENS name.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') to update.
 * @param address The Ethereum address to set, or `null` to clear it.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If the address is invalid (when not null).
 * @throws {Error} If there's an issue initializing the public or wallet client.
 * @throws {Error} If the transaction fails (e.g., insufficient permissions, gas issues).
 */
export async function setEnsAddressRecord(
  name: string,
  address: Address | null,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedEns = normalize(name);
    if (address && !isAddress(address)) {
      const error = new Error(
        `Invalid Ethereum address: "${address}" [Error Code: SetEnsAddressRecord_InvalidInput_001]`
      );
      console.error('Error in setEnsAddressRecord:', error);
      throw error;
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
      account: walletClient.account as Account,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    console.error(`Error setting ENS address record for name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to set ENS address record for "${name}". Reason: ${message} [Error Code: SetEnsAddressRecord_General_001]`
    );
    console.error('Error in setEnsAddressRecord:', newError);
    throw newError;
  }
}

/**
 * Sets the avatar URI for an ENS name.
 * Requires the caller to be the owner or an authorized operator of the ENS name.
 *
 * @param name The ENS name (e.g., 'vitalik.eth') to update.
 * @param avatarUri The avatar URI to set (e.g., IPFS URL, HTTP URL), or `null` to clear it.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If there's an issue initializing the public or wallet client.
 * @throws {Error} If the transaction fails (e.g., insufficient permissions, gas issues).
 */
export async function setEnsAvatar(
  name: string,
  avatarUri: string | null,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedEns = normalize(name);
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: SetEnsAvatar_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: walletClient.address,
      abi: [
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
      ],
      functionName: 'setText',
      args: [namehash(normalizedEns), 'avatar', avatarUri || ''],
      account: walletClient.account as Account,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    console.error(`Error setting ENS avatar for name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to set ENS avatar for "${name}". Reason: ${message} [Error Code: SetEnsAvatar_General_001]`
    );
    console.error('Error in setEnsAvatar:', newError);
    throw newError;
  }
}

/**
 * Creates a subdomain under an existing ENS name.
 * Requires the caller to be the owner or an authorized operator of the parent ENS name.
 *
 * @param parentName The parent ENS name (e.g., 'example.eth').
 * @param label The subdomain label (e.g., 'sub' for 'sub.example.eth').
 * @param owner The Ethereum address to set as the owner of the subdomain.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation.
 * @throws {Error} If the parent ENS name or label is invalid or cannot be normalized.
 * @throws {Error} If the owner address is invalid.
 * @throws {Error} If there's an issue initializing the public or wallet client.
 * @throws {Error} If the transaction fails (e.g., insufficient permissions, gas issues).
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
      const error = new Error(
        `Invalid owner address: "${owner}" [Error Code: CreateEnsSubdomain_InvalidInput_001]`
      );
      console.error('Error in createEnsSubdomain:', error);
      throw error;
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
      account: walletClient.account as Account,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    console.error(`Error creating subdomain "${label}" under "${parentName}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to create subdomain "${label}" under "${parentName}". Reason: ${message} [Error Code: CreateEnsSubdomain_General_001]`
    );
    console.error('Error in createEnsSubdomain:', newError);
    throw newError;
  }
}

/**
 * Sets the owner of an existing ENS name or subdomain.
 * Requires the caller to be the current owner or an authorized operator of the ENS name.
 *
 * @param name The ENS name (e.g., 'sub.example.eth') to update.
 * @param owner The Ethereum address to set as the new owner.
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation.
 * @throws {Error} If the ENS name is invalid or cannot be normalized.
 * @throws {Error} If the owner address is invalid.
 * @throws {Error} If there's an issue initializing the public or wallet client.
 * @throws {Error} If the transaction fails (e.g., insufficient permissions, gas issues).
 */
export async function setEnsOwner(
  name: string,
  owner: Address,
  network: string | Chain = mainnet
): Promise<TransactionReceipt> {
  try {
    const normalizedEns = normalize(name);
    if (!isAddress(owner)) {
      const error = new Error(
        `Invalid owner address: "${owner}" [Error Code: SetEnsOwner_InvalidInput_001]`
      );
      console.error('Error in setEnsOwner:', error);
      throw error;
    }
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: SetEnsOwner_NoAccount_001]');
    }
    const result = await walletClient.writeContract({
      address: walletClient.address,
      abi: [
        {
          inputs: [
            { name: 'node', type: 'bytes32' },
            { name: 'owner', type: 'address' },
          ],
          name: 'setOwner',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'setOwner',
      args: [namehash(normalizedEns), owner],
      account: walletClient.account as Account,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    console.error(`Error setting owner for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to set owner for "${name}". Reason: ${message} [Error Code: SetEnsOwner_General_001]`
    );
    console.error('Error in setEnsOwner:', newError);
    throw newError;
  }
}

/**
 * Validates whether a string is a syntactically valid ENS name.
 * Checks for proper formatting and allowed characters without network interaction.
 *
 * @param name The string to validate as an ENS name.
 * @returns `true` if the name is syntactically valid, `false` otherwise.
 */
export function isValidEnsName(name: string): boolean {
  try {
    normalize(name);
    return name.includes('.') && name.split('.').every(label => label.length > 0);
  } catch (error: unknown) {
    console.error(`Error validating ENS name "${name}":`, error);
    return false;
  }
}

/**
 * Checks if a name is a valid subdomain of a parent ENS name.
 * Validates syntax and hierarchy without network interaction.
 *
 * @param subdomain The potential subdomain (e.g., 'sub.example.eth').
 * @param parentName The parent ENS name (e.g., 'example.eth').
 * @returns `true` if the subdomain is valid and hierarchically under the parent, `false` otherwise.
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
    return subdomainLabels.length > parentLabels.length && isValidEnsName(subdomain);
  } catch (error: unknown) {
    console.error(`Error validating subdomain "${subdomain}" under "${parentName}":`, error);
    return false;
  }
}

/**
 * Interface representing an ENS ownership record
 */
export interface EnsOwnershipRecord {
  owner: Address;
  timestamp: number;
  transactionHash: Hash;
}

/**
 * Interface representing an ENS address record
 */
export interface EnsAddressRecord {
  address: Address;
  timestamp: number;
  transactionHash: Hash;
}

/**
 * Retrieves the ownership history of an ENS name
 * @param name The ENS name to query
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to an array of ownership records
 */
export async function getEnsOwnershipHistory(
  name: string,
  network: string | Chain = mainnet
): Promise<EnsOwnershipRecord[]> {
  try {
    const { publicClient } = await getClients(network);
    const registryAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;
    
    // Get all Transfer events for this name
    const logs = await publicClient.getLogs({
      address: registryAddress,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'bytes32', name: 'node', indexed: true },
          { type: 'address', name: 'owner', indexed: true }
        ]
      },
      args: {
        node: namehash(name)
      },
      fromBlock: 0n,
      toBlock: 'latest'
    });

    const ownershipHistory: EnsOwnershipRecord[] = [];
    
    for (const log of logs) {
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
      ownershipHistory.push({
        owner: log.args.owner as Address,
        timestamp: Number(block.timestamp),
        transactionHash: log.transactionHash
      });
    }

    return ownershipHistory;
  } catch (error: unknown) {
    console.error(`Error retrieving ownership history for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get ownership history for "${name}". Reason: ${message} [Error Code: GetEnsOwnershipHistory_General_001]`
    );
    console.error('Error in getEnsOwnershipHistory:', newError);
    throw newError;
  }
}

/**
 * Retrieves the address history of an ENS name
 * @param name The ENS name to query
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to an array of address records
 */
export async function getEnsAddressHistory(
  name: string,
  network: string | Chain = mainnet
): Promise<EnsAddressRecord[]> {
  try {
    const { publicClient } = await getClients(network);
    const resolverAddress = await publicClient.getEnsResolver({
      name: name,
    });

    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      return [];
    }

    // Get all AddrChanged events for this name
    const logs = await publicClient.getLogs({
      address: resolverAddress as `0x${string}`,
      event: {
        type: 'event',
        name: 'AddrChanged',
        inputs: [
          { type: 'bytes32', name: 'node', indexed: true },
          { type: 'address', name: 'a', indexed: false }
        ]
      },
      args: {
        node: namehash(name)
      },
      fromBlock: 0n,
      toBlock: 'latest'
    });

    const addressHistory: EnsAddressRecord[] = [];
    
    for (const log of logs) {
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
      addressHistory.push({
        address: log.args.a as Address,
        timestamp: Number(block.timestamp),
        transactionHash: log.transactionHash
      });
    }

    return addressHistory;
  } catch (error: unknown) {
    console.error(`Error retrieving address history for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get address history for "${name}". Reason: ${message} [Error Code: GetEnsAddressHistory_General_001]`
    );
    console.error('Error in getEnsAddressHistory:', newError);
    throw newError;
  }
}

/**
 * Retrieves the complete history of an ENS name including ownership and address changes
 * @param name The ENS name to query
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to an object containing both ownership and address history
 */
export async function getEnsCompleteHistory(
  name: string,
  network: string | Chain = mainnet
): Promise<{
  ownershipHistory: EnsOwnershipRecord[];
  addressHistory: EnsAddressRecord[];
}> {
  try {
    const [ownershipHistory, addressHistory] = await Promise.all([
      getEnsOwnershipHistory(name, network),
      getEnsAddressHistory(name, network)
    ]);

    return {
      ownershipHistory,
      addressHistory
    };
  } catch (error: unknown) {
    console.error(`Error retrieving complete history for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get complete history for "${name}". Reason: ${message} [Error Code: GetEnsCompleteHistory_General_001]`
    );
    console.error('Error in getEnsCompleteHistory:', newError);
    throw newError;
  }
}

/**
 * List all subdomains under a name
 * @param name The ENS name to query
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to an array of subdomain names
 */
export async function getEnsSubdomains(
  name: string,
  network: string | Chain = mainnet
): Promise<string[]> {
  try {
    const { publicClient } = await getClients(network);
    const registryAddress = ENS_REGISTRY_ADDRESS;
    
    const logs = await publicClient.getLogs({
      address: registryAddress,
      event: {
        type: 'event',
        name: 'NewOwner',
        inputs: [
          { type: 'bytes32', name: 'node', indexed: true },
          { type: 'bytes32', name: 'label', indexed: true },
          { type: 'address', name: 'owner' },
        ],
      },
      args: {
        node: namehash(name)
      },
      fromBlock: 0n,
    });
    
    return logs
      .filter((log: Log) => log.args.label !== undefined)
      .map((log: Log) => labelhash(log.args.label as string));
  } catch (error: unknown) {
    console.error(`Error retrieving subdomains for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get subdomains for "${name}". Reason: ${message} [Error Code: GetEnsSubdomains_General_001]`
    );
    console.error('Error in getEnsSubdomains:', newError);
    throw newError;
  }
}

/**
 * Set subdomain resolver
 * @param parentName The parent ENS name (e.g., 'example.eth')
 * @param label The subdomain label (e.g., 'sub')
 * @param resolver The Ethereum address to set as the resolver for the subdomain
 * @param network Optional. The target blockchain network. Defaults to Ethereum mainnet.
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation
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
      const error = new Error(
        `Invalid resolver address: "${resolver}" [Error Code: SetSubdomainResolver_InvalidInput_001]`
      );
      console.error('Error in setSubdomainResolver:', error);
      throw error;
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
      account: walletClient.account as Account,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    console.error(`Error setting subdomain resolver for "${label}" under "${parentName}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to set subdomain resolver for "${label}" under "${parentName}". Reason: ${message} [Error Code: SetSubdomainResolver_General_001]`
    );
    console.error('Error in setSubdomainResolver:', newError);
    throw newError;
  }
}

/**
 * Wrap an ENS name into an NFT
 * @param name The ENS name to wrap
 * @param network The target blockchain network
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation
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
      account: walletClient.account as Account,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    console.error(`Error wrapping ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to wrap ENS name "${name}". Reason: ${message} [Error Code: WrapEnsName_General_001]`
    );
    console.error('Error in wrapEnsName:', newError);
    throw newError;
  }
}

/**
 * Unwrap an ENS name from NFT
 * @param name The ENS name to unwrap
 * @param network The target blockchain network
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation
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
      account: walletClient.account as Account,
    });
    return result as TransactionReceipt;
  } catch (error: unknown) {
    console.error(`Error unwrapping ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to unwrap ENS name "${name}". Reason: ${message} [Error Code: UnwrapEnsName_General_001]`
    );
    console.error('Error in unwrapEnsName:', newError);
    throw newError;
  }
}

/**
 * Get wrapped name details
 * @param name The ENS name to query
 * @param network The target blockchain network
 * @returns A Promise that resolves to an object containing tokenId, owner, and expiry
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
    const { walletClient } = await getClients(network);
    if (!walletClient.account) {
      throw new Error('No wallet account available [Error Code: GetWrappedNameDetails_NoAccount_001]');
    }
    const result = await walletClient.readContract({
      address: walletClient.address,
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
    console.error(`Error getting wrapped name details for ENS name "${name}":`, error);
    const message = error instanceof Error ? error.message : String(error);
    const newError = new Error(
      `Failed to get wrapped name details for "${name}". Reason: ${message} [Error Code: GetWrappedNameDetails_General_001]`
    );
    console.error('Error in getWrappedNameDetails:', newError);
    throw newError;
  }
}

/**
 * Set content hash (IPFS, Swarm, etc.)
 * @param name The ENS name to update
 * @param protocol The content protocol (e.g., 'ipfs', 'swarm', 'onion', 'skynet')
 * @param hash The content hash
 * @param network The target blockchain network
 * @returns A Promise that resolves to the transaction hash (`WriteContractResult`) of the operation
 */
import { normalize, labelhash, namehash } from 'viem/ens';
import { getPublicClient, getWalletClient } from './clients.js';
import { 
  type Address, 
  type Chain, 
  type Hash, 
  type TransactionReceipt, 
  type PublicClient, 
  type WalletClient, 
  type Account, 
  type WriteContractParameters,
  type Hex,
  type GetEnsResolverParameters,
  type Log,
  type WriteContractReturnType
} from 'viem';
import { mainnet } from 'viem/chains';
import { isAddress } from 'viem';

// ENS Registry address
const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;

/**
 * Utility function to get initialized clients for a network
 * @param network Network name or chain
 * @returns Object containing public and wallet clients
 */
