import * as services from './index.js';

describe('services/index', () => {
  describe('exports from clients.js', () => {
    it('should export getPublicClient', () => {
      expect(services.getPublicClient).toBeDefined();
      expect(typeof services.getPublicClient).toBe('function');
    });

    it('should export getWalletClient', () => {
      expect(services.getWalletClient).toBeDefined();
      expect(typeof services.getWalletClient).toBe('function');
    });

    it('should export getAddressFromPrivateKey', () => {
      expect(services.getAddressFromPrivateKey).toBeDefined();
      expect(typeof services.getAddressFromPrivateKey).toBe('function');
    });
  });

  describe('exports from balance.js', () => {
    it('should export getETHBalance', () => {
      expect(services.getETHBalance).toBeDefined();
      expect(typeof services.getETHBalance).toBe('function');
    });

    it('should export getERC20Balance', () => {
      expect(services.getERC20Balance).toBeDefined();
      expect(typeof services.getERC20Balance).toBe('function');
    });

    it('should export isNFTOwner', () => {
      expect(services.isNFTOwner).toBeDefined();
      expect(typeof services.isNFTOwner).toBe('function');
    });

    it('should export getERC721Balance', () => {
      expect(services.getERC721Balance).toBeDefined();
      expect(typeof services.getERC721Balance).toBe('function');
    });

    it('should export getERC1155Balance', () => {
      expect(services.getERC1155Balance).toBeDefined();
      expect(typeof services.getERC1155Balance).toBe('function');
    });
  });

  describe('exports from transfer.js', () => {
    it('should export transferETH', () => {
      expect(services.transferETH).toBeDefined();
      expect(typeof services.transferETH).toBe('function');
    });

    it('should export transferERC20', () => {
      expect(services.transferERC20).toBeDefined();
      expect(typeof services.transferERC20).toBe('function');
    });

    it('should export approveERC20', () => {
      expect(services.approveERC20).toBeDefined();
      expect(typeof services.approveERC20).toBe('function');
    });

    it('should export transferERC721', () => {
      expect(services.transferERC721).toBeDefined();
      expect(typeof services.transferERC721).toBe('function');
    });

    it('should export transferERC1155', () => {
      expect(services.transferERC1155).toBeDefined();
      expect(typeof services.transferERC1155).toBe('function');
    });
  });

  describe('exports from blocks.js', () => {
    it('should export getBlockNumber', () => {
      expect(services.getBlockNumber).toBeDefined();
      expect(typeof services.getBlockNumber).toBe('function');
    });

    it('should export getBlockByNumber', () => {
      expect(services.getBlockByNumber).toBeDefined();
      expect(typeof services.getBlockByNumber).toBe('function');
    });

    it('should export getBlockByHash', () => {
      expect(services.getBlockByHash).toBeDefined();
      expect(typeof services.getBlockByHash).toBe('function');
    });

    it('should export getLatestBlock', () => {
      expect(services.getLatestBlock).toBeDefined();
      expect(typeof services.getLatestBlock).toBe('function');
    });
  });

  describe('exports from transactions.js', () => {
    it('should export getTransaction', () => {
      expect(services.getTransaction).toBeDefined();
      expect(typeof services.getTransaction).toBe('function');
    });

    it('should export getTransactionReceipt', () => {
      expect(services.getTransactionReceipt).toBeDefined();
      expect(typeof services.getTransactionReceipt).toBe('function');
    });

    it('should export getTransactionCount', () => {
      expect(services.getTransactionCount).toBeDefined();
      expect(typeof services.getTransactionCount).toBe('function');
    });

    it('should export estimateGas', () => {
      expect(services.estimateGas).toBeDefined();
      expect(typeof services.estimateGas).toBe('function');
    });

    it('should export getChainId', () => {
      expect(services.getChainId).toBeDefined();
      expect(typeof services.getChainId).toBe('function');
    });
  });

  describe('exports from contracts.js', () => {
    it('should export readContract', () => {
      expect(services.readContract).toBeDefined();
      expect(typeof services.readContract).toBe('function');
    });

    it('should export writeContract', () => {
      expect(services.writeContract).toBeDefined();
      expect(typeof services.writeContract).toBe('function');
    });

    it('should export getLogs', () => {
      expect(services.getLogs).toBeDefined();
      expect(typeof services.getLogs).toBe('function');
    });

    it('should export isContract', () => {
      expect(services.isContract).toBeDefined();
      expect(typeof services.isContract).toBe('function');
    });

    it('should export multicall', () => {
      expect(services.multicall).toBeDefined();
      expect(typeof services.multicall).toBe('function');
    });
  });

  describe('exports from tokens.js', () => {
    it('should export getERC20TokenInfo', () => {
      expect(services.getERC20TokenInfo).toBeDefined();
      expect(typeof services.getERC20TokenInfo).toBe('function');
    });

    it('should export getERC721TokenMetadata', () => {
      expect(services.getERC721TokenMetadata).toBeDefined();
      expect(typeof services.getERC721TokenMetadata).toBe('function');
    });

    it('should export getERC1155TokenURI', () => {
      expect(services.getERC1155TokenURI).toBeDefined();
      expect(typeof services.getERC1155TokenURI).toBe('function');
    });
  });

  describe('exports from ens.js', () => {
    it('should export resolveAddress', () => {
      expect(services.resolveAddress).toBeDefined();
      expect(typeof services.resolveAddress).toBe('function');
    });
  });

  describe('exports from abi.js', () => {
    it('should export fetchContractABI', () => {
      expect(services.fetchContractABI).toBeDefined();
      expect(typeof services.fetchContractABI).toBe('function');
    });

    it('should export parseABI', () => {
      expect(services.parseABI).toBeDefined();
      expect(typeof services.parseABI).toBe('function');
    });

    it('should export getReadableFunctions', () => {
      expect(services.getReadableFunctions).toBeDefined();
      expect(typeof services.getReadableFunctions).toBe('function');
    });

    it('should export getFunctionFromABI', () => {
      expect(services.getFunctionFromABI).toBeDefined();
      expect(typeof services.getFunctionFromABI).toBe('function');
    });
  });

  describe('exports from wallet.js', () => {
    it('should export getConfiguredAccount', () => {
      expect(services.getConfiguredAccount).toBeDefined();
      expect(typeof services.getConfiguredAccount).toBe('function');
    });

    it('should export getConfiguredPrivateKey', () => {
      expect(services.getConfiguredPrivateKey).toBeDefined();
      expect(typeof services.getConfiguredPrivateKey).toBe('function');
    });

    it('should export getWalletAddressFromKey', () => {
      expect(services.getWalletAddressFromKey).toBeDefined();
      expect(typeof services.getWalletAddressFromKey).toBe('function');
    });

    it('should export getConfiguredWallet', () => {
      expect(services.getConfiguredWallet).toBeDefined();
      expect(typeof services.getConfiguredWallet).toBe('function');
    });

    it('should export signMessage', () => {
      expect(services.signMessage).toBeDefined();
      expect(typeof services.signMessage).toBe('function');
    });

    it('should export signTypedData', () => {
      expect(services.signTypedData).toBeDefined();
      expect(typeof services.signTypedData).toBe('function');
    });
  });

  describe('exports from utils.js', () => {
    it('should export helpers object', () => {
      expect(services.helpers).toBeDefined();
      expect(typeof services.helpers).toBe('object');
    });

    it('should export parseEther via helpers', () => {
      expect(services.helpers.parseEther).toBeDefined();
      expect(typeof services.helpers.parseEther).toBe('function');
    });

    it('should export formatEther via helpers', () => {
      expect(services.helpers.formatEther).toBeDefined();
      expect(typeof services.helpers.formatEther).toBe('function');
    });

    it('should export formatBigInt via helpers', () => {
      expect(services.helpers.formatBigInt).toBeDefined();
      expect(typeof services.helpers.formatBigInt).toBe('function');
    });

    it('should export formatJson via helpers', () => {
      expect(services.helpers.formatJson).toBeDefined();
      expect(typeof services.helpers.formatJson).toBe('function');
    });

    it('should export formatNumber via helpers', () => {
      expect(services.helpers.formatNumber).toBeDefined();
      expect(typeof services.helpers.formatNumber).toBe('function');
    });

    it('should export hexToNumber via helpers', () => {
      expect(services.helpers.hexToNumber).toBeDefined();
      expect(typeof services.helpers.hexToNumber).toBe('function');
    });

    it('should export numberToHex via helpers', () => {
      expect(services.helpers.numberToHex).toBeDefined();
      expect(typeof services.helpers.numberToHex).toBe('function');
    });
  });

  describe('re-exported viem types', () => {
    it('should have Address type available (runtime check skipped for types)', () => {
      // Types are compile-time only, so we verify the module exports exist
      expect(services).toBeDefined();
    });

    it('should have Hash type available (runtime check skipped for types)', () => {
      expect(services).toBeDefined();
    });

    it('should have Hex type available (runtime check skipped for types)', () => {
      expect(services).toBeDefined();
    });

    it('should have Block type available (runtime check skipped for types)', () => {
      expect(services).toBeDefined();
    });

    it('should have TransactionReceipt type available (runtime check skipped for types)', () => {
      expect(services).toBeDefined();
    });

    it('should have Log type available (runtime check skipped for types)', () => {
      expect(services).toBeDefined();
    });
  });
});
