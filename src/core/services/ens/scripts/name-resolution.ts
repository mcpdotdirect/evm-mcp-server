import { type Address, type PublicClient } from 'viem';
import { normalize } from 'viem/ens';

/**
 * Resolves an ENS name to an Ethereum address
 * @param name The ENS name to resolve
 * @param client The Viem public client
 * @returns The resolved Ethereum address or null if not found
 */
export async function resolveAddress(
  name: string,
  client: PublicClient
): Promise<Address | null> {
  try {
    const normalizedName = normalize(name);
    return await client.getEnsAddress({ name: normalizedName });
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    return null;
  }
}

/**
 * Looks up the ENS name for a given Ethereum address
 * @param address The Ethereum address to look up
 * @param client The Viem public client
 * @returns The ENS name or null if not found
 */
export async function lookupAddress(
  address: Address,
  client: PublicClient
): Promise<string | null> {
  try {
    return await client.getEnsName({ address });
  } catch (error) {
    console.error('Error looking up ENS name:', error);
    return null;
  }
}

/**
 * Checks if a given string is a valid ENS name
 * @param name The string to validate
 * @returns true if the string is a valid ENS name, false otherwise
 */
export function isValidEnsName(name: string): boolean {
  try {
    // Check if the name ends with .eth
    if (!name.toLowerCase().endsWith('.eth')) {
      return false;
    }

    // Remove .eth and check if the remaining part is valid
    const label = name.slice(0, -4);
    if (label.length < 3) {
      return false;
    }

    // Check if the label contains only valid characters
    const validChars = /^[a-z0-9-]+$/;
    if (!validChars.test(label)) {
      return false;
    }

    // Check if the label doesn't start or end with a hyphen
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
} 