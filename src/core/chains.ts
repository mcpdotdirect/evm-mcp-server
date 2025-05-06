import { type Chain } from 'viem';
import {
  // Mainnets
  mainnet,
  optimism,
  arbitrum,
  arbitrumNova,
  base,
  polygon,
  polygonZkEvm,
  avalanche,
  bsc,
  zksync,
  linea,
  celo,
  gnosis,
  fantom,
  filecoin,
  moonbeam,
  moonriver,
  cronos,
  lumiaMainnet,
  scroll,
  mantle,
  manta,
  blast,
  fraxtal,
  mode,
  metis,
  kroma,
  zora,
  aurora,
  canto,
  flowMainnet,

  // Testnets
  sepolia,
  optimismSepolia,
  arbitrumSepolia,
  baseSepolia,
  polygonAmoy,
  avalancheFuji,
  bscTestnet,
  zksyncSepoliaTestnet,
  lineaSepolia,
  lumiaTestnet,
  scrollSepolia,
  mantleSepoliaTestnet,
  mantaSepoliaTestnet,
  blastSepolia,
  fraxtalTestnet,
  modeTestnet,
  metisSepolia,
  kromaSepolia,
  zoraSepolia,
  celoAlfajores,
  goerli,
  holesky,
  flowTestnet,
  optimismGoerli,
  arbitrumGoerli,
  baseGoerli,
  polygonMumbai,
} from 'viem/chains';

// Default configuration values
export const DEFAULT_CHAIN_ID = mainnet.id;
export const DEFAULT_RPC_URL = mainnet.rpcUrls.default.http[0];

// Chain metadata interface
export interface ChainMetadata {
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockTime: number; // Average block time in seconds
  gasLimit: {
    min: number;
    max: number;
    default: number;
  };
  isTestnet: boolean;
  explorerUrl: string;
  rpcUrls: readonly string[];
}

// Enhanced ChainDefinition interface
export interface ChainDefinition {
  viemChain: Chain;
  networkNames: string[];
  rpcUrlOverride?: string;
  metadata: ChainMetadata;
}

// Add network type validation
export type NetworkIdentifier = number | string;

// Add RPC URL validation
export type RpcUrl = string;

// Add proper error types
export class ChainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly chainIdentifier?: NetworkIdentifier
  ) {
    super(message);
    this.name = 'ChainError';
  }
}

// Add validation for RPC URLs
function validateRpcUrl(url: string): RpcUrl {
  try {
    new URL(url);
    return url;
  } catch (error) {
    throw new ChainError(
      `Invalid RPC URL: ${url}`,
      'INVALID_RPC_URL',
      undefined
    );
  }
}

// Add network type validation
function validateNetworkIdentifier(identifier: NetworkIdentifier): void {
  if (typeof identifier === 'number' && !Number.isInteger(identifier)) {
    throw new ChainError(
      `Invalid chain ID: ${identifier}. Must be an integer.`,
      'INVALID_CHAIN_ID',
      identifier
    );
  }
  if (typeof identifier === 'string' && !identifier.trim()) {
    throw new ChainError(
      'Network name cannot be empty',
      'EMPTY_NETWORK_NAME',
      identifier
    );
  }
}

// Helper function to create chain metadata
function createChainMetadata(
  chain: Chain,
  name: string,
  nativeCurrency: { name: string; symbol: string; decimals: number },
  blockTime: number,
  isTestnet: boolean
): ChainMetadata {
  return {
    name,
    nativeCurrency,
    blockTime,
    gasLimit: {
      min: 21000,
      max: 30000000,
      default: 21000
    },
    isTestnet,
    explorerUrl: chain.blockExplorers?.default?.url || '',
    rpcUrls: chain.rpcUrls.default.http
  };
}

// Define all supported chains with enhanced metadata
const supportedChains: ChainDefinition[] = [
  // Mainnets
  {
    viemChain: mainnet,
    networkNames: ['mainnet', 'ethereum', 'eth'],
    metadata: createChainMetadata(
      mainnet,
      'Ethereum Mainnet',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      12,
      false
    )
  },
  {
    viemChain: optimism,
    networkNames: ['optimism', 'op'],
    metadata: createChainMetadata(
      optimism,
      'Optimism',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: arbitrum,
    networkNames: ['arbitrum', 'arb'],
    metadata: createChainMetadata(
      arbitrum,
      'Arbitrum One',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      0.25,
      false
    )
  },
  {
    viemChain: arbitrumNova,
    networkNames: ['arbitrum-nova', 'arbitrumnova'],
    metadata: createChainMetadata(
      arbitrumNova,
      'Arbitrum Nova',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      0.25,
      false
    )
  },
  {
    viemChain: base,
    networkNames: ['base'],
    metadata: createChainMetadata(
      base,
      'Base',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: polygon,
    networkNames: ['polygon', 'matic'],
    metadata: createChainMetadata(
      polygon,
      'Polygon',
      { name: 'Matic', symbol: 'MATIC', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: polygonZkEvm,
    networkNames: ['polygon-zkevm', 'polygonzkevm'],
    metadata: createChainMetadata(
      polygonZkEvm,
      'Polygon zkEVM',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: avalanche,
    networkNames: ['avalanche', 'avax'],
    metadata: createChainMetadata(
      avalanche,
      'Avalanche',
      { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: bsc,
    networkNames: ['bsc', 'binance'],
    metadata: createChainMetadata(
      bsc,
      'BNB Smart Chain',
      { name: 'BNB', symbol: 'BNB', decimals: 18 },
      3,
      false
    )
  },
  {
    viemChain: zksync,
    networkNames: ['zksync'],
    metadata: createChainMetadata(
      zksync,
      'zkSync',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      0.1,
      false
    )
  },
  {
    viemChain: linea,
    networkNames: ['linea'],
    metadata: createChainMetadata(
      linea,
      'Linea',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: celo,
    networkNames: ['celo'],
    metadata: createChainMetadata(
      celo,
      'Celo',
      { name: 'Celo', symbol: 'CELO', decimals: 18 },
      5,
      false
    )
  },
  {
    viemChain: gnosis,
    networkNames: ['gnosis', 'xdai'],
    metadata: createChainMetadata(
      gnosis,
      'Gnosis Chain',
      { name: 'xDai', symbol: 'xDAI', decimals: 18 },
      5,
      false
    )
  },
  {
    viemChain: fantom,
    networkNames: ['fantom', 'ftm'],
    metadata: createChainMetadata(
      fantom,
      'Fantom',
      { name: 'Fantom', symbol: 'FTM', decimals: 18 },
      1,
      false
    )
  },
  {
    viemChain: filecoin,
    networkNames: ['filecoin', 'fil'],
    metadata: createChainMetadata(
      filecoin,
      'Filecoin',
      { name: 'Filecoin', symbol: 'FIL', decimals: 18 },
      30,
      false
    )
  },
  {
    viemChain: moonbeam,
    networkNames: ['moonbeam'],
    metadata: createChainMetadata(
      moonbeam,
      'Moonbeam',
      { name: 'Glimmer', symbol: 'GLMR', decimals: 18 },
      12,
      false
    )
  },
  {
    viemChain: moonriver,
    networkNames: ['moonriver'],
    metadata: createChainMetadata(
      moonriver,
      'Moonriver',
      { name: 'Moonriver', symbol: 'MOVR', decimals: 18 },
      12,
      false
    )
  },
  {
    viemChain: cronos,
    networkNames: ['cronos'],
    metadata: createChainMetadata(
      cronos,
      'Cronos',
      { name: 'Cronos', symbol: 'CRO', decimals: 18 },
      6,
      false
    )
  },
  {
    viemChain: scroll,
    networkNames: ['scroll'],
    metadata: createChainMetadata(
      scroll,
      'Scroll',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: mantle,
    networkNames: ['mantle'],
    metadata: createChainMetadata(
      mantle,
      'Mantle',
      { name: 'Mantle', symbol: 'MNT', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: manta,
    networkNames: ['manta'],
    metadata: createChainMetadata(
      manta,
      'Manta',
      { name: 'Manta', symbol: 'MANTA', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: lumiaMainnet,
    networkNames: ['lumia'],
    rpcUrlOverride: 'https://mainnet-rpc.lumia.org',
    metadata: createChainMetadata(
      lumiaMainnet,
      'Lumia',
      { name: 'Lumia', symbol: 'LUM', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: blast,
    networkNames: ['blast'],
    metadata: createChainMetadata(
      blast,
      'Blast',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: fraxtal,
    networkNames: ['fraxtal'],
    metadata: createChainMetadata(
      fraxtal,
      'Frax',
      { name: 'Frax', symbol: 'FRAX', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: mode,
    networkNames: ['mode'],
    metadata: createChainMetadata(
      mode,
      'Mode',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: metis,
    networkNames: ['metis'],
    metadata: createChainMetadata(
      metis,
      'Metis',
      { name: 'Metis', symbol: 'METIS', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: kroma,
    networkNames: ['kroma'],
    metadata: createChainMetadata(
      kroma,
      'Kroma',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: zora,
    networkNames: ['zora'],
    metadata: createChainMetadata(
      zora,
      'Zora',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: aurora,
    networkNames: ['aurora'],
    metadata: createChainMetadata(
      aurora,
      'Aurora',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: canto,
    networkNames: ['canto'],
    metadata: createChainMetadata(
      canto,
      'Canto',
      { name: 'Canto', symbol: 'CANTO', decimals: 18 },
      2,
      false
    )
  },
  {
    viemChain: flowMainnet,
    networkNames: ['flow'],
    metadata: createChainMetadata(
      flowMainnet,
      'Flow',
      { name: 'Flow', symbol: 'FLOW', decimals: 18 },
      2,
      false
    )
  },

  // Testnets
  {
    viemChain: sepolia,
    networkNames: ['sepolia'],
    metadata: createChainMetadata(
      sepolia,
      'Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      12,
      true
    )
  },
  {
    viemChain: goerli,
    networkNames: ['goerli'],
    metadata: createChainMetadata(
      goerli,
      'Goerli',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      15,
      true
    )
  },
  {
    viemChain: optimismGoerli,
    networkNames: ['optimism-goerli', 'optimismgoerli'],
    metadata: createChainMetadata(
      optimismGoerli,
      'Optimism Goerli',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: arbitrumGoerli,
    networkNames: ['arbitrum-goerli', 'arbitrumgoerli'],
    metadata: createChainMetadata(
      arbitrumGoerli,
      'Arbitrum Goerli',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      0.25,
      true
    )
  },
  {
    viemChain: baseGoerli,
    networkNames: ['base-goerli', 'basegoerli'],
    metadata: createChainMetadata(
      baseGoerli,
      'Base Goerli',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: polygonMumbai,
    networkNames: ['mumbai'],
    metadata: createChainMetadata(
      polygonMumbai,
      'Mumbai',
      { name: 'Matic', symbol: 'MATIC', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: avalancheFuji,
    networkNames: ['fuji'],
    metadata: createChainMetadata(
      avalancheFuji,
      'Fuji',
      { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: bscTestnet,
    networkNames: ['bsc-testnet', 'bsctestnet'],
    metadata: createChainMetadata(
      bscTestnet,
      'BSC Testnet',
      { name: 'BNB', symbol: 'BNB', decimals: 18 },
      3,
      true
    )
  },
  {
    viemChain: zksyncSepoliaTestnet,
    networkNames: ['zksync-sepolia', 'zksyncsepolia'],
    metadata: createChainMetadata(
      zksyncSepoliaTestnet,
      'zkSync Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      0.1,
      true
    )
  },
  {
    viemChain: lineaSepolia,
    networkNames: ['linea-sepolia', 'lineasepolia'],
    metadata: createChainMetadata(
      lineaSepolia,
      'Linea Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: lumiaTestnet,
    networkNames: ['lumia-testnet'],
    rpcUrlOverride: 'https://testnet-rpc.lumia.org',
    metadata: createChainMetadata(
      lumiaTestnet,
      'Lumia Testnet',
      { name: 'Lumia', symbol: 'LUM', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: scrollSepolia,
    networkNames: ['scroll-sepolia', 'scrollsepolia'],
    metadata: createChainMetadata(
      scrollSepolia,
      'Scroll Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: mantleSepoliaTestnet,
    networkNames: ['mantle-sepolia', 'mantlesepolia'],
    metadata: createChainMetadata(
      mantleSepoliaTestnet,
      'Mantle Sepolia',
      { name: 'Mantle', symbol: 'MNT', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: optimismSepolia,
    networkNames: ['optimism-sepolia', 'optimismsepolia'],
    metadata: createChainMetadata(
      optimismSepolia,
      'Optimism Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: arbitrumSepolia,
    networkNames: ['arbitrum-sepolia', 'arbitrumsepolia'],
    metadata: createChainMetadata(
      arbitrumSepolia,
      'Arbitrum Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      0.25,
      true
    )
  },
  {
    viemChain: baseSepolia,
    networkNames: ['base-sepolia', 'basesepolia'],
    metadata: createChainMetadata(
      baseSepolia,
      'Base Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: polygonAmoy,
    networkNames: ['polygon-amoy', 'polygonamoy'],
    metadata: createChainMetadata(
      polygonAmoy,
      'Polygon Amoy',
      { name: 'Matic', symbol: 'MATIC', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: mantaSepoliaTestnet,
    networkNames: ['manta-sepolia', 'mantasepolia'],
    metadata: createChainMetadata(
      mantaSepoliaTestnet,
      'Manta Sepolia',
      { name: 'Manta', symbol: 'MANTA', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: blastSepolia,
    networkNames: ['blast-sepolia', 'blastsepolia'],
    metadata: createChainMetadata(
      blastSepolia,
      'Blast Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: fraxtalTestnet,
    networkNames: ['fraxtal-testnet', 'fraxtaltestnet'],
    metadata: createChainMetadata(
      fraxtalTestnet,
      'Frax Testnet',
      { name: 'Frax', symbol: 'FRAX', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: zoraSepolia,
    networkNames: ['zora-sepolia', 'zorasepolia'],
    metadata: createChainMetadata(
      zoraSepolia,
      'Zora Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: celoAlfajores,
    networkNames: ['celo-alfajores', 'celoalfajores', 'alfajores'],
    metadata: createChainMetadata(
      celoAlfajores,
      'Celo Alfajores',
      { name: 'Celo', symbol: 'CELO', decimals: 18 },
      5,
      true
    )
  },
  {
    viemChain: holesky,
    networkNames: ['holesky'],
    metadata: createChainMetadata(
      holesky,
      'Holesky',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      12,
      true
    )
  },
  {
    viemChain: flowTestnet,
    networkNames: ['flow-testnet'],
    metadata: createChainMetadata(
      flowTestnet,
      'Flow Testnet',
      { name: 'Flow', symbol: 'FLOW', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: modeTestnet,
    networkNames: ['mode-testnet', 'modetestnet'],
    metadata: createChainMetadata(
      modeTestnet,
      'Mode Testnet',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: metisSepolia,
    networkNames: ['metis-sepolia', 'metissepolia'],
    metadata: createChainMetadata(
      metisSepolia,
      'Metis Sepolia',
      { name: 'Metis', symbol: 'METIS', decimals: 18 },
      2,
      true
    )
  },
  {
    viemChain: kromaSepolia,
    networkNames: ['kroma-sepolia', 'kromasepolia'],
    metadata: createChainMetadata(
      kromaSepolia,
      'Kroma Sepolia',
      { name: 'Ether', symbol: 'ETH', decimals: 18 },
      2,
      true
    )
  }
];

// Map chain IDs to viem Chain objects
export const chainMap: Readonly<Record<number, Chain>> = Object.freeze(
  supportedChains.reduce((map, { viemChain }) => {
    map[viemChain.id] = viemChain;
    return map;
  }, {} as Record<number, Chain>)
);

// Map network names (lowercase) to chain IDs for easy lookup
export const networkNameMap: Readonly<Record<string, number>> = Object.freeze(
  supportedChains.reduce((map, { viemChain, networkNames }) => {
    networkNames.forEach(name => {
      map[name.toLowerCase()] = viemChain.id;
    });
    return map;
  }, {} as Record<string, number>)
);

// Map chain IDs to their primary RPC URL (override or viem default)
export const rpcUrlMap: Readonly<Record<number, string>> = Object.freeze(
  supportedChains.reduce((map, { viemChain, rpcUrlOverride }) => {
    const defaultRpc = viemChain.rpcUrls.default?.http[0];
    if (rpcUrlOverride) {
      map[viemChain.id] = rpcUrlOverride;
    } else if (defaultRpc) {
      map[viemChain.id] = defaultRpc;
    }
    return map;
  }, {} as Record<number, string>)
);

// Map chain IDs to their metadata
export const chainMetadataMap: Readonly<Record<number, ChainMetadata>> = Object.freeze(
  supportedChains.reduce((map, { viemChain, metadata }) => {
    map[viemChain.id] = metadata;
    return map;
  }, {} as Record<number, ChainMetadata>)
);

// --- Helper Functions ---

/**
 * Resolves a chain identifier (chain ID number or network name string) to a chain ID number.
 * Throws an error if the identifier cannot be resolved.
 *
 * @param chainIdentifier - The chain ID (e.g., 1) or network name (e.g., 'mainnet', 'arbitrum-sepolia'). Case-insensitive for strings.
 * @returns The resolved chain ID number.
 * @throws {Error} If the chain identifier is invalid or unsupported.
 */
export function resolveChainId(chainIdentifier: NetworkIdentifier): number {
  validateNetworkIdentifier(chainIdentifier);

  if (typeof chainIdentifier === 'number') {
    if (chainMap[chainIdentifier]) {
      return chainIdentifier;
    }
    throw new ChainError(
      `Unsupported chain ID: ${chainIdentifier}`,
      'UNSUPPORTED_CHAIN_ID',
      chainIdentifier
    );
  }

  if (typeof chainIdentifier === 'string') {
    const networkName = chainIdentifier.toLowerCase();
    const chainId = networkNameMap[networkName];
    if (chainId !== undefined) {
      return chainId;
    }

    const parsedId = parseInt(networkName, 10);
    if (!isNaN(parsedId) && chainMap[parsedId]) {
      return parsedId;
    }
  }

  throw new ChainError(
    `Invalid or unsupported chain identifier: ${chainIdentifier}`,
    'INVALID_CHAIN_IDENTIFIER',
    chainIdentifier
  );
}

/**
 * Retrieves the viem Chain object for a given chain identifier.
 * Throws an error if the chain is not supported.
 *
 * @param chainIdentifier - The chain ID (number) or network name (string).
 * @returns The viem Chain object.
 * @throws {Error} If the chain identifier is invalid or unsupported.
 */
export function getChain(chainIdentifier: number | string): Chain {
  const chainId = resolveChainId(chainIdentifier); // Will throw if invalid/unsupported
  // We know chainId is valid and exists in chainMap because resolveChainId passed
  return chainMap[chainId];
}

/**
 * Gets the recommended RPC URL for the specified chain identifier.
 * Prioritizes overrides, then viem defaults, then the global default.
 * Throws an error if the chain identifier is invalid or unsupported.
 *
 * @param chainIdentifier - The chain ID (number) or network name (string).
 * @returns The RPC URL string.
 * @throws {Error} If the chain identifier is invalid or unsupported.
 */
export function getRpcUrl(chainIdentifier: NetworkIdentifier): RpcUrl {
  const chainId = resolveChainId(chainIdentifier);

  if (rpcUrlMap[chainId]) {
    return validateRpcUrl(rpcUrlMap[chainId]);
  }

  const chain = chainMap[chainId];
  const viemDefaultRpc = chain?.rpcUrls.default?.http[0];
  if (viemDefaultRpc) {
    console.warn(`Using viem default RPC for chain ${chainId} as no specific URL was found in rpcUrlMap.`);
    return validateRpcUrl(viemDefaultRpc);
  }

  console.warn(`Using global default RPC URL for chain ${chainId} as no specific or viem default URL was found.`);
  return validateRpcUrl(DEFAULT_RPC_URL);
}

/**
 * Gets a sorted list of primary supported network names.
 * Excludes shorter aliases for brevity.
 *
 * @returns An array of primary network name strings.
 */
export function getSupportedNetworks(): string[] {
  return supportedChains
    .map(def => def.networkNames[0])
    .sort();
}

/**
 * Gets a sorted list of testnet network names.
 *
 * @returns An array of testnet network name strings.
 */
export function getTestnetNetworks(): string[] {
  return supportedChains
    .filter(def => def.metadata.isTestnet)
    .map(def => def.networkNames[0])
    .sort();
}

/**
 * Gets a sorted list of mainnet network names.
 *
 * @returns An array of mainnet network name strings.
 */
export function getMainnetNetworks(): string[] {
  return supportedChains
    .filter(def => !def.metadata.isTestnet)
    .map(def => def.networkNames[0])
    .sort();
}

/**
 * Gets chain metadata for a given chain identifier.
 *
 * @param chainIdentifier - The chain ID (number) or network name (string).
 * @returns The chain metadata.
 * @throws {Error} If the chain identifier is invalid or unsupported.
 */
export function getChainMetadata(chainIdentifier: NetworkIdentifier): ChainMetadata {
  const chainId = resolveChainId(chainIdentifier);
  const metadata = chainMetadataMap[chainId];
  if (!metadata) {
    throw new ChainError(
      `No metadata found for chain ${chainIdentifier}`,
      'NO_CHAIN_METADATA',
      chainIdentifier
    );
  }
  return metadata;
}
