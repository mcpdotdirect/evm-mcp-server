import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupportedNetworks, getRpcUrl } from "./chains.js";
import * as services from "./services/index.js";
import { type Address, type Hex, type Hash } from 'viem';
import { normalize } from 'viem/ens';

/**
 * Register all EVM-related tools with the MCP server
 *
 * SECURITY: Either EVM_PRIVATE_KEY or EVM_MNEMONIC environment variable must be set for write operations.
 * Private keys and mnemonics are never passed as tool arguments for security reasons.
 * Tools will use the configured wallet for all transactions.
 *
 * Configuration options:
 * - EVM_PRIVATE_KEY: Hex private key (with or without 0x prefix)
 * - EVM_MNEMONIC: BIP-39 mnemonic phrase (12 or 24 words)
 * - EVM_ACCOUNT_INDEX: Optional account index for HD wallet derivation (default: 0)
 *
 * All tools that accept addresses also support ENS names (e.g., 'vitalik.eth').
 * ENS names are automatically resolved to addresses using the Ethereum Name Service.
 *
 * @param server The MCP server instance
 */
export function registerEVMTools(server: McpServer) {
  // Helpers are now imported from services/wallet.ts
  const { getConfiguredPrivateKey, getWalletAddressFromKey, getConfiguredWallet } = services;

  // ============================================================================
  // WALLET INFORMATION TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_wallet_address",
    {
      description: "Get the address of the configured wallet. Use this to verify which wallet is active.",
      inputSchema: {},
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
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              address,
              message: "This is the wallet that will be used for all transactions"
            }, null, 2)
          }]
        };
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
      inputSchema: {
        network: z.string().optional().describe("Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base') or chain ID. Defaults to Ethereum mainnet.")
      },
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

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ network, chainId, blockNumber: blockNumber.toString(), rpcUrl }, null, 2)
          }]
        };
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
      description: "Get a list of all supported EVM networks",
      inputSchema: {},
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
        return {
          content: [{ type: "text", text: JSON.stringify({ supportedNetworks: networks }, null, 2) }]
        };
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
      description: "Get current gas prices (base fee, standard, and fast) for a network",
      inputSchema: {
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        const [baseFee, priorityFee] = await Promise.all([
          client.getGasPrice(),
          client.estimateMaxPriorityFeePerGas()
        ]);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              baseFeePerGas: baseFee.toString(),
              priorityFeePerGas: priorityFee?.toString() || "N/A",
              currency: "wei"
            }, null, 2)
          }]
        };
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
      inputSchema: {
        ensName: z.string().describe("ENS name to resolve (e.g., 'vitalik.eth')"),
        network: z.string().optional().describe("Network name or chain ID. ENS resolution works best on Ethereum mainnet. Defaults to Ethereum mainnet.")
      },
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

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ensName,
              normalizedName: normalizedEns,
              resolvedAddress: address,
              network
            }, null, 2)
          }]
        };
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
      inputSchema: {
        address: z.string().describe("Ethereum address to lookup"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              address,
              ensName: ensName || "No ENS name found",
              network
            }, null, 2)
          }]
        };
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
      inputSchema: {
        blockIdentifier: z.string().describe("Block number (as string) or block hash"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return { content: [{ type: "text", text: services.helpers.formatJson(block) }] };
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
      inputSchema: {
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return { content: [{ type: "text", text: services.helpers.formatJson(block) }] };
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
      description: "Get the native token balance (ETH, MATIC, etc.) for an address",
      inputSchema: {
        address: z.string().describe("The wallet address or ENS name"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              address,
              balance: { wei: balance.wei.toString(), ether: balance.ether }
            }, null, 2)
          }]
        };
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
      inputSchema: {
        address: z.string().describe("The wallet address or ENS name"),
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              tokenAddress,
              address,
              balance: {
                raw: balance.raw.toString(),
                formatted: balance.formatted,
                symbol: balance.token.symbol,
                decimals: balance.token.decimals
              }
            }, null, 2)
          }]
        };
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
      inputSchema: {
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        spenderAddress: z.string().describe("The address allowed to spend the token (usually a contract address)"),
        ownerAddress: z.string().optional().describe("The owner address (defaults to the configured wallet)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              tokenAddress,
              owner,
              spenderAddress,
              allowance: allowance.toString(),
              message: allowance === 0n ? "No allowance set" : "Allowance is set"
            }, null, 2)
          }]
        };
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
      inputSchema: {
        txHash: z.string().describe("Transaction hash (0x...)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return { content: [{ type: "text", text: services.helpers.formatJson(tx) }] };
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
      inputSchema: {
        txHash: z.string().describe("Transaction hash (0x...)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return { content: [{ type: "text", text: services.helpers.formatJson(receipt) }] };
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
      description: "Wait for a transaction to be confirmed (mined). Polls the network until confirmation.",
      inputSchema: {
        txHash: z.string().describe("Transaction hash (0x...)"),
        confirmations: z.number().optional().describe("Number of block confirmations required. Defaults to 1."),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Wait For Transaction",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ txHash, confirmations = 1, network = "ethereum" }) => {
      try {
        const client = await services.getPublicClient(network);
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash as Hash,
          confirmations
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              txHash,
              status: receipt.status === 'success' ? 'confirmed' : 'failed',
              blockNumber: receipt.blockNumber.toString(),
              gasUsed: receipt.gasUsed.toString(),
              confirmations
            }, null, 2)
          }]
        };
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
      description: "Fetch a contract's full ABI from Etherscan/block explorers. Use this to understand verified contracts before interacting. Requires ETHERSCAN_API_KEY. Supports 30+ EVM networks. Works best with verified contracts on block explorers.",
      inputSchema: {
        contractAddress: z.string().describe("The contract address (0x...)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to ethereum. Supported: ethereum, polygon, arbitrum, optimism, base, avalanche, gnosis, fantom, bsc, celo, scroll, linea, zksync, manta, blast, and testnets (sepolia, mumbai, arbitrum-sepolia, optimism-sepolia, base-sepolia, avalanche-fuji)")
      },
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

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              contractAddress,
              network,
              abiFormat: "json",
              readableFunctions,
              totalFunctions: parsed.filter(i => i.type === 'function').length,
              abi: parsed
            }, null, 2)
          }]
        };
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
      inputSchema: {
        contractAddress: z.string().describe("The contract address"),
        functionName: z.string().describe("Function name (e.g., 'name', 'symbol', 'balanceOf', 'totalSupply', 'owner')"),
        args: z.array(z.string()).optional().describe("Function arguments as strings (e.g., ['0xAddress'] for balanceOf)"),
        abiJson: z.string().optional().describe("Full contract ABI as JSON string (optional - will auto-fetch verified contract ABI if not provided)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              contractAddress,
              function: functionName,
              args: args.length > 0 ? args : undefined,
              result: result?.toString(),
              abiSource: abiJson ? 'provided' : 'auto-fetched or built-in'
            }, null, 2)
          }]
        };
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
      description: "Execute state-changing functions on a smart contract. Automatically fetches ABI from block explorer if not provided (requires ETHERSCAN_API_KEY). Use this to call any write function on verified contracts. Requires wallet to be configured (via private key or mnemonic).",
      inputSchema: {
        contractAddress: z.string().describe("The contract address"),
        functionName: z.string().describe("Function name to call (e.g., 'mint', 'swap', 'stake', 'approve')"),
        args: z.array(z.string()).optional().describe("Function arguments as strings (e.g., ['0xAddress', '1000000'])"),
        value: z.string().optional().describe("ETH value to send with transaction in ether (e.g., '0.1' for payable functions)"),
        abiJson: z.string().optional().describe("Full contract ABI as JSON string (optional - will auto-fetch verified contract ABI if not provided)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Write to Smart Contract",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ contractAddress, functionName, args = [], value, abiJson, network = "ethereum" }) => {
      try {
        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();
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

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              contractAddress,
              function: functionName,
              args: args.length > 0 ? args : undefined,
              value: value || undefined,
              from: senderAddress,
              txHash,
              abiSource: abiJson ? 'provided' : 'auto-fetched',
              message: "Transaction sent. Use get_transaction_receipt or wait_for_transaction to check confirmation."
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error writing to contract: ${error instanceof Error ? error.message : String(error)}` }],
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
      description: "Transfer native tokens (ETH, MATIC, etc.) to an address. Uses the configured wallet.",
      inputSchema: {
        to: z.string().describe("Recipient address or ENS name"),
        amount: z.string().describe("Amount to send in ether (e.g., '0.5' for 0.5 ETH)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Transfer Native Tokens",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ to, amount, network = "ethereum" }) => {
      try {
        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();
        const txHash = await services.transferETH(privateKey, to as Address, amount, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              from: senderAddress,
              to,
              amount,
              txHash,
              message: "Transaction sent. Use get_transaction_receipt to check confirmation."
            }, null, 2)
          }]
        };
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
      inputSchema: {
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        to: z.string().describe("Recipient address or ENS name"),
        amount: z.string().describe("Amount to send (in token units, accounting for decimals)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Transfer ERC20 Tokens",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, to, amount, network = "ethereum" }) => {
      try {
        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();
        const result = await services.transferERC20(tokenAddress as Address, to as Address, amount, privateKey, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              tokenAddress,
              from: senderAddress,
              to,
              amount: result.amount.formatted,
              symbol: result.token.symbol,
              decimals: result.token.decimals,
              txHash: result.txHash,
              message: "Transaction sent. Use get_transaction_receipt to check confirmation."
            }, null, 2)
          }]
        };
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
      inputSchema: {
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        spenderAddress: z.string().describe("The address that will be allowed to spend tokens (usually a contract)"),
        amount: z.string().describe("Amount to approve (in token units). Use '0' to revoke approval."),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Approve Token Spending",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, spenderAddress, amount, network = "ethereum" }) => {
      try {
        const privateKey = getConfiguredPrivateKey();
        const senderAddress = getWalletAddressFromKey();
        const txHash = await services.approveERC20(privateKey, tokenAddress as Address, spenderAddress as Address, amount, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              tokenAddress,
              owner: senderAddress,
              spender: spenderAddress,
              approvalAmount: amount,
              txHash,
              message: "Approval transaction sent. Use get_transaction_receipt to check confirmation."
            }, null, 2)
          }]
        };
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
      inputSchema: {
        contractAddress: z.string().describe("The NFT contract address"),
        tokenId: z.string().describe("The NFT token ID"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              contract: contractAddress,
              tokenId,
              ...nftInfo
            }, null, 2)
          }]
        };
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
      inputSchema: {
        contractAddress: z.string().describe("The ERC1155 contract address"),
        tokenId: z.string().describe("The token ID"),
        address: z.string().describe("The owner address or ENS name"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
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
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network,
              contract: contractAddress,
              tokenId,
              owner: address,
              balance: balance.toString()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching ERC1155 balance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );
}
