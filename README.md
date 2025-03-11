# MCP EVM Server

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![EVM Networks](https://img.shields.io/badge/Networks-30+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)
![Viem](https://img.shields.io/badge/Viem-1.0+-green)

A comprehensive Model Context Protocol (MCP) server that provides blockchain services across multiple EVM-compatible networks. This server enables AI agents to interact with Ethereum, Optimism, Arbitrum, Base, Polygon, and many other EVM chains with a unified interface.

## 📋 Contents

- [Overview](#overview)
- [Features](#features)
- [Supported Networks](#supported-networks)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Server Configuration](#server-configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
  - [Tools](#tools)
  - [Resources](#resources)
- [Security Considerations](#security-considerations)
- [Project Structure](#project-structure)
- [Development](#development)
- [License](#license)

## 🔭 Overview

The MCP EVM Server leverages the Model Context Protocol to provide blockchain services to AI agents. It supports a wide range of services including:

- Reading blockchain state (balances, transactions, blocks, etc.)
- Interacting with smart contracts
- Transferring tokens (native, ERC20, ERC721, ERC1155)
- Querying token metadata and balances
- Chain-specific services across 30+ EVM networks
- **ENS name resolution** for all address parameters (use human-readable names like 'vitalik.eth' instead of addresses)

All services are exposed through a consistent interface of MCP tools and resources, making it easy for AI agents to discover and use blockchain functionality. **Every tool that accepts Ethereum addresses also supports ENS names**, automatically resolving them to addresses behind the scenes.

## ✨ Features

### Blockchain Data Access

- **Multi-chain support** for 30+ EVM-compatible networks
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
- **Write services** with private key signing
- **Contract verification** to distinguish from EOAs
- **Event logs** retrieval and filtering

### Comprehensive Transaction Support

- **Native token transfers** across all supported networks
- **Gas estimation** for transaction planning
- **Transaction status** and receipt information
- **Error handling** with descriptive messages

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

## 🛠️ Prerequisites

- [Bun](https://bun.sh/) 1.0.0 or higher
- Node.js 18.0.0 or higher (if not using Bun)

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

## ⚙️ Server Configuration

The server uses the following default configuration:

- **Default Chain ID**: 1 (Ethereum Mainnet)
- **Server Port**: 3001
- **Server Host**: 0.0.0.0 (accessible from any network interface)

These values are hardcoded in the application. If you need to modify them, you can edit the following files:

- For chain configuration: `src/core/chains.ts`
- For server configuration: `src/server/http-server.ts`

## 🚀 Usage

### Running the Server

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
   - Command: `npx tsx /path/to/mcp-evm-server/src/index.ts`
   - (Replace with the absolute path to your evm-mcp-server/src/index.ts file)

6. Click "Save"

Once connected, you can use the MCP server's capabilities directly within Cursor. The server will appear in the MCP Servers list and can be enabled/disabled as needed.

### Connecting using Claude CLI

If you're using Claude CLI, you can connect to the MCP server with just two commands:

```bash
# Add the MCP server
claude mcp add evm-mcp-server npx tsx /path/to/mcp-evm-server/src/index.ts

# Start Claude with the MCP server enabled
claude
```

Replace `/path/to/mcp-evm-server/src/index.ts` with the absolute path to your project's src/index.ts file.

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

The server provides the following MCP tools for agents. **All tools that accept address parameters support both Ethereum addresses and ENS names.**

#### Token services

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get-token-info` | Get ERC20 token metadata | `tokenAddress` (address/ENS), `network` |
| `get-token-balance` | Check ERC20 token balance | `tokenAddress` (address/ENS), `ownerAddress` (address/ENS), `network` |
| `transfer-token` | Transfer ERC20 tokens | `privateKey`, `tokenAddress` (address/ENS), `toAddress` (address/ENS), `amount`, `network` |
| `approve-token-spending` | Approve token allowances | `privateKey`, `tokenAddress` (address/ENS), `spenderAddress` (address/ENS), `amount`, `network` |
| `get-nft-info` | Get NFT metadata | `tokenAddress` (address/ENS), `tokenId`, `network` |
| `check-nft-ownership` | Verify NFT ownership | `tokenAddress` (address/ENS), `tokenId`, `ownerAddress` (address/ENS), `network` |
| `transfer-nft` | Transfer an NFT | `privateKey`, `tokenAddress` (address/ENS), `tokenId`, `toAddress` (address/ENS), `network` |
| `get-nft-balance` | Count NFTs owned | `tokenAddress` (address/ENS), `ownerAddress` (address/ENS), `network` |
| `get-erc1155-token-uri` | Get ERC1155 metadata | `tokenAddress` (address/ENS), `tokenId`, `network` |
| `get-erc1155-balance` | Check ERC1155 balance | `tokenAddress` (address/ENS), `tokenId`, `ownerAddress` (address/ENS), `network` |
| `transfer-erc1155` | Transfer ERC1155 tokens | `privateKey`, `tokenAddress` (address/ENS), `tokenId`, `amount`, `toAddress` (address/ENS), `network` |

#### Blockchain services

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get-chain-info` | Get network information | `network` |
| `get-balance` | Get native token balance | `address` (address/ENS), `network` |
| `transfer-eth` | Send native tokens | `privateKey`, `to` (address/ENS), `amount`, `network` |
| `get-transaction` | Get transaction details | `txHash`, `network` |
| `read-contract` | Read smart contract state | `contractAddress` (address/ENS), `abi`, `functionName`, `args`, `network` |
| `write-contract` | Write to smart contract | `contractAddress` (address/ENS), `abi`, `functionName`, `args`, `privateKey`, `network` |
| `is-contract` | Check if address is a contract | `address` (address/ENS), `network` |
| `resolve-ens` | Resolve ENS name to address | `ensName`, `network` |

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
