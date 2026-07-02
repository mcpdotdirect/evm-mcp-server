import {
  getBlockNumber,
  getBlockByNumber,
  getBlockByHash,
  getLatestBlock
} from './blocks.js';
import { getPublicClient } from './clients.js';
import type { Block, Hash } from 'viem';

jest.mock('./clients.js', () => ({
  getPublicClient: jest.fn()
}));

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;

describe('blocks service', () => {
  const mockBlockNumber = 18000000n;
  const mockBlock: Block = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash,
    parentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash,
    number: mockBlockNumber,
    timestamp: 1700000000n,
    nonce: '0x0000000000000000',
    difficulty: 0n,
    gasLimit: 30000000n,
    gasUsed: 15000000n,
    miner: '0x0000000000000000000000000000000000000000',
    extraData: '0x',
    baseFeePerGas: 1000000000n,
    transactions: [],
    size: 1000n,
    stateRoot: '0x' + '0'.repeat(64) as Hash,
    receiptsRoot: '0x' + '0'.repeat(64) as Hash,
    transactionsRoot: '0x' + '0'.repeat(64) as Hash,
    logsBloom: ('0x' + '0'.repeat(512)) as `0x${string}`,
    totalDifficulty: 0n,
    sha3Uncles: '0x' + '0'.repeat(64) as Hash,
    uncles: [],
    mixHash: '0x' + '0'.repeat(64) as Hash,
    blobGasUsed: 0n,
    excessBlobGas: 0n,
    sealFields: []
  };

  const mockClient = {
    getBlockNumber: jest.fn(),
    getBlock: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPublicClient.mockReturnValue(mockClient as never);
  });

  describe('getBlockNumber', () => {
    it('should return block number for default network (ethereum)', async () => {
      mockClient.getBlockNumber.mockResolvedValue(mockBlockNumber);

      const result = await getBlockNumber();

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockClient.getBlockNumber).toHaveBeenCalled();
      expect(result).toBe(mockBlockNumber);
    });

    it('should return block number for specified network', async () => {
      mockClient.getBlockNumber.mockResolvedValue(mockBlockNumber);

      const result = await getBlockNumber('polygon');

      expect(getPublicClient).toHaveBeenCalledWith('polygon');
      expect(mockClient.getBlockNumber).toHaveBeenCalled();
      expect(result).toBe(mockBlockNumber);
    });
  });

  describe('getBlockByNumber', () => {
    const blockNumber = 18000000;

    it('should return block for specified block number with default network', async () => {
      mockClient.getBlock.mockResolvedValue(mockBlock);

      const result = await getBlockByNumber(blockNumber);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockClient.getBlock).toHaveBeenCalledWith({ blockNumber: BigInt(blockNumber) });
      expect(result).toEqual(mockBlock);
    });

    it('should return block for specified block number and network', async () => {
      mockClient.getBlock.mockResolvedValue(mockBlock);

      const result = await getBlockByNumber(blockNumber, 'arbitrum');

      expect(getPublicClient).toHaveBeenCalledWith('arbitrum');
      expect(mockClient.getBlock).toHaveBeenCalledWith({ blockNumber: BigInt(blockNumber) });
      expect(result).toEqual(mockBlock);
    });

    it('should handle different block numbers correctly', async () => {
      mockClient.getBlock.mockResolvedValue(mockBlock);

      await getBlockByNumber(12345);

      expect(mockClient.getBlock).toHaveBeenCalledWith({ blockNumber: 12345n });
    });
  });

  describe('getBlockByHash', () => {
    const blockHash: Hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should return block for specified hash with default network', async () => {
      mockClient.getBlock.mockResolvedValue(mockBlock);

      const result = await getBlockByHash(blockHash);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockClient.getBlock).toHaveBeenCalledWith({ blockHash });
      expect(result).toEqual(mockBlock);
    });

    it('should return block for specified hash and network', async () => {
      mockClient.getBlock.mockResolvedValue(mockBlock);

      const result = await getBlockByHash(blockHash, 'optimism');

      expect(getPublicClient).toHaveBeenCalledWith('optimism');
      expect(mockClient.getBlock).toHaveBeenCalledWith({ blockHash });
      expect(result).toEqual(mockBlock);
    });
  });

  describe('getLatestBlock', () => {
    it('should return latest block for default network', async () => {
      mockClient.getBlock.mockResolvedValue(mockBlock);

      const result = await getLatestBlock();

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockClient.getBlock).toHaveBeenCalledWith();
      expect(result).toEqual(mockBlock);
    });

    it('should return latest block for specified network', async () => {
      mockClient.getBlock.mockResolvedValue(mockBlock);

      const result = await getLatestBlock('base');

      expect(getPublicClient).toHaveBeenCalledWith('base');
      expect(mockClient.getBlock).toHaveBeenCalledWith();
      expect(result).toEqual(mockBlock);
    });
  });
});
