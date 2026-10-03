import { runStdioServer } from "./server/stdio-server.js";

// Start the server
function main() {
  try {
    runStdioServer();
  } catch (error) {
    console.error("Error starting MCP server:", error);
    process.exit(1);
  }
}

main();
