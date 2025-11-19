import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register task-oriented prompts with the MCP server
 *
 * Prompts function like macros - they guide the model through complex multi-step workflows.
 * Instead of the AI agent having to discover and call multiple tools in the right sequence,
 * these prompts provide a structured approach to common blockchain tasks.
 *
 * @param server The MCP server instance
 */
export function registerEVMPrompts(server: McpServer) {
  // ============================================================================
  // TRANSACTION PREPARATION PROMPTS
  // ============================================================================

  server.registerPrompt(
    "prepare_transfer",
    {
      description: "Guide through preparing a token transfer with safety checks",
      argsSchema: {
        tokenType: z.enum(["native", "erc20"]).describe("Type of token: 'native' for ETH/MATIC, 'erc20' for contract tokens"),
        recipient: z.string().describe("Recipient address or ENS name"),
        amount: z.string().describe("Amount to transfer"),
        network: z.string().optional().describe("Network name (e.g., 'ethereum', 'polygon'). Defaults to Ethereum mainnet."),
        tokenAddress: z.string().optional().describe("Token contract address (required for ERC20 transfers)")
      }
    },
    ({ tokenType, recipient, amount, network = "ethereum", tokenAddress }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: tokenType === "native"
            ? `I want to transfer ${amount} native tokens (${network === "ethereum" ? "ETH" : "MATIC"}) to ${recipient} on ${network}.

Before proceeding:
1. Call get_wallet_address to confirm which wallet will send the transaction
2. Call get_balance to verify I have enough balance
3. Call get_gas_price to understand current gas costs
4. Summarize the transaction details and ask for confirmation before executing
5. Call transfer_native once approved
6. Wait for confirmation with wait_for_transaction

Be clear about gas costs and the impact of this transaction.`
            : `I want to transfer ${amount} tokens (contract: ${tokenAddress}) to ${recipient} on ${network}.

Before proceeding:
1. Call get_wallet_address to confirm which wallet will send the transaction
2. Call get_token_balance to verify I have enough balance
3. Call get_gas_price to understand current gas costs
4. Check if an approval is needed (call get_allowance for your DEX/protocol)
5. Summarize the transaction details and ask for confirmation before executing
6. If approval needed, call approve_token_spending first
7. Call transfer_erc20 once approved
8. Wait for confirmation with wait_for_transaction

Be clear about gas costs, token decimals, and the impact of this transaction.`
        }
      }]
    })
  );

  server.registerPrompt(
    "diagnose_transaction",
    {
      description: "Analyze a failed or pending transaction and suggest solutions",
      argsSchema: {
        txHash: z.string().describe("Transaction hash (0x...)"),
        network: z.string().optional().describe("Network name. Defaults to Ethereum mainnet.")
      }
    },
    ({ txHash, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please diagnose this transaction: ${txHash} on ${network}

Follow these steps:
1. Call get_transaction to get the transaction details
2. Call get_transaction_receipt to check the status and gas used
3. Analyze what went wrong or what the transaction is doing
4. If it failed:
   - Check if it was out of gas
   - Check if it was a contract revert
   - Look at the gas limit vs gas used
5. Provide:
   - Current status (pending/confirmed/failed)
   - Why it failed (if applicable)
   - Gas analysis
   - Recommended next steps

Be specific about the issues and provide actionable solutions.`
        }
      }]
    })
  );

  // ============================================================================
  // WALLET ANALYSIS PROMPTS
  // ============================================================================

  server.registerPrompt(
    "analyze_wallet",
    {
      description: "Get a comprehensive overview of a wallet's assets and activity",
      argsSchema: {
        address: z.string().describe("Wallet address or ENS name to analyze"),
        network: z.string().optional().describe("Network name. Defaults to Ethereum mainnet."),
        tokens: z.string().optional().describe("Comma-separated list of ERC20 token addresses to check balance for")
      }
    },
    ({ address, network = "ethereum", tokens }) => {
      const tokenList = tokens ? tokens.split(',').map(t => t.trim()) : [];
      return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please analyze the wallet ${address} on ${network}:

1. Call resolve_ens_name if the input looks like an ENS name, otherwise use it as an address
2. Call get_balance to get the native token balance
3. If tokens are specified, call get_token_balance for each token to show holdings
4. Provide a summary with:
   - Wallet address and ENS name (if any)
   - Native token balance (in both wei and ether)
   - Token holdings (if checked)
   - Overall asset overview

Format the results in a clear, readable way. If the wallet has no balance, let the user know.`
        }
      }]
      };
    }
  );

  server.registerPrompt(
    "audit_approvals",
    {
      description: "Review token approvals for a wallet and identify security risks",
      argsSchema: {
        address: z.string().optional().describe("Wallet address to audit (defaults to configured wallet)"),
        tokenAddress: z.string().describe("ERC20 token contract address to check approvals for"),
        network: z.string().optional().describe("Network name. Defaults to Ethereum mainnet.")
      }
    },
    ({ address, tokenAddress, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please audit token approvals for ${tokenAddress} on ${network}${address ? ` for address ${address}` : " for the configured wallet"}:

1. If no address is provided, call get_wallet_address to get the configured wallet
2. Call get_allowance to check if there are any existing approvals
3. Analyze the approval amount and what it means:
   - If allowance is 0: No approval set
   - If allowance is a normal amount: Limited approval (safe)
   - If allowance is max uint256: Unlimited approval (security risk)
4. Provide recommendations:
   - Is the current approval appropriate?
   - Should any dangerous approvals be revoked?
   - What approvals should be set up before interacting with protocols?

Be clear about the security implications of unlimited approvals.`
        }
      }]
    })
  );

  // ============================================================================
  // SMART CONTRACT EXPLORATION PROMPTS
  // ============================================================================

  server.registerPrompt(
    "explore_contract",
    {
      description: "Analyze a smart contract to understand its functions and state",
      argsSchema: {
        contractAddress: z.string().describe("The contract address to explore"),
        network: z.string().optional().describe("Network name. Defaults to Ethereum mainnet.")
      }
    },
    ({ contractAddress, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please explore the smart contract at ${contractAddress} on ${network}:

1. This is a read-only exploration - no transactions will be executed
2. Identify what type of contract this is (token, NFT, DEX, lending, etc.)
3. Try to read common functions that might exist:
   - For tokens: name(), symbol(), decimals(), totalSupply()
   - For NFTs: name(), symbol(), totalSupply()
   - For other contracts: relevant state functions
4. Use read_contract to call these functions
5. Provide a summary with:
   - Contract type and purpose (best guess)
   - Key properties discovered
   - Security notes (if applicable)
   - Next steps for interacting with it

Be clear about what you were able to discover and what remains unknown.`
        }
      }]
    })
  );

  server.registerPrompt(
    "explain_evm_concept",
    {
      description: "Get an explanation of an EVM or blockchain concept",
      argsSchema: {
        concept: z.string().describe("The concept to explain (e.g., 'gas', 'nonce', 'smart contracts', 'MEV')")
      }
    },
    ({ concept }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please explain the blockchain/EVM concept: "${concept}"

In your explanation:
1. Define what it is in simple terms
2. Explain why it matters
3. Give practical examples
4. Explain how it affects using blockchain applications
5. If relevant, mention how to check or monitor it on the blockchain

Make it accessible for someone new to blockchain but interested in using EVM networks.`
        }
      }]
    })
  );

  // ============================================================================
  // NETWORK INFORMATION PROMPTS
  // ============================================================================

  server.registerPrompt(
    "compare_networks",
    {
      description: "Compare different EVM networks to understand their differences",
      argsSchema: {
        networks: z.string().describe("Comma-separated list of network names to compare (e.g., 'ethereum,polygon,arbitrum')")
      }
    },
    ({ networks }) => {
      const networkList = networks.split(',').map(n => n.trim());
      return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please compare these EVM networks: ${networkList.join(", ")}

For each network:
1. Call get_chain_info to get current chain ID and block number
2. Call get_gas_price to understand current gas costs
3. Provide comparison across:
   - Chain characteristics (mainnet, testnet, etc.)
   - Current gas prices
   - Block time and finality
   - Typical use cases and advantages
   - Any known limitations or risks
4. Provide a recommendation for which network to use based on:
   - Transaction speed needs
   - Cost considerations
   - Ecosystem size and liquidity
   - Security considerations

Make the comparison easy to understand for someone deciding which network to use.`
        }
      }]
      };
    }
  );

  server.registerPrompt(
    "check_network_status",
    {
      description: "Check the current status and health of an EVM network",
      argsSchema: {
        network: z.string().optional().describe("Network name. Defaults to Ethereum mainnet.")
      }
    },
    ({ network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please check the current status of the ${network} network:

1. Call get_chain_info to get chain ID, current block number, and RPC info
2. Call get_latest_block to see recent block information
3. Call get_gas_price to check current gas prices
4. Provide a status report with:
   - Network is healthy/operational
   - Current block number and recent block times
   - Current gas prices (base fee and priority fee)
   - Any observations about network congestion
   - Recommendations for transaction timing if applicable

Be clear about whether now is a good time to transact on this network.`
        }
      }]
    })
  );
}
