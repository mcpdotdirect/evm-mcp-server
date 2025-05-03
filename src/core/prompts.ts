import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register all EVM-related prompts with the MCP server
 * @param server The MCP server instance
 */
export function registerEVMPrompts(server: McpServer) {
  // Basic block explorer prompt
  server.prompt(
    "explore_block",
    "Explore information about a specific block",
    z.object({
      blockNumber: z.string().optional().describe("Block number to explore. If not provided, latest block will be used."),
      network: z.string().optional().describe("Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet.")
    }),
    ({ blockNumber, network = "ethereum" }: { blockNumber?: string, network?: string }) => ({
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
  server.prompt(
    "analyze_transaction",
    "Analyze a specific transaction",
    z.object({
      txHash: z.string().describe("Transaction hash to analyze"),
      network: z.string().optional().describe("Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet.")
    }),
    ({ txHash, network = "ethereum" }: { txHash: string, network?: string }) => ({
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
  server.prompt(
    "analyze_address",
    "Analyze an EVM address",
    z.object({
      address: z.string().describe("Ethereum address or ENS name to analyze"),
      network: z.string().optional().describe("Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet.")
    }),
    ({ address, network = "ethereum" }: { address: string, network?: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please analyze the address ${address} (resolve if it's an ENS name) on the ${network} network. Provide information about its balance, transaction count, associated ENS name (if applicable), and any other relevant information you can find.`
        }
      }]
    })
  );

  // ENS Name Resolution Prompt
  server.prompt(
    "resolve_ens_name",
    "Resolve an ENS name to an Ethereum address",
    z.object({
      ensName: z.string().describe("The ENS name to resolve (e.g., 'vitalik.eth')"),
      network: z.string().optional().describe("Network name (e.g., 'ethereum', 'goerli'). Defaults to Ethereum mainnet.")
    }),
    ({ ensName, network = "ethereum" }: { ensName: string, network?: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please resolve the ENS name "${ensName}" to its corresponding Ethereum address on the ${network} network.`
        }
      }]
    })
  );

  // ENS Reverse Lookup Prompt (Address to Name)
  server.prompt(
    "lookup_ens_address",
    "Find the primary ENS name associated with an Ethereum address",
    z.object({
      address: z.string().describe("The Ethereum address to look up"),
      network: z.string().optional().describe("Network name (e.g., 'ethereum', 'goerli'). Defaults to Ethereum mainnet.")
    }),
    ({ address, network = "ethereum" }: { address: string, network?: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please find the primary ENS name associated with the Ethereum address ${address} on the ${network} network.`
        }
      }]
    })
  );

  // ENS Get Text Record Prompt
  server.prompt(
    "get_ens_text_record",
    "Get a specific text record for an ENS name",
    z.object({
      ensName: z.string().describe("The ENS name (e.g., 'vitalik.eth')"),
      recordKey: z.string().describe("The text record key (e.g., 'avatar', 'url', 'com.github')"),
      network: z.string().optional().describe("Network name (e.g., 'ethereum', 'goerli'). Defaults to Ethereum mainnet.")
    }),
    ({ ensName, recordKey, network = "ethereum" }: { ensName: string, recordKey: string, network?: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please retrieve the text record with the key "${recordKey}" for the ENS name "${ensName}" on the ${network} network.`
        }
      }]
    })
  );

  // Smart contract interaction guidance
  server.prompt(
    "interact_with_contract",
    "Get guidance on interacting with a smart contract",
    z.object({
      contractAddress: z.string().describe("The contract address or ENS name"),
      abiJson: z.string().optional().describe("The contract ABI as a JSON string"),
      network: z.string().optional().describe("Network name or chain ID. Defaults to Ethereum mainnet.")
    }),
    ({ contractAddress, abiJson, network = "ethereum" }: { contractAddress: string, abiJson?: string, network?: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: abiJson
            ? `I need to interact with the smart contract at address ${contractAddress} (resolve if ENS name) on the ${network} network. Here's the ABI:\n\n${abiJson}\n\nPlease analyze this contract's functions and provide guidance on how to interact with it safely. Explain what each function does and what parameters it requires.`
            : `I need to interact with the smart contract at address ${contractAddress} (resolve if ENS name) on the ${network} network. Please help me understand what this contract does and how I can interact with it safely.`
        }
      }]
    })
  );

  // EVM concept explanation
  server.prompt(
    "explain_evm_concept",
    "Get an explanation of an EVM concept",
    z.object({
      concept: z.string().describe("The EVM concept to explain (e.g., gas, nonce, ENS, etc.)")
    }),
    ({ concept }: { concept: string }) => ({
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
  server.prompt(
    "compare_networks",
    "Compare different EVM-compatible networks",
    z.object({
      networkList: z.string().describe("Comma-separated list of networks to compare (e.g., 'ethereum,optimism,arbitrum')")
    }),
    ({ networkList }: { networkList: string }) => {
      const networks = networkList.split(',').map((n: string) => n.trim());
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please compare the following EVM-compatible networks: ${networks.join(', ')}. Include information about their architecture, gas fees, transaction speed, security, ENS support (if applicable), and any other relevant differences.`
          }
        }]
      };
    }
  );

  // Token analysis prompt
  server.prompt(
    "analyze_token",
    "Analyze an ERC20 or NFT token",
    z.object({
      tokenAddress: z.string().describe("Token contract address or ENS name to analyze"),
      tokenType: z.string().optional().describe("Type of token to analyze (erc20, erc721/nft, or auto-detect). Defaults to auto."),
      tokenId: z.string().optional().describe("Token ID (required for NFT analysis)"),
      network: z.string().optional().describe("Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet.")
    }),
    ({ tokenAddress, tokenType = "auto", tokenId, network = "ethereum" }: { tokenAddress: string, tokenType?: string, tokenId?: string, network?: string }) => {
      let promptText = "";
      const addressDesc = `address ${tokenAddress} (resolve if ENS name)`;

      if (tokenType === "erc20" || tokenType === "auto") {
        promptText = `Please analyze the ERC20 token at ${addressDesc} on the ${network} network. Provide information about its name, symbol, total supply, and any other relevant details. If possible, explain the token's purpose, utility, and market context. If auto-detecting, confirm if it's an ERC20.`;
      } else if ((tokenType === "erc721" || tokenType === "nft") && tokenId) {
        promptText = `Please analyze the NFT with token ID ${tokenId} from the collection at ${addressDesc} on the ${network} network. Provide information about the collection name, token details, ownership history if available, and any other relevant information about this specific NFT.`;
      } else if (tokenType === "nft" || tokenType === "erc721") {
        promptText = `Please analyze the NFT collection at ${addressDesc} on the ${network} network. Provide information about the collection name, symbol, total supply if available, floor price if available, and any other relevant details about this NFT collection.`;
      } else if (tokenType === "auto" && tokenId) {
         // Handle auto-detect case where tokenId is provided (likely NFT)
         promptText = `Please analyze the token at ${addressDesc} on the ${network} network, likely an NFT with ID ${tokenId}. Determine the token type (ERC721 or other) and provide relevant details like collection name, token specifics, ownership, etc.`;
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