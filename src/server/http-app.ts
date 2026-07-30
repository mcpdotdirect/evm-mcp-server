import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response
} from "express";
import {
  bearerAuthChallengeResponse,
  createMcpHandler,
  OAuthError,
  OAuthErrorCode
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
    if (!validateHost(req, res) || !validateOrigin(req, res)) {
      return;
    }

    next();
  };

  const handleMcpRequest = (req: Request, res: Response) => {
    void nodeHandler(req, res, req.body);
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
      express.json({ limit: "1mb" }),
      requireOperationScope,
      handleMcpRequest
    );
  } else {
    app.all(
      "/mcp",
      validateMcpRequest,
      express.json({ limit: "1mb" }),
      handleMcpRequest
    );
  }

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
