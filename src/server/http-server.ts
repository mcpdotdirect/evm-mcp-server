import { getSupportedChainCount, getSupportedNetworks } from "../core/chains.js";
import { loadOAuthResourceServerConfiguration } from "./auth.js";
import { createHttpApp } from "./http-app.js";
import { MODERN_PROTOCOL_VERSION, SERVER_INFO } from "./protocol.js";

const PORT = parseInt(process.env.MCP_PORT || "3001", 10);
const HOST = process.env.MCP_HOST || "127.0.0.1";
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

function configuredHostnames(variableName: string, fallback: string[]): string[] {
  const configured = process.env[variableName]
    ?.split(",")
    .map(value => value.trim())
    .filter(Boolean);

  if (!configured?.length) {
    return fallback;
  }

  return configured.map(value => {
    try {
      return new URL(value).hostname;
    } catch {
      return value;
    }
  });
}

function isLocalHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

const defaultHostnames = isLocalHost(HOST) ? LOCAL_HOSTNAMES : [HOST];
const allowedHostnames = configuredHostnames("MCP_ALLOWED_HOSTS", defaultHostnames);
const allowedOriginHostnames = configuredHostnames("MCP_ALLOWED_ORIGINS", defaultHostnames);

console.error(`Configured to listen on ${HOST}:${PORT}`);

const oauthConfiguration = await loadOAuthResourceServerConfiguration({
  isLocalHost: isLocalHost(HOST)
}).catch((error: unknown) => {
  console.error(
    `HTTP authorization configuration error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});

const { app, mcpHandler } = createHttpApp({
  allowedHostnames,
  allowedOriginHostnames,
  oauthConfiguration
});

const httpServer = app.listen(PORT, HOST, () => {
  console.error(`EVM MCP Server v${SERVER_INFO.version} running at http://${HOST}:${PORT}`);
  console.error(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
  console.error(`Health check: http://${HOST}:${PORT}/health`);
  console.error(`Protocol: MCP ${MODERN_PROTOCOL_VERSION} (stateless Streamable HTTP)`);
  console.error(`Authorization: ${oauthConfiguration ? "OAuth bearer tokens required" : "disabled for localhost-only binding"}`);
  console.error(
    `Supported chains: ${getSupportedChainCount()} (${getSupportedNetworks().length} configured names and aliases)`
  );
}).on("error", (error: Error) => {
  console.error("HTTP server error:", error);
  process.exit(1);
});

httpServer.timeout = 120000;
httpServer.keepAliveTimeout = 65000;

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.error(`${signal} received, shutting down...`);
  await mcpHandler.close();
  httpServer.close((error) => {
    if (error) {
      console.error("Error closing HTTP server:", error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
