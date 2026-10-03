import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { resolve } from "node:path";
import { SERVER_INFO } from "../src/server/protocol.js";

describe("Packaged CLI stdio interoperability", () => {
  for (const deployment of [
    { MCP_HOST: "0.0.0.0", MCP_ALLOWED_HOSTS: "mcp.example.test" },
    { MCP_HOST: "127.0.0.1", MCP_ALLOWED_HOSTS: "localhost,mcp.example.test" },
    { MCP_HOST: "127.0.0.1", MCP_ALLOWED_HOSTS: "https://mcp.example.test:443" }
  ]) {
    test(`reports HTTP startup failures for ${deployment.MCP_HOST} with ${deployment.MCP_ALLOWED_HOSTS}`, async () => {
      const child = Bun.spawn(["node", resolve(import.meta.dir, "../bin/cli.js"), "--http"], {
        env: { ...process.env, ...deployment, MCP_OAUTH_ISSUER_URL: "" },
        stdout: "pipe",
        stderr: "pipe"
      });
      try {
        const [exitCode, stdout, stderr] = await Promise.all([
          child.exited,
          new Response(child.stdout).text(),
          new Response(child.stderr).text()
        ]);
        expect(exitCode).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain("MCP_OAUTH_ISSUER_URL is required");
      } finally {
        child.kill();
        await child.exited;
      }
    });
  }

  for (const era of ["modern", "legacy"] as const) {
    test(`negotiates ${era} and serves tools, resources and prompts`, async () => {
      const client = new Client({ name: "stdio-integration", version: "1.0.0" }, {
        versionNegotiation: {
          mode: era === "modern" ? { pin: "2026-07-28" } : "legacy"
        }
      });
      const transport = new StdioClientTransport({
        command: "node",
        args: [resolve(import.meta.dir, "../bin/cli.js")],
        stderr: "pipe"
      });
      const errors: Error[] = [];
      client.onerror = error => errors.push(error);

      try {
        await client.connect(transport);
        expect(client.getProtocolEra()).toBe(era);
        expect(client.getServerVersion()).toEqual(SERVER_INFO);
        expect((await client.listTools()).tools).toHaveLength(25);
        const result = await client.callTool({ name: "get_supported_networks", arguments: {} });
        expect(result.isError).toBeUndefined();
        expect(result.structuredContent).toEqual(expect.objectContaining({
          supportedNetworks: expect.any(Array)
        }));
        expect((await client.readResource({ uri: "evm://networks" })).contents[0].mimeType)
          .toBe("application/json");
        expect((await client.listPrompts()).prompts).toHaveLength(10);
        expect((await client.getPrompt({ name: "check_network_status", arguments: {} })).messages.length)
          .toBeGreaterThan(0);
        expect(errors).toEqual([]);
      } finally {
        await client.close();
      }
    }, 15000);
  }
});
