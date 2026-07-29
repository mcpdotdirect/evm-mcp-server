import { afterAll, describe, expect, test } from "bun:test";
import { createMcpHandler, SERVER_INFO_META_KEY } from "@modelcontextprotocol/server";
import createServer from "../src/server/server.js";
import { CACHE_SCOPE, CACHE_TTL_MS, MODERN_PROTOCOL_VERSION, SERVER_INFO } from "../src/server/protocol.js";

const handler = createMcpHandler(createServer, {
  legacy: "reject"
});

const CLIENT_META = {
  "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": {}
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

async function modernRequest(
  id: string,
  method: string,
  params: Record<string, unknown> = {},
  options: {
    name?: string;
    protocolVersion?: string;
    meta?: Record<string, unknown>;
  } = {}
): Promise<{ status: number; body: JsonRpcResponse }> {
  const protocolVersion = options.protocolVersion ?? MODERN_PROTOCOL_VERSION;
  const headers = new Headers({
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "MCP-Protocol-Version": protocolVersion,
    "Mcp-Method": method
  });

  if (options.name) {
    headers.set("Mcp-Name", options.name);
  }

  const response = await handler.fetch(new Request("http://test.local/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: {
        ...params,
        _meta: options.meta ?? CLIENT_META
      }
    })
  }));

  return {
    status: response.status,
    body: await response.json() as JsonRpcResponse
  };
}

afterAll(async () => {
  await handler.close();
});

describe("MCP 2026-07-28 SDK integration", () => {
  test("discovers protocol metadata and stamps server identity on the result", async () => {
    const { status, body } = await modernRequest("discover", "server/discover");

    expect(status).toBe(200);
    expect(body.result).toEqual(expect.objectContaining({
      resultType: "complete",
      supportedVersions: [MODERN_PROTOCOL_VERSION],
      ttlMs: CACHE_TTL_MS,
      cacheScope: CACHE_SCOPE,
      _meta: {
        [SERVER_INFO_META_KEY]: SERVER_INFO
      }
    }));
    expect(body.result).not.toHaveProperty("serverInfo");
  });

  test("accepts requests without optional clientInfo metadata", async () => {
    const { status, body } = await modernRequest("tools", "tools/list");

    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
  });

  test("lists tools with deterministic order and closed no-argument schemas", async () => {
    const { body } = await modernRequest("tools", "tools/list");
    const { body: repeatedBody } = await modernRequest("tools-repeat", "tools/list");
    const tools = body.result?.tools as Array<Record<string, unknown>>;
    const names = tools.map(tool => tool.name as string);
    const repeatedNames = (repeatedBody.result?.tools as Array<Record<string, unknown>>)
      .map(tool => tool.name as string);
    const walletTool = tools.find(tool => tool.name === "get_wallet_address");

    expect(names).toEqual(repeatedNames);
    expect(walletTool?.inputSchema).toEqual(expect.objectContaining({
      type: "object",
      properties: {},
      additionalProperties: false
    }));
    expect(body.result).toEqual(expect.objectContaining({
      ttlMs: CACHE_TTL_MS,
      cacheScope: CACHE_SCOPE
    }));
  });

  test("reads static resources with cache hints", async () => {
    const { body } = await modernRequest(
      "read",
      "resources/read",
      { uri: "evm://networks" },
      { name: "evm://networks" }
    );
    const contents = body.result?.contents as Array<Record<string, unknown>>;

    expect(body.result).toEqual(expect.objectContaining({
      resultType: "complete",
      ttlMs: CACHE_TTL_MS,
      cacheScope: CACHE_SCOPE
    }));
    expect(contents[0]).toEqual(expect.objectContaining({
      uri: "evm://networks",
      mimeType: "application/json"
    }));
  });

  test("calls read-only tools without wallet or RPC credentials", async () => {
    const { body } = await modernRequest(
      "call",
      "tools/call",
      {
        name: "get_supported_networks",
        arguments: {}
      },
      { name: "get_supported_networks" }
    );

    expect(body.result).toEqual(expect.objectContaining({
      resultType: "complete",
      content: [expect.objectContaining({ type: "text" })]
    }));
  });

  test("uses the final HeaderMismatch error code", async () => {
    const { status, body } = await modernRequest("mismatch", "tools/list", {}, {
      protocolVersion: "1900-01-01"
    });

    expect(status).toBe(400);
    expect(body.error?.code).toBe(-32020);
  });

  test("uses the final UnsupportedProtocolVersion error code", async () => {
    const unsupportedVersion = "1900-01-01";
    const { status, body } = await modernRequest("unsupported", "server/discover", {}, {
      protocolVersion: unsupportedVersion,
      meta: {
        ...CLIENT_META,
        "io.modelcontextprotocol/protocolVersion": unsupportedVersion
      }
    });

    expect(status).toBe(400);
    expect(body.error?.code).toBe(-32022);
  });
});
