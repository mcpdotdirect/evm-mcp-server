// Alchemy RPC URL mapping by chain
// Reference: https://www.alchemy.com/docs/reference/node-supported-chains

import {
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
  scroll,
  mantle,
  blast,
  metis,
  moonbeam,
  flowMainnet,
  sepolia,
  holesky,
  optimismSepolia,
  arbitrumSepolia,
  baseSepolia,
  polygonAmoy,
  avalancheFuji,
  bscTestnet,
  zksyncSepoliaTestnet,
  lineaSepolia,
  celoAlfajores,
  scrollSepolia,
  mantleSepoliaTestnet,
  blastSepolia,
  metisSepolia,
  flowTestnet,
  type Chain,
} from 'viem/chains';

export const alchemyNetworkMap = new Map<Chain, string>([
  // Mainnets
  [mainnet, 'eth-mainnet'],
  [optimism, 'opt-mainnet'],
  [arbitrum, 'arb-mainnet'],
  [arbitrumNova, 'arbnova-mainnet'],
  [base, 'base-mainnet'],
  [polygon, 'polygon-mainnet'],
  [polygonZkEvm, 'polygonzkevm-mainnet'],
  [avalanche, 'avax-mainnet'],
  [bsc, 'bnb-mainnet'],
  [zksync, 'zksync-mainnet'],
  [linea, 'linea-mainnet'],
  [celo, 'celo-mainnet'],
  [scroll, 'scroll-mainnet'],
  [mantle, 'mantle-mainnet'],
  [blast, 'blast-mainnet'],
  [metis, 'metis-mainnet'],
  [moonbeam, 'moonbeam-mainnet'],
  [flowMainnet, 'flow-mainnet'],

  // Testnets
  [sepolia, 'eth-sepolia'],
  [holesky, 'eth-holesky'],
  [optimismSepolia, 'opt-sepolia'],
  [arbitrumSepolia, 'arb-sepolia'],
  [baseSepolia, 'base-sepolia'],
  [polygonAmoy, 'polygon-amoy'],
  [avalancheFuji, 'avax-fuji'],
  [bscTestnet, 'bnb-testnet'],
  [zksyncSepoliaTestnet, 'zksync-sepolia'],
  [lineaSepolia, 'linea-sepolia'],
  [celoAlfajores, 'celo-alfajores'],
  [scrollSepolia, 'scroll-sepolia'],
  [mantleSepoliaTestnet, 'mantle-sepolia'],
  [blastSepolia, 'blast-sepolia'],
  [metisSepolia, 'metis-sepolia'],
  [flowTestnet, 'flow-testnet'],
]);

const alchemyNetworkByChainId: Record<number, string> = Object.fromEntries(
  [...alchemyNetworkMap.entries()].map(([chain, network]) => [chain.id, network])
);

export function getAlchemyRpcUrl(chainId: number, apiKey: string): string | null {
  const network = alchemyNetworkByChainId[chainId];
  if (!network) {
    return null;
  }
  return `https://${network}.g.alchemy.com/v2/${apiKey}`;
}

export function isAlchemySupported(chainId: number): boolean {
  return chainId in alchemyNetworkByChainId;
}
