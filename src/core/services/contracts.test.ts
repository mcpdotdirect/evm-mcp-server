import {
  readContract,
  writeContract,
  getLogs,
  isContract,
  multicall
} from './contracts.js';
import { getPublicClient, getWalletClient } from './clients.js';
import { resolveAddress } from './ens.js';
import type { Address, Hex } from 'viem';

// Mock dependencies
jest.mock('./clients.js', () => ({
  getPublicClient: jest.fn(),
  getWalletClient: jest.fn()
}));

jest.mock('./ens.js', () => ({
  resolveAddress: jest.fn()
}));

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockGetWalletClient = getWalletClient as jest.MockedFunction<typeof getWalletClient>;
const mockResolveAddress = resolveAddress as jest.MockedFunction<typeof resolveAddress>;

describe('contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readContract', () => {
    it('should read from a contract on default network', async () => {
      const mockReadContract = jest.fn().mockResolvedValue('result');
      const mockClient = { readContract: mockReadContract };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const params = {
        address: '0x1234567890123456789012345678901234567890' as Address,
        abi: [] as const,
        functionName: 'balanceOf',
        args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address]
      };

      const result = await readContract(params);

      expect(mockGetPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockReadContract).toHaveBeenCalledWith(params);
      expect(result).toBe('result');
    });

    it('should read from a contract on specified network', async () => {
      const mockReadContract = jest.fn().mockResolvedValue('result');
      const mockClient = { readContract: mockReadContract };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const params = {
        address: '0x1234567890123456789012345678901234567890' as Address,
        abi: [] as const,
        functionName: 'name'
      };

      const result = await readContract(params, 'polygon');

      expect(mockGetPublicClient).toHaveBeenCalledWith('polygon');
      expect(mockReadContract).toHaveBeenCalledWith(params);
      expect(result).toBe('result');
    });
  });

  describe('writeContract', () => {
    it('should write to a contract on default network', async () => {
      const mockWriteContract = jest.fn().mockResolvedValue('0xtxhash');
      const mockClient = { writeContract: mockWriteContract };
      mockGetWalletClient.mockReturnValue(mockClient as any);

      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;
      const params = {
        address: '0x1234567890123456789012345678901234567890' as Address,
        abi: [] as const,
        functionName: 'transfer',
        args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address, 1000n]
      };

      const result = await writeContract(privateKey, params);

      expect(mockGetWalletClient).toHaveBeenCalledWith(privateKey, 'ethereum');
      expect(mockWriteContract).toHaveBeenCalledWith(params);
      expect(result).toBe('0xtxhash');
    });

    it('should write to a contract on specified network', async () => {
      const mockWriteContract = jest.fn().mockResolvedValue('0xtxhash2');
      const mockClient = { writeContract: mockWriteContract };
      mockGetWalletClient.mockReturnValue(mockClient as any);

      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;
      const params = {
        address: '0x1234567890123456789012345678901234567890' as Address,
        abi: [] as const,
        functionName: 'approve',
        args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address, 500n]
      };

      const result = await writeContract(privateKey, params, 'arbitrum');

      expect(mockGetWalletClient).toHaveBeenCalledWith(privateKey, 'arbitrum');
      expect(mockWriteContract).toHaveBeenCalledWith(params);
      expect(result).toBe('0xtxhash2');
    });
  });

  describe('getLogs', () => {
    it('should get logs on default network', async () => {
      const mockGetLogs = jest.fn().mockResolvedValue([{ logIndex: '0x0' }]);
      const mockClient = { getLogs: mockGetLogs };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const params = {
        address: '0x1234567890123456789012345678901234567890' as Address,
        fromBlock: 1000000n,
        toBlock: 1000100n
      };

      const result = await getLogs(params);

      expect(mockGetPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockGetLogs).toHaveBeenCalledWith(params);
      expect(result).toEqual([{ logIndex: '0x0' }]);
    });

    it('should get logs on specified network', async () => {
      const mockGetLogs = jest.fn().mockResolvedValue([{ logIndex: '0x1' }, { logIndex: '0x2' }]);
      const mockClient = { getLogs: mockGetLogs };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const params = {
        address: '0x1234567890123456789012345678901234567890' as Address,
        fromBlock: 500000n,
        toBlock: 500100n
      };

      const result = await getLogs(params, 'base');

      expect(mockGetPublicClient).toHaveBeenCalledWith('base');
      expect(mockGetLogs).toHaveBeenCalledWith(params);
      expect(result).toEqual([{ logIndex: '0x1' }, { logIndex: '0x2' }]);
    });
  });

  describe('isContract', () => {
    it('should return true for a contract address', async () => {
      mockResolveAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
      const mockGetBytecode = jest.fn().mockResolvedValue('0x60806040');
      const mockClient = { getBytecode: mockGetBytecode };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const result = await isContract('0x1234567890123456789012345678901234567890');

      expect(mockResolveAddress).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890', 'ethereum');
      expect(mockGetBytecode).toHaveBeenCalledWith({ address: '0x1234567890123456789012345678901234567890' });
      expect(result).toBe(true);
    });

    it('should return false for an EOA address', async () => {
      mockResolveAddress.mockResolvedValue('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      const mockGetBytecode = jest.fn().mockResolvedValue('0x');
      const mockClient = { getBytecode: mockGetBytecode };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const result = await isContract('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      expect(mockResolveAddress).toHaveBeenCalledWith('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'ethereum');
      expect(mockGetBytecode).toHaveBeenCalledWith({ address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' });
      expect(result).toBe(false);
    });

    it('should return false when bytecode is undefined', async () => {
      mockResolveAddress.mockResolvedValue('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      const mockGetBytecode = jest.fn().mockResolvedValue(undefined);
      const mockClient = { getBytecode: mockGetBytecode };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const result = await isContract('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      expect(result).toBe(false);
    });

    it('should resolve ENS name and check if contract', async () => {
      mockResolveAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
      const mockGetBytecode = jest.fn().mockResolvedValue('0x60806040');
      const mockClient = { getBytecode: mockGetBytecode };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const result = await isContract('uniswap.eth');

      expect(mockResolveAddress).toHaveBeenCalledWith('uniswap.eth', 'ethereum');
      expect(mockGetBytecode).toHaveBeenCalledWith({ address: '0x1234567890123456789012345678901234567890' });
      expect(result).toBe(true);
    });

    it('should use specified network for ENS resolution and bytecode check', async () => {
      mockResolveAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
      const mockGetBytecode = jest.fn().mockResolvedValue('0x60806040');
      const mockClient = { getBytecode: mockGetBytecode };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const result = await isContract('example.eth', 'polygon');

      expect(mockResolveAddress).toHaveBeenCalledWith('example.eth', 'polygon');
      expect(mockGetPublicClient).toHaveBeenCalledWith('polygon');
      expect(result).toBe(true);
    });
  });

  describe('multicall', () => {
    it('should batch multiple contract read calls with default options', async () => {
      const mockMulticall = jest.fn().mockResolvedValue([
        { result: 100n, status: 'success' },
        { result: 'Token Name', status: 'success' }
      ]);
      const mockClient = { multicall: mockMulticall };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          abi: [],
          functionName: 'balanceOf',
          args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd']
        },
        {
          address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          abi: [],
          functionName: 'name'
        }
      ];

      const result = await multicall(contracts);

      expect(mockGetPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockMulticall).toHaveBeenCalledWith({
        contracts,
        allowFailure: true
      });
      expect(result).toEqual([
        { result: 100n, status: 'success' },
        { result: 'Token Name', status: 'success' }
      ]);
    });

    it('should batch calls with allowFailure set to false', async () => {
      const mockMulticall = jest.fn().mockResolvedValue([
        { result: 500n },
        { result: 'Symbol' }
      ]);
      const mockClient = { multicall: mockMulticall };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          abi: [],
          functionName: 'totalSupply'
        },
        {
          address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          abi: [],
          functionName: 'symbol'
        }
      ];

      const result = await multicall(contracts, false);

      expect(mockMulticall).toHaveBeenCalledWith({
        contracts,
        allowFailure: false
      });
      expect(result).toEqual([
        { result: 500n },
        { result: 'Symbol' }
      ]);
    });

    it('should batch calls on specified network', async () => {
      const mockMulticall = jest.fn().mockResolvedValue([
        { result: 1000n, status: 'success' }
      ]);
      const mockClient = { multicall: mockMulticall };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          abi: [],
          functionName: 'getReserves'
        }
      ];

      const result = await multicall(contracts, true, 'optimism');

      expect(mockGetPublicClient).toHaveBeenCalledWith('optimism');
      expect(mockMulticall).toHaveBeenCalledWith({
        contracts,
        allowFailure: true
      });
      expect(result).toEqual([{ result: 1000n, status: 'success' }]);
    });

    it('should handle empty contracts array', async () => {
      const mockMulticall = jest.fn().mockResolvedValue([]);
      const mockClient = { multicall: mockMulticall };
      mockGetPublicClient.mockReturnValue(mockClient as any);

      const result = await multicall([]);

      expect(mockMulticall).toHaveBeenCalledWith({
        contracts: [],
        allowFailure: true
      });
      expect(result).toEqual([]);
    });
  });
});
