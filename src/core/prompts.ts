import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
      argsSchema: {
        tokenType: z.enum(["native", "erc20"]).describe("Token type: 'native' for ETH/MATIC or 'erc20' for contract tokens"),
        recipient: z.string().describe("Recipient address or ENS name"),
        amount: z.string().describe("Amount to transfer (in ether for native, token units for ERC20)"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        tokenAddress: z.string().optional().describe("Token contract address (required for ERC20)")
      }
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
1. **Wallet Verification**: Call \`get_wallet_address\` to confirm the sending wallet
2. **Balance Check**:
   ${tokenType === "native"
              ? "- Call `get_balance` to verify native token balance"
              : "- Call `get_token_balance` with tokenAddress=${tokenAddress} to verify balance"}
3. **Gas Analysis**: Call \`get_gas_price\` to assess current network costs
${tokenType === "erc20" ? `4. **Approval Check**: Call \`get_allowance\` to verify approval (if needed for protocols)` : ""}

## Execution Steps
${tokenType === "native" ? `
1. Summarize: sender address, recipient, amount, and estimated gas cost
2. Request confirmation from user
3. Call \`transfer_native\` with to="${recipient}", amount="${amount}", network="${network}"
4. Return transaction hash to user
5. Call \`wait_for_transaction\` to confirm completion
` : `
1. Check if approval is needed:
   - If allowance < amount: Call \`approve_token_spending\` first
   - Then proceed with transfer
2. Summarize: sender, recipient, token, amount, decimals, gas estimate
3. Request confirmation
4. Call \`transfer_erc20\` with tokenAddress, recipient, amount
5. Wait for confirmation with \`wait_for_transaction\`
`}

## Output Format
- **Transaction Hash**: Clear hex value
- **Status**: Pending or Confirmed
- **Cost Estimate**: Gas price and total cost
- **User Confirmation**: Always ask before sending

## Safety Considerations
- Never send more than available balance
- Double-check recipient address
- Warn about high gas prices
- Explain any approval requirements
`
        }
      }]
    })
  );

  server.registerPrompt(
    "diagnose_transaction",
    {
      description: "Analyze transaction status, failures, and provide debugging insights",
      argsSchema: {
        txHash: z.string().describe("Transaction hash to diagnose (0x...)"),
        network: z.string().optional().describe("Network name (default: ethereum)")
      }
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
- Call \`get_transaction\` to fetch transaction details
- Call \`get_transaction_receipt\` to get status and gas used
- Note: both calls are read-only and free

### 2. Status Assessment
Determine transaction state:
- **Pending**: Not yet mined (check mempool conditions)
- **Confirmed**: Successfully executed (status='success')
- **Failed**: Execution failed (status='failed')
- **Replaced**: Transaction was dropped/replaced (check nonce)

### 3. Failure Analysis
If transaction failed, investigate:

**Out of Gas**:
- Compare gasUsed vs gasLimit in receipt
- If gasUsed >= gasLimit, suggest increasing gas limit

**Contract Revert**:
- Check function called and parameters
- Verify sufficient balance/approvals
- Look for require/revert statements in contract

**Invalid Nonce**:
- Compare transaction nonce with account's current nonce
- Suggest pending transactions may need replacement

**Other Issues**:
- Check sender/recipient addresses are valid
- Verify function parameters are correct type
- Look for access control restrictions

### 4. Gas Analysis
- Calculate gas cost: gasUsed * gasPrice
- Compare to current gas prices (call \`get_gas_price\`)
- Assess if overpaid or underpaid

## Output Format

Provide structured diagnosis:
- **Status**: Pending/Confirmed/Failed with reason
- **Transaction Hash**: The hash analyzed
- **From/To**: Addresses involved
- **Function**: What was called
- **Gas Analysis**: Used vs limit, cost
- **Issue (if failed)**: Root cause and explanation
- **Recommended Actions**: Next steps to resolve

## Important Notes
- Be specific about error messages and codes
- Provide actionable recommendations
- Link issues to specific contract behavior
- Suggest solutions (retry, increase gas, fix parameters, etc.)
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
      description: "Get comprehensive overview of wallet assets, balances, and activity",
      argsSchema: {
        address: z.string().describe("Wallet address or ENS name to analyze"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        tokens: z.string().optional().describe("Comma-separated token addresses to check")
      }
    },
    ({ address, network = "ethereum", tokens }) => {
      const tokenList = tokens ? tokens.split(',').map(t => t.trim()) : [];
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `# Wallet Analysis

**Objective**: Provide complete asset overview for ${address} on ${network}

## Information Gathering

### 1. Address Resolution
- If input contains '.eth', call \`resolve_ens_name\` to get address
- Otherwise use as direct address
- Provide both resolved address and ENS name if applicable

### 2. Native Token Balance
- Call \`get_balance\` to fetch native token (ETH/MATIC/etc) balance
- Report both wei and ether/human-readable formats
- Note: Free read-only call

### 3. Token Balances
${tokenList.length > 0
                ? `- Call \`get_token_balance\` for each token:\n${tokenList.map(t => `  * ${t}`).join('\n')}`
                : `- If specific tokens provided: call \`get_token_balance\` for each
- Include token symbol and decimals if available`}

## Output Format

Provide analysis with clear sections:

**Wallet Overview**
- Address: [address]
- ENS Name: [name or none]
- Network: [network]

**Native Token Balance**
- Ether: [formatted amount]
- Wei: [raw amount]
- In USD (if price available): [estimated value]

**Token Holdings** (if requested)
- Token: [address]
- Symbol: [symbol]
- Balance: [formatted]
- Decimals: [decimals]

**Summary**
- Total assets value (if prices available)
- Primary holdings
- Notable observations

## Key Considerations
- Show both formatted and raw amounts
- Include token decimals for precision
- Note if wallet has low/no balance
- Highlight any unusual patterns
- Be clear about what data was available vs not
`
          }
        }]
      };
    }
  );

  server.registerPrompt(
    "audit_approvals",
    {
      description: "Review token approvals and identify security risks from unlimited spend",
      argsSchema: {
        address: z.string().optional().describe("Wallet to audit (default: configured wallet)"),
        tokenAddress: z.string().describe("Token contract address to check approvals for"),
        network: z.string().optional().describe("Network name (default: ethereum)")
      }
    },
    ({ address, tokenAddress, network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Token Approval Audit

**Objective**: Check and analyze token approvals to identify security risks

## Approval Analysis

### 1. Get Configured Wallet (if needed)
- If no address provided: call \`get_wallet_address\` to get the configured wallet
- Use that as the owner for approval checks

### 2. Check Current Approvals
- Call \`get_allowance\` with:
  * tokenAddress: ${tokenAddress}
  * ownerAddress: [wallet address from step 1]
  * spenderAddress: [contract being analyzed]
- Note the allowance amount returned

### 3. Interpret Results

**Allowance = 0**
- No approval set
- User must approve before spender can use tokens
- Safe state

**Allowance < Max Value**
- Limited approval (safest approach)
- Spender can only use up to this amount
- Tokens are protected

**Allowance = Max uint256 (unlimited)**
- Dangerous! Spender has unlimited access
- Common but risky pattern
- Should be revoked if not actively used

## Security Assessment

For each approval found:
1. **Risk Level**: Low/Medium/High based on:
   - Is it unlimited (high risk)?
   - How trusted is the spender?
   - Is it actively used?

2. **Recommendations**:
   - Revoke unknown/untrusted spenders
   - Lower limits on high-risk approvals
   - Keep active approvals but monitor
   - Remove expired/legacy approvals

## Output Format

**Token Approval Audit Report**

For each spender:
- **Spender Address**: [contract address]
- **Current Allowance**: [amount or "Unlimited"]
- **Risk Level**: Low/Medium/High
- **Status**: Active/Unused
- **Recommendation**: Keep/Reduce/Revoke

**Summary**
- Total dangerous approvals: [count]
- Recommendations: [action items]
- Overall risk: Safe/Moderate/High

## Important Notes
- Unlimited approvals are a major attack vector
- Only approve what's necessary
- Regularly audit and revoke unused approvals
- Be especially careful with new/unknown contracts
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
      description: "Fetch contract ABI from block explorer and provide comprehensive analysis",
      argsSchema: {
        contractAddress: z.string().describe("Contract address to analyze"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        findFunction: z.string().optional().describe("Specific function to analyze (e.g., 'swap', 'mint')")
      }
    },
    ({ contractAddress, network = "ethereum", findFunction }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# ABI Fetch and Analysis

**Objective**: Retrieve and analyze contract ABI from block explorer

## Prerequisites
- Contract must be verified on block explorer (Etherscan/Polygonscan/etc)
- ETHERSCAN_API_KEY environment variable required
- Supports 30+ EVM networks via unified Etherscan v2 API
- Read-only, no gas cost

## Fetching Process

### 1. Fetch the ABI
- Call \`get_contract_abi\` with contractAddress="${contractAddress}", network="${network}"
- Returns full ABI array with all functions, events, state variables
- Includes metadata about each function (inputs, outputs, mutability)

### 2. Parse and Categorize
Organize functions by type:

**View/Pure Functions** (Read-only, free):
- Check current state
- Query data without state change
- Safe to call

**State-Changing Functions**:
- Payable: require ETH value
- Nonpayable: modify contract state
- Cost gas, need signer

**Admin Functions**:
- Often restricted (onlyOwner, etc)
- Control contract behavior
- High risk if compromised

### 3. Analyze Structure
- Count functions by type
- Identify events and their usage
- Look for special functions (constructor, fallback, receive)
- Check for custom errors

${findFunction ? `### 4. Find Specific Function
- Search for "${findFunction}" in ABI
- Document: inputs, outputs, mutability
- Explain what it does
- Note any access controls` : `### 4. Key Functions
- Identify most important/used functions
- Explain inputs and outputs
- Note special requirements`}

## Function Analysis Format

For important functions provide:
- **Name**: Function name
- **Type**: View/Pure/Payable/Nonpayable
- **Inputs**: Parameter names and types with descriptions
- **Outputs**: Return values and types
- **Access**: Public/External/Restricted
- **Purpose**: What it does
- **Usage**: How to call it

## Security Analysis

Look for:
- **Proxy Patterns**: Is this a proxy contract?
- **Access Controls**: Who can call what?
- **Special Functions**: Initialization, upgrade paths
- **Obvious Issues**: Reentrancy risks, overflow/underflow patterns
- **Standard Compliance**: Is it ERC20/721/1155 compatible?

## Output Format

**Contract Analysis Report**

- **Contract Type**: Identified purpose (Token/DEX/Lending/etc)
- **Network**: Where deployed
- **Verified**: Yes (since we fetched ABI)
- **Function Count**: Total functions by type

**Function Categories**:
- View/Pure: [list of read functions]
- Write: [list of state-changing functions]
- Admin: [restricted functions]

**Key Functions**:
[Detailed analysis of important functions]

**Security Notes**:
[Vulnerabilities, patterns, recommendations]

**How to Interact**:
[Step-by-step guide for common operations]
`
        }
      }]
    })
  );

  server.registerPrompt(
    "explore_contract",
    {
      description: "Analyze contract functions and state without requiring full ABI",
      argsSchema: {
        contractAddress: z.string().describe("Contract address to explore"),
        network: z.string().optional().describe("Network name (default: ethereum)"),
        fetchAbi: z.string().optional().describe("Set to 'true' to auto-fetch ABI (requires ETHERSCAN_API_KEY)")
      }
    },
    ({ contractAddress, network = "ethereum", fetchAbi }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Contract Exploration

**Objective**: Understand what contract ${contractAddress} does and how to use it

## Exploration Strategy

${fetchAbi === 'true'
              ? `### With Full ABI (Fetched)
1. Call \`get_contract_abi\` to fetch verified ABI
2. Parse all available functions
3. Call \`read_contract\` for important state functions
4. Build comprehensive understanding
`
              : `### Without Full ABI (Probing)
1. Test common function signatures
2. Call \`read_contract\` with standard functions:
   - name(), symbol(), decimals(), totalSupply()
   - owner(), paused(), version()
   - balanceOf(), allowance(), totalSupply()
3. Infer contract type from successful calls
`}

## Detection Process

### 1. Identify Contract Type
Based on available functions, determine:
- **Token**: Has name, symbol, decimals, totalSupply, balanceOf
- **NFT/ERC721**: Has tokenURI, ownerOf, name, symbol
- **NFT/ERC1155**: Has uri, balanceOf, balanceOfBatch
- **Staking**: Has stake, unstake, reward, claim functions
- **DEX**: Has swap, liquidity, pair functions
- **Other**: Analyze unique functions

### 2. Gather Key Information

For each contract type:

**Token (ERC20)**:
- name, symbol, decimals, totalSupply
- If owner, supply cap, minting rules
- If tax/fee mechanism

**NFT (ERC721)**:
- name, symbol, totalSupply
- baseURI, tokenURI patterns
- royalty info if available

**Staking/Farming**:
- Pool info, APY, reward token
- Lockup periods, early withdrawal penalties
- Reward distribution mechanism

### 3. Security Assessment
- Check for pause functions (risk of rug)
- Look for upgrade mechanisms (upgradeable proxy)
- Identify admin-only functions
- Note unusual patterns

## Output Format

**Contract Overview**
- Address: [address]
- Type: [identified type]
- Network: [network]
- Verified: [yes/if ABI was fetched]

**Key Properties**
[Type-specific details discovered]

**Available Functions**
- Read-only: [list]
- State-changing: [list]
- Admin: [list if any]

**How to Use**
[Step-by-step guide for primary use case]

**Security Notes**
[Observations and recommendations]

**Limitations**
[What couldn't be determined without full ABI]

## When to Use ABI Fetch
- Need complete function list
- Want detailed parameter information
- Exploring unfamiliar/complex contracts
- Security due diligence
- Learn contract architecture
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
      description: "Safely execute write operations on a smart contract with validation and confirmation",
      argsSchema: {
        contractAddress: z.string().describe("Contract address to interact with"),
        functionName: z.string().describe("Function to call (e.g., 'mint', 'swap', 'stake')"),
        args: z.string().optional().describe("Comma-separated function arguments"),
        value: z.string().optional().describe("ETH value to send (for payable functions)"),
        network: z.string().optional().describe("Network name (default: ethereum)")
      }
    },
    ({ contractAddress, functionName, args, value, network = "ethereum" }) => {
      const argsList = args ? args.split(',').map(a => a.trim()) : [];
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `# Smart Contract Interaction

**Objective**: Safely execute ${functionName} on contract ${contractAddress} on ${network}

## Prerequisites Check

### 1. Wallet Verification
- Call \`get_wallet_address\` to confirm the wallet that will execute this transaction
- Verify this is the correct wallet for this operation

### 2. Contract Analysis
- Call \`get_contract_abi\` to fetch and analyze the contract ABI
- Verify the function exists and understand its parameters
- Check function type:
  * **View/Pure**: Read-only (use \`read_contract\` instead)
  * **Nonpayable**: State-changing, no ETH required
  * **Payable**: State-changing, can accept ETH

### 3. Function Parameter Validation
For function: **${functionName}**
${argsList.length > 0 ? `Arguments provided: ${argsList.join(', ')}` : 'No arguments provided'}

- Verify parameter types match the ABI
- Validate addresses are checksummed
- Check numeric values are in correct units
- Resolve any ENS names to addresses if needed

### 4. Pre-execution Checks

**Balance Check**:
- Call \`get_balance\` to verify sufficient native token balance
- Account for gas costs + value (if payable)

**Gas Estimation**:
- Call \`get_gas_price\` to estimate transaction cost
- Calculate total cost: (gas_price * estimated_gas) + value

**State Verification** (if applicable):
- Use \`read_contract\` to check current contract state
- Verify conditions are met (e.g., allowances, balances, ownership)

## Execution Process

### 1. Present Summary to User
Before executing, show:
- **Contract**: ${contractAddress}
- **Network**: ${network}
- **Function**: ${functionName}
- **Arguments**: ${argsList.length > 0 ? argsList.join(', ') : 'None'}
${value ? `- **Value**: ${value} ETH` : ''}
- **From**: [wallet address from step 1]
- **Estimated Gas Cost**: [from gas estimation]
- **Total Cost**: [gas + value]

### 2. Request User Confirmation
⚠️ **IMPORTANT**: Always ask user to confirm before executing write operations
- Clearly state what will happen
- Show all costs involved
- Explain any risks or irreversible actions

### 3. Execute Transaction
Only after user confirms:
\`\`\`
Call write_contract with:
- contractAddress: "${contractAddress}"
- functionName: "${functionName}"
${argsList.length > 0 ? `- args: ${JSON.stringify(argsList)}` : ''}
${value ? `- value: "${value}"` : ''}
- network: "${network}"
\`\`\`

### 4. Monitor Transaction
After execution:
1. Return transaction hash to user
2. Call \`wait_for_transaction\` to monitor confirmation
3. Call \`get_transaction_receipt\` to verify success
4. If failed, call \`diagnose_transaction\` to understand why

## Output Format

**Pre-Execution Summary**:
- Contract details
- Function and parameters
- Cost breakdown
- Risk assessment

**Confirmation Request**:
"Ready to execute ${functionName} on ${contractAddress}. This will cost approximately [X] ETH. Proceed? (yes/no)"

**Execution Result**:
- Transaction Hash: [hash]
- Status: Pending/Confirmed/Failed
- Block Number: [if confirmed]
- Gas Used: [actual gas used]
- Total Cost: [final cost]

## Safety Considerations

### Critical Checks
- ✅ Verify contract is verified on block explorer
- ✅ Check function parameters are correct type and format
- ✅ Ensure sufficient balance for gas + value
- ✅ Validate addresses (no typos, correct network)
- ✅ Understand what the function does before calling

### Common Risks
- **Irreversible**: Most blockchain transactions cannot be undone
- **Gas Loss**: Failed transactions still consume gas
- **Approval Risks**: Be careful with unlimited approvals
- **Reentrancy**: Some functions may be vulnerable
- **Access Control**: Verify you have permission to call this function

### Red Flags
🚨 Stop and warn user if:
- Contract is not verified
- Function requires admin/owner privileges you don't have
- Unusually high gas estimate
- Suspicious parameter values
- Contract has known vulnerabilities

## Error Handling

If transaction fails:
1. Get the revert reason from receipt
2. Check common issues:
   - Insufficient balance/allowance
   - Access control (onlyOwner, etc.)
   - Invalid parameters
   - Contract paused
   - Slippage (for DEX operations)
3. Provide actionable fix suggestions
4. Offer to retry with corrected parameters

## Example Workflow

For a token mint operation:
1. ✅ Verify wallet
2. ✅ Fetch contract ABI
3. ✅ Check mint function exists and is callable
4. ✅ Verify sufficient ETH for gas
5. ✅ Show summary: "Minting 1 NFT will cost ~0.002 ETH"
6. ⏸️ Wait for user confirmation
7. ✅ Execute write_contract
8. ✅ Monitor transaction
9. ✅ Confirm success and return token ID

**Remember**: Always prioritize user safety and transparency!
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
      argsSchema: {
        concept: z.string().describe("Concept to explain (gas, nonce, smart contracts, MEV, etc)")
      }
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
      description: "Compare multiple EVM networks on key metrics and characteristics",
      argsSchema: {
        networks: z.string().describe("Comma-separated network names (ethereum,polygon,arbitrum)")
      }
    },
    ({ networks }) => {
      const networkList = networks.split(',').map(n => n.trim());
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `# Network Comparison

**Objective**: Compare ${networkList.join(', ')} on key metrics

## Comparison Metrics

### 1. Network Health (Current)
For each network, call:
- \`get_chain_info\` for chain ID and current block
- \`get_gas_price\` for current gas costs
- \`get_latest_block\` for block time and recent activity

### 2. Key Characteristics
Compare across these dimensions:

**Architecture**:
- Execution layer (Rollup/Sidechain/L1)
- Consensus mechanism
- Finality
- Decentralization level

**Performance**:
- Block time (seconds per block)
- Transactions per second (TPS)
- Confirmation time
- Throughput

**Costs**:
- Current gas prices (in gwei)
- Average transaction cost
- Cost to deploy contract
- Price trends

**Security**:
- Validator count / decentralization
- Mainnet maturity
- Track record
- Security audits

**Ecosystem**:
- Major protocols deployed
- Liquidity depth
- Developer activity
- Community size

## Comparison Table

Create table with:
- Network name
- Block time
- TPS capacity
- Current gas (gwei)
- Est. tx cost (USD)
- Security level
- Best for

## Analysis

For each network:
- **Strengths**: What it does well
- **Weaknesses**: Limitations
- **Best Use Cases**: When to use
- **Trade-offs**: Speed vs cost vs security

## Recommendations

Provide guidance:
- For small frequent transactions: [network]
- For large one-time transfers: [network]
- For DeFi/trading: [network]
- For NFTs: [network]
- For cost optimization: [network]

## Output Format

**Network Comparison Analysis**

[Comparison table]

**Network Profiles**

For each network:
- Overview
- Current metrics
- Strengths
- Weaknesses
- Best use cases

**Recommendations**

Based on user needs:
- Speed priority: [suggestion]
- Cost priority: [suggestion]
- Security priority: [suggestion]
- Overall best: [suggestion]

**Decision Matrix**

Help user choose based on:
- Transaction frequency
- Transaction size
- Budget constraints
- Required finality
- Ecosystem needs
`
          }
        }]
      };
    }
  );

  server.registerPrompt(
    "check_network_status",
    {
      description: "Check current network health and conditions",
      argsSchema: {
        network: z.string().optional().describe("Network name (default: ethereum)")
      }
    },
    ({ network = "ethereum" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `# Network Status Check

**Objective**: Assess health and current conditions of ${network}

## Status Assessment

### 1. Gather Current Data
Call these read-only tools:
- \`get_chain_info\` for chain ID and current block number
- \`get_latest_block\` for block details and timing
- \`get_gas_price\` for current gas prices

### 2. Network Health Analysis

**Block Production**:
- Current block number
- Block timing (normal ~12-15 sec for Ethereum)
- Consistent vs irregular blocks
- Any gaps or delays

**Gas Market**:
- Base fee level (in gwei)
- Priority fee level
- Gas price trend (up/down/stable)
- Congestion level

**Overall Status**:
- Operational: Yes/No
- Issues detected: Yes/No
- Performance: Normal/Degraded/Critical

### 3. Congestion Assessment

Evaluate:
- Current gas prices vs average
- Pending transaction count
- Memory pool size
- Are transactions backing up?

## Output Format

**Network Status Report: ${network}**

**Overall Status**
- Operational Status: [Online/Degraded/Offline]
- Current Block: [number]
- Network Time: [timestamp]
- Last Updated: [when]

**Performance Metrics**
- Block Time: [seconds] (normal: 12-15s)
- Gas Base Fee: [gwei]
- Priority Fee: [gwei]
- Total Cost for Standard Tx: [estimate USD]

**Congestion Level**
- Level: [Low/Moderate/High/Critical]
- Current vs Historical: [comparison]
- Trend: [increasing/stable/decreasing]

**Network Activity**
- Blocks per minute: [rate]
- Recent block details: [hash, time, tx count]
- Network security: [indicators]

**Recommendations**

For **sending transactions now**:
- Best for: [low-value / high-value / time-critical]
- Gas setting: [standard / fast / extreme]
- Estimated cost: [range]
- Estimated wait time: [minutes]

**If Congested**:
- Consider using: [alternative networks]
- Wait time: [estimated minutes]
- Cost to expedite: [gas increase needed]

**If Issues Detected**:
- Known issues: [list if any]
- Expected duration: [if known]
- Recommended action: [wait / use alternate / etc]

## Key Metrics

Reference points for interpretation:
- Ethereum normal block: 12-15 seconds
- Polygon normal: 2 seconds
- Arbitrum normal: <1 second
- Normal gas: 20-50 gwei
- High congestion: 100+ gwei
`
        }
      }]
    })
  );
}
