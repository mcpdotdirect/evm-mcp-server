export const SERVER_INFO = {
  name: "evm-mcp-server",
  version: "2.0.4"
} as const;

export const MODERN_PROTOCOL_VERSION = "2026-07-28";
export const LEGACY_PROTOCOL_VERSION = "2025-11-25";
export const CACHE_TTL_MS = 60 * 60 * 1000;
export const CACHE_SCOPE = "public";

export const SERVER_INSTRUCTIONS =
  "Use the EVM tools to inspect supported chains, resolve ENS names, read balances and contract data, and prepare or submit transactions with the configured wallet. Always ask the user to confirm write operations before invoking transfer or approval tools.";
