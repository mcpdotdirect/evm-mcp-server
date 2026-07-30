import { afterAll, describe, expect, test } from "bun:test";
import { createMcpHandler, SERVER_INFO_META_KEY } from "@modelcontextprotocol/server";
import {
  getChain,
  getRpcUrl,
  getSupportedNetworks,
  resolveChainId
} from "../src/core/chains.js";
import createServer from "../src/server/server.js";
import { CACHE_SCOPE, CACHE_TTL_MS, MODERN_PROTOCOL_VERSION, SERVER_INFO } from "../src/server/protocol.js";

const handler = createMcpHandler(createServer, {
  legacy: "reject"
});

const CLIENT_META = {
  "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": {}
};

const ELICITATION_CLIENT_META = {
  ...CLIENT_META,
  "io.modelcontextprotocol/clientCapabilities": {
    elicitation: {
      form: {}
    }
  }
};

const DANGEROUS_TOOL_CALLS = [
  {
    name: "write_contract",
    arguments: {
      contractAddress: "0x0000000000000000000000000000000000000001",
      functionName: "setValue",
      args: ["1"],
      abiJson: JSON.stringify([{
        type: "function",
        name: "setValue",
        stateMutability: "nonpayable",
        inputs: [{ name: "value", type: "uint256" }],
        outputs: []
      }])
    }
  },
  {
    name: "transfer_native",
    arguments: {
      to: "0x0000000000000000000000000000000000000001",
      amount: "0.01"
    }
  },
  {
    name: "transfer_erc20",
    arguments: {
      tokenAddress: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
      amount: "1"
    }
  },
  {
    name: "approve_token_spending",
    arguments: {
      tokenAddress: "0x0000000000000000000000000000000000000001",
      spenderAddress: "0x0000000000000000000000000000000000000002",
      amount: "1"
    }
  },
  {
    name: "sign_message",
    arguments: {
      message: "MCP confirmation test"
    }
  },
  {
    name: "sign_typed_data",
    arguments: {
      domainJson: JSON.stringify({ name: "MCP Test", version: "1" }),
      typesJson: JSON.stringify({
        Message: [{ name: "contents", type: "string" }]
      }),
      primaryType: "Message",
      messageJson: JSON.stringify({ contents: "MCP confirmation test" })
    }
  }
] as const;

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
    requestHandler?: typeof handler;
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

  const response = await (options.requestHandler ?? handler).fetch(new Request("http://test.local/mcp", {
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
  test("accepts configured numeric chain identifiers and rejects unknown networks", () => {
    expect(resolveChainId("137")).toBe(137);
    expect(getChain("137").id).toBe(137);
    expect(getRpcUrl("137")).toContain("polygon");
    expect(getSupportedNetworks()).toContain("op");

    expect(() => resolveChainId("not-a-network")).toThrow(
      "Unsupported network: not-a-network"
    );
    expect(() => getChain("999999998")).toThrow(
      "Unsupported network: 999999998"
    );
  });

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

  test("advertises an output schema for every tool", async () => {
    const { body } = await modernRequest("tool-output-schemas", "tools/list");
    const tools = body.result?.tools as Array<Record<string, unknown>>;

    expect(tools).toHaveLength(25);
    for (const tool of tools) {
      expect(tool.outputSchema).toEqual(expect.objectContaining({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        type: "object"
      }));
    }
  });

  test("marks token approvals as destructive", async () => {
    const { body } = await modernRequest("approval-annotations", "tools/list");
    const tools = body.result?.tools as Array<Record<string, unknown>>;
    const approvalTool = tools.find(tool => tool.name === "approve_token_spending");

    expect(approvalTool?.annotations).toEqual(expect.objectContaining({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    }));
  });

  test("keeps the experimental Tasks extension unadvertised and bounds the synchronous fallback", async () => {
    const { body: discoverBody } = await modernRequest(
      "tasks-discovery",
      "server/discover"
    );
    const capabilities = discoverBody.result?.capabilities as Record<string, unknown>;
    const extensions = capabilities.extensions as Record<string, unknown> | undefined;
    expect(extensions?.["io.modelcontextprotocol/tasks"]).toBeUndefined();

    const { body: toolsBody } = await modernRequest("tasks-tools", "tools/list");
    const tools = toolsBody.result?.tools as Array<Record<string, unknown>>;
    const waitTool = tools.find(tool => tool.name === "wait_for_transaction");
    const inputSchema = waitTool?.inputSchema as {
      properties?: Record<string, Record<string, unknown>>;
    };

    expect(inputSchema.properties?.timeoutSeconds).toEqual(expect.objectContaining({
      type: "integer",
      minimum: 1,
      maximum: 90
    }));

    const { status, body } = await modernRequest(
      "tasks-get",
      "tasks/get",
      { taskId: "not-supported" }
    );
    expect(status).toBe(404);
    expect(body.error).toEqual(expect.objectContaining({
      code: -32601,
      message: "Method not found"
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

  test("uses conservative cache defaults for resources without a cache hint", async () => {
    const privateResourceHandler = createMcpHandler(() => {
      const server = createServer();
      server.registerResource(
        "private_test_resource",
        "test://private",
        { mimeType: "text/plain" },
        async uri => ({
          contents: [{
            uri: uri.href,
            mimeType: "text/plain",
            text: "private"
          }]
        })
      );
      return server;
    }, {
      legacy: "reject"
    });

    try {
      const { body } = await modernRequest(
        "private-resource",
        "resources/read",
        { uri: "test://private" },
        {
          name: "test://private",
          requestHandler: privateResourceHandler
        }
      );

      expect(body.result).toEqual(expect.objectContaining({
        resultType: "complete",
        ttlMs: 0,
        cacheScope: "private"
      }));
    } finally {
      await privateResourceHandler.close();
    }
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

    const result = body.result as Record<string, unknown>;
    const content = result.content as Array<Record<string, unknown>>;

    expect(result).toEqual(expect.objectContaining({
      resultType: "complete",
      content: [expect.objectContaining({ type: "text" })],
      structuredContent: expect.objectContaining({
        supportedNetworks: expect.any(Array)
      })
    }));
    expect(JSON.parse(content[0].text as string)).toEqual(result.structuredContent);
  });

  test("requires client elicitation capability before requesting confirmation", async () => {
    const tool = DANGEROUS_TOOL_CALLS[1];
    const { status, body } = await modernRequest(
      "confirmation-capability",
      "tools/call",
      {
        name: tool.name,
        arguments: tool.arguments
      },
      { name: tool.name }
    );

    expect(status).toBe(400);
    expect(body.error).toEqual(expect.objectContaining({
      code: -32021,
      data: {
        requiredCapabilities: {
          elicitation: {
            form: {}
          }
        }
      }
    }));
  });

  test("requests confirmation before every wallet-backed operation and handles decline", async () => {
    for (const [index, tool] of DANGEROUS_TOOL_CALLS.entries()) {
      const { status, body } = await modernRequest(
        `confirmation-${index}`,
        "tools/call",
        {
          name: tool.name,
          arguments: tool.arguments
        },
        {
          name: tool.name,
          meta: ELICITATION_CLIENT_META
        }
      );

      expect(status).toBe(200);
      expect(body.result?.resultType).toBe("input_required");
      expect(body.result?.requestState).toEqual(expect.any(String));

      const inputRequests = body.result?.inputRequests as Record<string, Record<string, unknown>>;
      const entries = Object.entries(inputRequests);
      expect(entries).toHaveLength(1);

      const [confirmationKey, inputRequest] = entries[0];
      expect(inputRequest).toEqual(expect.objectContaining({
        method: "elicitation/create",
        params: expect.objectContaining({
          mode: "form",
          message: expect.any(String),
          requestedSchema: expect.objectContaining({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            properties: {
              confirm: expect.objectContaining({
                type: "boolean"
              })
            },
            required: ["confirm"]
          })
        })
      }));

      const { status: declinedStatus, body: declinedBody } = await modernRequest(
        `confirmation-${index}-declined`,
        "tools/call",
        {
          name: tool.name,
          arguments: tool.arguments,
          inputResponses: {
            [confirmationKey]: {
              action: "decline"
            }
          },
          requestState: body.result?.requestState
        },
        {
          name: tool.name,
          meta: ELICITATION_CLIENT_META
        }
      );

      expect(declinedStatus).toBe(200);
      expect(declinedBody.result?.resultType).toBe("complete");
      expect(declinedBody.result?.isError).toBe(true);
      const declinedContent = declinedBody.result?.content as Array<Record<string, unknown>>;
      expect(declinedContent[0]?.text).toMatch(/cancel|declin|not confirmed/i);
    }
  });

  test("does not accept injected confirmation input without server-issued state", async () => {
    const tool = DANGEROUS_TOOL_CALLS[1];
    const { body } = await modernRequest(
      "confirmation-injected",
      "tools/call",
      {
        name: tool.name,
        arguments: tool.arguments,
        inputResponses: {
          confirmation: {
            action: "accept",
            content: {
              confirm: true
            }
          }
        }
      },
      {
        name: tool.name,
        meta: ELICITATION_CLIENT_META
      }
    );

    expect(body.result?.resultType).toBe("input_required");
    expect(body.result?.requestState).toEqual(expect.any(String));
  });

  test("binds confirmation state to the complete operation arguments", async () => {
    const tool = DANGEROUS_TOOL_CALLS[1];
    const { body: firstBody } = await modernRequest(
      "confirmation-bound-first",
      "tools/call",
      {
        name: tool.name,
        arguments: tool.arguments
      },
      {
        name: tool.name,
        meta: ELICITATION_CLIENT_META
      }
    );

    const { body: changedBody } = await modernRequest(
      "confirmation-bound-changed",
      "tools/call",
      {
        name: tool.name,
        arguments: {
          ...tool.arguments,
          amount: "0.02"
        },
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
      {
        name: tool.name,
        meta: ELICITATION_CLIENT_META
      }
    );

    expect(changedBody.result?.resultType).toBe("input_required");
    expect(changedBody.result?.requestState).toEqual(expect.any(String));
    expect(changedBody.result?.requestState).not.toBe(firstBody.result?.requestState);
  });

  test("executes one accepted signing confirmation and rejects its replay", async () => {
    const previousPrivateKey = process.env.EVM_PRIVATE_KEY;
    process.env.EVM_PRIVATE_KEY =
      "0x0000000000000000000000000000000000000000000000000000000000000001";

    try {
      const tool = DANGEROUS_TOOL_CALLS[4];
      const { body: firstBody } = await modernRequest(
        "confirmation-accepted-first",
        "tools/call",
        {
          name: tool.name,
          arguments: tool.arguments
        },
        {
          name: tool.name,
          meta: ELICITATION_CLIENT_META
        }
      );
      const confirmationResponse = {
        confirmation: {
          action: "accept",
          content: {
            confirm: true
          }
        }
      };

      const { body: acceptedBody } = await modernRequest(
        "confirmation-accepted-second",
        "tools/call",
        {
          name: tool.name,
          arguments: tool.arguments,
          inputResponses: confirmationResponse,
          requestState: firstBody.result?.requestState
        },
        {
          name: tool.name,
          meta: ELICITATION_CLIENT_META
        }
      );

      expect(acceptedBody.result).toEqual(expect.objectContaining({
        resultType: "complete",
        structuredContent: expect.objectContaining({
          message: tool.arguments.message,
          signature: expect.stringMatching(/^0x[0-9a-f]+$/),
          signer: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
          messageType: "personal_sign"
        })
      }));
      expect(acceptedBody.result?.isError).toBeUndefined();

      const { body: replayBody } = await modernRequest(
        "confirmation-accepted-replay",
        "tools/call",
        {
          name: tool.name,
          arguments: tool.arguments,
          inputResponses: confirmationResponse,
          requestState: firstBody.result?.requestState
        },
        {
          name: tool.name,
          meta: ELICITATION_CLIENT_META
        }
      );

      expect(replayBody.result).toEqual(expect.objectContaining({
        resultType: "complete",
        isError: true
      }));
      const replayContent = replayBody.result?.content as Array<Record<string, unknown>>;
      expect(replayContent[0]?.text).toMatch(/already used/i);
    } finally {
      if (previousPrivateKey === undefined) {
        delete process.env.EVM_PRIVATE_KEY;
      } else {
        process.env.EVM_PRIVATE_KEY = previousPrivateKey;
      }
    }
  });

  test("treats an accepted false confirmation as a terminal decline", async () => {
    const tool = DANGEROUS_TOOL_CALLS[4];
    const { body: firstBody } = await modernRequest(
      "confirmation-false-first",
      "tools/call",
      {
        name: tool.name,
        arguments: tool.arguments
      },
      {
        name: tool.name,
        meta: ELICITATION_CLIENT_META
      }
    );

    const { body: declinedBody } = await modernRequest(
      "confirmation-false-second",
      "tools/call",
      {
        name: tool.name,
        arguments: tool.arguments,
        inputResponses: {
          confirmation: {
            action: "accept",
            content: {
              confirm: false
            }
          }
        },
        requestState: firstBody.result?.requestState
      },
      {
        name: tool.name,
        meta: ELICITATION_CLIENT_META
      }
    );

    expect(declinedBody.result).toEqual(expect.objectContaining({
      resultType: "complete",
      isError: true
    }));
    const declinedContent = declinedBody.result?.content as Array<Record<string, unknown>>;
    expect(declinedContent[0]?.text).toMatch(/declined/i);
  });

  test("rejects tampered confirmation request state before running a tool", async () => {
    const tool = DANGEROUS_TOOL_CALLS[4];
    const { body: firstBody } = await modernRequest(
      "confirmation-tamper-first",
      "tools/call",
      {
        name: tool.name,
        arguments: tool.arguments
      },
      {
        name: tool.name,
        meta: ELICITATION_CLIENT_META
      }
    );
    const requestState = firstBody.result?.requestState as string;
    const stateParts = requestState.split(".");
    stateParts[2] = `${
      stateParts[2].startsWith("A") ? "B" : "A"
    }${stateParts[2].slice(1)}`;
    const tamperedState = stateParts.join(".");

    const { status, body } = await modernRequest(
      "confirmation-tamper-second",
      "tools/call",
      {
        name: tool.name,
        arguments: tool.arguments,
        inputResponses: {
          confirmation: {
            action: "accept",
            content: {
              confirm: true
            }
          }
        },
        requestState: tamperedState
      },
      {
        name: tool.name,
        meta: ELICITATION_CLIENT_META
      }
    );

    expect(status).toBe(200);
    expect(body.error).toEqual(expect.objectContaining({
      code: -32602,
      message: "Invalid or expired requestState",
      data: {
        reason: "invalid_request_state"
      }
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
