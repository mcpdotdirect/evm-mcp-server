import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEVMResources } from "../core/resources.js";
import { registerEVMTools } from "../core/tools.js";
import { registerEVMPrompts } from "../core/prompts.js";
import { getSupportedNetworks } from "../core/chains.js";

// Create and start the MCP server
async function startServer() {
  try {
    // Create a new MCP server instance with capabilities
    const server = new McpServer(
      {
        name: "evm-mcp-server",
        version: "2.0.0"
      },
      {
        capabilities: {
          tools: {
            listChanged: true
          },
          resources: {
            subscribe: false,
            listChanged: true
          },
          prompts: {
            listChanged: true
          },
          logging: {}
        }
      }
    );

    // Register all resources, tools, and prompts
    registerEVMResources(server);
    registerEVMTools(server);
    registerEVMPrompts(server);

    // Log server information
    console.error(`EVM MCP Server v2.0.0 initialized`);
    console.error(`Protocol: MCP 2025-06-18`);
    console.error(`Supported networks: ${getSupportedNetworks().length} networks`);
    console.error("Server is ready to handle requests");

    return server;
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Export the server creation function
export default startServer;
