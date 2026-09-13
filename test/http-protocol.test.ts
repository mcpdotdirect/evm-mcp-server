import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpApp } from "../src/server/http-app.js";
import { MODERN_PROTOCOL_VERSION, SERVER_INFO } from "../src/server/protocol.js";

const { app, mcpHandler } = createHttpApp({
  allowedHostnames: ["127.0.0.1"],
  allowedOriginHostnames: ["127.0.0.1"]
});
let httpServer: Server;
let endpoint: string;

beforeAll(async () => {
  httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    httpServer.once("listening", resolve);
    httpServer.once("error", reject);
  });
  endpoint = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/mcp`;
});

afterAll(async () => {
  await mcpHandler.close();
  if (httpServer?.listening) {
    await new Promise<void>((resolve, reject) => {
      httpServer.close(error => error ? reject(error) : resolve());
    });
  }
});

function post(options: {
  method?: string;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  omitHeader?: string;
  rawBody?: string;
} = {}): Promise<Response> {
  const method = options.method ?? "server/discover";
  const headers = new Headers({
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
    "Mcp-Method": method,
    ...options.headers
  });
  if (options.omitHeader) headers.delete(options.omitHeader);
  return fetch(endpoint, {
    method: "POST",
    headers,
    body: options.rawBody ?? JSON.stringify({
      jsonrpc: "2.0",
      id: "http-test",
      method,
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
          "io.modelcontextprotocol/clientCapabilities": {}
        },
        ...options.params
      }
    })
  });
}

describe("Streamable HTTP protocol boundary", () => {
  test("serves an SDK client without protocol sessions", async () => {
    const client = new Client({ name: "http-test", version: "1.0.0" }, {
      versionNegotiation: { mode: { pin: MODERN_PROTOCOL_VERSION } }
    });
    const transport = new StreamableHTTPClientTransport(new URL(endpoint));
    try {
      await client.connect(transport);
      expect(client.getServerVersion()).toEqual(SERVER_INFO);
      expect(transport.sessionId).toBeUndefined();
      expect((await client.listTools()).tools).toHaveLength(25);
      expect((await client.listResources()).resources).toHaveLength(1);
      expect((await client.listResourceTemplates()).resourceTemplates).toEqual([]);
      expect((await client.listPrompts()).prompts).toHaveLength(10);
    } finally {
      await client.close();
    }
  });

  test("rejects malformed JSON with a protocol parse error", async () => {
    const response = await post({ rawBody: "{" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      jsonrpc: "2.0",
      error: expect.objectContaining({ code: -32700 })
    }));
  });

  test("rejects non-JSON media types and accepts JSON parameters", async () => {
    for (const type of ["text/plain", "text/plain; a=application/json"]) {
      const response = await post({ headers: { "Content-Type": type } });
      expect(response.status).toBe(415);
      await response.text();
    }
    const response = await post({ headers: { "Content-Type": "application/json; charset=utf-8" } });
    expect(response.status).toBe(200);
    await response.text();
  });

  test("requires both accepted response media types", async () => {
    for (const accept of ["application/json", "application/json, text/event-stream;q=0"]) {
      const response = await post({ headers: { Accept: accept } });
      expect(response.status).toBe(406);
      await response.text();
    }
  });

  test("rejects oversized JSON without exposing a parser stack trace", async () => {
    const response = await post({ rawBody: JSON.stringify({ padding: "x".repeat(1024 * 1024) }) });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Request body exceeds 1 MB" }
    });
  });

  test("distinguishes valid JSON with an invalid RPC shape from malformed JSON", async () => {
    const response = await post({ rawBody: "42" });
    expect(response.status).toBe(400);
    expect((await response.json() as { error: { code: number } }).error.code).toBe(-32600);
  });

  test("validates required headers and names with the final error code", async () => {
    for (const omitHeader of ["MCP-Protocol-Version", "Mcp-Method", "Mcp-Name"]) {
      const response = await post({
        method: "resources/read",
        params: { uri: "evm://networks" },
        headers: { "Mcp-Name": "evm://networks" },
        omitHeader
      });
      expect(response.status).toBe(400);
      expect((await response.json() as { error: { code: number } }).error.code).toBe(-32020);
    }
  });

  test("decodes Base64 sentinel names before comparing them with the body", async () => {
    const response = await post({
      method: "resources/read",
      params: { uri: "evm://networks" },
      headers: { "Mcp-Name": `=?base64?${Buffer.from("evm://networks").toString("base64")}?=` }
    });
    expect(response.status).toBe(200);
    expect((await response.json() as { result: { contents: unknown[] } }).result.contents).toHaveLength(1);
    const invalid = await post({
      method: "resources/read",
      params: { uri: "evm://networks" },
      headers: { "Mcp-Name": "=?base64?%%%?=" }
    });
    expect(invalid.status).toBe(400);
    expect((await invalid.json() as { error: { code: number } }).error.code).toBe(-32020);
  });

  test("rejects malformed client identity while accepting its omission", async () => {
    const response = await post({ params: { _meta: {
      "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": { name: 123 }
    } } });
    expect(response.status).toBe(400);
    expect((await response.json() as { error: { code: number } }).error.code).toBe(-32602);
  });

  test("rejects invalid hosts and origins before dispatch", async () => {
    const invalidHeaders: Record<string, string>[] = [
      { Host: "attacker.invalid" }, { Origin: "https://attacker.invalid" }
    ];
    for (const headers of invalidHeaders) {
      const response = await post({ headers });
      expect(response.status).toBe(403);
      await response.text();
    }
  });

  test("rejects removed HTTP methods and unknown RPCs", async () => {
    for (const method of ["GET", "DELETE"]) {
      const response = await fetch(endpoint, { method });
      expect(response.status).toBe(405);
      await response.text();
    }
    const response = await post({ method: "unknown/method" });
    expect(response.status).toBe(404);
    expect((await response.json() as { error: { code: number } }).error.code).toBe(-32601);
  });
});
