import { parseEther, parseUnits, type Address, type Hash } from 'viem';
import { transferETH, transferERC20, approveERC20, transferERC721, transferERC1155 } from './transfer.js';
import { getPublicClient, getWalletClient } from './clients.js';
import { resolveAddress } from './ens.js';
import { getContract } from 'viem';

// Mock dependencies
jest.mock('./clients.js', () => ({
  getPublicClient: jest.fn(),
  getWalletClient: jest.fn()
}));

jest.mock('./ens.js', () => ({
  resolveAddress: jest.fn()
}));

jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    getContract: jest.fn()
  };
});

describe('Transfer Services', () => {
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockPrivateKeyNoPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockToAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockToAddressWithZero = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
  const mockTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const mockNftAddress = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
  const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash;
  const mockAccount = { address: mockToAddressWithZero as Address };
  const mockChain = { id: 1, name: 'Ethereum' };

  const mockPublicClient = {
    readContract: jest.fn()
  };

  const mockWalletClient = {
    account: mockAccount,
    chain: mockChain,
    sendTransaction: jest.fn(),
    writeContract: jest.fn()
  };

  const mockContract = {
    read: {
      decimals: jest.fn(),
      symbol: jest.fn(),
      name: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
    (getWalletClient as jest.Mock).mockReturnValue(mockWalletClient);
    (getContract as jest.Mock).mockReturnValue(mockContract);
    (resolveAddress as jest.Mock).mockImplementation(async (addressOrEns: string) => {
      if (addressOrEns.includes('.eth')) {
        return mockToAddressWithZero;
      }
      return addressOrEns as Address;
    });
  });

  describe('transferETH', () => {
    it('should transfer ETH with a valid address', async () => {
      (mockWalletClient.sendTransaction as jest.Mock).mockResolvedValue(mockTxHash);

      const result = await transferETH(mockPrivateKey, mockToAddressWithZero, '1.5', 'ethereum');

      expect(result).toBe(mockTxHash);
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: mockToAddressWithZero,
        value: parseEther('1.5'),
        account: mockAccount,
        chain: mockChain
      });
    });

    it('should resolve ENS name to address', async () => {
      (mockWalletClient.sendTransaction as jest.Mock).mockResolvedValue(mockTxHash);
      (resolveAddress as jest.Mock).mockResolvedValue(mockToAddressWithZero);

      const result = await transferETH(mockPrivateKey, 'recipient.eth', '0.5', 'ethereum');

      expect(resolveAddress).toHaveBeenCalledWith('recipient.eth', 'ethereum');
      expect(result).toBe(mockTxHash);
    });

    it('should handle private key without 0x prefix', async () => {
      (mockWalletClient.sendTransaction as jest.Mock).mockResolvedValue(mockTxHash);

      const result = await transferETH(mockPrivateKeyNoPrefix, mockToAddressWithZero, '1.0', 'ethereum');

      expect(result).toBe(mockTxHash);
      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should use default network when not specified', async () => {
      (mockWalletClient.sendTransaction as jest.Mock).mockResolvedValue(mockTxHash);

      await transferETH(mockPrivateKey, mockToAddressWithZero, '1.0');

      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should convert amount to wei correctly', async () => {
      (mockWalletClient.sendTransaction as jest.Mock).mockResolvedValue(mockTxHash);

      await transferETH(mockPrivateKey, mockToAddressWithZero, '2.5', 'ethereum');

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          value: parseEther('2.5')
        })
      );
    });
  });

  describe('transferERC20', () => {
    const mockAmount = '100';
    const mockDecimals = 6;
    const mockSymbol = 'USDC';
    const mockRawAmount = parseUnits(mockAmount, mockDecimals);

    beforeEach(() => {
      mockContract.read.decimals.mockResolvedValue(mockDecimals);
      mockContract.read.symbol.mockResolvedValue(mockSymbol);
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(mockTxHash);
    });

    it('should transfer ERC20 tokens successfully', async () => {
      const result = await transferERC20(mockTokenAddress, mockToAddressWithZero, mockAmount, mockPrivateKey, 'ethereum');

      expect(result).toEqual({
        txHash: mockTxHash,
        amount: {
          raw: mockRawAmount,
          formatted: mockAmount
        },
        token: {
          symbol: mockSymbol,
          decimals: mockDecimals
        }
      });
    });

    it('should resolve ENS names for token and recipient', async () => {
      (resolveAddress as jest.Mock).mockImplementation(async (addressOrEns: string) => {
        if (addressOrEns === 'token.eth') return mockTokenAddress as Address;
        if (addressOrEns === 'recipient.eth') return mockToAddressWithZero as Address;
        return addressOrEns as Address;
      });

      await transferERC20('token.eth', 'recipient.eth', mockAmount, mockPrivateKey, 'ethereum');

      expect(resolveAddress).toHaveBeenCalledWith('token.eth', 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith('recipient.eth', 'ethereum');
    });

    it('should handle private key without 0x prefix', async () => {
      await transferERC20(mockTokenAddress, mockToAddressWithZero, mockAmount, mockPrivateKeyNoPrefix, 'ethereum');

      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should use default network when not specified', async () => {
      await transferERC20(mockTokenAddress, mockToAddressWithZero, mockAmount, mockPrivateKey);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should fetch token decimals and symbol', async () => {
      await transferERC20(mockTokenAddress, mockToAddressWithZero, mockAmount, mockPrivateKey, 'ethereum');

      expect(mockContract.read.decimals).toHaveBeenCalled();
      expect(mockContract.read.symbol).toHaveBeenCalled();
    });

    it('should call writeContract with correct parameters', async () => {
      await transferERC20(mockTokenAddress, mockToAddressWithZero, mockAmount, mockPrivateKey, 'ethereum');

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        functionName: 'transfer',
        args: [mockToAddressWithZero, mockRawAmount],
        account: mockAccount,
        chain: mockChain
      });
    });
  });

  describe('approveERC20', () => {
    const mockAmount = '500';
    const mockDecimals = 18;
    const mockSymbol = 'DAI';
    const mockSpenderAddress = '0x1234567890123456789012345678901234567890';
    const mockRawAmount = parseUnits(mockAmount, mockDecimals);

    beforeEach(() => {
      mockContract.read.decimals.mockResolvedValue(mockDecimals);
      mockContract.read.symbol.mockResolvedValue(mockSymbol);
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(mockTxHash);
    });

    it('should approve ERC20 token spending successfully', async () => {
      const result = await approveERC20(mockTokenAddress, mockSpenderAddress, mockAmount, mockPrivateKey, 'ethereum');

      expect(result).toEqual({
        txHash: mockTxHash,
        amount: {
          raw: mockRawAmount,
          formatted: mockAmount
        },
        token: {
          symbol: mockSymbol,
          decimals: mockDecimals
        }
      });
    });

    it('should resolve ENS names for token and spender', async () => {
      (resolveAddress as jest.Mock).mockImplementation(async (addressOrEns: string) => {
        if (addressOrEns === 'token.eth') return mockTokenAddress as Address;
        if (addressOrEns === 'spender.eth') return mockSpenderAddress as Address;
        return addressOrEns as Address;
      });

      await approveERC20('token.eth', 'spender.eth', mockAmount, mockPrivateKey, 'ethereum');

      expect(resolveAddress).toHaveBeenCalledWith('token.eth', 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith('spender.eth', 'ethereum');
    });

    it('should handle private key without 0x prefix', async () => {
      await approveERC20(mockTokenAddress, mockSpenderAddress, mockAmount, mockPrivateKeyNoPrefix, 'ethereum');

      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should use default network when not specified', async () => {
      await approveERC20(mockTokenAddress, mockSpenderAddress, mockAmount, mockPrivateKey);

      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should call writeContract with approve function', async () => {
      await approveERC20(mockTokenAddress, mockSpenderAddress, mockAmount, mockPrivateKey, 'ethereum');

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        functionName: 'approve',
        args: [mockSpenderAddress, mockRawAmount],
        account: mockAccount,
        chain: mockChain
      });
    });
  });

  describe('transferERC721', () => {
    const mockTokenId = 12345n;
    const mockTokenName = 'Bored Ape Yacht Club';
    const mockTokenSymbol = 'BAYC';

    beforeEach(() => {
      mockContract.read.name.mockResolvedValue(mockTokenName);
      mockContract.read.symbol.mockResolvedValue(mockTokenSymbol);
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(mockTxHash);
    });

    it('should transfer ERC721 NFT successfully', async () => {
      const result = await transferERC721(mockNftAddress, mockToAddressWithZero, mockTokenId, mockPrivateKey, 'ethereum');

      expect(result).toEqual({
        txHash: mockTxHash,
        tokenId: mockTokenId.toString(),
        token: {
          name: mockTokenName,
          symbol: mockTokenSymbol
        }
      });
    });

    it('should resolve ENS names for token and recipient', async () => {
      (resolveAddress as jest.Mock).mockImplementation(async (addressOrEns: string) => {
        if (addressOrEns === 'nft.eth') return mockNftAddress as Address;
        if (addressOrEns === 'recipient.eth') return mockToAddressWithZero as Address;
        return addressOrEns as Address;
      });

      await transferERC721('nft.eth', 'recipient.eth', mockTokenId, mockPrivateKey, 'ethereum');

      expect(resolveAddress).toHaveBeenCalledWith('nft.eth', 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith('recipient.eth', 'ethereum');
    });

    it('should handle private key without 0x prefix', async () => {
      await transferERC721(mockNftAddress, mockToAddressWithZero, mockTokenId, mockPrivateKeyNoPrefix, 'ethereum');

      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should use default network when not specified', async () => {
      await transferERC721(mockNftAddress, mockToAddressWithZero, mockTokenId, mockPrivateKey);

      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should use sender address as from address in transferFrom', async () => {
      await transferERC721(mockNftAddress, mockToAddressWithZero, mockTokenId, mockPrivateKey, 'ethereum');

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith({
        address: mockNftAddress,
        abi: expect.any(Array),
        functionName: 'transferFrom',
        args: [mockToAddressWithZero, mockToAddressWithZero, mockTokenId],
        account: mockAccount,
        chain: mockChain
      });
    });

    it('should handle metadata fetch errors gracefully', async () => {
      mockContract.read.name.mockRejectedValue(new Error('Metadata error'));
      mockContract.read.symbol.mockRejectedValue(new Error('Metadata error'));

      const result = await transferERC721(mockNftAddress, mockToAddressWithZero, mockTokenId, mockPrivateKey, 'ethereum');

      expect(result).toEqual({
        txHash: mockTxHash,
        tokenId: mockTokenId.toString(),
        token: {
          name: 'Unknown',
          symbol: 'NFT'
        }
      });
    });
  });

  describe('transferERC1155', () => {
    const mockTokenId = 67890n;
    const mockAmount = '5';

    beforeEach(() => {
      (mockWalletClient.writeContract as jest.Mock).mockResolvedValue(mockTxHash);
    });

    it('should transfer ERC1155 tokens successfully', async () => {
      const result = await transferERC1155(mockNftAddress, mockToAddressWithZero, mockTokenId, mockAmount, mockPrivateKey, 'ethereum');

      expect(result).toEqual({
        txHash: mockTxHash,
        tokenId: mockTokenId.toString(),
        amount: mockAmount
      });
    });

    it('should resolve ENS names for token and recipient', async () => {
      (resolveAddress as jest.Mock).mockImplementation(async (addressOrEns: string) => {
        if (addressOrEns === 'token.eth') return mockNftAddress as Address;
        if (addressOrEns === 'recipient.eth') return mockToAddressWithZero as Address;
        return addressOrEns as Address;
      });

      await transferERC1155('token.eth', 'recipient.eth', mockTokenId, mockAmount, mockPrivateKey, 'ethereum');

      expect(resolveAddress).toHaveBeenCalledWith('token.eth', 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith('recipient.eth', 'ethereum');
    });

    it('should handle private key without 0x prefix', async () => {
      await transferERC1155(mockNftAddress, mockToAddressWithZero, mockTokenId, mockAmount, mockPrivateKeyNoPrefix, 'ethereum');

      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should use default network when not specified', async () => {
      await transferERC1155(mockNftAddress, mockToAddressWithZero, mockTokenId, mockAmount, mockPrivateKey);

      expect(getWalletClient).toHaveBeenCalledWith(mockPrivateKey, 'ethereum');
    });

    it('should convert amount string to bigint', async () => {
      await transferERC1155(mockNftAddress, mockToAddressWithZero, mockTokenId, mockAmount, mockPrivateKey, 'ethereum');

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith({
        address: mockNftAddress,
        abi: expect.any(Array),
        functionName: 'safeTransferFrom',
        args: [mockToAddressWithZero, mockToAddressWithZero, mockTokenId, BigInt(mockAmount), '0x'],
        account: mockAccount,
        chain: mockChain
      });
    });

    it('should use sender address as from address in safeTransferFrom', async () => {
      await transferERC1155(mockNftAddress, mockToAddressWithZero, mockTokenId, mockAmount, mockPrivateKey, 'ethereum');

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'safeTransferFrom',
          args: expect.arrayContaining([mockToAddressWithZero, mockToAddressWithZero])
        })
      );
    });
  });
});
