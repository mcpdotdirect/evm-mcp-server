import { isAddress, isHex } from 'viem';
import { ValidationError } from './errors.js';

/**
 * Validation utilities for inputs
 */

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string, fieldName = 'address'): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`, fieldName);
  }

  // Allow ENS names (contain a dot)
  if (address.includes('.')) {
    return;
  }

  if (!isAddress(address)) {
    throw new ValidationError(`Invalid Ethereum address format: ${address}`, fieldName);
  }
}

/**
 * Validate transaction hash format
 */
export function validateTxHash(txHash: string, fieldName = 'txHash'): void {
  if (!txHash || typeof txHash !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`, fieldName);
  }

  if (!isHex(txHash) || txHash.length !== 66) {
    throw new ValidationError(`Invalid transaction hash format: ${txHash}`, fieldName);
  }
}

/**
 * Validate private key format
 */
export function validatePrivateKey(privateKey: string, fieldName = 'privateKey'): void {
  if (!privateKey || typeof privateKey !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`, fieldName);
  }

  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  if (key.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new ValidationError(`Invalid private key format`, fieldName);
  }
}

/**
 * Validate amount format (must be a positive number string)
 */
export function validateAmount(amount: string, fieldName = 'amount'): void {
  if (!amount || typeof amount !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`, fieldName);
  }

  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${fieldName} must be a valid positive number`, fieldName);
  }
}

/**
 * Validate token ID format
 */
export function validateTokenId(tokenId: string | number, fieldName = 'tokenId'): void {
  if (tokenId === undefined || tokenId === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  try {
    BigInt(tokenId);
  } catch (error) {
    throw new ValidationError(`${fieldName} must be a valid number or bigint string`, fieldName);
  }
}

/**
 * Validate network name
 */
export function validateNetwork(network: string, fieldName = 'network'): void {
  if (!network || typeof network !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`, fieldName);
  }
}

/**
 * Validate ABI format
 */
export function validateABI(abi: any, fieldName = 'abi'): void {
  if (!Array.isArray(abi)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName);
  }

  if (abi.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
}

/**
 * Validate block number
 */
export function validateBlockNumber(blockNumber: number | string, fieldName = 'blockNumber'): void {
  if (typeof blockNumber === 'string' && blockNumber !== 'latest' && blockNumber !== 'earliest' && blockNumber !== 'pending') {
    throw new ValidationError(`${fieldName} must be a number or 'latest', 'earliest', 'pending'`, fieldName);
  }

  if (typeof blockNumber === 'number' && (blockNumber < 0 || !Number.isInteger(blockNumber))) {
    throw new ValidationError(`${fieldName} must be a positive integer`, fieldName);
  }
}
