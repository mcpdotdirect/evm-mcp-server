import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { getSupportedChainCount, getSupportedNetworks } from "../core/chains.js";
import createServer from "./server.js";
import { LEGACY_PROTOCOL_VERSION, MODERN_PROTOCOL_VERSION, SERVER_INFO } from "./protocol.js";

/**
 * Serve MCP over stdio with SDK-native negotiation for modern and legacy clients.
 */
export function runStdioServer(): StdioServerHandle {
  console.error(`EVM MCP Server v${SERVER_INFO.version} running on stdio`);
  console.error(`Protocol: MCP ${MODERN_PROTOCOL_VERSION} (modern), MCP ${LEGACY_PROTOCOL_VERSION} (legacy)`);
  console.error(
    `Supported chains: ${getSupportedChainCount()} (${getSupportedNetworks().length} configured names and aliases)`
  );

  return serveStdio(createServer, {
    legacy: "serve",
    onerror: (error) => {
      console.error("MCP stdio error:", error);
    }
  });
}
