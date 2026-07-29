import express, { Request, Response } from "express";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { getSupportedNetworks } from "../core/chains.js";
import createServer from "./server.js";
import { CACHE_SCOPE, CACHE_TTL_MS, MODERN_PROTOCOL_VERSION, SERVER_INFO } from "./protocol.js";

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
const validateHost = hostHeaderValidation(allowedHostnames);
const validateOrigin = originValidation(allowedOriginHostnames);

console.error(`Configured to listen on ${HOST}:${PORT}`);

const app = express();
const mcpHandler = createMcpHandler(createServer, {
  legacy: "reject"
});
const nodeHandler = toNodeHandler(mcpHandler, {
  onerror: (error) => {
    console.error("MCP Node adapter error:", error);
  }
});

app.all("/mcp", (req: Request, res: Response) => {
  if (!validateHost(req, res) || !validateOrigin(req, res)) {
    return;
  }

  void nodeHandler(req, res);
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    protocol: `MCP ${MODERN_PROTOCOL_VERSION}`,
    transport: "Streamable HTTP",
    stateless: true
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocol: `MCP ${MODERN_PROTOCOL_VERSION}`,
    transport: "Streamable HTTP",
    endpoints: {
      mcp: "/mcp",
      health: "/health"
    },
    cache: {
      ttlMs: CACHE_TTL_MS,
      cacheScope: CACHE_SCOPE
    },
    status: "ready",
    stateless: true
  });
});

const httpServer = app.listen(PORT, HOST, () => {
  console.error(`EVM MCP Server v${SERVER_INFO.version} running at http://${HOST}:${PORT}`);
  console.error(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
  console.error(`Health check: http://${HOST}:${PORT}/health`);
  console.error(`Protocol: MCP ${MODERN_PROTOCOL_VERSION} (stateless Streamable HTTP)`);
  console.error(`Supported networks: ${getSupportedNetworks().length} networks`);
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
