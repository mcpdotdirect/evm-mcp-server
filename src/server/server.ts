import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEVMResources } from "../core/resources.js";
import { registerEVMTools } from "../core/tools.js";
import { registerEVMPrompts } from "../core/prompts.js";
import { getSupportedNetworks } from "../core/chains.js";

// Extend McpServer with required methods
interface ExtendedMcpServer extends McpServer {
  name: string;
  version: string;
  resource: (name: string, template: string | (new (uri: string, options: { list?: boolean }) => any), handler: (uri: URL, params: any) => Promise<{ contents: any[] }>) => void;
  tool: (name: string, description: string, params: Record<string, any>, handler: (params: any) => Promise<any>) => void;
  connect: (transport: any) => Promise<void>;
}

// Create and start the MCP server
async function startServer() {
  try {
    // Create a new MCP server instance
    const server = new McpServer() as ExtendedMcpServer;
    server.name = "EVM-Server";
    server.version = "1.0.0";

    // Register all resources, tools, and prompts
    registerEVMResources(server);
    registerEVMTools(server);
    registerEVMPrompts(server);
    
    // Log server information
    console.error(`EVM MCP Server initialized`);
    console.error(`Supported networks: ${getSupportedNetworks().join(", ")}`);
    console.error("Server is ready to handle requests");
    
    return server;
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Export the server creation function
export default startServer; 