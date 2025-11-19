import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register all EVM-related prompts with the MCP server
 * @param server The MCP server instance
 */
export function registerEVMPrompts(server: McpServer) {
  // Basic block explorer prompt
  server.registerPrompt(
    "explore_block",
    {
      description: "Explore information about a specific block",
      argsSchema: {
        blockNumber: z.string().optional().describe("Block number to explore. If not provided, latest block will be used."),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }
    },
    ({ blockNumber, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: blockNumber
            ? `Please analyze block #${blockNumber} on the ${network} network and provide information about its key metrics, transactions, and significance.`
            : `Please analyze the latest block on the ${network} network and provide information about its key metrics, transactions, and significance.`
        }
      }]
    })
  );

  // Transaction analysis prompt
  server.registerPrompt(
    "analyze_transaction",
    {
      description: "Analyze a specific transaction",
      argsSchema: {
        txHash: z.string().describe("Transaction hash to analyze"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }
    },
    ({ txHash, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please analyze transaction ${txHash} on the ${network} network and provide a detailed explanation of what this transaction does, who the parties involved are, the amount transferred (if applicable), gas used, and any other relevant information.`
        }
      }]
    })
  );

  // Address analysis prompt
  server.registerPrompt(
    "analyze_address",
    {
      description: "Analyze an EVM address",
      argsSchema: {
        address: z.string().describe("Ethereum address to analyze"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }
    },
    ({ address, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please analyze the address ${address} on the ${network} network. Provide information about its balance, transaction count, and any other relevant information you can find.`
        }
      }]
    })
  );

  // Smart contract interaction guidance
  server.registerPrompt(
    "interact_with_contract",
    {
      description: "Get guidance on interacting with a smart contract",
      argsSchema: {
        contractAddress: z.string().describe("The contract address"),
        abiJson: z.string().optional().describe("The contract ABI as a JSON string"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }
    },
    ({ contractAddress, abiJson, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: abiJson
            ? `I need to interact with the smart contract at address ${contractAddress} on the ${network} network. Here's the ABI:\n\n${abiJson}\n\nPlease analyze this contract's functions and provide guidance on how to interact with it safely.`
            : `I need to interact with the smart contract at address ${contractAddress} on the ${network} network. Please help me understand what this contract does and how I can interact with it safely.`
        }
      }]
    })
  );

  // EVM concept explanation
  server.registerPrompt(
    "explain_evm_concept",
    {
      description: "Get an explanation of an EVM concept",
      argsSchema: {
        concept: z.string().describe("The EVM concept to explain (e.g., gas, nonce, etc.)")
      }
    },
    ({ concept }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please explain the EVM Blockchain concept of "${concept}" in detail. Include how it works, why it's important, and provide examples if applicable.`
        }
      }]
    })
  );

  // Network comparison
  server.registerPrompt(
    "compare_networks",
    {
      description: "Compare different EVM-compatible networks",
      argsSchema: {
        networkList: z.string().describe("Comma-separated list of networks to compare")
      }
    },
    ({ networkList }) => {
      const networks = networkList.split(',').map(n => n.trim());
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please compare the following EVM-compatible networks: ${networks.join(', ')}. Include information about their architecture, gas fees, transaction speed, security, and any other relevant differences.`
          }
        }]
      };
    }
  );

  // Token analysis prompt
  server.registerPrompt(
    "analyze_token",
    {
      description: "Analyze an ERC20 or NFT token",
      argsSchema: {
        tokenAddress: z.string().describe("Token contract address to analyze"),
        tokenType: z.string().optional().describe("Type of token (erc20, erc721/nft, or auto-detect)"),
        tokenId: z.string().optional().describe("Token ID (required for NFT analysis)"),
        network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
      }
    },
    ({ tokenAddress, tokenType = "auto", tokenId, network = "ethereum" }) => {
      let promptText = "";

      if (tokenType === "erc20" || tokenType === "auto") {
        promptText = `Please analyze the ERC20 token at address ${tokenAddress} on the ${network} network. Provide information about its name, symbol, total supply, and any other relevant details.`;
      } else if ((tokenType === "erc721" || tokenType === "nft") && tokenId) {
        promptText = `Please analyze the NFT with token ID ${tokenId} from the collection at address ${tokenAddress} on the ${network} network. Provide information about the collection name, token details, and any other relevant information.`;
      } else if (tokenType === "nft" || tokenType === "erc721") {
        promptText = `Please analyze the NFT collection at address ${tokenAddress} on the ${network} network. Provide information about the collection name, symbol, total supply if available, and any other relevant details.`;
      }

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: promptText
          }
        }]
      };
    }
  );
}
