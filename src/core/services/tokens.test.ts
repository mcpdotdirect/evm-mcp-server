import { getERC20TokenInfo, getERC721TokenMetadata, getERC1155TokenURI } from './tokens.js';
import { getPublicClient } from './clients.js';
import { getContract, formatUnits } from 'viem';

jest.mock('./clients.js');
jest.mock('viem');

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockGetContract = getContract as jest.MockedFunction<typeof getContract>;
const mockFormatUnits = formatUnits as jest.MockedFunction<typeof formatUnits>;

describe('tokens', () => {
  const mockTokenAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const mockNetwork = 'ethereum';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getERC20TokenInfo', () => {
    const mockName = 'Test Token';
    const mockSymbol = 'TEST';
    const mockDecimals = 18;
    const mockTotalSupply = BigInt('1000000000000000000000000');
    const mockFormattedTotalSupply = '1000000.0';

    const mockRead = {
      name: jest.fn(),
      symbol: jest.fn(),
      decimals: jest.fn(),
      totalSupply: jest.fn()
    };

    const mockContract = {
      read: mockRead
    };

    beforeEach(() => {
      mockGetPublicClient.mockReturnValue({} as never);
      mockGetContract.mockReturnValue(mockContract as never);
      mockFormatUnits.mockReturnValue(mockFormattedTotalSupply);
    });

    it('should return ERC20 token info', async () => {
      mockRead.name.mockResolvedValue(mockName);
      mockRead.symbol.mockResolvedValue(mockSymbol);
      mockRead.decimals.mockResolvedValue(mockDecimals);
      mockRead.totalSupply.mockResolvedValue(mockTotalSupply);

      const result = await getERC20TokenInfo(mockTokenAddress, mockNetwork);

      expect(mockGetPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockGetContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        client: expect.any(Object)
      });
      expect(mockFormatUnits).toHaveBeenCalledWith(mockTotalSupply, mockDecimals);
      expect(result).toEqual({
        name: mockName,
        symbol: mockSymbol,
        decimals: mockDecimals,
        totalSupply: mockTotalSupply,
        formattedTotalSupply: mockFormattedTotalSupply
      });
    });

    it('should use default network when not provided', async () => {
      mockRead.name.mockResolvedValue(mockName);
      mockRead.symbol.mockResolvedValue(mockSymbol);
      mockRead.decimals.mockResolvedValue(mockDecimals);
      mockRead.totalSupply.mockResolvedValue(mockTotalSupply);

      await getERC20TokenInfo(mockTokenAddress);

      expect(mockGetPublicClient).toHaveBeenCalledWith('ethereum');
    });

    it('should handle different decimals correctly', async () => {
      const usdcTotalSupply = BigInt('1000000000000');
      mockRead.name.mockResolvedValue('USDC');
      mockRead.symbol.mockResolvedValue('USDC');
      mockRead.decimals.mockResolvedValue(6);
      mockRead.totalSupply.mockResolvedValue(usdcTotalSupply);
      mockFormatUnits.mockReturnValue('1000000.0');

      const result = await getERC20TokenInfo(mockTokenAddress, mockNetwork);

      expect(result.decimals).toBe(6);
      expect(result.formattedTotalSupply).toBe('1000000.0');
      expect(mockFormatUnits).toHaveBeenCalledWith(usdcTotalSupply, 6);
    });
  });

  describe('getERC721TokenMetadata', () => {
    const mockTokenId = BigInt(1);
    const mockName = 'Test NFT';
    const mockSymbol = 'TNFT';
    const mockTokenURI = 'ipfs://QmTest123';

    const mockRead = {
      name: jest.fn(),
      symbol: jest.fn(),
      tokenURI: jest.fn()
    };

    const mockContract = {
      read: mockRead
    };

    beforeEach(() => {
      mockGetPublicClient.mockReturnValue({} as never);
      mockGetContract.mockReturnValue(mockContract as never);
    });

    it('should return ERC721 token metadata', async () => {
      mockRead.name.mockResolvedValue(mockName);
      mockRead.symbol.mockResolvedValue(mockSymbol);
      mockRead.tokenURI.mockResolvedValue(mockTokenURI);

      const result = await getERC721TokenMetadata(mockTokenAddress, mockTokenId, mockNetwork);

      expect(mockGetPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockGetContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        client: expect.any(Object)
      });
      expect(result).toEqual({
        name: mockName,
        symbol: mockSymbol,
        tokenURI: mockTokenURI
      });
    });

    it('should use default network when not provided', async () => {
      mockRead.name.mockResolvedValue(mockName);
      mockRead.symbol.mockResolvedValue(mockSymbol);
      mockRead.tokenURI.mockResolvedValue(mockTokenURI);

      await getERC721TokenMetadata(mockTokenAddress, mockTokenId);

      expect(mockGetPublicClient).toHaveBeenCalledWith('ethereum');
    });

    it('should pass tokenId as array argument to tokenURI', async () => {
      mockRead.name.mockResolvedValue(mockName);
      mockRead.symbol.mockResolvedValue(mockSymbol);
      mockRead.tokenURI.mockResolvedValue(mockTokenURI);

      await getERC721TokenMetadata(mockTokenAddress, mockTokenId, mockNetwork);

      expect(mockRead.tokenURI).toHaveBeenCalledWith([mockTokenId]);
    });
  });

  describe('getERC1155TokenURI', () => {
    const mockTokenId = BigInt(42);
    const mockTokenURI = 'ipfs://QmERC1155Test';

    const mockRead = {
      uri: jest.fn()
    };

    const mockContract = {
      read: mockRead
    };

    beforeEach(() => {
      mockGetPublicClient.mockReturnValue({} as never);
      mockGetContract.mockReturnValue(mockContract as never);
    });

    it('should return ERC1155 token URI', async () => {
      mockRead.uri.mockResolvedValue(mockTokenURI);

      const result = await getERC1155TokenURI(mockTokenAddress, mockTokenId, mockNetwork);

      expect(mockGetPublicClient).toHaveBeenCalledWith(mockNetwork);
      expect(mockGetContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        client: expect.any(Object)
      });
      expect(result).toBe(mockTokenURI);
    });

    it('should use default network when not provided', async () => {
      mockRead.uri.mockResolvedValue(mockTokenURI);

      await getERC1155TokenURI(mockTokenAddress, mockTokenId);

      expect(mockGetPublicClient).toHaveBeenCalledWith('ethereum');
    });

    it('should pass tokenId as array argument to uri', async () => {
      mockRead.uri.mockResolvedValue(mockTokenURI);

      await getERC1155TokenURI(mockTokenAddress, mockTokenId, mockNetwork);

      expect(mockRead.uri).toHaveBeenCalledWith([mockTokenId]);
    });
  });
});
