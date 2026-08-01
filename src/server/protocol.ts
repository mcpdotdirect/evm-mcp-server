export const SERVER_INFO = {
  name: "evm-mcp-server",
  version: "2.0.4"
} as const;

export const MODERN_PROTOCOL_VERSION = "2026-07-28";
export const LEGACY_PROTOCOL_VERSION = "2025-11-25";
export const CACHE_TTL_MS = 60 * 60 * 1000;
export const CACHE_SCOPE = "public";

export const SERVER_INSTRUCTIONS =
  "Use the EVM tools to inspect supported chains, resolve ENS names, read balances and contract data, and prepare or submit transactions with the configured wallet. The six wallet-backed write and signing tools enforce exact-operation confirmation through MCP input_required results; invoke them directly and let the client complete that confirmation instead of asking separately. wait_for_transaction accepts a bounded timeoutSeconds value from 1 through 90 and defaults to 90.";
