import {
  type Address,
  type Hash,
  type Hex,
  type ReadContractParameters,
  type WriteContractParameters, // Added for type safety
  type GetLogsParameters,
  type Log,
  type Chain, // Added for network parameter consistency
} from 'viem';
import { mainnet } from 'viem/chains'; // Import mainnet for default chain
import { getPublicClient, getWalletClient } from './clients.js';
import { resolveAddress } from './ens.js';

/**
 * Reads data from a smart contract on a specified network using a public client.
 * Wraps viem's `readContract` with network selection and error handling.
 *
 * @param params - Parameters for the contract read operation (abi, address, functionName, args, etc.).
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the result of the contract read.
 * @throws Throws an error if the read operation fails, including network or contract issues.
 * @template TAbi - The ABI of the contract.
 * @template TFunctionName - The name of the function to call.
 * @example
 * const name = await readContract({ address: '0x...', abi: erc20Abi, functionName: 'name' });
 * const balance = await readContract({ address: '0x...', abi: erc20Abi, functionName: 'balanceOf', args: ['0x...'] }, 'polygon');
 */
export async function readContract<
  const TAbi extends ReadContractParameters['abi'], // Use const TAbi for better inference
  TFunctionName extends ReadContractParameters['functionName']
>(
  params: ReadContractParameters<TAbi, TFunctionName>,
  network: string | Chain = mainnet
): Promise<any> { // Return type depends on the contract function, 'any' is a safe default here
  try {
    const client = getPublicClient(network);
    // Type assertion needed because viem's client.readContract expects specific generics
    // which are hard to pass down perfectly without making this function generic itself in a complex way.
    // The ReadContractParameters type ensures the structure is correct.
    return await client.readContract(params as ReadContractParameters);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
    const contractAddress = params.address ?? 'unknown address';
    const functionName = params.functionName ?? 'unknown function';
    // Provide a more informative error message
    throw new Error(
      `Failed to read contract ${contractAddress} function ${functionName} on network "${networkIdentifier}". Reason: ${message} [Error Code: ReadContract_General_001]`
    );
  }
}

/**
 * Sends a transaction to write data to a smart contract on a specified network using a wallet client.
 * Wraps viem's `writeContract` with network selection, private key handling, and error handling.
 *
 * @param privateKey - The private key of the account sending the transaction.
 * @param params - Parameters for the contract write operation (abi, address, functionName, args, value, etc.).
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to the transaction hash (Hash).
 * @throws Throws an error if the write operation fails, including network, signing, or contract issues.
 * @template TAbi - The ABI of the contract.
 * @template TFunctionName - The name of the function to call.
 * @example
 * const txHash = await writeContract(process.env.PRIVATE_KEY, { address: '0x...', abi: erc20Abi, functionName: 'transfer', args: ['0x...', 100n] });
 */
export async function writeContract<
  const TAbi extends WriteContractParameters['abi'], // Use const TAbi for better inference
  TFunctionName extends WriteContractParameters['functionName']
>(
  privateKey: Hex,
  params: WriteContractParameters<TAbi, TFunctionName>, // Use WriteContractParameters for type safety
  network: string | Chain = mainnet
): Promise<Hash> {
  try {
    // The wallet client is derived from the private key and handles the account details
    const client = getWalletClient(privateKey, network);
    // Type assertion needed similar to readContract. WriteContractParameters ensures structure.
    return await client.writeContract(params as WriteContractParameters);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
    const contractAddress = params.address ?? 'unknown address';
    const functionName = params.functionName ?? 'unknown function';
    // Provide a more informative error message
    throw new Error(
      `Failed to write contract ${contractAddress} function ${functionName} on network "${networkIdentifier}". Reason: ${message} [Error Code: WriteContract_General_001]`
    );
  }
}

/**
 * Retrieves event logs from a specified network based on the provided filters.
 * Wraps viem's `getLogs` with network selection and error handling.
 *
 * @param params - Parameters for filtering logs (address, event, args, fromBlock, toBlock, etc.).
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to an array of Log objects.
 * @throws Throws an error if fetching logs fails, including network or filter issues.
 * @example
 * const transferLogs = await getLogs({ address: '0x...', event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'), fromBlock: 'latest' });
 */
export async function getLogs(
  params: GetLogsParameters,
  network: string | Chain = mainnet
): Promise<Log[]> {
  try {
    const client = getPublicClient(network);
    return await client.getLogs(params);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
    // Provide a more informative error message
    throw new Error(
      `Failed to get logs on network "${networkIdentifier}". Filters: ${JSON.stringify(params)}. Reason: ${message} [Error Code: GetLogs_General_001]`
    );
  }
}

/**
 * Checks if a given address corresponds to a smart contract on a specified network by checking its bytecode.
 *
 * @param addressOrEns - The address or ENS name to check.
 * @param network - The target blockchain network (name, chain ID, or Chain object). Defaults to Ethereum mainnet.
 * @returns A Promise resolving to `true` if the address has bytecode (is a contract), `false` otherwise (is an EOA or doesn't exist).
 * @throws Throws an error if resolving the address or fetching bytecode fails.
 * @example
 * const isDaiContract = await isContract('dai.eth');
 * const isEoa = await isContract('0x...'); // Check an Externally Owned Account
 */
export async function isContract(
  addressOrEns: string,
  network: string | Chain = mainnet
): Promise<boolean> {
  let address: Address;
  const networkIdentifier = typeof network === 'string' ? network : network.name ?? 'unknown';
  try {
    // Resolve ENS name to address if needed, handle potential resolution errors separately
    address = await resolveAddress(addressOrEns, network);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to resolve address/ENS name "${addressOrEns}" on network "${networkIdentifier}". Reason: ${message} [Error Code: IsContract_Resolve_001]`
    );
  }

  try {
    const client = getPublicClient(network);
    const code = await client.getBytecode({ address });
    // A contract has bytecode, an EOA has '0x' or undefined/null if the address doesn't exist.
    return !!code && code !== '0x';
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Provide a more informative error message for bytecode fetching failure
    throw new Error(
      `Failed to check bytecode for address "${address}" (resolved from "${addressOrEns}") on network "${networkIdentifier}". Reason: ${message} [Error Code: IsContract_GetBytecode_001]`
    );
  }
}