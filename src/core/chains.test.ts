import {
  DEFAULT_RPC_URL,
  DEFAULT_CHAIN_ID,
  chainMap,
  networkNameMap,
  rpcUrlMap,
  resolveChainId,
  getChain,
  getRpcUrl,
  getSupportedNetworks,
} from './chains.js';

describe('chains', () => {
  describe('constants', () => {
    it('should have correct DEFAULT_RPC_URL', () => {
      expect(DEFAULT_RPC_URL).toBe('https://eth.llamarpc.com');
    });

    it('should have correct DEFAULT_CHAIN_ID', () => {
      expect(DEFAULT_CHAIN_ID).toBe(1);
    });
  });

  describe('chainMap', () => {
    it('should contain mainnet chains', () => {
      expect(chainMap[1]).toBeDefined(); // ethereum
      expect(chainMap[10]).toBeDefined(); // optimism
      expect(chainMap[42161]).toBeDefined(); // arbitrum
      expect(chainMap[8453]).toBeDefined(); // base
      expect(chainMap[137]).toBeDefined(); // polygon
    });

    it('should contain testnet chains', () => {
      expect(chainMap[11155111]).toBeDefined(); // sepolia
      expect(chainMap[11155420]).toBeDefined(); // optimism sepolia
      expect(chainMap[421614]).toBeDefined(); // arbitrum sepolia
      expect(chainMap[84532]).toBeDefined(); // base sepolia
    });
  });

  describe('networkNameMap', () => {
    it('should map mainnet names to chain IDs', () => {
      expect(networkNameMap['ethereum']).toBe(1);
      expect(networkNameMap['mainnet']).toBe(1);
      expect(networkNameMap['optimism']).toBe(10);
      expect(networkNameMap['base']).toBe(8453);
      expect(networkNameMap['polygon']).toBe(137);
    });

    it('should map testnet names to chain IDs', () => {
      expect(networkNameMap['sepolia']).toBe(11155111);
      expect(networkNameMap['optimism-sepolia']).toBe(11155420);
      expect(networkNameMap['base-sepolia']).toBe(84532);
    });

    it('should map short aliases to chain IDs', () => {
      expect(networkNameMap['eth']).toBe(1);
      expect(networkNameMap['op']).toBe(10);
      expect(networkNameMap['arb']).toBe(42161);
      expect(networkNameMap['matic']).toBe(137);
      expect(networkNameMap['avax']).toBe(43114);
    });
  });

  describe('rpcUrlMap', () => {
    it('should contain RPC URLs for mainnet chains', () => {
      expect(rpcUrlMap[1]).toBe('https://eth.llamarpc.com');
      expect(rpcUrlMap[10]).toBe('https://mainnet.optimism.io');
      expect(rpcUrlMap[42161]).toBe('https://arb1.arbitrum.io/rpc');
      expect(rpcUrlMap[8453]).toBe('https://mainnet.base.org');
    });

    it('should contain RPC URLs for testnet chains', () => {
      expect(rpcUrlMap[11155111]).toBe('https://sepolia.drpc.org');
      expect(rpcUrlMap[11155420]).toBe('https://sepolia.optimism.io');
      expect(rpcUrlMap[421614]).toBe('https://sepolia-rpc.arbitrum.io/rpc');
    });
  });

  describe('resolveChainId', () => {
    it('should return the same number when given a number', () => {
      expect(resolveChainId(1)).toBe(1);
      expect(resolveChainId(10)).toBe(10);
      expect(resolveChainId(42161)).toBe(42161);
      expect(resolveChainId(11155111)).toBe(11155111);
    });

    it('should resolve mainnet network names to chain IDs', () => {
      expect(resolveChainId('ethereum')).toBe(1);
      expect(resolveChainId('mainnet')).toBe(1);
      expect(resolveChainId('optimism')).toBe(10);
      expect(resolveChainId('base')).toBe(8453);
      expect(resolveChainId('polygon')).toBe(137);
      expect(resolveChainId('arbitrum')).toBe(42161);
    });

    it('should resolve testnet network names to chain IDs', () => {
      expect(resolveChainId('sepolia')).toBe(11155111);
      expect(resolveChainId('optimism-sepolia')).toBe(11155420);
      expect(resolveChainId('base-sepolia')).toBe(84532);
      expect(resolveChainId('arbitrum-sepolia')).toBe(421614);
    });

    it('should resolve short aliases to chain IDs', () => {
      expect(resolveChainId('eth')).toBe(1);
      expect(resolveChainId('op')).toBe(10);
      expect(resolveChainId('arb')).toBe(42161);
      expect(resolveChainId('matic')).toBe(137);
      expect(resolveChainId('avax')).toBe(43114);
    });

    it('should be case-insensitive', () => {
      expect(resolveChainId('ETHEREUM')).toBe(1);
      expect(resolveChainId('Optimism')).toBe(10);
      expect(resolveChainId('BASE')).toBe(8453);
      expect(resolveChainId('SePolia')).toBe(11155111);
    });

    it('should resolve numeric strings to numbers', () => {
      expect(resolveChainId('1')).toBe(1);
      expect(resolveChainId('10')).toBe(10);
      expect(resolveChainId('42161')).toBe(42161);
      expect(resolveChainId('11155111')).toBe(11155111);
    });

    it('should default to DEFAULT_CHAIN_ID for unknown network names', () => {
      expect(resolveChainId('unknown-network')).toBe(DEFAULT_CHAIN_ID);
      expect(resolveChainId('nonexistent')).toBe(DEFAULT_CHAIN_ID);
      expect(resolveChainId('')).toBe(DEFAULT_CHAIN_ID);
    });
  });

  describe('getChain', () => {
    it('should return chain config for number input', () => {
      const chain1 = getChain(1);
      expect(chain1).toBeDefined();
      expect(chain1.id).toBe(1);

      const chain10 = getChain(10);
      expect(chain10).toBeDefined();
      expect(chain10.id).toBe(10);
    });

    it('should return chain config for string input', () => {
      const ethChain = getChain('ethereum');
      expect(ethChain).toBeDefined();
      expect(ethChain.id).toBe(1);

      const opChain = getChain('optimism');
      expect(opChain).toBeDefined();
      expect(opChain.id).toBe(10);
    });

    it('should return mainnet by default when no argument provided', () => {
      const chain = getChain();
      expect(chain).toBeDefined();
      expect(chain.id).toBe(1);
    });

    it('should return mainnet for unknown chain IDs', () => {
      const chain = getChain(999999);
      expect(chain).toBeDefined();
      expect(chain.id).toBe(1);
    });

    it('should throw error for unknown network names', () => {
      expect(() => getChain('unknown-network')).toThrow('Unsupported network: unknown-network');
      expect(() => getChain('nonexistent')).toThrow('Unsupported network: nonexistent');
    });

    it('should be case-insensitive for string input', () => {
      const chain1 = getChain('ETHEREUM');
      expect(chain1.id).toBe(1);

      const chain2 = getChain('Optimism');
      expect(chain2.id).toBe(10);
    });
  });

  describe('getRpcUrl', () => {
    it('should return RPC URL for number input', () => {
      expect(getRpcUrl(1)).toBe('https://eth.llamarpc.com');
      expect(getRpcUrl(10)).toBe('https://mainnet.optimism.io');
      expect(getRpcUrl(42161)).toBe('https://arb1.arbitrum.io/rpc');
      expect(getRpcUrl(8453)).toBe('https://mainnet.base.org');
    });

    it('should return RPC URL for string input', () => {
      expect(getRpcUrl('ethereum')).toBe('https://eth.llamarpc.com');
      expect(getRpcUrl('optimism')).toBe('https://mainnet.optimism.io');
      expect(getRpcUrl('base')).toBe('https://mainnet.base.org');
    });

    it('should return default RPC URL by default when no argument provided', () => {
      expect(getRpcUrl()).toBe(DEFAULT_RPC_URL);
    });

    it('should return default RPC URL for unknown chain IDs', () => {
      expect(getRpcUrl(999999)).toBe(DEFAULT_RPC_URL);
      expect(getRpcUrl(123456)).toBe(DEFAULT_RPC_URL);
    });

    it('should resolve network names to RPC URLs', () => {
      expect(getRpcUrl('polygon')).toBe('https://polygon-rpc.com');
      expect(getRpcUrl('arbitrum')).toBe('https://arb1.arbitrum.io/rpc');
      expect(getRpcUrl('avalanche')).toBe('https://api.avax.network/ext/bc/C/rpc');
    });

    it('should be case-insensitive', () => {
      expect(getRpcUrl('ETHEREUM')).toBe('https://eth.llamarpc.com');
      expect(getRpcUrl('Optimism')).toBe('https://mainnet.optimism.io');
      expect(getRpcUrl('BASE')).toBe('https://mainnet.base.org');
    });

    it('should resolve numeric strings to RPC URLs', () => {
      expect(getRpcUrl('1')).toBe('https://eth.llamarpc.com');
      expect(getRpcUrl('10')).toBe('https://mainnet.optimism.io');
    });
  });

  describe('getSupportedNetworks', () => {
    it('should return an array of strings', () => {
      const networks = getSupportedNetworks();
      expect(Array.isArray(networks)).toBe(true);
      expect(networks.every((n: string) => typeof n === 'string')).toBe(true);
    });

    it('should filter out short aliases (length <= 2)', () => {
      const networks = getSupportedNetworks();
      // Length <= 2 aliases should be filtered out
      expect(networks).not.toContain('op'); // length 2
      // Note: 'eth' (length 3), 'arb' (length 3), 'xdai' (length 4) are NOT filtered since filter is length > 2
    });

    it('should include full network names', () => {
      const networks = getSupportedNetworks();
      expect(networks).toContain('ethereum');
      expect(networks).toContain('optimism');
      expect(networks).toContain('arbitrum');
      expect(networks).toContain('base');
      expect(networks).toContain('polygon');
      expect(networks).toContain('sepolia');
    });

    it('should return sorted array', () => {
      const networks = getSupportedNetworks();
      const sorted = [...networks].sort();
      expect(networks).toEqual(sorted);
    });

    it('should include both mainnets and testnets', () => {
      const networks = getSupportedNetworks();
      // Mainnets
      expect(networks).toContain('ethereum');
      expect(networks).toContain('optimism');
      expect(networks).toContain('arbitrum');
      // Testnets
      expect(networks).toContain('sepolia');
      expect(networks).toContain('optimism-sepolia');
      expect(networks).toContain('base-sepolia');
    });
  });
});
