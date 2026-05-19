import {
  fetchContractABI,
  parseABI,
  getReadableFunctions,
  getFunctionFromABI
} from './abi.js';
import { resolveChainId, getSupportedNetworks } from '../chains.js';

// Mock dependencies
jest.mock('../chains.js', () => ({
  resolveChainId: jest.fn(),
  getSupportedNetworks: jest.fn()
}));

const mockResolveChainId = resolveChainId as jest.MockedFunction<typeof resolveChainId>;
const mockGetSupportedNetworks = getSupportedNetworks as jest.MockedFunction<typeof getSupportedNetworks>;

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('abi', () => {
  const mockContractAddress = '0x1234567890123456789012345678901234567890';
  const mockABI = JSON.stringify([
    {
      inputs: [{ name: 'owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'name',
      outputs: [{ type: 'string' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'symbol',
      outputs: [{ type: 'string' }],
      stateMutability: 'pure',
      type: 'function'
    },
    {
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      name: 'transfer',
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable
    delete process.env.ETHERSCAN_API_KEY;
  });

  describe('fetchContractABI', () => {
    it('should throw error when ETHERSCAN_API_KEY is not set', async () => {
      await expect(fetchContractABI(mockContractAddress))
        .rejects
        .toThrow('ETHERSCAN_API_KEY environment variable is not set');
    });

    it('should fetch ABI from Etherscan with default network (ethereum)', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockReturnValue(1);
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: '1', result: mockABI })
      });

      const result = await fetchContractABI(mockContractAddress);

      expect(mockResolveChainId).toHaveBeenCalledWith('ethereum');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.etherscan.io/v2/api')
      );
      expect(result).toBe(mockABI);
    });

    it('should fetch ABI from Etherscan with specified network', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockReturnValue(137);
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: '1', result: mockABI })
      });

      const result = await fetchContractABI(mockContractAddress, 'polygon');

      expect(mockResolveChainId).toHaveBeenCalledWith('polygon');
      expect(result).toBe(mockABI);
    });

    it('should throw error when network is not supported', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockImplementation(() => {
        throw new Error('Invalid network');
      });
      mockGetSupportedNetworks.mockReturnValue(['ethereum', 'polygon', 'arbitrum']);

      await expect(fetchContractABI(mockContractAddress, 'invalid-network'))
        .rejects
        .toThrow('Network "invalid-network" is not supported. Supported: ethereum, polygon, arbitrum');
    });

    it('should throw error when Etherscan returns status 0 with error message', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockReturnValue(1);
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: '0', result: 'Contract not verified' })
      });

      await expect(fetchContractABI(mockContractAddress))
        .rejects
        .toThrow('Failed to fetch ABI: Contract not verified');
    });

    it('should throw error when Etherscan returns no result', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockReturnValue(1);
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: '1', result: null })
      });

      await expect(fetchContractABI(mockContractAddress))
        .rejects
        .toThrow('No ABI found for this contract');
    });

    it('should throw error when fetch fails with network error', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockReturnValue(1);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(fetchContractABI(mockContractAddress))
        .rejects
        .toThrow('Failed to fetch ABI: Network error');
    });

    it('should throw error when fetch returns non-JSON response', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockReturnValue(1);
      mockFetch.mockImplementation(() => {
        throw new TypeError('Unexpected token in JSON');
      });

      await expect(fetchContractABI(mockContractAddress))
        .rejects
        .toThrow('Failed to fetch ABI: Unexpected token in JSON');
    });

    it('should handle unknown error type', async () => {
      process.env.ETHERSCAN_API_KEY = 'test-api-key';
      mockResolveChainId.mockReturnValue(1);
      mockFetch.mockImplementation(() => {
        throw 'string error';
      });

      await expect(fetchContractABI(mockContractAddress))
        .rejects
        .toBe('string error');
    });
  });

  describe('parseABI', () => {
    it('should parse valid ABI JSON string', () => {
      const result = parseABI(mockABI);
      expect(result).toEqual(JSON.parse(mockABI));
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJSON = '{ invalid json }';
      expect(() => parseABI(invalidJSON))
        .toThrow('Invalid ABI JSON:');
    });

    it('should throw error when ABI is not an array', () => {
      const notArray = JSON.stringify({ name: 'not-an-array' });
      expect(() => parseABI(notArray))
        .toThrow('ABI must be a JSON array');
    });

    it('should throw error for empty string', () => {
      expect(() => parseABI(''))
        .toThrow('Invalid ABI JSON:');
    });

    it('should throw error for null input', () => {
      expect(() => parseABI('null'))
        .toThrow('ABI must be a JSON array');
    });

    it('should parse empty ABI array', () => {
      const emptyABI = '[]';
      const result = parseABI(emptyABI);
      expect(result).toEqual([]);
    });
  });

  describe('getReadableFunctions', () => {
    it('should return only view and pure functions', () => {
      const abi = JSON.parse(mockABI);
      const result = getReadableFunctions(abi);
      expect(result).toEqual(['balanceOf', 'name', 'symbol']);
    });

    it('should return empty array for ABI with no readable functions', () => {
      const abi = [
        {
          inputs: [{ name: 'to', type: 'address' }],
          name: 'transfer',
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ];
      const result = getReadableFunctions(abi);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty ABI', () => {
      const result = getReadableFunctions([]);
      expect(result).toEqual([]);
    });

    it('should filter out non-function types', () => {
      const abi = [
        {
          inputs: [],
          name: 'Transfer',
          type: 'event'
        },
        {
          inputs: [],
          name: 'name',
          outputs: [{ type: 'string' }],
          stateMutability: 'view',
          type: 'function'
        }
      ];
      const result = getReadableFunctions(abi);
      expect(result).toEqual(['name']);
    });

    it('should handle functions without name property', () => {
      const abi = [
        {
          inputs: [],
          stateMutability: 'view',
          type: 'function'
        },
        {
          inputs: [],
          name: 'getName',
          stateMutability: 'view',
          type: 'function'
        }
      ];
      const result = getReadableFunctions(abi);
      expect(result).toEqual(['getName']);
    });

    it('should include both view and pure functions', () => {
      const abi = [
        {
          inputs: [],
          name: 'viewFunc',
          stateMutability: 'view',
          type: 'function'
        },
        {
          inputs: [],
          name: 'pureFunc',
          stateMutability: 'pure',
          type: 'function'
        }
      ];
      const result = getReadableFunctions(abi);
      expect(result).toEqual(['viewFunc', 'pureFunc']);
    });
  });

  describe('getFunctionFromABI', () => {
    it('should find and return a function by name', () => {
      const abi = JSON.parse(mockABI);
      const result = getFunctionFromABI(abi, 'balanceOf');
      expect(result).toEqual(abi[0]);
      expect(result.name).toBe('balanceOf');
    });

    it('should throw error when function is not found', () => {
      const abi = JSON.parse(mockABI);
      expect(() => getFunctionFromABI(abi, 'nonExistentFunction'))
        .toThrow('Function "nonExistentFunction" not found in ABI');
    });

    it('should throw error with correct function name in message', () => {
      const abi = JSON.parse(mockABI);
      expect(() => getFunctionFromABI(abi, 'missingFunc'))
        .toThrow('Function "missingFunc" not found in ABI');
    });

    it('should work with empty ABI array', () => {
      expect(() => getFunctionFromABI([], 'anyFunction'))
        .toThrow('Function "anyFunction" not found in ABI');
    });

    it('should find function when multiple functions have similar names', () => {
      const abi = [
        {
          inputs: [],
          name: 'balanceOf',
          stateMutability: 'view',
          type: 'function'
        },
        {
          inputs: [],
          name: 'balanceOfUnderlying',
          stateMutability: 'view',
          type: 'function'
        }
      ];
      const result = getFunctionFromABI(abi, 'balanceOf');
      expect(result.name).toBe('balanceOf');
      expect(result).toBe(abi[0]);
    });

    it('should return the first matching function', () => {
      const abi = [
        {
          inputs: [],
          name: 'duplicate',
          stateMutability: 'view',
          type: 'function'
        },
        {
          inputs: [],
          name: 'duplicate',
          stateMutability: 'pure',
          type: 'function'
        }
      ];
      const result = getFunctionFromABI(abi, 'duplicate');
      expect(result).toBe(abi[0]);
    });
  });
});
