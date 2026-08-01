import { McpServer } from "@modelcontextprotocol/server";
import { getSupportedNetworks } from "./chains.js";

/**
 * Register EVM-related resources with the MCP server
 *
 * Resources are application-driven, read-only data that clients can explicitly load.
 * For an AI agent use case, most data should be exposed through tools instead,
 * which allow the model to discover and autonomously fetch information.
 *
 * The supported_networks resource provides a static reference list that clients
 * may want to browse when configuring which networks to use.
 *
 * @param server The MCP server instance
 */
export function registerEVMResources(server: McpServer) {
  server.registerResource(
    "supported_networks",
    "evm://networks",
    {
      description: "Get the configured names and aliases for all supported EVM networks",
      mimeType: "application/json",
      cacheHint: {
        ttlMs: 60 * 60 * 1000,
        cacheScope: "public"
      }
    },
    async (uri) => {
      try {
        const networks = getSupportedNetworks();
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ supportedNetworks: networks }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
