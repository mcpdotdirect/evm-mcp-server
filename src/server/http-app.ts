import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response
} from "express";
import {
  bearerAuthChallengeResponse,
  createMcpHandler,
  isJsonContentType,
  OAuthError,
  OAuthErrorCode,
  ProtocolErrorCode
} from "@modelcontextprotocol/server";
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
  requireBearerAuth
} from "@modelcontextprotocol/express";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import {
  getRequiredRequestScopes,
  type OAuthResourceServerConfiguration
} from "./auth.js";
import createServer from "./server.js";
import { CACHE_SCOPE, CACHE_TTL_MS, MODERN_PROTOCOL_VERSION, SERVER_INFO } from "./protocol.js";

export type HttpAppOptions = {
  allowedHostnames: string[];
  allowedOriginHostnames: string[];
  oauthConfiguration?: OAuthResourceServerConfiguration;
};

export type HttpApp = {
  app: Express;
  mcpHandler: ReturnType<typeof createMcpHandler>;
};

/**
 * Create the Streamable HTTP application without binding a network listener.
 *
 * Runtime configuration and process lifecycle remain the responsibility of the
 * HTTP entry point so tests can exercise the complete middleware chain safely.
 */
export function createHttpApp(options: HttpAppOptions): HttpApp {
  const {
    allowedHostnames,
    allowedOriginHostnames,
    oauthConfiguration
  } = options;
  const validateHost = hostHeaderValidation(allowedHostnames);
  const validateOrigin = originValidation(allowedOriginHostnames);
  const app = express();
  const mcpHandler = createMcpHandler(createServer, {
    legacy: "reject"
  });
  const nodeHandler = toNodeHandler(mcpHandler, {
    onerror: (error) => {
      console.error("MCP Node adapter error:", error);
    }
  });

  // Browser preflights do not carry bearer tokens. Validate their host/origin
  // before answering, and retain CORS headers on OAuth challenges and metadata.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!validateHost(req, res) || !validateOrigin(req, res)) {
      return;
    }
    res.vary("Origin");
    const origin = req.get("Origin");
    if (!origin) {
      next();
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate, Retry-After, MCP-Protocol-Version");
    if (req.method !== "OPTIONS") {
      next();
      return;
    }

    res.vary("Access-Control-Request-Method");
    res.vary("Access-Control-Request-Headers");
    const method = req.get("Access-Control-Request-Method");
    const headers = (req.get("Access-Control-Request-Headers") ?? "")
      .split(",").map(header => header.trim().toLowerCase()).filter(Boolean);
    const allowedHeaders = new Set([
      "accept", "content-type", "authorization", "mcp-protocol-version", "mcp-method", "mcp-name"
    ]);
    if (
      !method || !["GET", "POST"].includes(method)
      || headers.some(header => !allowedHeaders.has(header) && !/^mcp-param-[a-z0-9-]+$/.test(header))
    ) {
      res.status(403).end();
      return;
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    if (headers.length) {
      res.setHeader("Access-Control-Allow-Headers", headers.join(", "));
    }
    res.status(204).end();
  });

  if (oauthConfiguration) {
    app.use(mcpAuthMetadataRouter({
      oauthMetadata: oauthConfiguration.oauthMetadata,
      resourceServerUrl: oauthConfiguration.resourceServerUrl,
      scopesSupported: oauthConfiguration.scopesSupported,
      resourceName: SERVER_INFO.name
    }));
  }

  const validateMcpRequest = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (req.method === "POST" && !isJsonContentType(req.get("Content-Type") ?? null)) {
      res.status(415).json({
        jsonrpc: "2.0",
        error: {
          code: ProtocolErrorCode.InvalidRequest,
          message: "Content-Type must be application/json"
        }
      });
      return;
    }

    next();
  };

  // Media types are checked above. Force every remaining body through this
  // bounded reader, including chunked uploads and decompressed JSON.
  const parseMcpBody = express.json({ limit: "1mb", strict: false, type: () => true });

  const handleMcpRequest = (req: Request, res: Response) => {
    // The v2 entry validates header values but permits an absent version header.
    if (req.method === "POST" && !req.get("MCP-Protocol-Version")) {
      res.status(400).json({
        jsonrpc: "2.0",
        ...(typeof req.body?.id === "string" || typeof req.body?.id === "number"
          ? { id: req.body.id } : {}),
        error: { code: -32020, message: "Missing MCP-Protocol-Version header" }
      });
      return;
    }

    if (req.method === "POST" && (
      !req.get("Accept")
      || !req.accepts("application/json")
      || !req.accepts("text/event-stream")
    )) {
      res.status(406).json({
        jsonrpc: "2.0",
        error: {
          code: ProtocolErrorCode.InvalidRequest,
          message: "Accept must allow application/json and text/event-stream"
        }
      });
      return;
    }

    // An undefined parsedBody makes the SDK buffer the raw stream without a limit.
    // Treat an absent body as invalid JSON-RPC instead of entering that fallback.
    void nodeHandler(req, res, req.body ?? null);
  };

  if (oauthConfiguration) {
    const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(
      oauthConfiguration.resourceServerUrl
    );
    const requireOperationScope = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const missingScopes = getRequiredRequestScopes(req.body).filter(
        scope => !req.auth?.scopes.includes(scope)
      );
      if (missingScopes.length === 0) {
        next();
        return;
      }

      const challenge = bearerAuthChallengeResponse(
        new OAuthError(
          OAuthErrorCode.InsufficientScope,
          `Additional scope required: ${missingScopes.join(" ")}`
        ),
        {
          requiredScopes: missingScopes,
          resourceMetadataUrl
        }
      );

      challenge.headers.forEach((value, name) => {
        res.setHeader(name, value);
      });
      res.status(challenge.status).send(await challenge.text());
    };

    app.all(
      "/mcp",
      validateMcpRequest,
      requireBearerAuth({
        verifier: oauthConfiguration.verifier,
        requiredScopes: oauthConfiguration.requiredScopes,
        resourceMetadataUrl
      }),
      parseMcpBody,
      requireOperationScope,
      handleMcpRequest
    );
  } else {
    app.all(
      "/mcp",
      validateMcpRequest,
      parseMcpBody,
      handleMcpRequest
    );
  }

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    const parserError = error as { type?: string; status?: number } | undefined;
    if (parserError?.type === "entity.parse.failed") {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: ProtocolErrorCode.ParseError, message: "Parse error" }
      });
      return;
    }
    if (parserError?.type === "entity.too.large") {
      res.status(413).json({
        jsonrpc: "2.0",
        error: { code: ProtocolErrorCode.InvalidRequest, message: "Request body exceeds 1 MB" }
      });
      return;
    }
    if (parserError?.status === 400 || parserError?.status === 415) {
      res.status(parserError.status).json({
        jsonrpc: "2.0",
        error: { code: ProtocolErrorCode.InvalidRequest, message: "Invalid request body or encoding" }
      });
      return;
    }
    next(error);
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      protocol: `MCP ${MODERN_PROTOCOL_VERSION}`,
      transport: "Streamable HTTP",
      stateless: true,
      authorization: oauthConfiguration ? "oauth" : "localhost-only"
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
      authorization: oauthConfiguration ? {
        type: "oauth",
        resourceMetadata: getOAuthProtectedResourceMetadataUrl(
          oauthConfiguration.resourceServerUrl
        )
      } : {
        type: "none",
        restriction: "localhost-only"
      },
      status: "ready",
      stateless: true
    });
  });

  return {
    app,
    mcpHandler
  };
}
