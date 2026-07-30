import type { OAuthTokenVerifier } from "@modelcontextprotocol/express";
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthMetadata
} from "@modelcontextprotocol/server";
import { z } from "zod";

export const BASE_MCP_SCOPE = "mcp";
export const WRITE_MCP_SCOPE = "evm:write";
export const SIGN_MCP_SCOPE = "evm:sign";
export const DEFAULT_MCP_SCOPES = [
  BASE_MCP_SCOPE
] as const;
const OAUTH_NETWORK_TIMEOUT_MS = 10_000;

const toolScopeRequirements: Readonly<Record<string, string>> = {
  "write_contract": WRITE_MCP_SCOPE,
  "transfer_native": WRITE_MCP_SCOPE,
  "transfer_erc20": WRITE_MCP_SCOPE,
  "approve_token_spending": WRITE_MCP_SCOPE,
  "sign_message": SIGN_MCP_SCOPE,
  "sign_typed_data": SIGN_MCP_SCOPE
};

const oauthMetadataSchema = z.looseObject({
  issuer: z.url(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  registration_endpoint: z.url().optional(),
  scopes_supported: z.array(z.string()).optional(),
  response_types_supported: z.array(z.string()),
  grant_types_supported: z.array(z.string()).optional(),
  code_challenge_methods_supported: z.array(z.string()),
  introspection_endpoint: z.url().optional()
});

const introspectionResponseSchema = z.looseObject({
  active: z.boolean(),
  token_type: z.string().optional(),
  client_id: z.string().optional(),
  sub: z.string().optional(),
  scope: z.union([z.string(), z.array(z.string())]).optional(),
  exp: z.number().int().positive().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  resource: z.string().optional(),
  iss: z.string().optional()
});

export type OAuthResourceServerConfiguration = {
  oauthMetadata: OAuthMetadata;
  resourceServerUrl: URL;
  scopesSupported: string[];
  requiredScopes: string[];
  verifier: OAuthTokenVerifier;
};

type OAuthEnvironment = NodeJS.ProcessEnv;
type FetchImplementation = typeof fetch;

function requiredEnvironmentValue(
  environment: OAuthEnvironment,
  name: string
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when MCP OAuth is enabled`);
  }
  return value;
}

function parseScopes(value: string | undefined): string[] {
  const scopes = value
    ?.split(/[,\s]+/)
    .map(scope => scope.trim())
    .filter(Boolean);

  return scopes?.length ? [...new Set(scopes)] : [];
}

export function getRequiredToolScope(toolName: unknown): string | undefined {
  return typeof toolName === "string"
    ? toolScopeRequirements[toolName]
    : undefined;
}

export function getRequiredRequestScopes(body: unknown): string[] {
  const requests = Array.isArray(body) ? body : [body];
  const requiredScopes = new Set<string>();

  for (const request of requests) {
    if (!request || typeof request !== "object") {
      continue;
    }

    const message = request as {
      method?: unknown;
      params?: unknown;
    };
    if (message.method !== "tools/call" || !message.params || typeof message.params !== "object") {
      continue;
    }

    const requiredScope = getRequiredToolScope(
      (message.params as { name?: unknown }).name
    );
    if (requiredScope) {
      requiredScopes.add(requiredScope);
    }
  }

  return [...requiredScopes];
}

function canonicalResourceUrl(value: URL): URL {
  if (value.hash) {
    throw new Error("OAuth resource identifiers must not contain a fragment");
  }
  if (value.protocol !== "https:" && value.protocol !== "http:") {
    throw new Error("OAuth resource identifiers must use HTTP or HTTPS");
  }
  return new URL(value);
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "[::1]"
    || hostname === "::1";
}

function requireHttpsAuthorizationUrl(value: URL, label: string): void {
  if (value.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS`);
  }
}

function requireSecureResourceUrl(value: URL, label: string): void {
  if (
    value.protocol !== "https:"
    && !(value.protocol === "http:" && isLoopbackHostname(value.hostname))
  ) {
    throw new Error(`${label} must use HTTPS unless it is a loopback URL`);
  }
}

function getAuthorizationServerMetadataUrl(issuer: URL): URL {
  const metadataUrl = new URL(issuer.origin);
  metadataUrl.pathname = `/.well-known/oauth-authorization-server${
    issuer.pathname === "/" ? "" : issuer.pathname
  }`;
  return metadataUrl;
}

function matchesAudience(
  audience: string | string[] | undefined,
  expectedAudience: string
): boolean {
  if (!audience) {
    return false;
  }

  const values = Array.isArray(audience) ? audience : [audience];
  return values.some(value => {
    try {
      return canonicalResourceUrl(new URL(value)).href === expectedAudience;
    } catch {
      return false;
    }
  });
}

function formEncodeCredential(value: string): string {
  return new URLSearchParams({ value }).toString().slice("value=".length);
}

function validateAuthorizationServerMetadata(
  metadata: z.infer<typeof oauthMetadataSchema>
): void {
  if (!metadata.response_types_supported.includes("code")) {
    throw new Error("OAuth metadata must support the authorization code response type");
  }
  if (
    metadata.grant_types_supported
    && !metadata.grant_types_supported.includes("authorization_code")
  ) {
    throw new Error("OAuth metadata grant_types_supported must include authorization_code");
  }
  if (!metadata.code_challenge_methods_supported.includes("S256")) {
    throw new Error("OAuth metadata must advertise PKCE S256 support");
  }

  const endpointEntries = [
    ["authorization_endpoint", metadata.authorization_endpoint],
    ["token_endpoint", metadata.token_endpoint],
    ["registration_endpoint", metadata.registration_endpoint],
    ["introspection_endpoint", metadata.introspection_endpoint]
  ] as const;
  for (const [name, value] of endpointEntries) {
    if (!value) {
      continue;
    }

    const endpoint = new URL(value);
    if (endpoint.hash) {
      throw new Error(`OAuth metadata ${name} must not contain a fragment`);
    }
    requireHttpsAuthorizationUrl(endpoint, `OAuth metadata ${name}`);
  }
}

function createIntrospectionVerifier(options: {
  clientId: string;
  clientSecret: string;
  expectedAudience: string;
  expectedIssuer: string;
  fetchImplementation: FetchImplementation;
  introspectionEndpoint: string;
  resourceServerUrl: URL;
}): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      let response: Response;
      try {
        response = await options.fetchImplementation(options.introspectionEndpoint, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(OAUTH_NETWORK_TIMEOUT_MS),
          headers: {
            "Authorization": `Basic ${Buffer.from(
              `${formEncodeCredential(options.clientId)}:${formEncodeCredential(options.clientSecret)}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: new URLSearchParams({
            token,
            token_type_hint: "access_token"
          })
        });
      } catch {
        throw new OAuthError(
          OAuthErrorCode.ServerError,
          "The authorization server could not be reached"
        );
      }

      if (!response.ok) {
        throw new OAuthError(
          OAuthErrorCode.ServerError,
          `The authorization server rejected token introspection with HTTP ${response.status}`
        );
      }

      const parsed = introspectionResponseSchema.safeParse(await response.json());
      if (!parsed.success || !parsed.data.active) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, "The access token is invalid");
      }

      const tokenInfo = parsed.data;
      if (
        tokenInfo.token_type
        && tokenInfo.token_type.toLowerCase() !== "bearer"
      ) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "The access token is not a bearer token"
        );
      }

      const clientId = tokenInfo.client_id ?? tokenInfo.sub;
      if (!clientId || !tokenInfo.exp) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "The access token is missing required identity or expiration claims"
        );
      }

      if (tokenInfo.exp <= Math.floor(Date.now() / 1000)) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "The access token has expired"
        );
      }

      if (tokenInfo.iss && tokenInfo.iss !== options.expectedIssuer) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "The access token was issued by an unexpected authorization server"
        );
      }

      const audience = tokenInfo.resource ?? tokenInfo.aud;
      if (!matchesAudience(audience, options.expectedAudience)) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "The access token is not intended for this MCP server"
        );
      }

      const scopes = Array.isArray(tokenInfo.scope)
        ? tokenInfo.scope
        : tokenInfo.scope?.split(/\s+/).filter(Boolean) ?? [];

      return {
        token,
        clientId,
        scopes,
        expiresAt: tokenInfo.exp,
        resource: options.resourceServerUrl,
        extra: {
          issuer: options.expectedIssuer
        }
      };
    }
  };
}

/**
 * Load the OAuth resource-server configuration for Streamable HTTP.
 *
 * Localhost remains usable without OAuth. Binding to a non-local interface
 * requires an external OAuth authorization server and RFC 7662 introspection.
 */
export async function loadOAuthResourceServerConfiguration(options: {
  environment?: OAuthEnvironment;
  fetchImplementation?: FetchImplementation;
  isLocalHost: boolean;
}): Promise<OAuthResourceServerConfiguration | undefined> {
  const environment = options.environment ?? process.env;
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const issuer = environment.MCP_OAUTH_ISSUER_URL?.trim();

  if (!issuer) {
    if (options.isLocalHost) {
      return undefined;
    }

    throw new Error(
      "MCP_OAUTH_ISSUER_URL is required when MCP_HOST binds to a non-local interface"
    );
  }

  const issuerUrl = new URL(issuer);
  if (issuerUrl.search || issuerUrl.hash) {
    throw new Error("MCP_OAUTH_ISSUER_URL must not include a query or fragment");
  }
  requireHttpsAuthorizationUrl(issuerUrl, "MCP_OAUTH_ISSUER_URL");
  const expectedIssuer = issuer;

  const publicUrl = new URL(requiredEnvironmentValue(environment, "MCP_PUBLIC_URL"));
  if (publicUrl.pathname !== "/mcp" || publicUrl.search || publicUrl.hash) {
    throw new Error("MCP_PUBLIC_URL must be the exact public MCP endpoint ending in /mcp, without a query or fragment");
  }
  requireSecureResourceUrl(publicUrl, "MCP_PUBLIC_URL");

  const metadataUrl = environment.MCP_OAUTH_METADATA_URL?.trim()
    ?? getAuthorizationServerMetadataUrl(issuerUrl).href;
  const parsedMetadataUrl = new URL(metadataUrl);
  if (parsedMetadataUrl.hash) {
    throw new Error("OAuth metadata URL must not contain a fragment");
  }
  requireHttpsAuthorizationUrl(parsedMetadataUrl, "OAuth metadata URL");
  let metadataResponse: Response;
  try {
    metadataResponse = await fetchImplementation(metadataUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(OAUTH_NETWORK_TIMEOUT_MS),
      headers: {
        "Accept": "application/json"
      }
    });
  } catch {
    throw new Error("Unable to load OAuth authorization server metadata");
  }
  if (!metadataResponse.ok) {
    throw new Error(
      `Unable to load OAuth authorization server metadata: HTTP ${metadataResponse.status}`
    );
  }

  const metadata = oauthMetadataSchema.parse(await metadataResponse.json());
  if (metadata.issuer !== expectedIssuer) {
    throw new Error("OAuth metadata issuer does not match MCP_OAUTH_ISSUER_URL");
  }
  validateAuthorizationServerMetadata(metadata);

  const introspectionEndpoint = environment.MCP_OAUTH_INTROSPECTION_URL?.trim()
    ?? metadata.introspection_endpoint;
  if (!introspectionEndpoint) {
    throw new Error(
      "The authorization server metadata must provide introspection_endpoint, or MCP_OAUTH_INTROSPECTION_URL must be set"
    );
  }
  const introspectionUrl = new URL(introspectionEndpoint);
  if (introspectionUrl.hash) {
    throw new Error("OAuth token introspection URL must not contain a fragment");
  }
  requireHttpsAuthorizationUrl(introspectionUrl, "OAuth token introspection URL");

  const requiredScopes = [
    ...new Set([
      BASE_MCP_SCOPE,
      ...parseScopes(environment.MCP_OAUTH_REQUIRED_SCOPES)
    ])
  ];
  const scopesSupported = [
    ...new Set([
      ...DEFAULT_MCP_SCOPES,
      ...parseScopes(environment.MCP_OAUTH_SCOPES),
      ...requiredScopes
    ])
  ];
  const expectedAudienceUrl = canonicalResourceUrl(new URL(
    environment.MCP_OAUTH_AUDIENCE?.trim() ?? publicUrl.href
  ));
  requireSecureResourceUrl(expectedAudienceUrl, "MCP_OAUTH_AUDIENCE");
  const expectedAudience = expectedAudienceUrl.href;

  return {
    oauthMetadata: metadata as OAuthMetadata,
    resourceServerUrl: publicUrl,
    scopesSupported,
    requiredScopes,
    verifier: createIntrospectionVerifier({
      clientId: requiredEnvironmentValue(environment, "MCP_OAUTH_CLIENT_ID"),
      clientSecret: requiredEnvironmentValue(environment, "MCP_OAUTH_CLIENT_SECRET"),
      expectedAudience,
      expectedIssuer,
      fetchImplementation,
      introspectionEndpoint: introspectionUrl.href,
      resourceServerUrl: publicUrl
    })
  };
}
