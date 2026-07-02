import { formatEther, formatUnits, getContract } from 'viem';
import { getPublicClient } from './clients.js';
import { readContract } from './contracts.js';
import { resolveAddress } from './ens.js';

jest.mock('viem', () => ({
  formatEther: jest.fn(),
  formatUnits: jest.fn(),
  getContract: jest.fn(),
}));

jest.mock('./clients.js', () => ({
  getPublicClient: jest.fn(),
}));

jest.mock('./contracts.js', () => ({
  readContract: jest.fn(),
}));

jest.mock('./ens.js', () => ({
  resolveAddress: jest.fn(),
}));

describe('getETHBalance', () => {
  const mockGetBalance = jest.fn();
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockEnsName = 'example.eth';
  const mockBalance = 1000000000000000000n;
  const mockFormattedEther = '1.0';

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAddress as jest.Mock).mockResolvedValue(mockAddress);
    (getPublicClient as jest.Mock).mockReturnValue({
      getBalance: mockGetBalance,
    });
    (formatEther as jest.Mock).mockReturnValue(mockFormattedEther);
  });

  describe('when given a valid Ethereum address', () => {
    it('should return the ETH balance in wei and ether', async () => {
      mockGetBalance.mockResolvedValue(mockBalance);

      const { getETHBalance } = await import('./balance.js');
      const result = await getETHBalance(mockAddress);

      expect(resolveAddress).toHaveBeenCalledWith(mockAddress, 'ethereum');
      expect(getPublicClient).toHaveBeenCalledWith('ethereum');
      expect(mockGetBalance).toHaveBeenCalledWith({ address: mockAddress });
      expect(formatEther).toHaveBeenCalledWith(mockBalance);
      expect(result).toEqual({
        wei: mockBalance,
        ether: mockFormattedEther,
      });
    });

    it('should use the specified network when provided', async () => {
      mockGetBalance.mockResolvedValue(mockBalance);

      const { getETHBalance } = await import('./balance.js');
      await getETHBalance(mockAddress, 'sepolia');

      expect(resolveAddress).toHaveBeenCalledWith(mockAddress, 'sepolia');
      expect(getPublicClient).toHaveBeenCalledWith('sepolia');
    });
  });

  describe('when given an ENS name', () => {
    it('should resolve the ENS name and return the balance', async () => {
      mockGetBalance.mockResolvedValue(mockBalance);

      const { getETHBalance } = await import('./balance.js');
      const result = await getETHBalance(mockEnsName);

      expect(resolveAddress).toHaveBeenCalledWith(mockEnsName, 'ethereum');
      expect(result).toEqual({
        wei: mockBalance,
        ether: mockFormattedEther,
      });
    });
  });
});

describe('getERC20Balance', () => {
  const mockTokenAddress = '0x1234567890123456789012345678901234567890';
  const mockOwnerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const mockTokenEns = 'token.eth';
  const mockOwnerEns = 'owner.eth';
  const mockBalance = 1000000n;
  const mockSymbol = 'TKN';
  const mockDecimals = 18;
  const mockFormattedBalance = '1.0';

  const mockContract = {
    read: {
      balanceOf: jest.fn(),
      symbol: jest.fn(),
      decimals: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAddress as jest.Mock)
      .mockResolvedValueOnce(mockTokenAddress)
      .mockResolvedValueOnce(mockOwnerAddress);
    (getContract as jest.Mock).mockReturnValue(mockContract);
    mockContract.read.balanceOf.mockResolvedValue(mockBalance);
    mockContract.read.symbol.mockResolvedValue(mockSymbol);
    mockContract.read.decimals.mockResolvedValue(mockDecimals);
    (formatUnits as jest.Mock).mockReturnValue(mockFormattedBalance);
  });

  describe('when given valid addresses', () => {
    it('should return the ERC20 balance with token info', async () => {
      const { getERC20Balance } = await import('./balance.js');
      const result = await getERC20Balance(mockTokenAddress, mockOwnerAddress);

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenAddress, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerAddress, 'ethereum');
      expect(getContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        client: expect.any(Object),
      });
      expect(mockContract.read.balanceOf).toHaveBeenCalledWith([mockOwnerAddress]);
      expect(mockContract.read.symbol).toHaveBeenCalled();
      expect(mockContract.read.decimals).toHaveBeenCalled();
      expect(formatUnits).toHaveBeenCalledWith(mockBalance, mockDecimals);
      expect(result).toEqual({
        raw: mockBalance,
        formatted: mockFormattedBalance,
        token: {
          symbol: mockSymbol,
          decimals: mockDecimals,
        },
      });
    });

    it('should use the specified network when provided', async () => {
      const { getERC20Balance } = await import('./balance.js');
      await getERC20Balance(mockTokenAddress, mockOwnerAddress, 'sepolia');

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenAddress, 'sepolia');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerAddress, 'sepolia');
      expect(getPublicClient).toHaveBeenCalledWith('sepolia');
    });
  });

  describe('when given ENS names', () => {
    it('should resolve ENS names and return the balance', async () => {
      (resolveAddress as jest.Mock)
        .mockResolvedValueOnce(mockTokenAddress)
        .mockResolvedValueOnce(mockOwnerAddress);

      const { getERC20Balance } = await import('./balance.js');
      const result = await getERC20Balance(mockTokenEns, mockOwnerEns);

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenEns, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerEns, 'ethereum');
      expect(result).toEqual({
        raw: mockBalance,
        formatted: mockFormattedBalance,
        token: {
          symbol: mockSymbol,
          decimals: mockDecimals,
        },
      });
    });
  });
});

describe('isNFTOwner', () => {
  const mockTokenAddress = '0x1234567890123456789012345678901234567890';
  const mockOwnerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const mockTokenEns = 'nft.eth';
  const mockOwnerEns = 'owner.eth';
  const mockTokenId = 123n;
  const mockActualOwner = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAddress as jest.Mock)
      .mockResolvedValueOnce(mockTokenAddress)
      .mockResolvedValueOnce(mockOwnerAddress);
  });

  describe('when the address owns the NFT', () => {
    it('should return true', async () => {
      (readContract as jest.Mock).mockResolvedValue(mockActualOwner);

      const { isNFTOwner } = await import('./balance.js');
      const result = await isNFTOwner(mockTokenAddress, mockOwnerAddress, mockTokenId);

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenAddress, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerAddress, 'ethereum');
      expect(readContract).toHaveBeenCalledWith(
        {
          address: mockTokenAddress,
          abi: expect.any(Array),
          functionName: 'ownerOf',
          args: [mockTokenId],
        },
        'ethereum'
      );
      expect(result).toBe(true);
    });

    it('should return true when addresses match (case insensitive)', async () => {
      const uppercaseOwner = '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCD';
      (resolveAddress as jest.Mock)
        .mockResolvedValueOnce(mockTokenAddress)
        .mockResolvedValueOnce(uppercaseOwner);
      (readContract as jest.Mock).mockResolvedValue(mockActualOwner);

      const { isNFTOwner } = await import('./balance.js');
      const result = await isNFTOwner(mockTokenAddress, uppercaseOwner, mockTokenId);

      expect(result).toBe(true);
    });
  });

  describe('when the address does not own the NFT', () => {
    it('should return false', async () => {
      const differentOwner = '0x1111111111111111111111111111111111111111';
      (readContract as jest.Mock).mockResolvedValue(differentOwner);

      const { isNFTOwner } = await import('./balance.js');
      const result = await isNFTOwner(mockTokenAddress, mockOwnerAddress, mockTokenId);

      expect(result).toBe(false);
    });
  });

  describe('when an error occurs', () => {
    it('should return false and log the error', async () => {
      const errorMessage = 'Token not found';
      (readContract as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { isNFTOwner } = await import('./balance.js');
      const result = await isNFTOwner(mockTokenAddress, mockOwnerAddress, mockTokenId);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Error checking NFT ownership: ${errorMessage}`
      );
      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('when given ENS names', () => {
    it('should resolve ENS names and check ownership', async () => {
      (resolveAddress as jest.Mock)
        .mockResolvedValueOnce(mockTokenAddress)
        .mockResolvedValueOnce(mockOwnerAddress);
      (readContract as jest.Mock).mockResolvedValue(mockActualOwner);

      const { isNFTOwner } = await import('./balance.js');
      const result = await isNFTOwner(mockTokenEns, mockOwnerEns, mockTokenId);

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenEns, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerEns, 'ethereum');
      expect(result).toBe(true);
    });

    it('should use the specified network when provided', async () => {
      (resolveAddress as jest.Mock)
        .mockResolvedValueOnce(mockTokenAddress)
        .mockResolvedValueOnce(mockOwnerAddress);
      (readContract as jest.Mock).mockResolvedValue(mockActualOwner);

      const { isNFTOwner } = await import('./balance.js');
      await isNFTOwner(mockTokenEns, mockOwnerEns, mockTokenId, 'sepolia');

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenEns, 'sepolia');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerEns, 'sepolia');
    });
  });
});

describe('getERC721Balance', () => {
  const mockTokenAddress = '0x1234567890123456789012345678901234567890';
  const mockOwnerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const mockTokenEns = 'nft.eth';
  const mockOwnerEns = 'owner.eth';
  const mockBalance = 5n;

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAddress as jest.Mock)
      .mockResolvedValueOnce(mockTokenAddress)
      .mockResolvedValueOnce(mockOwnerAddress);
    (readContract as jest.Mock).mockResolvedValue(mockBalance);
  });

  describe('when given valid addresses', () => {
    it('should return the number of NFTs owned', async () => {
      const { getERC721Balance } = await import('./balance.js');
      const result = await getERC721Balance(mockTokenAddress, mockOwnerAddress);

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenAddress, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerAddress, 'ethereum');
      expect(readContract).toHaveBeenCalledWith(
        {
          address: mockTokenAddress,
          abi: expect.any(Array),
          functionName: 'balanceOf',
          args: [mockOwnerAddress],
        },
        'ethereum'
      );
      expect(result).toBe(mockBalance);
    });

    it('should use the specified network when provided', async () => {
      const { getERC721Balance } = await import('./balance.js');
      await getERC721Balance(mockTokenAddress, mockOwnerAddress, 'sepolia');

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenAddress, 'sepolia');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerAddress, 'sepolia');
    });
  });

  describe('when given ENS names', () => {
    it('should resolve ENS names and return the balance', async () => {
      (resolveAddress as jest.Mock)
        .mockResolvedValueOnce(mockTokenAddress)
        .mockResolvedValueOnce(mockOwnerAddress);

      const { getERC721Balance } = await import('./balance.js');
      const result = await getERC721Balance(mockTokenEns, mockOwnerEns);

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenEns, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerEns, 'ethereum');
      expect(result).toBe(mockBalance);
    });
  });
});

describe('getERC1155Balance', () => {
  const mockTokenAddress = '0x1234567890123456789012345678901234567890';
  const mockOwnerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const mockTokenEns = 'token.eth';
  const mockOwnerEns = 'owner.eth';
  const mockTokenId = 456n;
  const mockBalance = 100n;

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAddress as jest.Mock)
      .mockResolvedValueOnce(mockTokenAddress)
      .mockResolvedValueOnce(mockOwnerAddress);
    (readContract as jest.Mock).mockResolvedValue(mockBalance);
  });

  describe('when given valid addresses', () => {
    it('should return the ERC1155 token balance', async () => {
      const { getERC1155Balance } = await import('./balance.js');
      const result = await getERC1155Balance(
        mockTokenAddress,
        mockOwnerAddress,
        mockTokenId
      );

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenAddress, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerAddress, 'ethereum');
      expect(readContract).toHaveBeenCalledWith(
        {
          address: mockTokenAddress,
          abi: expect.any(Array),
          functionName: 'balanceOf',
          args: [mockOwnerAddress, mockTokenId],
        },
        'ethereum'
      );
      expect(result).toBe(mockBalance);
    });

    it('should use the specified network when provided', async () => {
      const { getERC1155Balance } = await import('./balance.js');
      await getERC1155Balance(mockTokenAddress, mockOwnerAddress, mockTokenId, 'sepolia');

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenAddress, 'sepolia');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerAddress, 'sepolia');
    });
  });

  describe('when given ENS names', () => {
    it('should resolve ENS names and return the balance', async () => {
      (resolveAddress as jest.Mock)
        .mockResolvedValueOnce(mockTokenAddress)
        .mockResolvedValueOnce(mockOwnerAddress);

      const { getERC1155Balance } = await import('./balance.js');
      const result = await getERC1155Balance(mockTokenEns, mockOwnerEns, mockTokenId);

      expect(resolveAddress).toHaveBeenCalledWith(mockTokenEns, 'ethereum');
      expect(resolveAddress).toHaveBeenCalledWith(mockOwnerEns, 'ethereum');
      expect(result).toBe(mockBalance);
    });
  });
});
