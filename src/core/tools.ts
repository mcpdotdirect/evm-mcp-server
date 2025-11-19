import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupportedNetworks, getRpcUrl } from "./chains.js";
import * as services from "./services/index.js";
import { type Address, type Hex, type Hash } from 'viem';
import { normalize } from 'viem/ens';

/**
 * Register all EVM-related tools with the MCP server
 *
 * All tools that accept Ethereum addresses also support ENS names (e.g., 'vitalik.eth').
 * ENS names are automatically resolved to addresses using the Ethereum Name Service.
 *
 * @param server The MCP server instance
 */
export function registerEVMTools(server: McpServer) {
  // ============================================================================
  // NETWORK INFORMATION TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_chain_info",
    {
      description: "Get information about an EVM network including chain ID, block number, and RPC URL",
      inputSchema: {
        network: z.string().optional().describe("Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Defaults to Ethereum mainnet.")
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
          content: [{ type: "text", text: `Error fetching supported networks: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "resolve_ens",
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
            content: [{ type: "text", text: `Error: Input "${ensName}" is not a valid ENS name. ENS names must contain a dot (e.g., 'name.eth').` }],
            isError: true
          };
        }
        const normalizedEns = normalize(ensName);
        const address = await services.resolveAddress(ensName, network);

        return {
          content: [{ type: "text", text: JSON.stringify({ ensName, normalizedName: normalizedEns, resolvedAddress: address, network }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error resolving ENS name: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // BLOCK TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_block_by_number",
    {
      description: "Get a block by its block number",
      inputSchema: {
        blockNumber: z.number().describe("The block number to fetch"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Get Block by Number",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ blockNumber, network = "ethereum" }) => {
      try {
        const block = await services.getBlockByNumber(blockNumber, network);
        return { content: [{ type: "text", text: services.helpers.formatJson(block) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching block ${blockNumber}: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_latest_block",
    {
      description: "Get the latest block from the EVM network",
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
        address: z.string().describe("The wallet address or ENS name to check the balance for"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Get Native Balance",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ address, network = "ethereum" }) => {
      try {
        const balance = await services.getETHBalance(address, network);
        return {
          content: [{ type: "text", text: JSON.stringify({ address, network, wei: balance.wei.toString(), ether: balance.ether }, null, 2) }]
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
    "get_erc20_balance",
    {
      description: "Get the ERC20 token balance of an address",
      inputSchema: {
        address: z.string().describe("The address to check"),
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Get ERC20 Balance",
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
              address, tokenAddress, network,
              balance: { raw: balance.raw.toString(), formatted: balance.formatted, decimals: balance.token.decimals }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching ERC20 balance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_token_balance",
    {
      description: "Get the balance of an ERC20 token for an address",
      inputSchema: {
        tokenAddress: z.string().describe("The contract address of the ERC20 token"),
        ownerAddress: z.string().describe("The wallet address or ENS name to check the balance for"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Get Token Balance",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, ownerAddress, network = "ethereum" }) => {
      try {
        const balance = await services.getERC20Balance(tokenAddress, ownerAddress, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              tokenAddress, owner: ownerAddress, network,
              raw: balance.raw.toString(), formatted: balance.formatted,
              symbol: balance.token.symbol, decimals: balance.token.decimals
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
    "get_nft_balance",
    {
      description: "Get the total number of NFTs owned by an address from a specific ERC721 collection",
      inputSchema: {
        tokenAddress: z.string().describe("The contract address of the NFT collection"),
        ownerAddress: z.string().describe("The wallet address to check the NFT balance for"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Get NFT Balance",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, ownerAddress, network = "ethereum" }) => {
      try {
        const balance = await services.getERC721Balance(tokenAddress as Address, ownerAddress as Address, network);
        return {
          content: [{ type: "text", text: JSON.stringify({ collection: tokenAddress, owner: ownerAddress, network, balance: balance.toString() }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching NFT balance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_erc1155_balance",
    {
      description: "Get the balance of a specific ERC1155 token ID owned by an address",
      inputSchema: {
        tokenAddress: z.string().describe("The contract address of the ERC1155 token collection"),
        tokenId: z.string().describe("The ID of the specific token to check"),
        ownerAddress: z.string().describe("The wallet address to check the token balance for"),
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
    async ({ tokenAddress, tokenId, ownerAddress, network = "ethereum" }) => {
      try {
        const balance = await services.getERC1155Balance(tokenAddress as Address, ownerAddress as Address, BigInt(tokenId), network);
        return {
          content: [{ type: "text", text: JSON.stringify({ contract: tokenAddress, tokenId, owner: ownerAddress, network, balance: balance.toString() }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching ERC1155 balance: ${error instanceof Error ? error.message : String(error)}` }],
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
      description: "Get detailed information about a specific transaction by its hash",
      inputSchema: {
        txHash: z.string().describe("The transaction hash to look up"),
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
      description: "Get a transaction receipt by its hash",
      inputSchema: {
        txHash: z.string().describe("The transaction hash to look up"),
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
        const receipt = await services.getTransactionReceipt(txHash as Hash, network);
        return { content: [{ type: "text", text: services.helpers.formatJson(receipt) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching receipt: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "estimate_gas",
    {
      description: "Estimate the gas cost for a transaction",
      inputSchema: {
        to: z.string().describe("The recipient address"),
        value: z.string().optional().describe("The amount of ETH to send in ether (e.g., '0.1')"),
        data: z.string().optional().describe("The transaction data as a hex string"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Estimate Gas",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ to, value, data, network = "ethereum" }) => {
      try {
        const params: any = { to: to as Address };
        if (value) params.value = services.helpers.parseEther(value);
        if (data) params.data = data as `0x${string}`;

        const gas = await services.estimateGas(params, network);
        return {
          content: [{ type: "text", text: JSON.stringify({ network, estimatedGas: gas.toString() }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error estimating gas: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // TOKEN INFO TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_token_info",
    {
      description: "Get comprehensive information about an ERC20 token including name, symbol, decimals, and total supply",
      inputSchema: {
        tokenAddress: z.string().describe("The contract address of the ERC20 token"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Get Token Info",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, network = "ethereum" }) => {
      try {
        const tokenInfo = await services.getERC20TokenInfo(tokenAddress as Address, network);
        return {
          content: [{ type: "text", text: JSON.stringify({ address: tokenAddress, network, ...tokenInfo }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching token info: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "get_nft_info",
    {
      description: "Get detailed information about a specific NFT (ERC721 token)",
      inputSchema: {
        tokenAddress: z.string().describe("The contract address of the NFT collection"),
        tokenId: z.string().describe("The ID of the specific NFT token to query"),
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
    async ({ tokenAddress, tokenId, network = "ethereum" }) => {
      try {
        const nftInfo = await services.getERC721TokenMetadata(tokenAddress as Address, BigInt(tokenId), network);
        let owner = null;
        try {
          owner = await services.getPublicClient(network).readContract({
            address: tokenAddress as Address,
            abi: [{ inputs: [{ type: 'uint256' }], name: 'ownerOf', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }],
            functionName: 'ownerOf',
            args: [BigInt(tokenId)]
          });
        } catch (e) { /* Ownership info not available */ }

        return {
          content: [{ type: "text", text: JSON.stringify({ contract: tokenAddress, tokenId, network, ...nftInfo, owner: owner || 'Unknown' }, null, 2) }]
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
    "get_erc1155_token_uri",
    {
      description: "Get the metadata URI for an ERC1155 token",
      inputSchema: {
        tokenAddress: z.string().describe("The contract address of the ERC1155 token collection"),
        tokenId: z.string().describe("The ID of the specific token to query"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Get ERC1155 Token URI",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, tokenId, network = "ethereum" }) => {
      try {
        const uri = await services.getERC1155TokenURI(tokenAddress as Address, BigInt(tokenId), network);
        return {
          content: [{ type: "text", text: JSON.stringify({ contract: tokenAddress, tokenId, network, uri }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching ERC1155 token URI: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "check_nft_ownership",
    {
      description: "Check if an address owns a specific NFT",
      inputSchema: {
        tokenAddress: z.string().describe("The contract address of the NFT collection"),
        tokenId: z.string().describe("The ID of the NFT to check"),
        ownerAddress: z.string().describe("The wallet address to check ownership against"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Check NFT Ownership",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ tokenAddress, tokenId, ownerAddress, network = "ethereum" }) => {
      try {
        const isOwner = await services.isNFTOwner(tokenAddress, ownerAddress, BigInt(tokenId), network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              tokenAddress, tokenId, ownerAddress, network, isOwner,
              result: isOwner ? "Address owns this NFT" : "Address does not own this NFT"
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error checking NFT ownership: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // CONTRACT TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "read_contract",
    {
      description: "Read data from a smart contract by calling a view/pure function. This doesn't modify blockchain state.",
      inputSchema: {
        contractAddress: z.string().describe("The address of the smart contract"),
        abi: z.array(z.any()).describe("The ABI of the smart contract function, as a JSON array"),
        functionName: z.string().describe("The name of the function to call"),
        args: z.array(z.any()).optional().describe("The arguments to pass to the function"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Read Contract",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ contractAddress, abi, functionName, args = [], network = "ethereum" }) => {
      try {
        const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;
        const params = {
          address: contractAddress as Address,
          abi: parsedAbi,
          functionName: functionName as string,
          args: args as readonly unknown[]
        };
        const result = await services.readContract(params, network as string);
        return { content: [{ type: "text", text: services.helpers.formatJson(result) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error reading contract: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "is_contract",
    {
      description: "Check if an address is a smart contract or an externally owned account (EOA)",
      inputSchema: {
        address: z.string().describe("The address to check"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Is Contract",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ address, network = "ethereum" }) => {
      try {
        const isContract = await services.isContract(address, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              address, network, isContract,
              type: isContract ? "Contract" : "Externally Owned Account (EOA)"
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error checking if address is a contract: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // WALLET TOOLS (Read-only)
  // ============================================================================

  server.registerTool(
    "get_address_from_private_key",
    {
      description: "Get the EVM address derived from a private key",
      inputSchema: {
        privateKey: z.string().describe("Private key in hex format. SECURITY: Used only for address derivation and is not stored.")
      },
      annotations: {
        title: "Get Address from Private Key",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ privateKey }) => {
      try {
        const formattedKey = privateKey.startsWith('0x') ? privateKey as Hex : `0x${privateKey}` as Hex;
        const address = services.getAddressFromPrivateKey(formattedKey);
        return {
          content: [{ type: "text", text: JSON.stringify({ address }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error deriving address: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  // ============================================================================
  // TRANSFER TOOLS (Destructive - modify blockchain state)
  // ============================================================================

  server.registerTool(
    "transfer_eth",
    {
      description: "Transfer native tokens (ETH, MATIC, etc.) to an address. This modifies blockchain state.",
      inputSchema: {
        privateKey: z.string().describe("Private key of the sender. SECURITY: Used only for signing and is not stored."),
        to: z.string().describe("The recipient address or ENS name"),
        amount: z.string().describe("Amount to send in ether (e.g., '0.1')"),
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
    async ({ privateKey, to, amount, network = "ethereum" }) => {
      try {
        const txHash = await services.transferETH(privateKey, to, amount, network);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, txHash, to, amount, network }, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error transferring: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "transfer_erc20",
    {
      description: "Transfer ERC20 tokens to another address. This modifies blockchain state.",
      inputSchema: {
        privateKey: z.string().describe("Private key of the sender. SECURITY: Used only for signing and is not stored."),
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        toAddress: z.string().describe("The recipient address"),
        amount: z.string().describe("Amount of tokens to send (e.g., '10' for 10 tokens)"),
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
    async ({ privateKey, tokenAddress, toAddress, amount, network = "ethereum" }) => {
      try {
        const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
        const result = await services.transferERC20(tokenAddress as Address, toAddress as Address, amount, formattedKey, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true, txHash: result.txHash, network, tokenAddress,
              recipient: toAddress, amount: result.amount.formatted, symbol: result.token.symbol
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error transferring ERC20: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "transfer_token",
    {
      description: "Transfer ERC20 tokens to an address (alias for transfer_erc20)",
      inputSchema: {
        privateKey: z.string().describe("Private key of the sender. SECURITY: Used only for signing."),
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        toAddress: z.string().describe("The recipient address or ENS name"),
        amount: z.string().describe("Amount of tokens to send"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Transfer Token",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ privateKey, tokenAddress, toAddress, amount, network = "ethereum" }) => {
      try {
        const result = await services.transferERC20(tokenAddress, toAddress, amount, privateKey, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true, txHash: result.txHash, tokenAddress, toAddress,
              amount: result.amount.formatted, symbol: result.token.symbol, network
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error transferring tokens: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "transfer_nft",
    {
      description: "Transfer an NFT (ERC721 token) to another address. This modifies blockchain state.",
      inputSchema: {
        privateKey: z.string().describe("Private key of the NFT owner. SECURITY: Used only for signing."),
        tokenAddress: z.string().describe("The NFT collection contract address"),
        tokenId: z.string().describe("The ID of the NFT to transfer"),
        toAddress: z.string().describe("The recipient address"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Transfer NFT",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ privateKey, tokenAddress, tokenId, toAddress, network = "ethereum" }) => {
      try {
        const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
        const result = await services.transferERC721(tokenAddress as Address, toAddress as Address, BigInt(tokenId), formattedKey, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true, txHash: result.txHash, network, collection: tokenAddress,
              tokenId: result.tokenId, recipient: toAddress, name: result.token.name, symbol: result.token.symbol
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error transferring NFT: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "transfer_erc1155",
    {
      description: "Transfer ERC1155 tokens to another address. This modifies blockchain state.",
      inputSchema: {
        privateKey: z.string().describe("Private key of the token owner. SECURITY: Used only for signing."),
        tokenAddress: z.string().describe("The ERC1155 token collection contract address"),
        tokenId: z.string().describe("The ID of the token to transfer"),
        amount: z.string().describe("The quantity of tokens to send"),
        toAddress: z.string().describe("The recipient address"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Transfer ERC1155 Tokens",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ privateKey, tokenAddress, tokenId, amount, toAddress, network = "ethereum" }) => {
      try {
        const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
        const result = await services.transferERC1155(tokenAddress as Address, toAddress as Address, BigInt(tokenId), amount, formattedKey, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true, txHash: result.txHash, network, contract: tokenAddress,
              tokenId: result.tokenId, amount: result.amount, recipient: toAddress
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error transferring ERC1155: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "approve_token_spending",
    {
      description: "Approve another address to spend your ERC20 tokens. This modifies blockchain state.",
      inputSchema: {
        privateKey: z.string().describe("Private key of the token owner. SECURITY: Used only for signing."),
        tokenAddress: z.string().describe("The ERC20 token contract address"),
        spenderAddress: z.string().describe("The address being approved to spend tokens"),
        amount: z.string().describe("The amount of tokens to approve"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      },
      annotations: {
        title: "Approve Token Spending",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ privateKey, tokenAddress, spenderAddress, amount, network = "ethereum" }) => {
      try {
        const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
        const result = await services.approveERC20(tokenAddress as Address, spenderAddress as Address, amount, formattedKey, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true, txHash: result.txHash, network, tokenAddress,
              spender: spenderAddress, amount: result.amount.formatted, symbol: result.token.symbol
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error approving: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "write_contract",
    {
      description: "Write data to a smart contract by calling a state-changing function. This modifies blockchain state.",
      inputSchema: {
        contractAddress: z.string().describe("The smart contract address"),
        abi: z.array(z.any()).describe("The ABI of the function, as a JSON array"),
        functionName: z.string().describe("The name of the function to call"),
        args: z.array(z.any()).describe("The arguments to pass to the function"),
        privateKey: z.string().describe("Private key of the sender. SECURITY: Used only for signing."),
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
    async ({ contractAddress, abi, functionName, args, privateKey, network = "ethereum" }) => {
      try {
        const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;
        const contractParams: Record<string, any> = {
          address: contractAddress as Address,
          abi: parsedAbi,
          functionName,
          args
        };
        const txHash = await services.writeContract(privateKey as Hex, contractParams, network);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ network, transactionHash: txHash, message: "Contract write transaction sent successfully" }, null, 2)
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
}
