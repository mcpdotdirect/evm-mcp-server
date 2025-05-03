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
  lineaSepolia, // Added missing import
  lumiaTestnet, // Added missing import
  scrollSepolia, // Added missing import
  mantleSepoliaTestnet, // Added missing import
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
} from 'viem/chains';

// Default configuration values
export const DEFAULT_CHAIN_ID = mainnet.id; // Use mainnet ID directly
export const DEFAULT_RPC_URL = mainnet.rpcUrls.default.http[0]; // Use mainnet default RPC

// --- Chain Definitions ---
// Provides a single source of truth for chain configurations.

interface ChainDefinition {
  viemChain: Chain;
  networkNames: string[]; // Primary name first, followed by aliases
  rpcUrlOverride?: string; // Optional override for the default RPC URL from viemChain
}

// Define all supported chains here
const supportedChains: ChainDefinition[] = [
  // Mainnets
  { viemChain: mainnet, networkNames: ['mainnet', 'ethereum', 'eth'] },
  { viemChain: optimism, networkNames: ['optimism', 'op'] },
  { viemChain: arbitrum, networkNames: ['arbitrum', 'arb'] },
  { viemChain: arbitrumNova, networkNames: ['arbitrum-nova', 'arbitrumnova'] },
  { viemChain: base, networkNames: ['base'] },
  { viemChain: polygon, networkNames: ['polygon', 'matic'] },
  { viemChain: polygonZkEvm, networkNames: ['polygon-zkevm', 'polygonzkevm'] },
  { viemChain: avalanche, networkNames: ['avalanche', 'avax'] },
  { viemChain: bsc, networkNames: ['bsc', 'binance'] },
  { viemChain: zksync, networkNames: ['zksync'] },
  { viemChain: linea, networkNames: ['linea'] },
  { viemChain: celo, networkNames: ['celo'] },
  { viemChain: gnosis, networkNames: ['gnosis', 'xdai'] },
  { viemChain: fantom, networkNames: ['fantom', 'ftm'] },
  { viemChain: filecoin, networkNames: ['filecoin', 'fil'] },
  { viemChain: moonbeam, networkNames: ['moonbeam'] },
  { viemChain: moonriver, networkNames: ['moonriver'] },
  { viemChain: cronos, networkNames: ['cronos'] },
  { viemChain: scroll, networkNames: ['scroll'] },
  { viemChain: mantle, networkNames: ['mantle'] },
  { viemChain: manta, networkNames: ['manta'] },
  { viemChain: lumiaMainnet, networkNames: ['lumia'], rpcUrlOverride: 'https://mainnet-rpc.lumia.org' }, // Example override
  { viemChain: blast, networkNames: ['blast'] },
  { viemChain: fraxtal, networkNames: ['fraxtal'] },
  { viemChain: mode, networkNames: ['mode'] },
  { viemChain: metis, networkNames: ['metis'] },
  { viemChain: kroma, networkNames: ['kroma'] },
  { viemChain: zora, networkNames: ['zora'] },
  { viemChain: aurora, networkNames: ['aurora'] },
  { viemChain: canto, networkNames: ['canto'] },
  { viemChain: flowMainnet, networkNames: ['flow'] },

  // Testnets
  { viemChain: sepolia, networkNames: ['sepolia'] },
  { viemChain: optimismSepolia, networkNames: ['optimism-sepolia', 'optimismsepolia'] },
  { viemChain: arbitrumSepolia, networkNames: ['arbitrum-sepolia', 'arbitrumsepolia'] },
  { viemChain: baseSepolia, networkNames: ['base-sepolia', 'basesepolia'] },
  { viemChain: polygonAmoy, networkNames: ['polygon-amoy', 'polygonamoy'] },
  { viemChain: avalancheFuji, networkNames: ['avalanche-fuji', 'avalanchefuji', 'fuji'] },
  { viemChain: bscTestnet, networkNames: ['bsc-testnet', 'bsctestnet'] },
  { viemChain: zksyncSepoliaTestnet, networkNames: ['zksync-sepolia', 'zksyncsepolia'] },
  { viemChain: lineaSepolia, networkNames: ['linea-sepolia', 'lineasepolia'] },
  { viemChain: lumiaTestnet, networkNames: ['lumia-testnet'], rpcUrlOverride: 'https://testnet-rpc.lumia.org' }, // Example override
  { viemChain: scrollSepolia, networkNames: ['scroll-sepolia', 'scrollsepolia'] },
  { viemChain: mantleSepoliaTestnet, networkNames: ['mantle-sepolia', 'mantlesepolia'] },
  { viemChain: mantaSepoliaTestnet, networkNames: ['manta-sepolia', 'mantasepolia'] },
  { viemChain: blastSepolia, networkNames: ['blast-sepolia', 'blastsepolia'] },
  { viemChain: fraxtalTestnet, networkNames: ['fraxtal-testnet', 'fraxtaltestnet'] },
  { viemChain: modeTestnet, networkNames: ['mode-testnet', 'modetestnet'] },
  { viemChain: metisSepolia, networkNames: ['metis-sepolia', 'metissepolia'] },
  { viemChain: kromaSepolia, networkNames: ['kroma-sepolia', 'kromasepolia'] },
  { viemChain: zoraSepolia, networkNames: ['zora-sepolia', 'zorasepolia'] },
  { viemChain: celoAlfajores, networkNames: ['celo-alfajores', 'celoalfajores', 'alfajores'] },
  { viemChain: goerli, networkNames: ['goerli'] },
  { viemChain: holesky, networkNames: ['holesky'] },
  { viemChain: flowTestnet, networkNames: ['flow-testnet'] },
];

// --- Derived Maps (Generated from supportedChains) ---

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
    // Prioritize override, then viem default. Fallback handled in getRpcUrl.
    if (rpcUrlOverride) {
      map[viemChain.id] = rpcUrlOverride;
    } else if (defaultRpc) {
      map[viemChain.id] = defaultRpc;
    }
    // If neither override nor viem default exists, it won't be added here.
    // getRpcUrl will handle the final fallback to DEFAULT_RPC_URL.
    return map;
  }, {} as Record<number, string>)
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
export function resolveChainId(chainIdentifier: number | string): number {
  if (typeof chainIdentifier === 'number') {
    // Check if the numeric ID is actually supported
    if (chainMap[chainIdentifier]) {
      return chainIdentifier;
    } else {
      throw new Error(`Unsupported chain ID: ${chainIdentifier}`);
    }
  }

  if (typeof chainIdentifier === 'string') {
    const networkName = chainIdentifier.toLowerCase();
    const chainId = networkNameMap[networkName];
    if (chainId !== undefined) {
      return chainId;
    }

    // Allow string representation of valid chain IDs (e.g., "1")
    const parsedId = parseInt(networkName, 10);
    if (!isNaN(parsedId) && chainMap[parsedId]) {
      return parsedId;
    }
  }

  throw new Error(`Invalid or unsupported chain identifier: ${chainIdentifier}`);
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
export function getRpcUrl(chainIdentifier: number | string): string {
  const chainId = resolveChainId(chainIdentifier); // Will throw if invalid/unsupported

  // 1. Check our explicit rpcUrlMap (includes overrides and viem defaults if available)
  if (rpcUrlMap[chainId]) {
    return rpcUrlMap[chainId];
  }

  // 2. As a fallback, try the viem chain's default RPC again (might cover cases where rpcUrlMap generation missed it)
  const chain = chainMap[chainId];
  const viemDefaultRpc = chain?.rpcUrls.default?.http[0];
  if (viemDefaultRpc) {
    console.warn(`Using viem default RPC for chain ${chainId} as no specific URL was found in rpcUrlMap.`);
    return viemDefaultRpc;
  }

  // 3. Final fallback to the global default (should ideally not be reached for supported chains)
  console.warn(`Using global default RPC URL for chain ${chainId} as no specific or viem default URL was found.`);
  return DEFAULT_RPC_URL;
}

/**
 * Gets a sorted list of primary supported network names.
 * Excludes shorter aliases for brevity.
 *
 * @returns An array of primary network name strings.
 */
export function getSupportedNetworks(): string[] {
  // Return the first name (primary) from each definition's networkNames array
  return supportedChains
    .map(def => def.networkNames[0]) // Get primary name
    .sort(); // Sort alphabetically
}
