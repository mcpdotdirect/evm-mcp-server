# EVM MCP Server

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![EVM Networks](https://img.shields.io/badge/Networks-60+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6)
![MCP](https://img.shields.io/badge/MCP-1.22.0+-blue)
![Viem](https://img.shields.io/badge/Viem-2.39.3+-green)

A comprehensive Model Context Protocol (MCP) server that provides blockchain services across 60+ EVM-compatible networks. This server enables AI agents to interact with Ethereum, Optimism, Arbitrum, Base, Polygon, and many other EVM chains with a unified interface through 22 tools and 10 AI-guided prompts.

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
- Interacting with smart contracts with **automatic ABI fetching** from block explorers
- Transferring tokens (native, ERC20, ERC721, ERC1155)
- Querying token metadata and balances
- Chain-specific services across 60+ EVM networks (34 mainnets + 26 testnets)
- **ENS name resolution** for all address parameters (use human-readable names like 'vitalik.eth' instead of addresses)
- **AI-friendly prompts** that guide agents through complex workflows

All services are exposed through a consistent interface of MCP tools, resources, and prompts, making it easy for AI agents to discover and use blockchain functionality. **Every tool that accepts Ethereum addresses also supports ENS names**, automatically resolving them to addresses behind the scenes. The server includes intelligent ABI fetching, eliminating the need to know contract ABIs in advance.

## ✨ Features

### Blockchain Data Access

- **Multi-chain support** for 60+ EVM-compatible networks (34 mainnets + 26 testnets)
- **Chain information** including blockNumber, chainId, and RPCs
- **Block data** access by number, hash, or latest
- **Transaction details** and receipts with decoded logs
- **Address balances** for native tokens and all token standards
- **ENS resolution** for human-readable Ethereum addresses (use 'vitalik.eth' instead of '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')

### Token services

- **ERC20 Tokens**
  - Get token metadata (name, symbol, decimals, supply)
  - Check token balances
  - Transfer tokens between addresses
  - Approve spending allowances

- **NFTs (ERC721)**
  - Get collection and token metadata
  - Verify token ownership
  - Transfer NFTs between addresses
  - Retrieve token URIs and count holdings

- **Multi-tokens (ERC1155)**
  - Get token balances and metadata
  - Transfer tokens with quantity
  - Access token URIs

### Smart Contract Interactions

- **Read contract state** through view/pure functions
- **Write to contracts** - Execute any state-changing function with automatic ABI fetching
- **Contract verification** to distinguish from EOAs
- **Event logs** retrieval and filtering
- **Automatic ABI fetching** from Etherscan v2 API across all 60+ networks (no need to know ABIs in advance)
- **ABI parsing and validation** with function discovery

### Comprehensive Transaction Support

- **Flexible Wallet Support** - Configure with Private Key or Mnemonic (BIP-39) with HD path support
- **Native token transfers** across all supported networks
- **Gas estimation** for transaction planning
- **Transaction status** and receipt information
- **Error handling** with descriptive messages

### AI-Guided Workflows (Prompts)

- **Transaction preparation** - Guidance for planning and executing transfers
- **Wallet analysis** - Tools for analyzing wallet activity and holdings
- **Smart contract exploration** - Interactive ABI fetching and contract analysis
- **Contract interaction** - Safe execution of write operations on smart contracts
- **Network information** - Learning about EVM networks and comparisons
- **Approval auditing** - Reviewing and managing token approvals
- **Error diagnosis** - Troubleshooting transaction failures

## 🌐 Supported Networks

### Mainnets
- Ethereum (ETH)
- Optimism (OP)
- Arbitrum (ARB)
- Arbitrum Nova
- Base
- Polygon (MATIC)
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

### Testnets
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
git clone https://github.com/mcpdotdirect/mcp-evm-server.git
cd mcp-evm-server

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
export EVM_MNEMONIC="word1 word2 word3 ... word12" # Your 12 or 24 word BIP-39 mnemonic
export EVM_ACCOUNT_INDEX="0" # Optional: Account index for HD wallet derivation (default: 0)
```

The mnemonic option supports hierarchical deterministic (HD) wallet derivation:
- Uses BIP-39 standard mnemonic phrases (12 or 24 words)
- Supports BIP-44 derivation path: `m/44'/60'/0'/0/{accountIndex}`
- `EVM_ACCOUNT_INDEX` allows you to derive different accounts from the same mnemonic
- Default account index is 0 (first account)

**Wallet is used for:**
- Transferring native tokens (`transfer_native` tool)
- Transferring ERC20 tokens (`transfer_erc20` tool)
- Approving token spending (`approve_token_spending` tool)
- Writing to smart contracts (`write_contract` tool)

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
- Automatic ABI fetching from block explorers (`get_contract_abi` tool)
- Auto-fetching ABIs when reading contracts (`read_contract` tool with `abiJson` parameter)
- The `fetch_and_analyze_abi` prompt

Get your free API key from:
- [Etherscan](https://etherscan.io/apis) - For Ethereum and compatible chains
- The same key works across all 60+ EVM networks via the Etherscan v2 API

### Server Configuration

The server uses the following default configuration:

- **Default Chain ID**: 1 (Ethereum Mainnet)
- **Server Port**: 3001
- **Server Host**: 0.0.0.0 (accessible from any network interface)

These values are hardcoded in the application. If you need to modify them, you can edit the following files:

- For chain configuration: `src/core/chains.ts`
- For server configuration: `src/server/http-server.ts`

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

Or start the HTTP server with SSE for web applications:

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
      "args": [
        "-y",
        "@mcpdotdirect/evm-mcp-server"
      ]
    },
    "evm-mcp-http": {
      "command": "npx",
      "args": [
        "-y", 
        "@mcpdotdirect/evm-mcp-server", 
        "--http"
      ]
    }
  }
}
```

Place this file in your project's `.cursor` directory (create it if it doesn't exist), and Cursor will automatically detect and use these MCP server configurations when working in that project. This approach makes it easy to:

1. Share MCP configurations with your team
2. Version control your MCP setup
3. Use different server configurations for different projects

### Example: HTTP Mode with SSE

If you're developing a web application and want to connect to the HTTP server with Server-Sent Events (SSE), you can use this configuration:

```json
{
  "mcpServers": {
    "evm-mcp-sse": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

This connects directly to the HTTP server's SSE endpoint, which is useful for:
- Web applications that need to connect to the MCP server from the browser
- Environments where running local commands isn't ideal
- Sharing a single MCP server instance among multiple users or applications

To use this configuration:
1. Create a `.cursor` directory in your project root if it doesn't exist
2. Save the above JSON as `mcp.json` in the `.cursor` directory
3. Restart Cursor or open your project
4. Cursor will detect the configuration and offer to enable the server(s)

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
   - "Look up the price of USDC on Ethereum"
   - "Show me the latest block on Optimism"
   - "Check if 0x1234... is a contract address"

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

```javascript
// Example of using the MCP client to check a token balance using ENS
const mcp = new McpClient("http://localhost:3000");

const result = await mcp.invokeTool("get-token-balance", {
  tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
  ownerAddress: "vitalik.eth", // ENS name instead of address
  network: "ethereum"
});

console.log(result);
// {
//   tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
//   owner: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
//   network: "ethereum",
//   raw: "1000000000",
//   formatted: "1000",
//   symbol: "USDC",
//   decimals: 6
// }
```

### Example: Resolving an ENS Name

```javascript
// Example of using the MCP client to resolve an ENS name to an address
const mcp = new McpClient("http://localhost:3000");

const result = await mcp.invokeTool("resolve-ens", {
  ensName: "vitalik.eth",
  network: "ethereum"
});

console.log(result);
// {
//   ensName: "vitalik.eth",
//   normalizedName: "vitalik.eth",
//   resolvedAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
//   network: "ethereum"
// }
```

## 📚 API Reference

### Tools

The server provides 22 focused MCP tools for agents. **All tools that accept address parameters support both Ethereum addresses and ENS names.**

#### Wallet Information

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get_wallet_address` | Get the address of the configured wallet (from EVM_PRIVATE_KEY) | none |

#### Network Information

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get_chain_info` | Get network information | `network` |
| `get_supported_networks` | List all supported EVM networks | none |
| `get_gas_price` | Get current gas prices on a network | `network` |

#### ENS Services

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `resolve_ens_name` | Resolve ENS name to address | `ensName`, `network` |
| `lookup_ens_address` | Reverse lookup address to ENS name | `address`, `network` |

#### Block & Transaction Information

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get_block` | Get block data | `blockNumber` or `blockHash`, `network` |
| `get_latest_block` | Get latest block data | `network` |
| `get_transaction` | Get transaction details | `txHash`, `network` |
| `get_transaction_receipt` | Get transaction receipt with logs | `txHash`, `network` |
| `wait_for_transaction` | Wait for transaction confirmation | `txHash`, `confirmations`, `network` |

#### Balance & Token Information

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get_balance` | Get native token balance | `address` (address/ENS), `network` |
| `get_token_balance` | Check ERC20 token balance | `tokenAddress` (address/ENS), `ownerAddress` (address/ENS), `network` |
| `get_allowance` | Check token spending allowance | `tokenAddress` (address/ENS), `ownerAddress` (address/ENS), `spenderAddress` (address/ENS), `network` |

#### Smart Contract Interactions

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get_contract_abi` | Fetch contract ABI from block explorer (60+ networks) | `contractAddress` (address/ENS), `network` |
| `read_contract` | Read smart contract state (auto-fetches ABI if needed) | `contractAddress`, `functionName`, `args[]`, `abiJson` (optional), `network` |
| `write_contract` | Execute state-changing functions (auto-fetches ABI if needed) | `contractAddress`, `functionName`, `args[]`, `value` (optional), `abiJson` (optional), `network` |

#### Token Transfers

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `transfer_native` | Send native tokens (ETH, etc.) | `to` (address/ENS), `amount`, `network` |
| `transfer_erc20` | Transfer ERC20 tokens | `tokenAddress` (address/ENS), `to` (address/ENS), `amount`, `network` |
| `approve_token_spending` | Approve token allowances | `tokenAddress` (address/ENS), `spenderAddress` (address/ENS), `amount`, `network` |

#### NFT Services

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get_nft_info` | Get NFT (ERC721) metadata | `tokenAddress` (address/ENS), `tokenId`, `network` |
| `get_erc1155_balance` | Check ERC1155 balance | `tokenAddress` (address/ENS), `tokenId`, `ownerAddress` (address/ENS), `network` |

### Resources

The server exposes blockchain data through the following MCP resource URIs. All resource URIs that accept addresses also support ENS names, which are automatically resolved to addresses.

#### Blockchain Resources

| Resource URI Pattern | Description |
|-----------|-------------|
| `evm://{network}/chain` | Chain information for a specific network |
| `evm://chain` | Ethereum mainnet chain information |
| `evm://{network}/block/{blockNumber}` | Block data by number |
| `evm://{network}/block/latest` | Latest block data |
| `evm://{network}/address/{address}/balance` | Native token balance |
| `evm://{network}/tx/{txHash}` | Transaction details |
| `evm://{network}/tx/{txHash}/receipt` | Transaction receipt with logs |

#### Token Resources

| Resource URI Pattern | Description |
|-----------|-------------|
| `evm://{network}/token/{tokenAddress}` | ERC20 token information |
| `evm://{network}/token/{tokenAddress}/balanceOf/{address}` | ERC20 token balance |
| `evm://{network}/nft/{tokenAddress}/{tokenId}` | NFT (ERC721) token information |
| `evm://{network}/nft/{tokenAddress}/{tokenId}/isOwnedBy/{address}` | NFT ownership verification |
| `evm://{network}/erc1155/{tokenAddress}/{tokenId}/uri` | ERC1155 token URI |
| `evm://{network}/erc1155/{tokenAddress}/{tokenId}/balanceOf/{address}` | ERC1155 token balance |

## 🔒 Security Considerations

- **Private keys** are used only for transaction signing and are never stored by the server
- Consider implementing additional authentication mechanisms for production use
- Use HTTPS for the HTTP server in production environments
- Implement rate limiting to prevent abuse
- For high-value services, consider adding confirmation steps

## 📁 Project Structure

```
mcp-evm-server/
├── src/
│   ├── index.ts                # Main stdio server entry point
│   ├── server/                 # Server-related files
│   │   ├── http-server.ts      # HTTP server with SSE
│   │   └── server.ts           # General server setup
│   ├── core/
│   │   ├── chains.ts           # Chain definitions and utilities
│   │   ├── resources.ts        # MCP resources implementation
│   │   ├── tools.ts            # MCP tools implementation
│   │   ├── prompts.ts          # MCP prompts implementation
│   │   └── services/           # Core blockchain services
│   │       ├── index.ts        # Operation exports
│   │       ├── balance.ts      # Balance services
│   │       ├── transfer.ts     # Token transfer services
│   │       ├── utils.ts        # Utility functions
│   │       ├── tokens.ts       # Token metadata services
│   │       ├── contracts.ts    # Contract interactions
│   │       ├── transactions.ts # Transaction services
│   │       └── blocks.ts       # Block services
│   │       └── clients.ts      # RPC client utilities
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
5. To change server configuration, edit the hardcoded values in `src/server/http-server.ts`

## 📄 License

This project is licensed under the terms of the [MIT License](./LICENSE).
