import { resolveAddress } from './ens.js';
import { normalize } from 'viem/ens';
import { getPublicClient } from './clients.js';

jest.mock('viem/ens', () => ({
  normalize: jest.fn(),
}));

jest.mock('./clients.js', () => ({
  getPublicClient: jest.fn(),
}));

describe('resolveAddress', () => {
  const mockGetEnsAddress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getPublicClient as jest.Mock).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });
  });

  describe('when given a valid Ethereum address', () => {
    it('should return the address unchanged (lowercase)', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const result = await resolveAddress(address);
      expect(result).toBe(address);
      expect(getPublicClient).not.toHaveBeenCalled();
      expect(normalize).not.toHaveBeenCalled();
    });

    it('should return the address unchanged (uppercase)', async () => {
      const address = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const result = await resolveAddress(address);
      expect(result).toBe(address);
    });

    it('should return the address unchanged with mixed case', async () => {
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const result = await resolveAddress(address);
      expect(result).toBe(address);
    });
  });

  describe('when given an ENS name', () => {
    const ensName = 'example.eth';
    const resolvedAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const normalizedEns = 'example.eth';

    beforeEach(() => {
      (normalize as jest.Mock).mockReturnValue(normalizedEns);
    });

    it('should resolve a valid ENS name to an address', async () => {
      mockGetEnsAddress.mockResolvedValue(resolvedAddress);

      const result = await resolveAddress(ensName);

      expect(normalize).toHaveBeenCalledWith(ensName);
      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockGetEnsAddress).toHaveBeenCalledWith({ name: normalizedEns });
      expect(result).toBe(resolvedAddress);
    });

    it('should use the specified network when provided', async () => {
      mockGetEnsAddress.mockResolvedValue(resolvedAddress);

      await resolveAddress(ensName, 'sepolia');

      expect(getPublicClient).toHaveBeenCalledWith('sepolia');
    });

    it('should throw an error if ENS resolution returns null', async () => {
      mockGetEnsAddress.mockResolvedValue(null);

      await expect(resolveAddress(ensName)).rejects.toThrow(
        `ENS name ${ensName} could not be resolved to an address`
      );
    });

    it('should throw an error if ENS resolution fails', async () => {
      const errorMessage = 'ENS name not found';
      mockGetEnsAddress.mockRejectedValue(new Error(errorMessage));

      await expect(resolveAddress(ensName)).rejects.toThrow(
        `Failed to resolve ENS name ${ensName}: ${errorMessage}`
      );
    });

    it('should throw an error if normalize fails', async () => {
      const normalizeError = new Error('Invalid ENS name');
      (normalize as jest.Mock).mockImplementation(() => {
        throw normalizeError;
      });

      await expect(resolveAddress(ensName)).rejects.toThrow(
        `Failed to resolve ENS name ${ensName}: ${normalizeError.message}`
      );
    });
  });

  describe('when given an invalid input', () => {
    it('should throw an error for a string that is not a valid address or ENS name', async () => {
      const invalidInput = 'not-an-address-or-ens';

      await expect(resolveAddress(invalidInput)).rejects.toThrow(
        `Invalid address or ENS name: ${invalidInput}`
      );
    });

    it('should throw an error for an empty string', async () => {
      await expect(resolveAddress('')).rejects.toThrow(
        'Invalid address or ENS name: '
      );
    });

    it('should throw an error for an address with incorrect length', async () => {
      const invalidAddress = '0x1234567890';

      await expect(resolveAddress(invalidAddress)).rejects.toThrow(
        `Invalid address or ENS name: ${invalidAddress}`
      );
    });

    it('should throw an error for an address with invalid hex characters', async () => {
      const invalidAddress = '0xGGGG567890123456789012345678901234567890';

      await expect(resolveAddress(invalidAddress)).rejects.toThrow(
        `Invalid address or ENS name: ${invalidAddress}`
      );
    });

    it('should throw an error for an address missing 0x prefix', async () => {
      const invalidAddress = '1234567890123456789012345678901234567890';

      await expect(resolveAddress(invalidAddress)).rejects.toThrow(
        `Invalid address or ENS name: ${invalidAddress}`
      );
    });
  });
});
