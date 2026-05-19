import { utils } from './utils.js';

describe('utils', () => {
  describe('formatBigInt', () => {
    it('should format a bigint to a string', () => {
      expect(utils.formatBigInt(123n)).toBe('123');
    });

    it('should format a large bigint to a string', () => {
      expect(utils.formatBigInt(9007199254740991n)).toBe('9007199254740991');
    });

    it('should format zero bigint to string', () => {
      expect(utils.formatBigInt(0n)).toBe('0');
    });
  });

  describe('formatJson', () => {
    it('should format an object to JSON with bigint handling', () => {
      const obj = { value: 100n, name: 'test' };
      expect(utils.formatJson(obj)).toBe(JSON.stringify(obj, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
    });

    it('should format a simple object without bigint', () => {
      const obj = { name: 'test', count: 42 };
      expect(utils.formatJson(obj)).toBe(JSON.stringify(obj, null, 2));
    });

    it('should format nested objects with bigint handling', () => {
      const obj = { nested: { value: 50n }, total: 100n };
      expect(utils.formatJson(obj)).toBe(JSON.stringify(obj, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
    });
  });

  describe('formatNumber', () => {
    it('should format a number with commas', () => {
      expect(utils.formatNumber(1000)).toBe('1,000');
    });

    it('should format a string number with commas', () => {
      expect(utils.formatNumber('1000')).toBe('1,000');
    });

    it('should format a large number with commas', () => {
      expect(utils.formatNumber(1000000)).toBe('1,000,000');
    });

    it('should format a decimal number', () => {
      expect(utils.formatNumber(1234.56)).toBe('1,234.56');
    });
  });

  describe('hexToNumber', () => {
    it('should convert a hex string to a number', () => {
      expect(utils.hexToNumber('0xff')).toBe(255);
    });

    it('should convert hex string without prefix to a number', () => {
      expect(utils.hexToNumber('ff')).toBe(255);
    });

    it('should convert zero hex to zero', () => {
      expect(utils.hexToNumber('0x0')).toBe(0);
    });

    it('should convert larger hex to number', () => {
      expect(utils.hexToNumber('0x10')).toBe(16);
    });
  });

  describe('numberToHex', () => {
    it('should convert a number to a hex string', () => {
      expect(utils.numberToHex(255)).toBe('0xff');
    });

    it('should convert zero to hex string', () => {
      expect(utils.numberToHex(0)).toBe('0x0');
    });

    it('should convert 16 to hex string', () => {
      expect(utils.numberToHex(16)).toBe('0x10');
    });

    it('should convert larger number to hex string', () => {
      expect(utils.numberToHex(4096)).toBe('0x1000');
    });
  });
});
