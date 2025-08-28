import { fromBech32Address, toBech32Address } from '@zilliqa-js/crypto';
import { validation } from '@zilliqa-js/util';

/**
 * Converts a Zilliqa bech32 address to a hex address.
 * 
 * @param bech32Address The Zilliqa bech32 address (e.g., 'zil1...')
 * @returns The hex address (e.g., '0x...')
 */
export function zilToHex(bech32Address: string): string {
  // fromBech32Address will throw if invalid
  return fromBech32Address(bech32Address);
}

/**
 * Converts a hex address to a Zilliqa bech32 address.
 * 
 * @param hexAddress The hex address (e.g., '0x...')
 * @returns The Zilliqa bech32 address (e.g., 'zil1...')
 */
export function hexToZil(hexAddress: string): string {
  if (!validation.isAddress(hexAddress)) {
    throw new Error('Invalid hex address');
  }
  return toBech32Address(hexAddress);
}
