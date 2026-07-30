import { McpServer } from "@modelcontextprotocol/server";
import { registerEVMResources } from "../core/resources.js";
import { registerEVMTools } from "../core/tools.js";
import { registerEVMPrompts } from "../core/prompts.js";
import { CACHE_SCOPE, CACHE_TTL_MS, SERVER_INFO, SERVER_INSTRUCTIONS } from "./protocol.js";
import { confirmationRequestStateCodec } from "./request-state.js";

// Create the MCP server used by the stdio and per-request HTTP serving entries.
function createServer() {
  const cacheHint = {
    ttlMs: CACHE_TTL_MS,
    cacheScope: CACHE_SCOPE
  } as const;

  const server = new McpServer(
    SERVER_INFO,
    {
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false, subscribe: false },
        prompts: { listChanged: false }
      },
      instructions: SERVER_INSTRUCTIONS,
      cacheHints: {
        "server/discover": cacheHint,
        "tools/list": cacheHint,
        "prompts/list": cacheHint,
        "resources/list": cacheHint,
        "resources/templates/list": cacheHint
      },
      requestState: {
        verify: confirmationRequestStateCodec.verify
      }
    }
  );

  // Register all resources, tools, and prompts.
  registerEVMResources(server);
  registerEVMTools(server);
  registerEVMPrompts(server);

  return server;
}

// Export the server creation function
export default createServer;
