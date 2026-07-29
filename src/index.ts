import { runStdioServer } from "./server/stdio-server.js";

// Start the server
async function main() {
  try {
    await runStdioServer();
  } catch (error) {
    console.error("Error starting MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
