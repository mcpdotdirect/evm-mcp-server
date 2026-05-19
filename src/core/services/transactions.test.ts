import {
  getTransaction,
  getTransactionReceipt,
  getTransactionCount,
  estimateGas,
  getChainId
} from './transactions.js';
import { getPublicClient } from './clients.js';
import type { TransactionReceipt } from 'viem';

jest.mock('./clients.js', () => ({
  getPublicClient: jest.fn()
}));

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;

describe('transactions', () => {
  const mockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`;
  const mockNetwork = 'ethereum';
  const mockChainId = 1;
  const mockGas = BigInt(21000);
  const mockNonce = BigInt(5);

  let mockClient: {
    getTransaction: jest.Mock;
    getTransactionReceipt: jest.Mock;
    getTransactionCount: jest.Mock;
    estimateGas: jest.Mock;
    getChainId: jest.Mock;
  };

  beforeEach(() => {
    mockClient = {
      getTransaction: jest.fn(),
      getTransactionReceipt: jest.fn(),
      getTransactionCount: jest.fn(),
      estimateGas: jest.fn(),
      getChainId: jest.fn()
    };
    mockGetPublicClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getPublicClient>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransaction', () => {
    it('should get a transaction by hash', async () => {
      const mockTransaction = { hash: mockHash, from: mockAddress };
      mockClient.getTransaction.mockResolvedValue(mockTransaction);

      const result = await getTransaction(mockHash, mockNetwork);

      expect(getPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockClient.getTransaction).toHaveBeenCalledWith({ hash: mockHash });
      expect(result).toEqual(mockTransaction);
    });

    it('should use default network when not provided', async () => {
      const mockTransaction = { hash: mockHash, from: mockAddress };
      mockClient.getTransaction.mockResolvedValue(mockTransaction);

      await getTransaction(mockHash);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
    });
  });

  describe('getTransactionReceipt', () => {
    it('should get a transaction receipt by hash', async () => {
      const mockReceipt = {
        hash: mockHash,
        status: 'success',
        gasUsed: mockGas,
        blockHash: mockHash,
        blockNumber: BigInt(1000),
        contractAddress: null,
        cumulativeGasUsed: mockGas,
        effectiveGasPrice: BigInt(1000000000),
        from: mockAddress,
        to: mockAddress,
        type: 2,
        logsBloom: '0x0',
        logs: [],
        transactionHash: mockHash,
        transactionIndex: 0
      } as unknown as TransactionReceipt;
      mockClient.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const result = await getTransactionReceipt(mockHash, mockNetwork);

      expect(getPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockClient.getTransactionReceipt).toHaveBeenCalledWith({ hash: mockHash });
      expect(result).toEqual(mockReceipt);
    });

    it('should use default network when not provided', async () => {
      const mockReceipt = {
        hash: mockHash,
        status: 'success',
        blockHash: mockHash,
        blockNumber: BigInt(1000),
        contractAddress: null,
        cumulativeGasUsed: mockGas,
        effectiveGasPrice: BigInt(1000000000),
        from: mockAddress,
        to: mockAddress,
        type: 2,
        logsBloom: '0x0',
        logs: [],
        transactionHash: mockHash,
        transactionIndex: 0
      } as unknown as TransactionReceipt;
      mockClient.getTransactionReceipt.mockResolvedValue(mockReceipt);

      await getTransactionReceipt(mockHash);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
    });
  });

  describe('getTransactionCount', () => {
    it('should get the transaction count for an address', async () => {
      mockClient.getTransactionCount.mockResolvedValue(mockNonce);

      const result = await getTransactionCount(mockAddress, mockNetwork);

      expect(getPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockClient.getTransactionCount).toHaveBeenCalledWith({ address: mockAddress });
      expect(result).toBe(5);
    });

    it('should use default network when not provided', async () => {
      mockClient.getTransactionCount.mockResolvedValue(mockNonce);

      await getTransactionCount(mockAddress);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
    });

    it('should convert bigint nonce to number', async () => {
      const largeNonce = BigInt(1000);
      mockClient.getTransactionCount.mockResolvedValue(largeNonce);

      const result = await getTransactionCount(mockAddress);

      expect(result).toBe(1000);
      expect(typeof result).toBe('number');
    });
  });

  describe('estimateGas', () => {
    it('should estimate gas for a transaction', async () => {
      const mockParams = {
        from: mockAddress,
        to: mockAddress,
        value: BigInt(1000)
      };
      mockClient.estimateGas.mockResolvedValue(mockGas);

      const result = await estimateGas(mockParams, mockNetwork);

      expect(getPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockClient.estimateGas).toHaveBeenCalledWith(mockParams);
      expect(result).toBe(mockGas);
    });

    it('should use default network when not provided', async () => {
      const mockParams = { from: mockAddress, to: mockAddress };
      mockClient.estimateGas.mockResolvedValue(mockGas);

      await estimateGas(mockParams);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
    });
  });

  describe('getChainId', () => {
    it('should get the chain ID', async () => {
      mockClient.getChainId.mockResolvedValue(mockChainId);

      const result = await getChainId(mockNetwork);

      expect(getPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockClient.getChainId).toHaveBeenCalled();
      expect(result).toBe(mockChainId);
    });

    it('should use default network when not provided', async () => {
      mockClient.getChainId.mockResolvedValue(mockChainId);

      await getChainId();

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
    });

    it('should convert bigint chainId to number', async () => {
      const bigChainId = BigInt(137);
      mockClient.getChainId.mockResolvedValue(bigChainId);

      const result = await getChainId();

      expect(result).toBe(137);
      expect(typeof result).toBe('number');
    });
  });
});
