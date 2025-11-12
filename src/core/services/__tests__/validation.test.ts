import { describe, it, expect } from 'bun:test';
import {
  validateAddress,
  validateTxHash,
  validateAmount,
  validateTokenId,
  validateBlockNumber
} from '../validation.js';
import { ValidationError } from '../errors.js';

describe('Validation Utilities', () => {
  describe('validateAddress', () => {
    it('should accept valid Ethereum addresses', () => {
      expect(() => validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).not.toThrow();
      expect(() => validateAddress('0x0000000000000000000000000000000000000000')).not.toThrow();
    });

    it('should accept ENS names', () => {
      expect(() => validateAddress('vitalik.eth')).not.toThrow();
      expect(() => validateAddress('test.example.eth')).not.toThrow();
    });

    it('should reject invalid addresses', () => {
      expect(() => validateAddress('invalid')).toThrow(ValidationError);
      expect(() => validateAddress('0x123')).toThrow(ValidationError);
      expect(() => validateAddress('')).toThrow(ValidationError);
    });
  });

  describe('validateTxHash', () => {
    it('should accept valid transaction hashes', () => {
      expect(() => validateTxHash('0x1234567890123456789012345678901234567890123456789012345678901234')).not.toThrow();
    });

    it('should reject invalid transaction hashes', () => {
      expect(() => validateTxHash('0x123')).toThrow(ValidationError);
      expect(() => validateTxHash('invalid')).toThrow(ValidationError);
      expect(() => validateTxHash('')).toThrow(ValidationError);
    });
  });

  describe('validateAmount', () => {
    it('should accept valid amounts', () => {
      expect(() => validateAmount('100')).not.toThrow();
      expect(() => validateAmount('0.5')).not.toThrow();
      expect(() => validateAmount('1000.123')).not.toThrow();
    });

    it('should reject invalid amounts', () => {
      expect(() => validateAmount('-100')).toThrow(ValidationError);
      expect(() => validateAmount('abc')).toThrow(ValidationError);
      expect(() => validateAmount('')).toThrow(ValidationError);
    });
  });

  describe('validateTokenId', () => {
    it('should accept valid token IDs', () => {
      expect(() => validateTokenId('123')).not.toThrow();
      expect(() => validateTokenId(456)).not.toThrow();
      expect(() => validateTokenId('999999999999999999')).not.toThrow();
    });

    it('should reject invalid token IDs', () => {
      expect(() => validateTokenId('abc')).toThrow(ValidationError);
      expect(() => validateTokenId('12.5')).toThrow(ValidationError);
    });
  });

  describe('validateBlockNumber', () => {
    it('should accept valid block numbers', () => {
      expect(() => validateBlockNumber(12345)).not.toThrow();
      expect(() => validateBlockNumber(0)).not.toThrow();
      expect(() => validateBlockNumber('latest')).not.toThrow();
      expect(() => validateBlockNumber('earliest')).not.toThrow();
    });

    it('should reject invalid block numbers', () => {
      expect(() => validateBlockNumber(-1)).toThrow(ValidationError);
      expect(() => validateBlockNumber(12.5)).toThrow(ValidationError);
      expect(() => validateBlockNumber('invalid')).toThrow(ValidationError);
    });
  });
});
