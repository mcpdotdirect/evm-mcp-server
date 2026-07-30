import {
  acceptedContent,
  inputRequired,
  inputResponse,
  McpServer,
  type CallToolResult,
  type InputRequiredResult,
  type ServerContext
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { getSupportedNetworks, getRpcUrl } from "./chains.js";
import * as services from "./services/index.js";
import { type Address, type Hash } from 'viem';
import { normalize } from 'viem/ens';
import {
  consumeConfirmationRequestState,
  createOperationDigest,
  isConfirmationRequestState,
  mintConfirmationRequestState
} from "../server/request-state.js";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const walletAddressOutputSchema = z.object({
  address: z.string(),
  message: z.string()
});

const chainInfoOutputSchema = z.object({
  network: z.string(),
  chainId: z.number(),
  blockNumber: z.string(),
  rpcUrl: z.string()
});

const supportedNetworksOutputSchema = z.object({
  supportedNetworks: z.array(z.string())
});

const gasPriceOutputSchema = z.object({
  network: z.string(),
  gasPricePerGas: z.string(),
  priorityFeePerGas: z.string().nullable(),
  currency: z.literal("wei")
});

const resolveEnsOutputSchema = z.object({
  ensName: z.string(),
  normalizedName: z.string(),
  resolvedAddress: z.string(),
  network: z.string()
});

const lookupEnsOutputSchema = z.object({
  address: z.string(),
  ensName: z.string(),
  network: z.string()
});

// Blocks, transactions, and receipts are viem-defined objects whose fields vary by chain.
const viemObjectOutputSchema = z.record(z.string(), z.json());

const nativeBalanceOutputSchema = z.object({
  network: z.string(),
  address: z.string(),
  balance: z.object({
    raw: z.string(),
    formatted: z.string()
  })
});

const tokenBalanceOutputSchema = z.object({
  network: z.string(),
  tokenAddress: z.string(),
  address: z.string(),
  balance: z.object({
    raw: z.string(),
    formatted: z.string(),
    symbol: z.string(),
    decimals: z.number()
  })
});

const allowanceOutputSchema = z.object({
  network: z.string(),
  tokenAddress: z.string(),
  owner: z.string(),
  spenderAddress: z.string(),
  allowance: z.string(),
  message: z.string()
});

const waitForTransactionOutputSchema = z.object({
  network: z.string(),
  txHash: z.string(),
  status: z.enum(["confirmed", "failed"]),
  blockNumber: z.string(),
  gasUsed: z.string(),
  confirmations: z.number(),
  timeoutSeconds: z.number()
});

const contractAbiOutputSchema = z.object({
  contractAddress: z.string(),
  network: z.string(),
  abiFormat: z.literal("json"),
  readableFunctions: z.array(z.string()),
  totalFunctions: z.number(),
  abi: z.array(z.json())
});

const readContractOutputSchema = z.object({
  contractAddress: z.string(),
  function: z.string(),
  args: z.array(z.string()).optional(),
  result: z.json().optional(),
  abiSource: z.enum(["provided", "auto-fetched or built-in"])
});

const writeContractOutputSchema = z.object({
  network: z.string(),
  contractAddress: z.string(),
  function: z.string(),
  args: z.array(z.string()).optional(),
  value: z.string().optional(),
  from: z.string(),
  txHash: z.string(),
  abiSource: z.enum(["provided", "auto-fetched"]),
  message: z.string()
});

const multicallResultOutputSchema = z.discriminatedUnion("status", [
  z.object({
    contractAddress: z.string(),
    functionName: z.string(),
    args: z.array(z.string()).optional(),
    result: z.json().optional(),
    status: z.literal("success")
  }),
  z.object({
    contractAddress: z.string(),
    functionName: z.string(),
    args: z.array(z.string()).optional(),
    error: z.string(),
    status: z.literal("failure")
  })
]);

const multicallOutputSchema = z.object({
  network: z.string(),
  totalCalls: z.number(),
  successfulCalls: z.number(),
  failedCalls: z.number(),
  results: z.array(multicallResultOutputSchema)
});

const nativeTransferOutputSchema = z.object({
  network: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  txHash: z.string(),
  message: z.string()
});

const erc20TransferOutputSchema = z.object({
  network: z.string(),
  tokenAddress: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  txHash: z.string(),
  message: z.string()
});

const tokenApprovalOutputSchema = z.object({
  network: z.string(),
  tokenAddress: z.string(),
  owner: z.string(),
  spender: z.string(),
  approvalAmount: z.string(),
  txHash: z.string(),
  message: z.string()
});

const nftInfoOutputSchema = z.object({
  network: z.string(),
  contract: z.string(),
  tokenId: z.string(),
  name: z.string(),
  symbol: z.string(),
  tokenURI: z.string()
});

const erc1155BalanceOutputSchema = z.object({
  network: z.string(),
  contract: z.string(),
  tokenId: z.string(),
  owner: z.string(),
  balance: z.string()
});

const signedMessageOutputSchema = z.object({
  message: z.string(),
  signature: z.string(),
  signer: z.string(),
  messageType: z.literal("personal_sign")
});

const signedTypedDataOutputSchema = z.object({
  domain: z.json(),
  types: z.json(),
  primaryType: z.string(),
  message: z.json(),
  signature: z.string(),
  signer: z.string(),
  messageType: z.literal("EIP-712")
});

/**
 * Create a tool result with both the legacy text rendering and structured JSON.
 * viem bigint values are encoded as decimal strings so the structured result is JSON-safe.
 */
function createToolResult(value: unknown) {
  const text = JSON.stringify(
    value,
    (_, nestedValue) => typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue,
    2
  );

  if (text === undefined) {
    throw new TypeError("Tool result must be JSON-serializable");
  }

  return {
    content: [{ type: "text" as const, text }],
    structuredContent: JSON.parse(text) as JsonValue
  };
}

const confirmationSchema = z.object({
  confirm: z.boolean().describe("Set to true to authorize this exact operation.")
});

/**
 * Require an explicit MCP input response before a wallet-backed operation.
 * A declined or cancelled request is terminal and never re-prompts.
 */
async function requireConfirmation(
  ctx: ServerContext,
  toolName: string,
  argumentsValue: Record<string, unknown>,
  message: string
): Promise<CallToolResult | InputRequiredResult | undefined> {
  const operationDigest = await createOperationDigest(toolName, argumentsValue);
  const requestState = ctx.mcpReq.requestState<unknown>();

  if (
    !isConfirmationRequestState(requestState)
    || requestState.operationDigest !== operationDigest
  ) {
    return inputRequired({
      inputRequests: {
        confirmation: inputRequired.elicit({
          message,
          requestedSchema: confirmationSchema
        })
      },
      requestState: await mintConfirmationRequestState(operationDigest, ctx)
    });
  }

  if (!consumeConfirmationRequestState(requestState)) {
    return {
      content: [{
        type: "text",
        text: "Confirmation expired or already used. Request a new confirmation before retrying."
      }],
      isError: true
    };
  }

  const response = inputResponse(ctx.mcpReq.inputResponses, "confirmation");

  if (response.kind === "elicit" && response.action !== "accept") {
    return {
      content: [{ type: "text", text: "Operation cancelled by the user." }],
      isError: true
    };
  }

  const answer = acceptedContent(
    ctx.mcpReq.inputResponses,
    "confirmation",
    confirmationSchema
  );

  if (answer?.confirm === false) {
    return {
      content: [{ type: "text", text: "Operation declined by the user." }],
      isError: true
    };
  }

  if (answer?.confirm !== true) {
    return inputRequired({
      inputRequests: {
        confirmation: inputRequired.elicit({
          message,
          requestedSchema: confirmationSchema
        })
      },
      requestState: await mintConfirmationRequestState(operationDigest, ctx)
    });
  }

  return undefined;
}

/**
 * Register all EVM-related tools with the MCP server
 *
 * SECURITY: Either EVM_PRIVATE_KEY or EVM_MNEMONIC environment variable must be set for write operations.
 * Private keys and mnemonics are never passed as tool arguments for security reasons.
 * Tools will use the configured wallet for all transactions.
 *
 * Configuration options:
 * - EVM_PRIVATE_KEY: Hex private key (with or without 0x prefix)
 * - EVM_MNEMONIC: BIP-39 mnemonic phrase
 * - EVM_ACCOUNT_INDEX: Optional account index for HD wallet derivation (default: 0)
 *
 * ENS support is declared per input. Raw contract interaction parameters require
 * hexadecimal addresses unless their individual description says otherwise.
 *
 * @param server The MCP server instance
 */
export function registerEVMTools(server: McpServer) {
  const { getConfiguredPrivateKey, getWalletAddressFromKey, getConfiguredWallet } = services;

  // ============================================================================
  // WALLET INFORMATION TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_wallet_address",
    {
      description: "Get the address of the configured wallet. Use this to verify which wallet is active.",
      inputSchema: z.strictObject({}),
      outputSchema: walletAddressOutputSchema,
      annotations: {
        title: "Get Wallet Address",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      try {
        const address = getWalletAddressFromKey();
        return createToolResult({
          address,
          message: "This is the wallet that will be used for all transactions"
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // NETWORK INFORMATION TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_chain_info",
    {
      description: "Get information about an EVM network: chain ID, current block number, and RPC endpoint",
      inputSchema: z.object({
        network: z.string().optional().describe("Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base') or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: chainInfoOutputSchema,
      annotations: {
        title: "Get Chain Info",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ network = "ethereum" }) => {
      try {
        const chainId = await services.getChainId(network);
        const blockNumber = await services.getBlockNumber(network);
        const rpcUrl = getRpcUrl(network);

        return createToolResult({ network, chainId, blockNumber: blockNumber.toString(), rpcUrl });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching chain info: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_supported_networks",
    {
      description: "Get the configured network names and aliases for all supported EVM chains",
      inputSchema: z.strictObject({}),
      outputSchema: supportedNetworksOutputSchema,
      annotations: {
        title: "Get Supported Networks",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      try {
        const networks = getSupportedNetworks();
        return createToolResult({ supportedNetworks: networks });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_gas_price",
    {
      description: "Get the node's current transaction gas-price estimate and, when supported, its estimated priority fee",
      inputSchema: z.object({
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: gasPriceOutputSchema,
      annotations: {
        title: "Get Gas Prices",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ network = "ethereum" }) => {
      try {
        const client = await services.getPublicClient(network);
        const gasPrice = await client.getGasPrice();
        let priorityFee: bigint | null = null;
        try {
          priorityFee = await client.estimateMaxPriorityFeePerGas();
        } catch {
          // Legacy fee markets do not expose an EIP-1559 priority fee.
        }

        return createToolResult({
          network,
          gasPricePerGas: gasPrice.toString(),
          priorityFeePerGas: priorityFee?.toString() ?? null,
          currency: "wei"
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching gas prices: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // ENS TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "resolve_ens_name",
    {
      description: "Resolve an ENS name to an Ethereum address",
      inputSchema: z.object({
        ensName: z.string().describe("ENS name to resolve (e.g., 'vitalik.eth')"),
        network: z.string().optional().describe("Network name or chain ID. ENS resolution works best on Ethereum mainnet. Defaults to Ethereum mainnet.")
      }),
      outputSchema: resolveEnsOutputSchema,
      annotations: {
        title: "Resolve ENS Name",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ ensName, network = "ethereum" }) => {
      try {
        if (!ensName.includes('.')) {
          return {
            content: [{ type: "text", text: `Error: "${ensName}" is not a valid ENS name. ENS names must contain a dot (e.g., 'name.eth').` }],
            isError: true
          };
        }
        const normalizedEns = normalize(ensName);
        const address = await services.resolveAddress(ensName, network);

        return createToolResult({
          ensName,
          normalizedName: normalizedEns,
          resolvedAddress: address,
          network
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error resolving ENS name: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "lookup_ens_address",
    {
      description: "Lookup the ENS name for an Ethereum address (reverse resolution)",
      inputSchema: z.object({
        address: z.string().describe("Ethereum address to lookup"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: lookupEnsOutputSchema,
      annotations: {
        title: "Lookup ENS Address",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ address, network = "ethereum" }) => {
      try {
        const client = await services.getPublicClient(network);
        const ensName = await client.getEnsName({
          address: address as Address
        });
        return createToolResult({
          address,
          ensName: ensName || "No ENS name found",
          network
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error looking up ENS name: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // BLOCK TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_block",
    {
      description: "Get block details by block number or hash",
      inputSchema: z.object({
        blockIdentifier: z.string().describe("Block number (as string) or block hash"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: viemObjectOutputSchema,
      annotations: {
        title: "Get Block",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ blockIdentifier, network = "ethereum" }) => {
      try {
        let block;
        if (blockIdentifier.startsWith("0x") && blockIdentifier.length === 66) {
          // It's a hash
          block = await services.getBlockByHash(blockIdentifier as Hash, network);
        } else {
          // It's a number
          block = await services.getBlockByNumber(parseInt(blockIdentifier), network);
        }
        return createToolResult(block);
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching block: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_latest_block",
    {
      description: "Get the latest block from the network",
      inputSchema: z.object({
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: viemObjectOutputSchema,
      annotations: {
        title: "Get Latest Block",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ network = "ethereum" }) => {
      try {
        const block = await services.getLatestBlock(network);
        return createToolResult(block);
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching latest block: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // BALANCE TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_balance",
    {
      description: "Get the native token balance (ETH, POL, etc.) for an address",
      inputSchema: z.object({
        address: z.string().describe("The wallet address or ENS name"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: nativeBalanceOutputSchema,
      annotations: {
        title: "Get Native Token Balance",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ address, network = "ethereum" }) => {
      try {
        const balance = await services.getETHBalance(address as Address, network);
        return createToolResult({
          network,
          address,
          balance: {
            raw: balance.wei.toString(),
            formatted: balance.ether
          }
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching balance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_token_balance",
    {
      description: "Get the ERC20 token balance for an address",
      inputSchema: z.object({
        address: z.string().describe("The wallet address or ENS name"),
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: tokenBalanceOutputSchema,
      annotations: {
        title: "Get ERC20 Token Balance",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ address, tokenAddress, network = "ethereum" }) => {
      try {
        const balance = await services.getERC20Balance(tokenAddress as Address, address as Address, network);
        return createToolResult({
          network,
          tokenAddress,
          address,
          balance: {
            raw: balance.raw.toString(),
            formatted: balance.formatted,
            symbol: balance.token.symbol,
            decimals: balance.token.decimals
          }
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching token balance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_allowance",
    {
      description: "Check the allowance granted to a spender for a token. This tells you how much of a token an address can spend on your behalf.",
      inputSchema: z.object({
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        spenderAddress: z.string().describe("The address allowed to spend the token (usually a contract address)"),
        ownerAddress: z.string().optional().describe("The owner address (defaults to the configured wallet)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: allowanceOutputSchema,
      annotations: {
        title: "Get Token Allowance",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, spenderAddress, ownerAddress, network = "ethereum" }) => {
      try {
        const owner = ownerAddress ? (ownerAddress as Address) : getConfiguredWallet().address;
        const client = await services.getPublicClient(network);

        const allowance = await client.readContract({
          address: tokenAddress as Address,
          abi: [
            {
              name: 'allowance',
              type: 'function',
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' }
              ],
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view'
            }
          ],
          functionName: 'allowance',
          args: [owner, spenderAddress as Address]
        });

        return createToolResult({
          network,
          tokenAddress,
          owner,
          spenderAddress,
          allowance: allowance.toString(),
          message: allowance === 0n ? "No allowance set" : "Allowance is set"
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching allowance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // TRANSACTION TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_transaction",
    {
      description: "Get transaction details by transaction hash",
      inputSchema: z.object({
        txHash: z.string().describe("Transaction hash (0x...)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: viemObjectOutputSchema,
      annotations: {
        title: "Get Transaction",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ txHash, network = "ethereum" }) => {
      try {
        const tx = await services.getTransaction(txHash as Hash, network);
        return createToolResult(tx);
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching transaction: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_transaction_receipt",
    {
      description: "Get transaction receipt (confirmation status, gas used, logs). Use this to check if a transaction has been confirmed.",
      inputSchema: z.object({
        txHash: z.string().describe("Transaction hash (0x...)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: viemObjectOutputSchema,
      annotations: {
        title: "Get Transaction Receipt",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ txHash, network = "ethereum" }) => {
      try {
        const client = await services.getPublicClient(network);
        const receipt = await client.getTransactionReceipt({
          hash: txHash as Hash
        });
        return createToolResult(receipt);
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching transaction receipt: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "wait_for_transaction",
    {
      description: "Wait up to a bounded timeout for a transaction to be confirmed (mined). If it is still pending, call this tool again or use get_transaction_receipt.",
      inputSchema: z.object({
        txHash: z.string().describe("Transaction hash (0x...)"),
        confirmations: z.number().int().positive().optional().describe("Number of block confirmations required. Defaults to 1."),
        timeoutSeconds: z.number().int().min(1).max(90).optional().describe("Maximum time to wait before returning an error. Defaults to 90 seconds and is capped below the HTTP transport timeout."),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: waitForTransactionOutputSchema,
      annotations: {
        title: "Wait For Transaction",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ txHash, confirmations = 1, timeoutSeconds = 90, network = "ethereum" }) => {
      try {
        const client = await services.getPublicClient(network);
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash as Hash,
          confirmations,
          timeout: timeoutSeconds * 1000
        });

        return createToolResult({
          network,
          txHash,
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          confirmations,
          timeoutSeconds
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error waiting for transaction: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // SMART CONTRACT TOOLS
  // ============================================================================

  server.registerTool(
    "get_contract_abi",
    {
      description: "Fetch a verified contract ABI through the Etherscan v2 API. Requires ETHERSCAN_API_KEY and explorer support for the selected chain.",
      inputSchema: z.object({
        contractAddress: z.string().describe("The contract address (0x...)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet; use polygon-amoy for the Polygon testnet.")
      }),
      outputSchema: contractAbiOutputSchema,
      annotations: {
        title: "Get Contract ABI",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ contractAddress, network = "ethereum" }) => {
      try {
        const abi = await services.fetchContractABI(contractAddress as Address, network);
        const parsed = services.parseABI(abi);
        const readableFunctions = services.getReadableFunctions(parsed);

        return createToolResult({
          contractAddress,
          network,
          abiFormat: "json",
          readableFunctions,
          totalFunctions: parsed.filter(i => i.type === 'function').length,
          abi: parsed
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching ABI: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "read_contract",
    {
      description: "Call read-only functions on a smart contract. Automatically fetches ABI from block explorer if not provided (requires ETHERSCAN_API_KEY). Falls back to common functions if contract is not verified. Use this to query contract state and data.",
      inputSchema: z.object({
        contractAddress: z.string().describe("The contract address"),
        functionName: z.string().describe("Function name (e.g., 'name', 'symbol', 'balanceOf', 'totalSupply', 'owner')"),
        args: z.array(z.string()).optional().describe("Function arguments as strings (e.g., ['0xAddress'] for balanceOf)"),
        abiJson: z.string().optional().describe("Full contract ABI as JSON string (optional - will auto-fetch verified contract ABI if not provided)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: readContractOutputSchema,
      annotations: {
        title: "Read Smart Contract",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ contractAddress, functionName, args = [], abiJson, network = "ethereum" }) => {
      try {
        const client = await services.getPublicClient(network);

        let abi: any[] | undefined;
        let functionAbi: any;

        // If ABI is provided, use it
        if (abiJson) {
          try {
            abi = services.parseABI(abiJson);
            functionAbi = services.getFunctionFromABI(abi, functionName);
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: `Error parsing provided ABI: ${error instanceof Error ? error.message : String(error)}`
              }],
              isError: true
            };
          }
        } else {
          // Try to auto-fetch ABI from block explorer
          try {
            const fetchedAbi = await services.fetchContractABI(contractAddress as Address, network);
            abi = services.parseABI(fetchedAbi);
            functionAbi = services.getFunctionFromABI(abi, functionName);
          } catch (fetchError) {
            // Fall back to common function signatures
            const commonFunctions: { [key: string]: any } = {
              'name': { inputs: [], outputs: [{ type: 'string' }] },
              'symbol': { inputs: [], outputs: [{ type: 'string' }] },
              'decimals': { inputs: [], outputs: [{ type: 'uint8' }] },
              'totalSupply': { inputs: [], outputs: [{ type: 'uint256' }] },
              'balanceOf': { inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
              'allowance': { inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
            };

            if (!commonFunctions[functionName]) {
              return {
                content: [{
                  type: "text",
                  text: `Error: Could not auto-fetch ABI (${fetchError instanceof Error ? fetchError.message : String(fetchError)}). Function '${functionName}' not in common signatures. Use get_contract_abi to fetch and provide the full ABI, or provide abiJson parameter.`
                }],
                isError: true
              };
            }

            functionAbi = {
              name: functionName,
              type: 'function',
              inputs: commonFunctions[functionName].inputs,
              outputs: commonFunctions[functionName].outputs,
              stateMutability: 'view'
            };
          }
        }

        const result = await client.readContract({
          address: contractAddress as Address,
          abi: [functionAbi],
          functionName: functionName,
          args: args as any
        });

        return createToolResult({
          contractAddress,
          function: functionName,
          args: args.length > 0 ? args : undefined,
          result,
          abiSource: abiJson ? 'provided' : 'auto-fetched or built-in'
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error reading contract: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "write_contract",
    {
      description: "Execute an ABI-described state-changing smart-contract function with string-form arguments. Automatically fetches the ABI from Etherscan v2 if not provided (requires ETHERSCAN_API_KEY and a supported chain). Requires a configured wallet.",
      inputSchema: z.object({
        contractAddress: z.string().describe("The contract address"),
        functionName: z.string().describe("Function name to call (e.g., 'mint', 'swap', 'stake', 'approve')"),
        args: z.array(z.string()).optional().describe("Function arguments as strings (e.g., ['0xAddress', '1000000'])"),
        value: z.string().optional().describe("Native-token value to send in whole-token units (e.g., '0.1' for payable functions)"),
        abiJson: z.string().optional().describe("Full contract ABI as JSON string (optional - will auto-fetch verified contract ABI if not provided)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: writeContractOutputSchema,
      annotations: {
        title: "Write to Smart Contract",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ contractAddress, functionName, args = [], value, abiJson, network = "ethereum" }, ctx) => {
      try {
        let abi: any[] | undefined;
        let functionAbi: any;

        // If ABI is provided, use it
        if (abiJson) {
          try {
            abi = services.parseABI(abiJson);
            functionAbi = services.getFunctionFromABI(abi, functionName);
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: `Error parsing provided ABI: ${error instanceof Error ? error.message : String(error)}`
              }],
              isError: true
            };
          }
        } else {
          // Try to auto-fetch ABI from block explorer
          try {
            const fetchedAbi = await services.fetchContractABI(contractAddress as Address, network);
            abi = services.parseABI(fetchedAbi);
            functionAbi = services.getFunctionFromABI(abi, functionName);
          } catch (fetchError) {
            return {
              content: [{
                type: "text",
                text: `Error: Could not auto-fetch ABI (${fetchError instanceof Error ? fetchError.message : String(fetchError)}). Please provide the contract ABI using the abiJson parameter, or use get_contract_abi to fetch it first.`
              }],
              isError: true
            };
          }
        }

        // Validate that this is not a view/pure function
        if (functionAbi.stateMutability === 'view' || functionAbi.stateMutability === 'pure') {
          return {
            content: [{
              type: "text",
              text: `Error: Function '${functionName}' is a ${functionAbi.stateMutability} function and cannot modify state. Use read_contract instead.`
            }],
            isError: true
          };
        }

        const functionSignature = `${functionAbi.name}(${
          (functionAbi.inputs ?? [])
            .map((input: { type?: unknown }) => String(input.type ?? "unknown"))
            .join(",")
        })`;
        const confirmation = await requireConfirmation(
          ctx,
          "write_contract",
          {
            contractAddress,
            functionName,
            args,
            value: value ?? null,
            abiJson: abiJson ?? null,
            functionAbi,
            network
          },
          `Call ${functionSignature} on contract ${contractAddress} on ${network} with arguments ${JSON.stringify(args)}${value ? ` and ${value} native tokens` : ""} using the ${abiJson ? "provided" : "auto-fetched"} ABI?`
        );
        if (confirmation) {
          return confirmation;
        }

        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();

        // Prepare write parameters
        const writeParams: any = {
          address: contractAddress as Address,
          abi: [functionAbi],
          functionName: functionName,
          args: args as any
        };

        // Add value if provided (for payable functions)
        if (value) {
          const { parseEther } = await import('viem');
          writeParams.value = parseEther(value);
        }

        // Execute the write operation
        const txHash = await services.writeContract(privateKey, writeParams, network);

        return createToolResult({
          network,
          contractAddress,
          function: functionName,
          args: args.length > 0 ? args : undefined,
          value: value || undefined,
          from: senderAddress,
          txHash,
          abiSource: abiJson ? 'provided' : 'auto-fetched',
          message: "Transaction sent. Use get_transaction_receipt or wait_for_transaction to check confirmation."
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error writing to contract: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "multicall",
    {
      description: "Batch contract reads through Viem and Multicall3. Large batches may be split across RPC requests, and the selected chain must have a configured Multicall3 deployment.",
      inputSchema: z.object({
        calls: z.array(z.object({
          contractAddress: z.string().describe("The contract address"),
          functionName: z.string().describe("Function name to call"),
          args: z.array(z.string()).optional().describe("Function arguments as strings"),
          abiJson: z.string().optional().describe("Contract ABI as JSON string (optional - will auto-fetch if not provided)")
        })).describe("Array of contract calls to batch together"),
        allowFailure: z.boolean().optional().describe("If true, returns partial results even if some calls fail. Defaults to true."),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: multicallOutputSchema,
      annotations: {
        title: "Multicall (Batch Read)",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ calls, allowFailure = true, network = "ethereum" }) => {
      try {
        // Build contracts array with ABIs
        const contractsWithAbis = await Promise.all(
          calls.map(async (call) => {
            let abi: any[];
            let functionAbi: any;

            // If ABI is provided, use it
            if (call.abiJson) {
              try {
                abi = services.parseABI(call.abiJson);
                functionAbi = services.getFunctionFromABI(abi, call.functionName);
              } catch (error) {
                throw new Error(`Error parsing ABI for ${call.contractAddress}: ${error instanceof Error ? error.message : String(error)}`);
              }
            } else {
              // Try to auto-fetch ABI
              try {
                const fetchedAbi = await services.fetchContractABI(call.contractAddress as Address, network);
                abi = services.parseABI(fetchedAbi);
                functionAbi = services.getFunctionFromABI(abi, call.functionName);
              } catch (fetchError) {
                // Fall back to common function signatures
                const commonFunctions: { [key: string]: any } = {
                  'name': { inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
                  'symbol': { inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
                  'decimals': { inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
                  'totalSupply': { inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
                  'balanceOf': { inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
                  'allowance': { inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
                };

                if (!commonFunctions[call.functionName]) {
                  throw new Error(`Could not auto-fetch ABI for ${call.contractAddress}. Function '${call.functionName}' not in common signatures. Please provide abiJson parameter.`);
                }

                functionAbi = {
                  name: call.functionName,
                  type: 'function',
                  inputs: commonFunctions[call.functionName].inputs,
                  outputs: commonFunctions[call.functionName].outputs,
                  stateMutability: 'view'
                };
              }
            }

            return {
              address: call.contractAddress as Address,
              abi: [functionAbi],
              functionName: call.functionName,
              args: call.args || []
            };
          })
        );

        // Execute multicall
        const results = await services.multicall(contractsWithAbis, allowFailure, network);

        // Format results
        const formattedResults = results.map((result: any, index: number) => {
          const call = calls[index];
          if (result.status === 'success') {
            return {
              contractAddress: call.contractAddress,
              functionName: call.functionName,
              args: call.args,
              result: result.result,
              status: 'success'
            };
          } else {
            return {
              contractAddress: call.contractAddress,
              functionName: call.functionName,
              args: call.args,
              error: result.error?.message || 'Unknown error',
              status: 'failure'
            };
          }
        });

        return createToolResult({
          network,
          totalCalls: calls.length,
          successfulCalls: formattedResults.filter((r: any) => r.status === 'success').length,
          failedCalls: formattedResults.filter((r: any) => r.status === 'failure').length,
          results: formattedResults
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error executing multicall: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // TRANSFER TOOLS (Write operations)
  // ============================================================================

  server.registerTool(
    "transfer_native",
    {
      description: "Transfer native tokens (ETH, POL, etc.) to an address. Uses the configured wallet.",
      inputSchema: z.object({
        to: z.string().describe("Recipient address or ENS name"),
        amount: z.string().describe("Amount to send in whole native-token units (e.g., '0.5')"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: nativeTransferOutputSchema,
      annotations: {
        title: "Transfer Native Tokens",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ to, amount, network = "ethereum" }, ctx) => {
      try {
        const resolvedRecipient = await services.resolveAddress(to, network);
        const confirmation = await requireConfirmation(
          ctx,
          "transfer_native",
          { to, resolvedRecipient, amount, network },
          `Transfer ${amount} native tokens to ${to} (${resolvedRecipient}) on ${network}?`
        );
        if (confirmation) {
          return confirmation;
        }

        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();
        const txHash = await services.transferETH(privateKey, resolvedRecipient, amount, network);
        return createToolResult({
          network,
          from: senderAddress,
          to: resolvedRecipient,
          amount,
          txHash,
          message: "Transaction sent. Use get_transaction_receipt to check confirmation."
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error transferring native tokens: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "transfer_erc20",
    {
      description: "Transfer ERC20 tokens to an address. Uses the configured wallet.",
      inputSchema: z.object({
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        to: z.string().describe("Recipient address or ENS name"),
        amount: z.string().describe("Amount to send (in token units, accounting for decimals)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: erc20TransferOutputSchema,
      annotations: {
        title: "Transfer ERC20 Tokens",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, to, amount, network = "ethereum" }, ctx) => {
      try {
        const [resolvedTokenAddress, resolvedRecipient] = await Promise.all([
          services.resolveAddress(tokenAddress, network),
          services.resolveAddress(to, network)
        ]);
        const confirmation = await requireConfirmation(
          ctx,
          "transfer_erc20",
          {
            tokenAddress,
            resolvedTokenAddress,
            to,
            resolvedRecipient,
            amount,
            network
          },
          `Transfer ${amount} of token ${tokenAddress} (${resolvedTokenAddress}) to ${to} (${resolvedRecipient}) on ${network}?`
        );
        if (confirmation) {
          return confirmation;
        }

        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();
        const result = await services.transferERC20(
          resolvedTokenAddress,
          resolvedRecipient,
          amount,
          privateKey,
          network
        );
        return createToolResult({
          network,
          tokenAddress: resolvedTokenAddress,
          from: senderAddress,
          to: resolvedRecipient,
          amount: result.amount.formatted,
          symbol: result.token.symbol,
          decimals: result.token.decimals,
          txHash: result.txHash,
          message: "Transaction sent. Use get_transaction_receipt to check confirmation."
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error transferring ERC20 tokens: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "approve_token_spending",
    {
      description: "Approve a spender (contract) to spend tokens on your behalf. Required before interacting with DEXes, lending protocols, etc.",
      inputSchema: z.object({
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        spenderAddress: z.string().describe("The address that will be allowed to spend tokens (usually a contract)"),
        amount: z.string().describe("Amount to approve (in token units). Use '0' to revoke approval."),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: tokenApprovalOutputSchema,
      annotations: {
        title: "Approve Token Spending",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, spenderAddress, amount, network = "ethereum" }, ctx) => {
      try {
        const [resolvedTokenAddress, resolvedSpenderAddress] = await Promise.all([
          services.resolveAddress(tokenAddress, network),
          services.resolveAddress(spenderAddress, network)
        ]);
        const confirmation = await requireConfirmation(
          ctx,
          "approve_token_spending",
          {
            tokenAddress,
            resolvedTokenAddress,
            spenderAddress,
            resolvedSpenderAddress,
            amount,
            network
          },
          `Approve ${spenderAddress} (${resolvedSpenderAddress}) to spend ${amount} of token ${tokenAddress} (${resolvedTokenAddress}) on ${network}?`
        );
        if (confirmation) {
          return confirmation;
        }

        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();
        const txHash = await services.approveERC20(
          resolvedTokenAddress,
          resolvedSpenderAddress,
          amount,
          privateKey,
          network
        );
        return createToolResult({
          network,
          tokenAddress: resolvedTokenAddress,
          owner: senderAddress,
          spender: resolvedSpenderAddress,
          approvalAmount: amount,
          txHash,
          message: "Approval transaction sent. Use get_transaction_receipt to check confirmation."
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error approving token spending: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // NFT TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_nft_info",
    {
      description: "Get information about an ERC721 NFT including metadata URI",
      inputSchema: z.object({
        contractAddress: z.string().describe("The NFT contract address"),
        tokenId: z.string().describe("The NFT token ID"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: nftInfoOutputSchema,
      annotations: {
        title: "Get NFT Info",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ contractAddress, tokenId, network = "ethereum" }) => {
      try {
        const nftInfo = await services.getERC721TokenMetadata(contractAddress as Address, BigInt(tokenId), network);
        return createToolResult({
          network,
          contract: contractAddress,
          tokenId,
          ...nftInfo
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching NFT info: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_erc1155_balance",
    {
      description: "Get ERC1155 token balance for an address",
      inputSchema: z.object({
        contractAddress: z.string().describe("The ERC1155 contract address"),
        tokenId: z.string().describe("The token ID"),
        address: z.string().describe("The owner address or ENS name"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }),
      outputSchema: erc1155BalanceOutputSchema,
      annotations: {
        title: "Get ERC1155 Balance",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ contractAddress, tokenId, address, network = "ethereum" }) => {
      try {
        const balance = await services.getERC1155Balance(contractAddress as Address, address as Address, BigInt(tokenId), network);
        return createToolResult({
          network,
          contract: contractAddress,
          tokenId,
          owner: address,
          balance: balance.toString()
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching ERC1155 balance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // MESSAGE SIGNING TOOLS (Write operations)
  // ============================================================================

  server.registerTool(
    "sign_message",
    {
      description: "Sign an arbitrary message using the configured wallet. Useful for authentication (SIWE), meta-transactions, and off-chain signatures. The signature can be verified on-chain or off-chain.",
      inputSchema: z.object({
        message: z.string().describe("The plain-text message to sign")
      }),
      outputSchema: signedMessageOutputSchema,
      annotations: {
        title: "Sign Message",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ message }, ctx) => {
      const confirmation = await requireConfirmation(
        ctx,
        "sign_message",
        { message },
        `Sign this message with the configured wallet?\n\n${message}`
      );
      if (confirmation) {
        return confirmation;
      }

      try {
        const senderAddress = getWalletAddressFromKey();
        const signature = await services.signMessage(message);
        return createToolResult({
          message,
          signature,
          signer: senderAddress,
          messageType: "personal_sign"
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error signing message: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "sign_typed_data",
    {
      description: "Sign structured data (EIP-712) using the configured wallet. Used for gasless transactions, meta-transactions, permit signatures, and protocol-specific signatures. The signature follows the EIP-712 standard.",
      inputSchema: z.object({
        domainJson: z.string().describe("EIP-712 domain as JSON string with fields: name, version, chainId, verifyingContract, salt (all optional)"),
        typesJson: z.string().describe("EIP-712 types definition as JSON string (exclude EIP712Domain type - it's added automatically)"),
        primaryType: z.string().describe("The primary type name (e.g., 'Mail', 'Permit', 'MetaTransaction')"),
        messageJson: z.string().describe("The message data to sign as JSON string")
      }),
      outputSchema: signedTypedDataOutputSchema,
      annotations: {
        title: "Sign Typed Data (EIP-712)",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ domainJson, typesJson, primaryType, messageJson }, ctx) => {
      try {
        // Parse JSON inputs
        let domain, types, message;
        try {
          domain = JSON.parse(domainJson);
          types = JSON.parse(typesJson);
          message = JSON.parse(messageJson);
        } catch (parseError) {
          return {
            content: [{
              type: "text",
              text: `Error parsing JSON inputs: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            }],
            isError: true
          };
        }

        const confirmation = await requireConfirmation(
          ctx,
          "sign_typed_data",
          {
            domainJson,
            typesJson,
            primaryType,
            messageJson
          },
          `Sign EIP-712 ${primaryType} typed data with domain ${JSON.stringify(domain)}, types ${JSON.stringify(types)}, and message ${JSON.stringify(message)}?`
        );
        if (confirmation) {
          return confirmation;
        }

        const senderAddress = getWalletAddressFromKey();
        const signature = await services.signTypedData(domain, types, primaryType, message);

        return createToolResult({
          domain,
          types,
          primaryType,
          message,
          signature,
          signer: senderAddress,
          messageType: "EIP-712"
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error signing typed data: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );
}
