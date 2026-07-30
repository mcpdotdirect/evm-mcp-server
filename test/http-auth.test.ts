import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import {
  BASE_MCP_SCOPE,
  SIGN_MCP_SCOPE,
  WRITE_MCP_SCOPE,
  type OAuthResourceServerConfiguration
} from "../src/server/auth.js";
import { createHttpApp } from "../src/server/http-app.js";
import { MODERN_PROTOCOL_VERSION } from "../src/server/protocol.js";

const ISSUER = "https://auth.example.test/";
const RESOURCE_SERVER = new URL("https://mcp.example.test/mcp");
const RESOURCE_METADATA_URL =
  "https://mcp.example.test/.well-known/oauth-protected-resource/mcp";
const LOCAL_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource/mcp";
const CLIENT_META = {
  "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": {}
};

const oauthConfiguration: OAuthResourceServerConfiguration = {
  oauthMetadata: {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}authorize`,
    token_endpoint: `${ISSUER}token`,
    response_types_supported: ["code"]
  },
  resourceServerUrl: RESOURCE_SERVER,
  scopesSupported: [BASE_MCP_SCOPE],
  requiredScopes: [BASE_MCP_SCOPE],
  verifier: {
    async verifyAccessToken(token) {
      if (![
        "mcp-token",
        "signing-token-a",
        "signing-token-b"
      ].includes(token)) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "The access token is invalid"
        );
      }

      return {
        token,
        clientId: "test-client",
        scopes: token.startsWith("signing-token")
          ? [BASE_MCP_SCOPE, SIGN_MCP_SCOPE]
          : [BASE_MCP_SCOPE],
        expiresAt: Math.floor(Date.now() / 1000) + 300,
        resource: RESOURCE_SERVER,
        extra: {
          issuer: ISSUER
        }
      };
    }
  }
};

const { app, mcpHandler } = createHttpApp({
  allowedHostnames: ["127.0.0.1"],
  allowedOriginHostnames: ["127.0.0.1"],
  oauthConfiguration
});

let httpServer: Server;
let baseUrl: string;

function mcpHeaders(options: {
  authorization?: string;
  method?: string;
  name?: string;
} = {}): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
    "Mcp-Method": options.method ?? "tools/list"
  });

  if (options.authorization) {
    headers.set("Authorization", options.authorization);
  }
  if (options.name) {
    headers.set("Mcp-Name", options.name);
  }

  return headers;
}

function mcpRequest(
  id: string,
  method: string,
  params: Record<string, unknown> = {},
  clientMeta: Record<string, unknown> = CLIENT_META
) {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: clientMeta
    }
  };
}

async function postMcp(
  body: unknown,
  options: {
    authorization?: string;
    method?: string;
    name?: string;
  } = {}
): Promise<Response> {
  return fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: mcpHeaders(options),
    body: JSON.stringify(body)
  });
}

beforeAll(async () => {
  httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    httpServer.once("listening", resolve);
    httpServer.once("error", reject);
  });

  const address = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await mcpHandler.close();
  await new Promise<void>((resolve, reject) => {
    httpServer.close(error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

describe("HTTP OAuth middleware integration", () => {
  test("serves public protected-resource metadata for the exact MCP resource", async () => {
    const response = await fetch(`${baseUrl}${LOCAL_RESOURCE_METADATA_PATH}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toEqual(expect.objectContaining({
      resource: RESOURCE_SERVER.href,
      authorization_servers: [ISSUER],
      scopes_supported: [BASE_MCP_SCOPE]
    }));
  });

  test("challenges a missing bearer token with resource metadata", async () => {
    const response = await postMcp(
      mcpRequest("missing-bearer", "tools/list")
    );
    const challenge = response.headers.get("WWW-Authenticate");
    const body = await response.json() as {
      error?: string;
    };

    expect(response.status).toBe(401);
    expect(body.error).toBe("invalid_token");
    expect(challenge).toContain("Bearer");
    expect(challenge).toContain(`scope="${BASE_MCP_SCOPE}"`);
    expect(challenge).toContain(`resource_metadata="${RESOURCE_METADATA_URL}"`);
  });

  test("permits read-only discovery with the baseline MCP scope", async () => {
    const response = await postMcp(
      mcpRequest("tools-list", "tools/list"),
      {
        authorization: "Bearer mcp-token"
      }
    );
    const body = await response.json() as {
      error?: unknown;
      result?: {
        tools?: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.tools).toBeArray();
  });

  test("challenges wallet writes and signatures for their step-up scope", async () => {
    const calls = [
      {
        name: "transfer_native",
        arguments: {
          to: "0x0000000000000000000000000000000000000001",
          amount: "0.01"
        },
        scope: WRITE_MCP_SCOPE
      },
      {
        name: "sign_message",
        arguments: {
          message: "HTTP OAuth scope test"
        },
        scope: SIGN_MCP_SCOPE
      }
    ];

    for (const [index, call] of calls.entries()) {
      const response = await postMcp(
        mcpRequest(
          `step-up-${index}`,
          "tools/call",
          {
            name: call.name,
            arguments: call.arguments
          }
        ),
        {
          authorization: "Bearer mcp-token",
          method: "tools/call",
          name: call.name
        }
      );
      const challenge = response.headers.get("WWW-Authenticate");
      const body = await response.json() as {
        error?: string;
      };

      expect(response.status).toBe(403);
      expect(body.error).toBe("insufficient_scope");
      expect(challenge).toContain(`scope="${call.scope}"`);
      expect(challenge).toContain(
        `resource_metadata="${RESOURCE_METADATA_URL}"`
      );
    }
  });

  test("challenges a batched write and signature for both step-up scopes", async () => {
    const response = await postMcp(
      [
        mcpRequest(
          "batch-write",
          "tools/call",
          {
            name: "transfer_native",
            arguments: {
              to: "0x0000000000000000000000000000000000000001",
              amount: "0.01"
            }
          }
        ),
        mcpRequest(
          "batch-sign",
          "tools/call",
          {
            name: "sign_message",
            arguments: {
              message: "HTTP OAuth batch scope test"
            }
          }
        )
      ],
      {
        authorization: "Bearer mcp-token",
        method: "tools/call"
      }
    );
    const challenge = response.headers.get("WWW-Authenticate");
    const body = await response.json() as {
      error?: string;
    };

    expect(response.status).toBe(403);
    expect(body.error).toBe("insufficient_scope");
    expect(challenge).toContain(
      `scope="${WRITE_MCP_SCOPE} ${SIGN_MCP_SCOPE}"`
    );
    expect(challenge).toContain(
      `resource_metadata="${RESOURCE_METADATA_URL}"`
    );
  });

  test("binds confirmation continuation state to the presenting bearer token", async () => {
    const argumentsValue = {
      message: "HTTP request-state binding test"
    };
    const elicitationClientMeta = {
      ...CLIENT_META,
      "io.modelcontextprotocol/clientCapabilities": {
        elicitation: {
          form: {}
        }
      }
    };
    const firstResponse = await postMcp(
      mcpRequest(
        "token-bound-first",
        "tools/call",
        {
          name: "sign_message",
          arguments: argumentsValue
        },
        elicitationClientMeta
      ),
      {
        authorization: "Bearer signing-token-a",
        method: "tools/call",
        name: "sign_message"
      }
    );
    const firstBody = await firstResponse.json() as {
      result?: {
        requestState?: string;
        resultType?: string;
      };
    };

    expect(firstBody.result?.resultType).toBe("input_required");
    expect(firstBody.result?.requestState).toEqual(expect.any(String));

    const retryResponse = await postMcp(
      mcpRequest(
        "token-bound-retry",
        "tools/call",
        {
          name: "sign_message",
          arguments: argumentsValue,
          inputResponses: {
            confirmation: {
              action: "accept",
              content: {
                confirm: true
              }
            }
          },
          requestState: firstBody.result?.requestState
        },
        elicitationClientMeta
      ),
      {
        authorization: "Bearer signing-token-b",
        method: "tools/call",
        name: "sign_message"
      }
    );
    const retryBody = await retryResponse.json() as {
      error?: {
        code?: number;
        data?: {
          reason?: string;
        };
      };
    };

    expect(retryResponse.status).toBe(200);
    expect(retryBody.error).toEqual(expect.objectContaining({
      code: -32602,
      data: {
        reason: "invalid_request_state"
      }
    }));
  });
});
