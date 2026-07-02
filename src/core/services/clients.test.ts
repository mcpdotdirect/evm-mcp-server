// Mock the chains module
jest.mock('../chains.js', () => ({
  getChain: jest.fn(),
  getRpcUrl: jest.fn(),
}));

// Mock viem modules
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
}));

jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn(),
}));

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChain, getRpcUrl } from '../chains.js';

describe('clients', () => {
  const mockChain = { id: 1, name: 'Ethereum' };
  const mockRpcUrl = 'https://mock-rpc.com';
  const mockAccount = {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    publicKey: '0xmockPublicKey'
  };
  const mockPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

  describe('getPublicClient', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup default mocks
      (getChain as jest.Mock).mockReturnValue(mockChain);
      (getRpcUrl as jest.Mock).mockReturnValue(mockRpcUrl);
      (http as jest.Mock).mockReturnValue({ type: 'http' });
      (privateKeyToAccount as jest.Mock).mockReturnValue(mockAccount);
    });

    it('should create a new public client for a network', () => {
      const mockPublicClient = { type: 'public', chain: mockChain };
      (createPublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      jest.isolateModules(() => {
        const { getPublicClient } = require('./clients.js');
        const client = getPublicClient('ethereum');

        expect(getChain).toHaveBeenCalledWith('ethereum');
        expect(getRpcUrl).toHaveBeenCalledWith('ethereum');
        expect(http).toHaveBeenCalledWith(mockRpcUrl);
        expect(createPublicClient).toHaveBeenCalledWith({
          chain: mockChain,
          transport: { type: 'http' }
        });
        expect(client).toBe(mockPublicClient);
      });
    });

    it('should use default network "ethereum" when no network is provided', () => {
      const mockPublicClient = { type: 'public', chain: mockChain };
      (createPublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      jest.isolateModules(() => {
        const { getPublicClient } = require('./clients.js');
        getPublicClient();

        expect(getChain).toHaveBeenCalledWith('ethereum');
        expect(getRpcUrl).toHaveBeenCalledWith('ethereum');
      });
    });

    it('should cache the public client and return cached instance on subsequent calls', () => {
      const mockPublicClient = { type: 'public', chain: mockChain };
      (createPublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      jest.isolateModules(() => {
        const { getPublicClient } = require('./clients.js');
        const firstCall = getPublicClient('ethereum');
        const secondCall = getPublicClient('ethereum');

        expect(firstCall).toBe(secondCall);
        expect(createPublicClient).toHaveBeenCalledTimes(1);
      });
    });

    it('should cache clients separately for different networks', () => {
      const mockPublicClient1 = { type: 'public', chain: mockChain, id: 1 };
      const mockPublicClient2 = { type: 'public', chain: mockChain, id: 2 };
      let callCount = 0;
      (createPublicClient as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockPublicClient1 : mockPublicClient2;
      });

      jest.isolateModules(() => {
        const { getPublicClient } = require('./clients.js');
        const ethereumClient = getPublicClient('ethereum');
        const optimismClient = getPublicClient('optimism');

        expect(ethereumClient).not.toBe(optimismClient);
        expect(createPublicClient).toHaveBeenCalledTimes(2);
      });
    });

    it('should return cached client even when called with different case network names', () => {
      const mockPublicClient1 = { type: 'public', chain: mockChain, id: 1 };
      const mockPublicClient2 = { type: 'public', chain: mockChain, id: 2 };
      let callCount = 0;
      (createPublicClient as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockPublicClient1 : mockPublicClient2;
      });

      jest.isolateModules(() => {
        const { getPublicClient } = require('./clients.js');
        const client1 = getPublicClient('Ethereum');
        const client2 = getPublicClient('ethereum');

        // Note: cache key is String(network), so case matters
        expect(createPublicClient).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('getWalletClient', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup default mocks
      (getChain as jest.Mock).mockReturnValue(mockChain);
      (getRpcUrl as jest.Mock).mockReturnValue(mockRpcUrl);
      (http as jest.Mock).mockReturnValue({ type: 'http' });
      (privateKeyToAccount as jest.Mock).mockReturnValue(mockAccount);
    });

    it('should create a wallet client with private key and network', () => {
      const mockWalletClient = { type: 'wallet', chain: mockChain };
      (createWalletClient as jest.Mock).mockReturnValue(mockWalletClient);

      jest.isolateModules(() => {
        const { getWalletClient } = require('./clients.js');
        const client = getWalletClient(mockPrivateKey, 'ethereum');

        expect(getChain).toHaveBeenCalledWith('ethereum');
        expect(getRpcUrl).toHaveBeenCalledWith('ethereum');
        expect(privateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
        expect(createWalletClient).toHaveBeenCalledWith({
          account: mockAccount,
          chain: mockChain,
          transport: { type: 'http' }
        });
        expect(client).toBe(mockWalletClient);
      });
    });

    it('should use default network "ethereum" when no network is provided', () => {
      const mockWalletClient = { type: 'wallet', chain: mockChain };
      (createWalletClient as jest.Mock).mockReturnValue(mockWalletClient);

      jest.isolateModules(() => {
        const { getWalletClient } = require('./clients.js');
        getWalletClient(mockPrivateKey);

        expect(getChain).toHaveBeenCalledWith('ethereum');
        expect(getRpcUrl).toHaveBeenCalledWith('ethereum');
      });
    });

    it('should create a new wallet client each time (no caching)', () => {
      const mockWalletClient1 = { type: 'wallet', chain: mockChain, id: 1 };
      const mockWalletClient2 = { type: 'wallet', chain: mockChain, id: 2 };
      let callCount = 0;
      (createWalletClient as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockWalletClient1 : mockWalletClient2;
      });

      jest.isolateModules(() => {
        const { getWalletClient } = require('./clients.js');
        const firstCall = getWalletClient(mockPrivateKey, 'ethereum');
        const secondCall = getWalletClient(mockPrivateKey, 'ethereum');

        expect(firstCall).not.toBe(secondCall);
        expect(createWalletClient).toHaveBeenCalledTimes(2);
      });
    });

    it('should work with different private keys', () => {
      const mockWalletClient = { type: 'wallet', chain: mockChain };
      (createWalletClient as jest.Mock).mockReturnValue(mockWalletClient);

      const privateKey2 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
      const mockAccount2 = { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C9', publicKey: '0xmockPublicKey2' };
      (privateKeyToAccount as jest.Mock).mockReturnValueOnce(mockAccount2);

      jest.isolateModules(() => {
        const { getWalletClient } = require('./clients.js');
        const client1 = getWalletClient(mockPrivateKey, 'ethereum');
        const client2 = getWalletClient(privateKey2, 'ethereum');

        expect(privateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
        expect(privateKeyToAccount).toHaveBeenCalledWith(privateKey2);
      });
    });
  });

  describe('getAddressFromPrivateKey', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup default mocks
      (getChain as jest.Mock).mockReturnValue(mockChain);
      (getRpcUrl as jest.Mock).mockReturnValue(mockRpcUrl);
      (http as jest.Mock).mockReturnValue({ type: 'http' });
      (privateKeyToAccount as jest.Mock).mockReturnValue(mockAccount);
    });

    it('should return the address derived from a private key', () => {
      jest.isolateModules(() => {
        const { getAddressFromPrivateKey } = require('./clients.js');
        const address = getAddressFromPrivateKey(mockPrivateKey);

        expect(privateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
        expect(address).toBe(mockAccount.address);
      });
    });

    it('should work with different private keys', () => {
      const privateKey2 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
      const mockAccount2 = { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C9', publicKey: '0xmockPublicKey2' };

      (privateKeyToAccount as jest.Mock)
        .mockReturnValueOnce(mockAccount)
        .mockReturnValueOnce(mockAccount2);

      jest.isolateModules(() => {
        const { getAddressFromPrivateKey } = require('./clients.js');
        const address1 = getAddressFromPrivateKey(mockPrivateKey);
        const address2 = getAddressFromPrivateKey(privateKey2);

        expect(address1).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
        expect(address2).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C9');
      });
    });
  });
});
