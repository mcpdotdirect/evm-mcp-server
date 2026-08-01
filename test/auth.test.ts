import { describe, expect, test } from "bun:test";
import { OAuthErrorCode } from "@modelcontextprotocol/server";
import {
  BASE_MCP_SCOPE,
  SIGN_MCP_SCOPE,
  WRITE_MCP_SCOPE,
  getRequiredRequestScopes,
  getRequiredToolScope,
  loadOAuthResourceServerConfiguration
} from "../src/server/auth.js";

const ISSUER = "https://auth.example.test/";
const RESOURCE_SERVER = "https://mcp.example.test/mcp";
const INTROSPECTION_ENDPOINT = `${ISSUER}introspect`;

function oauthEnvironment(
  overrides: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv {
  return {
    MCP_OAUTH_ISSUER_URL: ISSUER,
    MCP_PUBLIC_URL: RESOURCE_SERVER,
    MCP_OAUTH_CLIENT_ID: "resource-server",
    MCP_OAUTH_CLIENT_SECRET: "test-secret",
    ...overrides
  };
}

function authorizationServerMetadata(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}authorize`,
    token_endpoint: `${ISSUER}token`,
    introspection_endpoint: INTROSPECTION_ENDPOINT,
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    ...overrides
  };
}

describe("HTTP OAuth resource-server configuration", () => {
  test("maps wallet-backed tools to step-up scopes", () => {
    for (const toolName of [
      "write_contract",
      "transfer_native",
      "transfer_erc20",
      "approve_token_spending"
    ]) {
      expect(getRequiredToolScope(toolName)).toBe(WRITE_MCP_SCOPE);
    }

    for (const toolName of ["sign_message", "sign_typed_data"]) {
      expect(getRequiredToolScope(toolName)).toBe(SIGN_MCP_SCOPE);
    }

    expect(getRequiredToolScope("get_supported_networks")).toBeUndefined();
    expect(getRequiredToolScope(undefined)).toBeUndefined();
  });

  test("collects step-up scopes from single and batched MCP requests", () => {
    expect(getRequiredRequestScopes({
      method: "tools/call",
      params: {
        name: "transfer_native"
      }
    })).toEqual([WRITE_MCP_SCOPE]);

    expect(getRequiredRequestScopes([
      {
        method: "tools/call",
        params: {
          name: "sign_message"
        }
      },
      {
        method: "tools/call",
        params: {
          name: "approve_token_spending"
        }
      },
      {
        method: "tools/list"
      }
    ])).toEqual([SIGN_MCP_SCOPE, WRITE_MCP_SCOPE]);
  });

  test("allows unauthenticated localhost but fails closed for a remote bind", async () => {
    await expect(loadOAuthResourceServerConfiguration({
      environment: {},
      isLocalHost: true
    })).resolves.toBeUndefined();

    await expect(loadOAuthResourceServerConfiguration({
      environment: {},
      isLocalHost: false
    })).rejects.toThrow(
      "MCP_OAUTH_ISSUER_URL is required when MCP_HOST binds to a non-local interface"
    );
  });

  test("requires HTTPS for a remotely exposed MCP resource server", async () => {
    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment({
        MCP_PUBLIC_URL: "http://mcp.example.test/mcp"
      }),
      fetchImplementation: async () => {
        throw new Error("metadata fetch should not run");
      },
      isLocalHost: false
    })).rejects.toThrow(
      "MCP_PUBLIC_URL must use HTTPS unless it is a loopback URL"
    );
  });

  test("requires HTTPS for authorization-server URLs even on localhost", async () => {
    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment({
        MCP_OAUTH_ISSUER_URL: "http://localhost:9000/"
      }),
      fetchImplementation: async () => {
        throw new Error("metadata fetch should not run");
      },
      isLocalHost: true
    })).rejects.toThrow(
      "MCP_OAUTH_ISSUER_URL must use HTTPS"
    );
  });

  test("requires MCP_PUBLIC_URL to identify the exact MCP endpoint", async () => {
    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment({
        MCP_PUBLIC_URL: "https://mcp.example.test/"
      }),
      fetchImplementation: async () => {
        throw new Error("metadata fetch should not run");
      },
      isLocalHost: false
    })).rejects.toThrow(
      "MCP_PUBLIC_URL must be the exact public MCP endpoint ending in /mcp"
    );
  });

  test("uses RFC 8414 discovery for an issuer with a path", async () => {
    const pathIssuer = "https://auth.example.test/tenant";
    const expectedMetadataUrl =
      "https://auth.example.test/.well-known/oauth-authorization-server/tenant";
    let requestedUrl: string | undefined;

    await loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment({
        MCP_OAUTH_ISSUER_URL: pathIssuer
      }),
      fetchImplementation: async input => {
        requestedUrl = String(input);
        return Response.json(authorizationServerMetadata({
          issuer: pathIssuer
        }));
      },
      isLocalHost: false
    });

    expect(requestedUrl).toBe(expectedMetadataUrl);
  });

  test("loads authorization metadata and validates introspected tokens", async () => {
    const requests: Array<{
      url: string;
      init?: RequestInit;
    }> = [];
    const expiresAt = Math.floor(Date.now() / 1000) + 300;

    const configuration = await loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment({
        MCP_OAUTH_SCOPES: `${BASE_MCP_SCOPE}, ${WRITE_MCP_SCOPE} ${SIGN_MCP_SCOPE}`,
        MCP_OAUTH_REQUIRED_SCOPES: BASE_MCP_SCOPE
      }),
      fetchImplementation: async (input, init) => {
        const url = String(input);
        requests.push({ url, init });

        if (url === `${ISSUER}.well-known/oauth-authorization-server`) {
          return Response.json(authorizationServerMetadata());
        }

        if (url === INTROSPECTION_ENDPOINT) {
          return Response.json({
            active: true,
            client_id: "mcp-client",
            scope: `${BASE_MCP_SCOPE} ${WRITE_MCP_SCOPE}`,
            exp: expiresAt,
            aud: RESOURCE_SERVER,
            iss: ISSUER
          });
        }

        return new Response("not found", { status: 404 });
      },
      isLocalHost: false
    });

    expect(configuration).toBeDefined();
    if (!configuration) {
      throw new Error("Expected OAuth configuration");
    }

    expect(configuration.resourceServerUrl.href).toBe(RESOURCE_SERVER);
    expect(configuration.scopesSupported).toEqual([
      BASE_MCP_SCOPE,
      WRITE_MCP_SCOPE,
      SIGN_MCP_SCOPE
    ]);
    expect(configuration.requiredScopes).toEqual([BASE_MCP_SCOPE]);

    const authInfo = await configuration.verifier.verifyAccessToken("access-token");

    expect(authInfo).toEqual(expect.objectContaining({
      token: "access-token",
      clientId: "mcp-client",
      scopes: [BASE_MCP_SCOPE, WRITE_MCP_SCOPE],
      expiresAt
    }));
    expect(authInfo.resource?.href).toBe(RESOURCE_SERVER);
    expect(authInfo.extra).toEqual({ issuer: ISSUER });

    const introspectionRequest = requests.find(
      request => request.url === INTROSPECTION_ENDPOINT
    );
    const metadataRequest = requests.find(
      request => request.url === `${ISSUER}.well-known/oauth-authorization-server`
    );
    expect(metadataRequest?.init?.redirect).toBe("error");
    expect(metadataRequest?.init?.signal).toBeInstanceOf(AbortSignal);

    const headers = introspectionRequest?.init?.headers as Record<string, string>;
    expect(introspectionRequest?.init?.redirect).toBe("error");
    expect(introspectionRequest?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("resource-server:test-secret").toString("base64")}`
    );
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(String(introspectionRequest?.init?.body)).toBe(
      "token=access-token&token_type_hint=access_token"
    );
  });

  test("rejects inactive, expired, and wrong-audience tokens", async () => {
    let introspectionResponse: Record<string, unknown> = {
      active: false
    };
    const expiresAt = Math.floor(Date.now() / 1000) + 300;

    const configuration = await loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment(),
      fetchImplementation: async input => {
        const url = String(input);
        if (url === `${ISSUER}.well-known/oauth-authorization-server`) {
          return Response.json(authorizationServerMetadata());
        }

        return Response.json(introspectionResponse);
      },
      isLocalHost: false
    });

    if (!configuration) {
      throw new Error("Expected OAuth configuration");
    }

    await expect(
      configuration.verifier.verifyAccessToken("inactive-token")
    ).rejects.toMatchObject({
      code: OAuthErrorCode.InvalidToken
    });

    introspectionResponse = {
      active: true,
      token_type: "DPoP",
      client_id: "mcp-client",
      scope: BASE_MCP_SCOPE,
      exp: expiresAt,
      aud: RESOURCE_SERVER,
      iss: ISSUER
    };

    await expect(
      configuration.verifier.verifyAccessToken("wrong-token-type")
    ).rejects.toMatchObject({
      code: OAuthErrorCode.InvalidToken
    });

    introspectionResponse = {
      active: true,
      client_id: "mcp-client",
      scope: BASE_MCP_SCOPE,
      exp: expiresAt,
      aud: "https://another-resource.example.test/mcp",
      iss: ISSUER
    };

    await expect(
      configuration.verifier.verifyAccessToken("wrong-audience-token")
    ).rejects.toMatchObject({
      code: OAuthErrorCode.InvalidToken
    });

    introspectionResponse = {
      active: true,
      client_id: "mcp-client",
      scope: BASE_MCP_SCOPE,
      exp: Math.floor(Date.now() / 1000) - 1,
      aud: RESOURCE_SERVER,
      iss: ISSUER
    };

    await expect(
      configuration.verifier.verifyAccessToken("expired-token")
    ).rejects.toMatchObject({
      code: OAuthErrorCode.InvalidToken
    });

    introspectionResponse = {
      active: true,
      client_id: "mcp-client",
      scope: BASE_MCP_SCOPE,
      exp: expiresAt,
      aud: RESOURCE_SERVER,
      iss: "https://other-auth.example.test/"
    };

    await expect(
      configuration.verifier.verifyAccessToken("wrong-issuer-token")
    ).rejects.toMatchObject({
      code: OAuthErrorCode.InvalidToken
    });
  });

  test("requires OAuth 2.1 authorization metadata before republishing it", async () => {
    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment(),
      fetchImplementation: async () => Response.json(
        authorizationServerMetadata({
          response_types_supported: ["token"]
        })
      ),
      isLocalHost: false
    })).rejects.toThrow(
      "OAuth metadata must support the authorization code response type"
    );

    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment(),
      fetchImplementation: async () => Response.json(
        authorizationServerMetadata({
          code_challenge_methods_supported: ["plain"]
        })
      ),
      isLocalHost: false
    })).rejects.toThrow(
      "OAuth metadata must advertise PKCE S256 support"
    );

    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment(),
      fetchImplementation: async () => Response.json(
        authorizationServerMetadata({
          authorization_endpoint: "http://auth.example.test/authorize"
        })
      ),
      isLocalHost: false
    })).rejects.toThrow(
      "OAuth metadata authorization_endpoint must use HTTPS"
    );
  });

  test("rejects a fragment in the configured OAuth audience", async () => {
    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment({
        MCP_OAUTH_AUDIENCE: `${RESOURCE_SERVER}#other`
      }),
      fetchImplementation: async () => Response.json(
        authorizationServerMetadata()
      ),
      isLocalHost: false
    })).rejects.toThrow(
      "OAuth resource identifiers must not contain a fragment"
    );
  });

  test("form-encodes client_secret_basic credentials", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    let authorization: string | undefined;
    const configuration = await loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment({
        MCP_OAUTH_CLIENT_ID: "resource server:1",
        MCP_OAUTH_CLIENT_SECRET: "secret % value"
      }),
      fetchImplementation: async (input, init) => {
        if (String(input) === INTROSPECTION_ENDPOINT) {
          authorization = (init?.headers as Record<string, string>).Authorization;
          return Response.json({
            active: true,
            client_id: "mcp-client",
            scope: BASE_MCP_SCOPE,
            exp: expiresAt,
            aud: RESOURCE_SERVER,
            iss: ISSUER
          });
        }

        return Response.json(authorizationServerMetadata());
      },
      isLocalHost: false
    });

    if (!configuration) {
      throw new Error("Expected OAuth configuration");
    }
    await configuration.verifier.verifyAccessToken("encoded-credentials");

    expect(authorization).toBe(
      `Basic ${Buffer.from(
        "resource+server%3A1:secret+%25+value"
      ).toString("base64")}`
    );
  });

  test("rejects authorization metadata from an unexpected issuer", async () => {
    await expect(loadOAuthResourceServerConfiguration({
      environment: oauthEnvironment(),
      fetchImplementation: async () => Response.json(
        authorizationServerMetadata({
          issuer: "https://other-auth.example.test/"
        })
      ),
      isLocalHost: false
    })).rejects.toThrow(
      "OAuth metadata issuer does not match MCP_OAUTH_ISSUER_URL"
    );
  });
});
