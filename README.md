# EVM MCP Server

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![EVM Networks](https://img.shields.io/badge/Networks-55-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6)
![MCP](https://img.shields.io/badge/MCP-2026--07--28-blue)
![Viem](https://img.shields.io/badge/Viem-2.55.10+-green)

A comprehensive Model Context Protocol (MCP) server that provides blockchain services across 55 distinct EVM-compatible chains. This server enables AI agents to interact with Ethereum, Optimism, Arbitrum, Base, Polygon, and many other EVM chains with a unified interface through 25 tools and 10 AI-guided prompts.

## 📋 Contents

- [Overview](#overview)
- [Features](#features)
- [Supported Networks](#supported-networks)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Server Configuration](#server-configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
  - [Tools](#tools)
  - [Prompts](#prompts)
  - [Resources](#resources)
- [Security Considerations](#security-considerations)
- [Project Structure](#project-structure)
- [Development](#development)
- [License](#license)

## 🔭 Overview

The MCP EVM Server leverages the Model Context Protocol to provide blockchain services to AI agents. It supports a wide range of services including:

- Reading blockchain state (balances, transactions, blocks, etc.)
- Interacting with smart contracts with **automatic ABI fetching** through Etherscan v2 where supported
- Transferring native and ERC20 tokens
- Querying ERC20, ERC721, and ERC1155 data
- Chain-specific services across 55 EVM chains (31 mainnets + 24 testnets)
- **ENS name resolution** for supported balance and transfer address parameters
- **AI-friendly prompts** that guide agents through complex workflows

All services are exposed through a consistent interface of MCP tools, resources, and prompts, making it easy for AI agents to discover and use blockchain functionality. The API reference identifies which address parameters accept ENS names. Raw contract interaction tools require resolved hexadecimal addresses. For verified contracts on chains supported by Etherscan v2, the server can fetch an ABI when one is not supplied.

## ✨ Features

### Blockchain Data Access

- **Multi-chain support** for 55 EVM-compatible chains (31 mainnets + 24 testnets)
- **Chain information** including block number, chain ID, and RPC endpoint
- **Block data** access by number, hash, or latest
- **Transaction details** and receipts with logs
- **Address balances** for native, ERC20, and ERC1155 tokens
- **ENS resolution** for supported address parameters (use 'vitalik.eth' instead of '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')

### Token services

- **ERC20 Tokens**

  - Check token balances
  - Transfer tokens between addresses
  - Approve spending allowances

- **NFTs (ERC721)**

  - Get collection name and symbol
  - Retrieve token URIs (the server does not fetch off-chain metadata documents)

- **Multi-tokens (ERC1155)**
  - Get token balances by owner and token ID

### Smart Contract Interactions

- **Read contract state** through view/pure functions
- **Write to contracts** - Execute ABI-described state-changing functions with an optional Etherscan v2 ABI fetch
- **Automatic ABI fetching** through the Etherscan v2 API where the selected chain is supported by Etherscan
- **ABI JSON parsing and basic array-shape checking** with readable-function discovery

### Comprehensive Transaction Support

- **Flexible Wallet Support** - Configure with a private key or mnemonic-derived HD account
- **Native token transfers** across all supported networks
- **Current gas price information** for transaction planning
- **Transaction status** and receipt information
- **Bounded confirmation waiting** with a configurable 1–90 second timeout
- **Error handling** with descriptive messages

### MCP-Native Safety and Results

- **Structured tool results** - All 25 tools advertise an output schema and return successful JSON results in `structuredContent`
- **Legacy-readable output** - The same successful JSON is retained as pretty-printed text content
- **Enforced operation confirmation** - Wallet-backed writes and signatures use MCP `input_required` confirmation before accessing the configured wallet
- **Scoped remote authorization** - HTTP deployments support the `mcp`, `evm:write`, and `evm:sign` OAuth scopes

### Message Signing Capabilities

- **Personal Message Signing** - Sign arbitrary messages for authentication and verification
- **EIP-712 Typed Data Signing** - Sign structured data for gasless transactions and meta-transactions
- **SIWE Support** - Enable Sign-In With Ethereum authentication flows
- **Permit Signatures** - Create off-chain approvals for gasless token operations
- **Meta-Transaction Support** - Sign transaction data for relay services and gasless transfers

### AI-Guided Workflows (Prompts)

- **Transaction preparation** - Guidance for planning and executing transfers
- **Wallet analysis** - Guidance for native and explicitly requested ERC20 balances
- **Smart contract exploration** - Interactive ABI fetching and contract analysis
- **Contract interaction** - Safe execution of write operations on smart contracts
- **Network information** - Learning about EVM networks and comparisons
- **Approval auditing** - Assessing a known owner-to-spender token allowance
- **Error diagnosis** - Troubleshooting transaction failures

## 🌐 Supported Networks

### Mainnets (31)

- Ethereum (ETH)
- Optimism (OP)
- Arbitrum (ARB)
- Arbitrum Nova
- Base
- Polygon (POL)
- Polygon zkEVM
- Avalanche (AVAX)
- Binance Smart Chain (BSC)
- zkSync Era
- Linea
- Celo
- Gnosis (xDai)
- Fantom (FTM)
- Filecoin (FIL)
- Moonbeam
- Moonriver
- Cronos
- Scroll
- Mantle
- Manta
- Blast
- Fraxtal
- Mode
- Metis
- Kroma
- Zora
- Aurora
- Canto
- Flow
- Lumia

### Testnets (24)

- Sepolia
- Optimism Sepolia
- Arbitrum Sepolia
- Base Sepolia
- Polygon Amoy
- Avalanche Fuji
- BSC Testnet
- zkSync Sepolia
- Linea Sepolia
- Scroll Sepolia
- Mantle Sepolia
- Manta Sepolia
- Blast Sepolia
- Fraxtal Testnet
- Mode Testnet
- Metis Sepolia
- Kroma Sepolia
- Zora Sepolia
- Celo Alfajores
- Goerli
- Holesky
- Flow Testnet
- Filecoin Calibration
- Lumia Testnet

## 🛠️ Prerequisites

- [Bun](https://bun.sh/) 1.0.0 or higher (recommended)
- Node.js 20.0.0 or higher (if not using Bun)
- Optional: [Etherscan API key](https://etherscan.io/apis) for ABI fetching

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/mcpdotdirect/evm-mcp-server.git
cd evm-mcp-server

# Install dependencies with Bun
bun install

# Or with npm
npm install
```

## ⚙️ Configuration

### Environment Variables

The server uses the following environment variables. For write operations and ABI fetching, you must configure these variables:

#### Wallet Configuration (For Write Operations)

You can configure your wallet using **either** a private key or a mnemonic phrase:

**Option 1: Private Key**

```bash
export EVM_PRIVATE_KEY="0x..." # Your private key in hex format (with or without 0x prefix)
```

**Option 2: Mnemonic Phrase (Recommended for HD Wallets)**

```bash
export EVM_MNEMONIC="word1 word2 word3 ..." # Your mnemonic phrase
export EVM_ACCOUNT_INDEX="0" # Optional: Account index for HD wallet derivation (default: 0)
```

The mnemonic option supports hierarchical deterministic (HD) wallet derivation:

- Passes the configured phrase to Viem's mnemonic account derivation
- Uses derivation path `m/44'/60'/{accountIndex}'/0/0`
- `EVM_ACCOUNT_INDEX` allows you to derive different accounts from the same mnemonic
- Default account index is 0 (first account)

The server does not pre-validate mnemonic word count or checksum. Validate the phrase before configuring it.

**Wallet is used for:**

- Transferring native tokens (`transfer_native` tool)
- Transferring ERC20 tokens (`transfer_erc20` tool)
- Approving token spending (`approve_token_spending` tool)
- Writing to smart contracts (`write_contract` tool)
- Signing messages for authentication (`sign_message` tool)
- Signing structured data for gasless transactions (`sign_typed_data` tool)

⚠️ **Security**:

- Never commit your private key or mnemonic to version control
- Use environment variables or a secure key management system
- Store mnemonics securely - they provide access to all derived accounts
- Consider using different account indices for different purposes

#### API Keys (For ABI Fetching)

```bash
export ETHERSCAN_API_KEY="your-api-key-here"
```

This API key is optional but required for:

- Automatic ABI fetching from Etherscan v2 (`get_contract_abi` tool)
- Auto-fetching ABIs when reading contracts (`read_contract` tool without an `abiJson` parameter)
- Workflows generated by the `fetch_and_analyze_abi` prompt

Get your free API key from:

- [Etherscan](https://etherscan.io/apis) - For Ethereum and compatible chains
- The same key is sent to the Etherscan v2 API for chains that Etherscan supports

### Server Configuration

The HTTP server uses the following default configuration:

- **Default Chain ID**: 1 (Ethereum Mainnet)
- **Server Port**: `3001` (`MCP_PORT`)
- **Server Host**: `127.0.0.1` (`MCP_HOST`)
- **Allowed Host headers**: Localhost hostnames (`MCP_ALLOWED_HOSTS`, comma-separated)
- **Allowed Origin hostnames**: Localhost hostnames (`MCP_ALLOWED_ORIGINS`, comma-separated)

When binding to a non-local interface, explicitly configure the public hostnames accepted by `MCP_ALLOWED_HOSTS` and `MCP_ALLOWED_ORIGINS`. Values may be hostnames or origin URLs; validation is port-agnostic.

#### HTTP OAuth

The HTTP process is an OAuth resource server; it does not issue access tokens. OAuth is optional only when `MCP_HOST` is local (`127.0.0.1`, `localhost`, or `::1`). If `MCP_OAUTH_ISSUER_URL` is set, OAuth is enabled even for a local bind. A non-local bind fails during startup unless OAuth is fully configured.

Required when OAuth is enabled:

| Variable                  | Purpose                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `MCP_OAUTH_ISSUER_URL`    | Exact HTTPS authorization-server issuer URL with no query or fragment                                               |
| `MCP_PUBLIC_URL`          | Exact externally reachable MCP endpoint; it must have the `/mcp` path with no query or fragment, and remote use requires HTTPS |
| `MCP_OAUTH_CLIENT_ID`     | Resource-server client ID used for RFC 7662 token introspection                                                     |
| `MCP_OAUTH_CLIENT_SECRET` | Resource-server client secret used for RFC 7662 token introspection                                                 |

Optional OAuth variables:

| Variable                      | Default                                   | Purpose                                                                                                  |
| ----------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `MCP_OAUTH_METADATA_URL`      | RFC 8414 URL derived from the issuer      | Override authorization-server metadata discovery                                                        |
| `MCP_OAUTH_INTROSPECTION_URL` | Metadata `introspection_endpoint`         | Override the RFC 7662 introspection endpoint                                                             |
| `MCP_OAUTH_AUDIENCE`          | `MCP_PUBLIC_URL`                          | Expected token audience or resource                                                                      |
| `MCP_OAUTH_SCOPES`            | none                                      | Add scopes advertised alongside the minimal built-in `mcp` scope                                        |
| `MCP_OAUTH_REQUIRED_SCOPES`   | none                                      | Add scopes required for every request alongside the built-in `mcp` scope                                |

The introspection response must identify an active, unexpired token for this server's audience/resource. Every authenticated MCP request requires `mcp` plus any additional globally required scopes. `write_contract`, both transfer tools, and `approve_token_spending` additionally require `evm:write`; `sign_message` and `sign_typed_data` require `evm:sign`.

Authorization-server metadata must advertise the authorization-code response type and PKCE `S256`; the issuer, metadata URL, and all authorization-server endpoints must use HTTPS. Metadata and token-introspection requests reject redirects and time out after 10 seconds.

Example remote configuration:

```bash
export MCP_HOST="0.0.0.0"
export MCP_ALLOWED_HOSTS="mcp.example.com"
export MCP_ALLOWED_ORIGINS="https://app.example.com"
export MCP_OAUTH_ISSUER_URL="https://auth.example.com/"
export MCP_PUBLIC_URL="https://mcp.example.com/mcp"
export MCP_OAUTH_CLIENT_ID="evm-mcp-resource-server"
export MCP_OAUTH_CLIENT_SECRET="..."
```

Chain defaults and RPC endpoints are configured in `src/core/chains.ts`.

## 🚀 Usage

### Using npx (No Installation Required)

You can run the MCP EVM Server directly without installation using npx:

```bash
# Run the server in stdio mode (for CLI tools)
npx @mcpdotdirect/evm-mcp-server

# Run the server in HTTP mode (for web applications)
npx @mcpdotdirect/evm-mcp-server --http
```

### Running the Server Locally

Start the server using stdio (for embedding in CLI tools):

```bash
# Start the stdio server
bun start

# Development mode with auto-reload
bun dev
```

Or start the stateless Streamable HTTP server for web applications:

```bash
# Start the HTTP server
bun start:http

# Development mode with auto-reload
bun dev:http
```

### Connecting to the Server

Connect to this MCP server using any MCP-compatible client. For testing and debugging, you can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

### Connecting from Cursor

To connect to the MCP server from Cursor:

1. Open Cursor and go to Settings (gear icon in the bottom left)
2. Click on "Features" in the left sidebar
3. Scroll down to "MCP Servers" section
4. Click "Add new MCP server"
5. Enter the following details:

   - Server name: `evm-mcp-server`
   - Type: `command`
   - Command: `npx @mcpdotdirect/evm-mcp-server`

6. Click "Save"

Once connected, you can use the MCP server's capabilities directly within Cursor. The server will appear in the MCP Servers list and can be enabled/disabled as needed.

### Using mcp.json with Cursor

For a more portable configuration that you can share with your team or use across projects, you can create an `.cursor/mcp.json` file in your project's root directory:

```json
{
  "mcpServers": {
    "evm-mcp-server": {
      "command": "npx",
      "args": ["-y", "@mcpdotdirect/evm-mcp-server"]
    }
  }
}
```

Place this file in your project's `.cursor` directory (create it if it doesn't exist), and Cursor will automatically detect and use these MCP server configurations when working in that project. This approach makes it easy to:

1. Share MCP configurations with your team
2. Version control your MCP setup
3. Use different server configurations for different projects

### Example: Streamable HTTP Mode

The HTTP entrypoint uses MCP `2026-07-28` stateless Streamable HTTP on `POST /mcp`. It does not mint `Mcp-Session-Id` values, and `GET /mcp` or `DELETE /mcp` return `405 Method Not Allowed`. HTTP is modern-only; stdio additionally serves legacy MCP `2025-11-25` clients through the SDK's version negotiation.

Modern HTTP clients must send:

- `Accept: application/json, text/event-stream`
- `MCP-Protocol-Version: 2026-07-28`
- `Mcp-Method: <json-rpc method>`
- `Mcp-Name: <tool name, resource URI, or prompt name>` for `tools/call`, `resources/read`, and `prompts/get`
- `params._meta.io.modelcontextprotocol/protocolVersion`
- `params._meta.io.modelcontextprotocol/clientCapabilities`

Clients should also send `params._meta.io.modelcontextprotocol/clientInfo`. The final specification makes client identity optional, so the server accepts a request when that field is absent.

When OAuth is enabled, clients must also send `Authorization: Bearer <access-token>`. The server publishes MCP protected-resource metadata and returns standards-based `WWW-Authenticate` challenges for missing, invalid, or insufficiently scoped tokens.

Example discovery request:

```bash
curl -X POST http://127.0.0.1:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: server/discover' \
  --data '{
    "jsonrpc": "2.0",
    "id": "discover-1",
    "method": "server/discover",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": {
          "name": "example-client",
          "version": "1.0.0"
        },
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
  }'
```

### Example: Using the MCP Server in Cursor

After configuring the MCP server with `mcp.json`, you can easily use it in Cursor. Here's an example workflow:

1. Create a new JavaScript/TypeScript file in your project:

```javascript
// blockchain-example.js
async function main() {
  try {
    // Get ETH balance for an address using ENS
    console.log("Getting ETH balance for vitalik.eth...");

    // When using with Cursor, you can simply ask Cursor to:
    // "Check the ETH balance of vitalik.eth on mainnet"
    // Or "Transfer 0.1 ETH from my wallet to vitalik.eth"

    // Cursor will use the MCP server to execute these operations
    // without requiring any additional code from you

    // This is the power of the MCP integration - your AI assistant
    // can directly interact with blockchain data and operations
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
```

2. With the file open in Cursor, you can ask Cursor to:

   - "Check the current ETH balance of vitalik.eth"
   - "Show me the current gas price on Ethereum"
   - "Show me the latest block on Optimism"
   - "Read the name() function from the contract at 0x1234..."

3. Cursor will use the MCP server to execute these operations and return the results directly in your conversation.

The MCP server handles all the blockchain communication while allowing Cursor to understand and execute blockchain-related tasks through natural language.

### Connecting using Claude CLI

If you're using Claude CLI, you can connect to the MCP server with just two commands:

```bash
# Add the MCP server
claude mcp add evm-mcp-server npx @mcpdotdirect/evm-mcp-server

# Start Claude with the MCP server enabled
claude
```

### Example: Getting a Token Balance with ENS

Use the following object as the `params` of a `tools/call` request:

```json
{
  "name": "get_token_balance",
  "arguments": {
    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "address": "vitalik.eth",
    "network": "ethereum"
  }
}
```

A successful result includes the same JSON as text and as typed structured content:

```json
{
  "structuredContent": {
    "network": "ethereum",
    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "address": "vitalik.eth",
    "balance": {
      "raw": "1000000000",
      "formatted": "1000",
      "symbol": "USDC",
      "decimals": 6
    }
  }
}
```

### Example: Resolving an ENS Name

```json
{
  "name": "resolve_ens_name",
  "arguments": {
    "ensName": "vitalik.eth",
    "network": "ethereum"
  }
}
```

### Example: Batch Multiple Calls with Multicall

```json
{
  "name": "multicall",
  "arguments": {
    "network": "ethereum",
    "calls": [
      {
        "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "functionName": "balanceOf",
        "args": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]
      },
      {
        "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "functionName": "symbol"
      },
      {
        "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "functionName": "decimals"
      }
    ]
  }
}
```

### Structured Results and Wallet Confirmation

Every tool advertises an `outputSchema`. Successful calls return the schema-described value twice:

- `structuredContent` contains native JSON for clients.
- `content[0].text` contains the same JSON as pretty-printed text for compatibility.

Values that originate as JavaScript bigint values are encoded as decimal strings in both representations.

The following wallet-backed tools enforce confirmation through MCP multi-round-trip `input_required` results:

- `write_contract`
- `transfer_native`
- `transfer_erc20`
- `approve_token_spending`
- `sign_message`
- `sign_typed_data`

The first invocation describes the exact operation and requests a boolean `confirm` input. No wallet action occurs until the client returns an accepted response with `confirm: true`; declining or cancelling terminates the operation. Clients should display this protocol-level request instead of adding a separate conversational confirmation.

Confirmation continuation state is HMAC integrity-protected and binds the complete tool arguments. It expires after five minutes, is process-local and single-use, and is also bound to the authenticated bearer token for HTTP requests. An expired, replayed, cross-process, or differently authenticated continuation requires a new confirmation.

For example, the initial transfer call uses ordinary `tools/call` parameters:

```json
{
  "name": "transfer_native",
  "arguments": {
    "to": "vitalik.eth",
    "amount": "0.01",
    "network": "ethereum"
  }
}
```

An MCP `2026-07-28` client must advertise form elicitation support to complete the confirmation round trip. Legacy stdio clients use the SDK compatibility bridge.

## 📚 API Reference

### Tools

The server provides 25 focused MCP tools for agents. ENS support is noted for each relevant address parameter below; raw contract interaction tools require resolved hexadecimal addresses.

#### Wallet Information

| Tool Name            | Description                              | Key Parameters |
| -------------------- | ---------------------------------------- | -------------- |
| `get_wallet_address` | Get the configured wallet address        | none           |

#### Network Information

| Tool Name                | Description                                                   | Key Parameters |
| ------------------------ | ------------------------------------------------------------- | -------------- |
| `get_chain_info`         | Get network information                                       | `network`      |
| `get_supported_networks` | List 87 configured names and aliases for 55 distinct EVM chains | none           |
| `get_gas_price`          | Get current gas prices on a network                           | `network`      |

#### ENS Services

| Tool Name            | Description                        | Key Parameters       |
| -------------------- | ---------------------------------- | -------------------- |
| `resolve_ens_name`   | Resolve ENS name to address        | `ensName`, `network` |
| `lookup_ens_address` | Reverse lookup address to ENS name | `address`, `network` |

#### Block & Transaction Information

| Tool Name                 | Description                       | Key Parameters                                         |
| ------------------------- | --------------------------------- | ------------------------------------------------------ |
| `get_block`               | Get block data                    | `blockIdentifier`, `network`                           |
| `get_latest_block`        | Get latest block data             | `network`                                              |
| `get_transaction`         | Get transaction details           | `txHash`, `network`                                    |
| `get_transaction_receipt` | Get transaction receipt with logs | `txHash`, `network`                                    |
| `wait_for_transaction`    | Wait for transaction confirmation | `txHash`, `confirmations`, `timeoutSeconds`, `network` |

`wait_for_transaction.timeoutSeconds` accepts an integer from 1 through 90 and defaults to 90. If the transaction is still pending, call the tool again or query `get_transaction_receipt`. The tool remains synchronous because the released MCP TypeScript SDK v2 removed its experimental Tasks server runtime; this server does not advertise or implement Tasks.

#### Balance & Token Information

| Tool Name           | Description                    | Key Parameters                                                                                                 |
| ------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `get_balance`       | Get native token balance       | `address` (address/ENS), `network`                                                                             |
| `get_token_balance` | Check ERC20 token balance      | `tokenAddress` (address/ENS), `address` (address/ENS), `network`                                               |
| `get_allowance`     | Check token spending allowance | `tokenAddress`, `spenderAddress`, `ownerAddress` (optional; configured wallet by default), `network`           |

#### Smart Contract Interactions

| Tool Name          | Description                                                           | Key Parameters                                                                                   |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `get_contract_abi` | Fetch a verified contract ABI through Etherscan v2 where supported    | `contractAddress`, `network`                                                                     |
| `read_contract`    | Read smart contract state (auto-fetches ABI if needed)                | `contractAddress`, `functionName`, `args[]`, `abiJson` (optional), `network`                     |
| `write_contract`   | Execute state-changing functions (auto-fetches ABI if needed)         | `contractAddress`, `functionName`, `args[]`, `value` (optional), `abiJson` (optional), `network` |
| `multicall`        | Batch contract reads through Viem/Multicall3; large batches may be split and require a configured deployment | `calls[]` (array of contract calls), `allowFailure` (optional), `network` |

#### Token Transfers

| Tool Name                | Description                    | Key Parameters                                                                    |
| ------------------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `transfer_native`        | Send native tokens (ETH, etc.) | `to` (address/ENS), `amount`, `network`                                           |
| `transfer_erc20`         | Transfer ERC20 tokens          | `tokenAddress` (address/ENS), `to` (address/ENS), `amount`, `network`             |
| `approve_token_spending` | Approve token allowances       | `tokenAddress` (address/ENS), `spenderAddress` (address/ENS), `amount`, `network` |

#### NFT Services

| Tool Name             | Description                                      | Key Parameters                                                                  |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `get_nft_info`        | Get ERC721 collection name, symbol, and token URI | `contractAddress`, `tokenId`, `network`                                         |
| `get_erc1155_balance` | Check ERC1155 balance                            | `contractAddress` (address/ENS), `tokenId`, `address` (address/ENS), `network`   |

#### Message Signing

| Tool Name         | Description                                                                              | Key Parameters                                          |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `sign_message`    | Sign arbitrary messages for authentication and verification (SIWE, off-chain signatures) | `message`                                               |
| `sign_typed_data` | Sign EIP-712 structured data for gasless transactions, permits, and meta-transactions    | `domainJson`, `typesJson`, `primaryType`, `messageJson` |

### Prompts

The server registers 10 prompts that generate task-specific instructions. Retrieving a prompt does not itself read blockchain state or execute a wallet operation.

| Prompt Name               | Description                                                       | Key Parameters                                                                                       |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `prepare_transfer`        | Guide a validated native or ERC20 transfer workflow               | `tokenType`, `recipient`, `amount`, `tokenAddress` (optional; required for ERC20), `network`         |
| `diagnose_transaction`    | Guide transaction status, receipt, and gas-based diagnosis        | `txHash`, `network`                                                                                  |
| `analyze_wallet`          | Summarize native and explicitly requested ERC20 balances          | `address`, `tokens` (optional, comma-separated), `network`                                           |
| `audit_approvals`         | Assess one owner-to-spender ERC20 allowance                       | `tokenAddress`, `spenderAddress`, `address` (optional; configured wallet by default), `network`      |
| `fetch_and_analyze_abi`   | Guide verified-contract ABI fetching and analysis                 | `contractAddress`, `findFunction` (optional), `network`                                              |
| `explore_contract`        | Guide contract exploration with optional ABI fetching             | `contractAddress`, `fetchAbi` (optional), `network`                                                  |
| `interact_with_contract`  | Guide a validated contract write with MCP confirmation            | `contractAddress`, `functionName`, `args` (optional JSON array string), `value` (optional), `network` |
| `explain_evm_concept`     | Explain an EVM or blockchain concept                              | `concept`                                                                                            |
| `compare_networks`        | Compare named EVM networks                                        | `networks` (comma-separated)                                                                         |
| `check_network_status`    | Guide a current network-condition check                           | `network`                                                                                            |

### Resources

The server exposes 87 configured names and aliases for its 55 distinct chains as a static MCP resource. Supported numeric chain IDs are also accepted as tool inputs.

| Resource URI     | Description                                    |
| ---------------- | ---------------------------------------------- |
| `evm://networks` | Accepted EVM network names and alias identifiers |

## 🔒 Security Considerations

- Wallet secrets are read from the process environment for address derivation, transaction signing, and message signing; the application does not write them to persistent storage
- The six wallet-backed transaction, approval, and signing tools enforce exact-operation MCP confirmation before accessing the wallet
- Confirmation continuation state is HMAC integrity-protected, expires after five minutes, and is process-local and single-use; HTTP state is additionally bound to the authenticated bearer token
- Local HTTP may run without authorization; non-local HTTP fails closed unless OAuth is configured
- Remote access tokens require the baseline `mcp` scope, plus `evm:write` or `evm:sign` for privileged operations
- Use HTTPS for all non-local HTTP deployments
- Implement rate limiting to prevent abuse
- Keep wallet secrets, OAuth introspection credentials, and RPC credentials in a secure secret manager

## 📁 Project Structure

```
evm-mcp-server/
├── bin/
│   └── cli.js                  # Published stdio/HTTP command-line entry point
├── src/
│   ├── index.ts                # Main stdio server entry point
│   ├── server/                 # Server-related files
│   │   ├── auth.ts             # HTTP OAuth metadata and token introspection
│   │   ├── http-app.ts         # Testable Express middleware assembly
│   │   ├── http-server.ts      # Stateless Streamable HTTP server
│   │   ├── protocol.ts         # Shared protocol metadata
│   │   ├── request-state.ts    # Integrity-protected confirmation continuation state
│   │   ├── server.ts           # General server setup
│   │   └── stdio-server.ts     # SDK-native dual-era stdio entry
│   └── core/
│       ├── chains.ts           # Chain definitions and utilities
│       ├── resources.ts        # MCP resources implementation
│       ├── tools.ts            # MCP tools implementation
│       ├── prompts.ts          # MCP prompts implementation
│       └── services/           # Core blockchain services
│           ├── abi.ts          # Etherscan ABI fetching and parsing
│           ├── balance.ts      # Balance services
│           ├── blocks.ts       # Block services
│           ├── clients.ts      # RPC client utilities
│           ├── contracts.ts    # Contract interactions
│           ├── ens.ts          # ENS resolution
│           ├── index.ts        # Operation exports
│           ├── tokens.ts       # Token information services
│           ├── transactions.ts # Transaction services
│           ├── transfer.ts     # Token transfer services
│           └── wallet.ts       # Wallet derivation and signing
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Development

To modify or extend the server:

1. Add new services in the appropriate file under `src/core/services/`
2. Register new tools in `src/core/tools.ts`
3. Register new resources in `src/core/resources.ts`
4. Add new network support in `src/core/chains.ts`
5. Configure the HTTP listener and OAuth resource server with the documented `MCP_*` environment variables

## 📄 License

This project is licensed under the terms of the [MIT License](./LICENSE).
