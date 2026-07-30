import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

/**
 * Register task-oriented prompts with the MCP server
 *
 * All prompts follow a consistent structure:
 * - Clear objective statement
 * - Step-by-step instructions
 * - Expected outputs
 * - Safety/security considerations
 *
 * Prompts guide the model through complex workflows that would otherwise
 * require multiple tool calls in the correct sequence.
 *
 * @param server The MCP server instance
 */
export function registerEVMPrompts(server: McpServer) {
  // ============================================================================
  // TRANSACTION PROMPTS
  // ============================================================================

  server.registerPrompt(
    "prepare_transfer",
    {
      description: "Safely prepare and execute a token transfer with validation checks",
      argsSchema: z.object({
        tokenType: z.enum(["native", "erc20"]).describe("Token type: 'native' for ETH/POL or 'erc20' for contract tokens"),
        recipient: z.string().describe("Recipient address or ENS name"),
        amount: z.string().describe("Amount to transfer (in whole native-token units or ERC20 token units)"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        tokenAddress: z.string().optional().describe("Token contract address (required for ERC20)")
      }).superRefine(({ tokenType, tokenAddress }, ctx) => {
        if (tokenType === "erc20" && !tokenAddress) {
          ctx.addIssue({
            code: "custom",
            path: ["tokenAddress"],
            message: "tokenAddress is required when tokenType is 'erc20'"
          });
        }
      })
    },
    ({ tokenType, recipient, amount, network = "ethereum", tokenAddress }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Token Transfer Task

**Objective**: Safely transfer ${amount} ${tokenType === "native" ? "native tokens" : "ERC20 tokens"} to ${recipient} on ${network}

## Validation & Checks
Before executing any transfer:
1. **Wallet Verification**: Call \`get_wallet_address\` with no arguments to identify the sending wallet
2. **Balance Check**:
   ${tokenType === "native"
              ? `- Call \`get_balance\` with address set to the sending wallet and network="${network}"`
              : `- Call \`get_token_balance\` with address set to the sending wallet, tokenAddress="${tokenAddress}", and network="${network}"`}
3. **Gas Analysis**: Call \`get_gas_price\` with network="${network}" to assess current network gas conditions

## Execution Steps
${tokenType === "native" ? `
1. Summarize: sender address, recipient, amount, and current gas conditions
2. Call \`transfer_native\` with to="${recipient}", amount="${amount}", network="${network}"
3. Let the tool enforce the exact-operation MCP confirmation; do not ask a duplicate conversational confirmation
4. After acceptance and execution, record the returned transaction hash
5. Call \`wait_for_transaction\` with txHash="[hash from transfer_native]", timeoutSeconds between 1 and 90, and network="${network}"
6. If the bounded wait times out, report the transaction as unconfirmed rather than assuming success or failure
` : `
1. Summarize: sender, recipient, token, amount, decimals, and current gas conditions
2. Call \`transfer_erc20\` with tokenAddress="${tokenAddress}", to="${recipient}", amount="${amount}", network="${network}"
3. Let the tool enforce the exact-operation MCP confirmation; do not ask a duplicate conversational confirmation
4. After acceptance and execution, record the returned transaction hash
5. Call \`wait_for_transaction\` with txHash="[hash from transfer_erc20]", timeoutSeconds between 1 and 90, and network="${network}"
6. If the bounded wait times out, report the transaction as unconfirmed rather than assuming success or failure
`}

## Output Format
- **Transaction Hash**: Clear hex value if execution occurred
- **Submission State**: Submitted once a transaction hash is returned
- **Confirmation Result**: Confirmed or Failed when \`wait_for_transaction\` succeeds; Unconfirmed if the bounded wait times out
- **Gas Conditions**: Current gas price; note that this server does not estimate total transaction cost
- **MCP Confirmation**: Report whether the tool's protocol-level confirmation was accepted, declined, or cancelled; a decline or cancellation produces no transaction hash

## Safety Considerations
- Never send more than available balance
- Double-check recipient address
- Warn about high gas prices
`
        }
      }]
    })
  );

  server.registerPrompt(
    "diagnose_transaction",
    {
      description: "Analyze transaction status, failures, and provide debugging insights",
      argsSchema: z.object({
        txHash: z.string().describe("Transaction hash to diagnose (0x...)"),
        network: z.string().optional().describe("Network name (default: ethereum)")
      })
    },
    ({ txHash, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Transaction Diagnosis

**Objective**: Analyze transaction ${txHash} on ${network} and identify any issues

## Investigation Process

### 1. Gather Transaction Data
- Call \`get_transaction\` with txHash="${txHash}", network="${network}" to fetch transaction details
- Call \`get_transaction_receipt\` with txHash="${txHash}", network="${network}" to get a mined transaction's status, gas used, and logs
- If the receipt call reports that no receipt exists yet, classify the transaction only as unconfirmed
- Both calls are read-only and consume no on-chain gas, although RPC usage may be metered

### 2. Status Assessment
Determine only the state supported by the returned data:
- **Confirmed**: A receipt exists with status='success'
- **Reverted**: A receipt exists with status='reverted'
- **Unconfirmed**: The transaction exists but a receipt is not yet available
- **Unavailable**: The transaction lookup fails; do not infer whether it was dropped or replaced

### 3. Failure Analysis
If the receipt reports a revert, inspect only the available transaction and receipt fields:

**Gas Usage**:
- Compare receipt gasUsed with the transaction gas limit
- Treat equality or near-equality as a possible out-of-gas indicator, not a proven cause

**Call Data**:
- Report the destination and raw transaction input
- Do not claim a function name or decoded parameters unless they are independently available
- A standard receipt does not contain the revert reason or Solidity source location

**Observable Issues**:
- Check sender/recipient addresses are valid
- Report the transaction value, gas fields, receipt status, and emitted logs
- State clearly when the available data cannot establish the root cause

### 4. Gas Analysis
- Calculate actual gas cost from receipt gasUsed and effectiveGasPrice when both fields are available
- Call \`get_gas_price\` with network="${network}" only for current network context
- Do not label the historical transaction overpaid or underpaid from a current gas quote alone

## Output Format

Provide structured diagnosis:
- **Status**: Confirmed/Reverted/Unconfirmed/Unavailable, based only on returned data
- **Transaction Hash**: The hash analyzed
- **From/To**: Addresses involved
- **Call Data**: Raw input or method selector when available
- **Gas Analysis**: Used vs limit, cost
- **Evidence**: Receipt status, block, and logs when available
- **Limitations**: Information that would require simulation, tracing, source code, or transaction-history indexing
- **Recommended Actions**: Evidence-based next steps only

## Important Notes
- Preserve exact error messages and returned field values
- Do not infer replacement status, current account nonce, revert reason, or contract source behavior
- Recommend retrying only after the cause is known and corrected
`
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
      description: "Summarize native and explicitly requested ERC20 balances for a wallet",
      argsSchema: z.object({
        address: z.string().describe("Wallet address or ENS name to analyze"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        tokens: z.string().optional().describe("Comma-separated token addresses to check")
      })
    },
    ({ address, network = "ethereum", tokens }) => {
      const tokenList = tokens ? tokens.split(',').map(t => t.trim()) : [];
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `# Wallet Analysis

**Objective**: Summarize requested balances for ${address} on ${network}

## Information Gathering

### 1. Address Resolution
- If "${address}" is a name, call \`resolve_ens_name\` with ensName="${address}", network="${network}"
- Otherwise use it as a direct address
- For a direct address, call \`lookup_ens_address\` with address="${address}", network="${network}" only if reverse ENS information is useful
- Preserve the original input and any returned resolved address or ENS name

### 2. Native Token Balance
- Call \`get_balance\` with address="${address}", network="${network}"
- Report both raw wei and human-readable formats
- This read-only call consumes no on-chain gas, although RPC usage may be metered

### 3. Token Balances
${tokenList.length > 0
                ? `- Call \`get_token_balance\` for each requested token:\n${tokenList.map(t => `  * address="${address}", tokenAddress="${t}", network="${network}"`).join('\n')}
- Include the symbol, decimals, raw balance, and formatted balance returned by each call`
                : `- No token addresses were provided, so do not claim to enumerate ERC20 holdings
- Explain that token discovery requires an external indexer or an explicit list of token addresses`}

## Output Format

Provide analysis with clear sections:

**Wallet Overview**
- Address: [address]
- ENS Name: [name or none]
- Network: [network]

**Native Token Balance**
- Formatted Native Amount: [balance.formatted field]
- Wei: [raw amount]

**Token Holdings** (if requested)
- Token: [address]
- Symbol: [symbol]
- Balance: [formatted]
- Decimals: [decimals]

**Summary**
- Native balance
- Requested ERC20 balances
- Coverage limitations, including any tokens not requested

## Key Considerations
- Show both formatted and raw amounts
- Include token decimals for precision
- Note if wallet has low/no balance
- Do not claim USD value, complete holdings, transaction history, or wallet activity
- Be clear about which token addresses were checked and what data was unavailable
`
          }
        }]
      };
    }
  );

  server.registerPrompt(
    "audit_approvals",
    {
      description: "Assess one ERC20 allowance for a specific owner, token, and spender",
      argsSchema: z.object({
        address: z.string().optional().describe("Wallet to audit (default: configured wallet)"),
        tokenAddress: z.string().describe("Token contract address to check approvals for"),
        spenderAddress: z.string().describe("Spender contract address to assess"),
        network: z.string().optional().describe("Network name (default: ethereum)")
      })
    },
    ({ address, tokenAddress, spenderAddress, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Token Approval Audit

**Objective**: Assess the allowance granted by ${address ?? "the configured wallet"} to ${spenderAddress} for token ${tokenAddress} on ${network}

## Approval Analysis

### 1. Get Configured Wallet (if needed)
- If no owner address was provided, call \`get_wallet_address\` with no arguments to identify the configured wallet

### 2. Check Current Allowance
- Call \`get_allowance\` with:
  * tokenAddress: ${tokenAddress}
  * ownerAddress: ${address ?? "[wallet address from step 1]"}
  * spenderAddress: ${spenderAddress}
  * network: ${network}
- Treat the returned allowance as a raw token base-unit integer

### 3. Interpret Results

**Allowance = 0**
- No approval set
- User must approve before spender can use tokens
- No exposure through this allowance

**Allowance < Max Value**
- Limited approval
- Spender can only use up to this amount
- The amount alone does not establish whether the spender is trustworthy or actively used

**Allowance = Max uint256 (unlimited)**
- The spender has effectively unlimited allowance
- Common but risky pattern
- Recommend review or revocation only in light of user-provided or external context

## Allowance Assessment

For this allowance:
1. **Exposure Level**: None/Limited/Unlimited based only on the numeric allowance

2. **Recommendations**:
   - Consider setting the allowance to zero if the user no longer needs it
   - Prefer a limited amount when the intended operation permits it
   - Ask for external context before making claims about spender reputation or current usage

## Output Format

**Token Approval Audit Report**

- **Owner Address**: [wallet address]
- **Spender Address**: ${spenderAddress}
- **Current Allowance (raw base units)**: [integer]
- **Exposure Level**: None/Limited/Unlimited
- **Recommendation**: Keep/Reduce/Revoke/Review, with rationale limited to the observed allowance

**Summary**
- Recommendations: [action items]
- Missing context: spender reputation, approval history, and current usage are not available from this tool

## Important Notes
- Unlimited allowance increases the amount exposed to the spender
- Only approve what's necessary
- This workflow checks one token/spender pair; it does not enumerate all approvals
- Do not claim an approval is active, expired, legacy, trusted, or malicious from allowance data alone
`
        }
      }]
    })
  );

  // ============================================================================
  // SMART CONTRACT ANALYSIS PROMPTS
  // ============================================================================

  server.registerPrompt(
    "fetch_and_analyze_abi",
    {
      description: "Fetch a verified contract ABI and summarize its exposed interface",
      argsSchema: z.object({
        contractAddress: z.string().describe("Contract address to analyze"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        findFunction: z.string().optional().describe("Specific function to analyze (e.g., 'swap', 'mint')")
      })
    },
    ({ contractAddress, network = "ethereum", findFunction }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# ABI Fetch and Analysis

**Objective**: Retrieve the contract ABI from a block explorer and summarize the interface it exposes

## Prerequisites
- Contract must be verified and supported by the Etherscan v2 API
- ETHERSCAN_API_KEY environment variable required
- Works on configured chains supported by Etherscan v2
- Read-only and consumes no on-chain gas; explorer API usage may be metered

## Fetching Process

### 1. Fetch the ABI
- Call \`get_contract_abi\` with contractAddress="${contractAddress}", network="${network}"
- Use the returned ABI array to inspect functions, events, errors, constructors, fallback handlers, and receive handlers
- Function entries expose names, inputs, outputs, and state mutability; they do not include Solidity source or modifiers

### 2. Parse and Categorize
Organize functions by type:

**View/Pure Functions**:
- Read-only at the ABI level
- Consume no transaction gas when called through \`read_contract\`, although RPC usage may be metered

**State-Changing Functions**:
- Payable: can accept native-token value
- Nonpayable: cannot accept native-token value
- Require a signer and an on-chain transaction

### 3. Analyze Structure
- Count functions by type
- List event and custom-error signatures
- Look for special functions (constructor, fallback, receive)
- Identify overloaded function names and preserve their full signatures

${findFunction ? `### 4. Find Specific Function
- Search for "${findFunction}" in ABI
- Document its exact inputs, outputs, and state mutability
- Describe only behavior implied directly by its signature
- State that access controls and implementation behavior are unknown from ABI alone` : `### 4. Interface Highlights
- Group recognizable function signatures by likely purpose
- Describe inputs and outputs without inventing implementation behavior
- Treat importance and contract type as interface-level heuristics`}

## Function Analysis Format

For important functions provide:
- **Name**: Function name
- **Type**: View/Pure/Payable/Nonpayable
- **Inputs**: Parameter names and ABI types
- **Outputs**: Return values and types
- **Access Controls**: Unknown from ABI unless supplied by an external source
- **Likely Purpose**: A clearly labeled signature-based heuristic
- **Invocation Shape**: Arguments and whether native-token value is accepted

## Interface Heuristics

- Note signatures commonly associated with ERC20, ERC721, ERC1155, proxy administration, or initialization
- Describe these as compatibility or pattern indicators, not proof of implementation or standards compliance
- Do not claim vulnerabilities, source-level access controls, reentrancy safety, arithmetic safety, or upgrade behavior from ABI alone

## Output Format

**Contract Interface Report**

- **Likely Interface Type**: Signature-based heuristic with confidence and caveats
- **Network**: Where deployed
- **Explorer ABI Available**: Yes
- **Function Count**: Total functions by type

**Function Categories**:
- View/Pure: [list of read functions]
- Write: [list of state-changing functions]
- Pattern Indicators: [standard or administrative-looking signatures, clearly labeled as heuristics]

**Key Functions**:
[Exact signatures and ABI-derived invocation details]

**Limitations**:
- ABI does not provide source code, modifiers, access-control rules, business logic, vulnerability status, or runtime state
`
        }
      }]
    })
  );

  server.registerPrompt(
    "explore_contract",
    {
      description: "Inspect a contract interface and selected state through verified ABI or supported common reads",
      argsSchema: z.object({
        contractAddress: z.string().describe("Contract address to explore"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        fetchAbi: z.string().optional().describe("Set to 'true' to auto-fetch ABI (requires ETHERSCAN_API_KEY)")
      })
    },
    ({ contractAddress, network = "ethereum", fetchAbi }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Contract Exploration

**Objective**: Inspect the exposed interface and selected readable state of ${contractAddress} on ${network}

## Exploration Strategy

${fetchAbi === 'true'
              ? `### With Full ABI (Fetched)
1. Call \`get_contract_abi\` with contractAddress="${contractAddress}", network="${network}"
2. Parse the returned function signatures, events, and errors
3. For a selected no-argument view function, call \`read_contract\` with contractAddress="${contractAddress}", functionName="[function name]", network="${network}"
4. For a view function with parameters, include args=["[argument strings]"] based on its ABI
`
              : `### Common Read Probes
1. Be aware that \`read_contract\` first attempts to fetch a verified ABI automatically
2. If ABI fetch is unavailable, its built-in fallback supports only name, symbol, decimals, totalSupply, balanceOf, and allowance
3. Probe no-argument functions with exact calls such as:
   - contractAddress="${contractAddress}", functionName="name", network="${network}"
   - contractAddress="${contractAddress}", functionName="symbol", network="${network}"
   - contractAddress="${contractAddress}", functionName="decimals", network="${network}"
   - contractAddress="${contractAddress}", functionName="totalSupply", network="${network}"
4. Do not call balanceOf or allowance without the required address arguments
5. Treat successful signatures as interface clues, not proof of contract behavior
`}

## Interface Assessment

### 1. Identify Signature Patterns
Based only on functions that appear in a fetched ABI or succeed as reads:
- **ERC20-like**: name, symbol, decimals, totalSupply, balanceOf, allowance
- **ERC721-like**: ownerOf, tokenURI, name, symbol
- **ERC1155-like**: uri, balanceOf, balanceOfBatch
- **Other recognizable interfaces**: describe as tentative signature matches

### 2. Gather Key Information

- Report exact values returned by successful read calls
- List relevant ABI signatures and state mutability when a full ABI is available
- Do not infer minting rules, fees, royalties, APY, lockups, ownership restrictions, or upgrade behavior unless a specific read returns that information

### 3. Limits of Interface Inspection
- Function names can indicate a possible pattern but not implementation behavior
- ABI data does not reveal Solidity modifiers, source code, vulnerabilities, or who is authorized to call a function
- Failed probes do not prove that a capability is absent

## Output Format

**Contract Overview**
- Address: [address]
- Likely Interface: [signature-based heuristic, or unknown]
- Network: [network]
- Explorer ABI Available: [yes/no]

**Observed Values**
[Only values returned by successful read calls]

**Available Functions**
- Read-only: [list]
- State-changing: [list]
- Pattern indicators: [clearly labeled interface heuristics]

**Limitations**
[What could not be determined from the ABI and selected reads]

## When to Use ABI Fetch
- Need complete function list
- Want detailed parameter information
- Exploring unfamiliar/complex contracts
- Need event and custom-error signatures
- Need a reliable invocation shape before a read or write
`
        }
      }]
    })
  );

  // ============================================================================
  // NETWORK & EDUCATION PROMPTS
  // ============================================================================

  server.registerPrompt(
    "interact_with_contract",
    {
      description: "Safely execute smart contract writes with validation and tool-enforced MCP confirmation",
      argsSchema: z.object({
        contractAddress: z.string().describe("Contract address to interact with"),
        functionName: z.string().describe("Function to call (e.g., 'mint', 'swap', 'stake')"),
        args: z.string()
          .optional()
          .refine((value) => {
            if (value === undefined) {
              return true;
            }

            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) && parsed.every(argument => typeof argument === "string");
            } catch {
              return false;
            }
          }, "args must be a JSON array of strings")
          .describe("Function arguments as a JSON array of strings"),
        value: z.string().optional().describe("Native-token value to send (for payable functions)"),
        network: z.string().optional().describe("Network name (default: ethereum)")
      })
    },
    ({ contractAddress, functionName, args, value, network = "ethereum" }) => {
      const argsList = args ? JSON.parse(args) as string[] : [];
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `# Smart Contract Interaction

**Objective**: Safely execute ${functionName} on contract ${contractAddress} on ${network}

## Prerequisites Check

### 1. Wallet Verification
- Call \`get_wallet_address\` with no arguments to identify the wallet that will execute this transaction
- Verify this is the correct wallet for this operation

### 2. Contract Analysis
- Call \`get_contract_abi\` with contractAddress="${contractAddress}", network="${network}"
- Verify that ${functionName} exists and record its exact inputs and state mutability
- Check function type:
  * **View/Pure**: Read-only (use \`read_contract\` instead)
  * **Nonpayable**: State-changing, no native-token value accepted
  * **Payable**: State-changing, can accept native-token value
- The ABI does not reveal source-level access controls or implementation behavior

### 3. Function Parameter Validation
For function: **${functionName}**
${argsList.length > 0 ? `Arguments provided: ${argsList.join(', ')}` : 'No arguments provided'}

- Verify parameter types match the ABI
- Validate address syntax and network
- Check numeric values are in correct units
- If an address argument is an ENS name, call \`resolve_ens_name\` with ensName="[name]", network="${network}" and substitute the returned address before invoking \`write_contract\`

### 4. Pre-execution Checks

**Balance Check**:
- Call \`get_balance\` with address="[wallet address from step 1]", network="${network}"
- Verify the native balance covers the explicit value, if any
- Do not claim that the remaining balance is sufficient for gas because this server does not estimate transaction gas usage

**Gas Conditions**:
- Call \`get_gas_price\` with network="${network}" to report current network gas conditions
- Do not present a full transaction cost estimate because this server does not estimate gas usage

**State Verification** (if applicable):
- For a specific view function identified in the ABI, call \`read_contract\` with contractAddress="${contractAddress}", functionName="[view function]", args=["[argument strings]"] when required, and network="${network}"
- Report only the returned state; do not infer unavailable access-control or business-logic conditions

## Execution Process

### 1. Present Summary to User
Before executing, show:
- **Contract**: ${contractAddress}
- **Network**: ${network}
- **Function**: ${functionName}
- **Arguments**: ${argsList.length > 0 ? argsList.join(', ') : 'None'}
${value ? `- **Native-Token Value**: ${value}` : ''}
- **From**: [wallet address from step 1]
- **Current Gas Conditions**: [from get_gas_price]
- **Transaction Cost**: Not estimated

### 2. Invoke the Transaction Tool
\`\`\`
Call write_contract with:
- contractAddress: "${contractAddress}"
- functionName: "${functionName}"
${argsList.length > 0 ? `- args: ${JSON.stringify(argsList)}` : ''}
${value ? `- value: "${value}"` : ''}
- network: "${network}"
\`\`\`

The \`write_contract\` tool returns an MCP \`input_required\` request describing the exact operation before it accesses the wallet. Let the client display and answer that protocol-level request; do not ask a duplicate conversational confirmation. The operation executes only after the client accepts with \`confirm: true\`. A decline or cancellation is terminal.

### 3. Monitor Transaction
After execution:
1. Return transaction hash to user
2. Call \`wait_for_transaction\` with txHash="[hash from write_contract]", timeoutSeconds between 1 and 90, and network="${network}"
3. Call \`get_transaction_receipt\` with txHash="[hash from write_contract]", network="${network}" for the raw mined receipt
4. If the receipt reports a revert, use MCP \`prompts/get\` with name="diagnose_transaction" and arguments={ txHash: "[hash from write_contract]", network: "${network}" }, then follow the returned workflow
5. If the bounded wait times out, report the transaction as unconfirmed rather than assuming success or failure

## Output Format

**Pre-Execution Summary**:
- Contract details
- Function and parameters
- Native-token value, if any
- Current gas conditions and the absence of a full cost estimate

**MCP Confirmation**:
- Report whether the tool-generated confirmation was accepted, declined, or cancelled; a decline or cancellation produces no transaction

**Execution Result**:
- Transaction Hash: [hash, if submitted]
- Submission State: Submitted
- Confirmation Result: Confirmed/Failed when the wait succeeds, or Unconfirmed after a timeout
- Block Number: [if confirmed]
- Gas Used: [if a receipt is available]

## Safety Considerations

### Critical Checks
- Confirm a verified ABI was fetched
- Check function parameters against the ABI
- Verify the explicit native-token value does not exceed the wallet balance
- Validate addresses and network
- Explain that an ABI signature does not prove implementation behavior

### Common Risks
- **Irreversible**: Most blockchain transactions cannot be undone
- **Gas Loss**: Failed transactions still consume gas
- **Approval Risks**: Be careful with unlimited approvals
- **Unknown Implementation**: ABI data does not establish internal logic or access controls

### Red Flags
Stop and warn the user if:
- The ABI cannot be fetched
- The function is absent from the ABI
- Arguments do not match the ABI
- The current network gas price is unexpectedly high for the user's stated tolerance
- Parameter values conflict with the user's request

## Error Handling

If transaction fails:
1. Preserve the exact tool error and receipt status
2. Do not claim that a standard receipt contains a revert reason
3. State that a precise cause may require simulation, tracing, source code, or protocol-specific context that these tools do not provide
4. Suggest a retry only after the cause is established and corrected

## Example Workflow

For a token mint operation:
1. Verify the wallet
2. Fetch the contract ABI
3. Check that the mint signature exists and validate its arguments
4. Check the wallet's native balance without claiming a gas-usage estimate
5. Show the operation summary and current gas conditions
6. Invoke \`write_contract\`
7. Let the tool enforce MCP confirmation before execution
8. Monitor the transaction with its returned hash
9. Report receipt data; do not claim a token ID unless it is independently decoded
`
          }
        }]
      };
    }
  );

  server.registerPrompt(
    "explain_evm_concept",
    {
      description: "Explain EVM and blockchain concepts with examples",
      argsSchema: z.object({
        concept: z.string().describe("Concept to explain (gas, nonce, smart contracts, MEV, etc)")
      })
    },
    ({ concept }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Concept Explanation: ${concept}

**Objective**: Provide clear, practical explanation of "${concept}"

## Explanation Structure

### 1. Definition
- What is it?
- Simple one-sentence summary
- Technical name/terminology

### 2. How It Works
- Step-by-step explanation
- Why it exists/why it's important
- How it relates to blockchain

### 3. Real-World Analogy
- Compare to familiar concept
- Make it relatable for beginners
- Highlight key differences

### 4. Practical Examples
- Real transaction examples
- Numbers and metrics where applicable
- Common scenarios
- Edge cases or gotchas

### 5. Relevance to Users
- Why should developers care?
- How does it affect transactions?
- How to optimize/reduce costs?
- Common mistakes to avoid

## Output Format

Provide explanation in sections:

**What is ${concept}?**
[Definition and overview]

**How Does It Work?**
[Mechanics and process]

**Example**
[Real or hypothetical scenario]

**Key Takeaways**
[Bullet points of important facts]

**Common Questions**
- Question 1? Answer
- Question 2? Answer

## Important
- Use clear, non-technical language first
- Progress to technical details
- Include concrete numbers where helpful
- Be honest about complexity
- Suggest further learning if needed
`
        }
      }]
    })
  );

  server.registerPrompt(
    "compare_networks",
    {
      description: "Compare current RPC-observable data across multiple EVM networks",
      argsSchema: z.object({
        networks: z.string().describe("Comma-separated network names (ethereum,polygon,arbitrum)")
      })
    },
    ({ networks }) => {
      const networkList = networks.split(',').map(n => n.trim());
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `# Network Comparison

**Objective**: Compare current RPC-observable data for ${networkList.join(', ')}

## Data Collection

For each network, make separate calls with the network argument set explicitly:
${networkList.map(network => `- \`get_chain_info\` with network="${network}"
- \`get_gas_price\` with network="${network}"
- \`get_latest_block\` with network="${network}"
- \`get_block\` with blockIdentifier="[latest block number minus 1]", network="${network}" if an observed one-block interval is useful`).join('\n')}

## Supported Comparisons

- Chain ID and current block height from \`get_chain_info\`
- Latest block hash, number, timestamp, and transaction count when present
- One observed interval between the latest and immediately preceding block, if both calls succeed
- Current node gas-price estimate and, when available, priority-fee estimate from \`get_gas_price\`
- Latest block base fee from the latest block's baseFeePerGas field, when present
- Convert wei values to gwei for readability while preserving the raw values

## Comparison Table

Create a table with:
- Network name
- Chain ID
- Current block
- Latest block timestamp
- Latest block transaction count
- Observed one-block interval, clearly labeled as a single sample
- Current gas-price estimate in wei and gwei
- Priority-fee estimate in wei and gwei, when available
- Latest block base fee, if available

## Analysis

- Compare only values returned by the tools
- A lower current gas quote does not establish lower average transaction cost
- A single block interval does not establish throughput, TPS, confirmation time, finality, or network health
- Do not rank security, decentralization, validators, ecosystem, liquidity, developer activity, or protocol suitability because these tools do not provide that data
- Do not estimate USD costs, deployment costs, transaction costs, historical averages, or trends

## Output Format

**Current Network Measurements**

[Comparison table]

For each network:
- Exact returned measurements
- Calls that failed or fields that were absent
- Caveats on the one-block sample

**Limited Comparison**
- Identify the lowest current gas-price estimate only as a point-in-time observation
- Do not make a general network recommendation from these measurements alone
`
          }
        }]
      };
    }
  );

  server.registerPrompt(
    "check_network_status",
    {
      description: "Check current RPC reachability, latest-block data, and gas conditions",
      argsSchema: z.object({
        network: z.string().optional().describe("Network name (default: ethereum)")
      })
    },
    ({ network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Network Status Check

**Objective**: Check current RPC-observable conditions for ${network}

## Status Assessment

### 1. Gather Current Data
Call these read-only tools:
- \`get_chain_info\` with network="${network}" for chain ID and current block number
- \`get_latest_block\` with network="${network}" for the latest block
- \`get_gas_price\` with network="${network}" for the node gas-price estimate and any available priority-fee estimate
- If an observed block interval is useful, call \`get_block\` with blockIdentifier="[latest block number minus 1]", network="${network}"

### 2. Current Observations

**Block Production**:
- Current block number
- Latest block hash and timestamp
- Latest block transaction count when present
- Difference between the latest and previous block timestamps, clearly labeled as one observed interval
- Do not extrapolate consistency, throughput, or a historical block-time average from one interval

**Gas Market**:
- Use the latest block's baseFeePerGas field for the actual latest-block base fee, when present
- Use \`get_gas_price\`'s gasPricePerGas field as the node's current transaction gas-price estimate
- Report priorityFeePerGas when the node provides it
- Preserve wei values and optionally convert them to gwei
- Do not infer a trend, historical comparison, or congestion category

**RPC Reachability**:
- If the calls succeed, report that the configured RPC endpoint responded
- If a call fails, preserve the exact error
- Do not equate RPC reachability with full network health or finality

## Output Format

**Network Status Report: ${network}**

**RPC Observation**
- RPC Responded: [yes/no for each call]
- Current Block: [number]
- Latest Block Timestamp: [timestamp]
- Observed At: [current response time, if available]

**Latest Block**
- Hash: [hash]
- Transaction Count: [if present]
- Observed Previous-Block Interval: [seconds, if the previous block was fetched]
- Base Fee: [wei and gwei, if present]

**Current Gas Data**
- Node Gas-Price Estimate: [wei and gwei]
- Priority-Fee Estimate: [wei and gwei, if available]

**Limitations**
- No mempool size, pending transaction count, historical trend, average fee, USD price, transaction gas estimate, validator/security data, incident status, or expected recovery time is available
- Do not recommend standard/fast/extreme fee settings or estimate transaction cost and confirmation time from these calls
`
        }
      }]
    })
  );
}
