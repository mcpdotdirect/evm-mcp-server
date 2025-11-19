import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupportedNetworks, getRpcUrl } from "./chains.js";
import * as services from "./services/index.js";
import type { Address, Hash } from "viem";

/**
 * Register all EVM-related resources
 * @param server The MCP server instance
 */
export function registerEVMResources(server: McpServer) {
  // ============================================================================
  // CHAIN INFO RESOURCES
  // ============================================================================

  server.registerResource(
    "chain_info_by_network",
    new ResourceTemplate("evm://{network}/chain", { list: undefined }),
    { description: "Get chain information for a specific network", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const chainId = await services.getChainId(network);
        const blockNumber = await services.getBlockNumber(network);
        const rpcUrl = getRpcUrl(network);
        return { contents: [{ uri: uri.href, text: JSON.stringify({ network, chainId, blockNumber: blockNumber.toString(), rpcUrl }, null, 2) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "ethereum_chain_info",
    "evm://chain",
    { description: "Get Ethereum mainnet chain information", mimeType: "application/json" },
    async (uri) => {
      try {
        const network = "ethereum";
        const chainId = await services.getChainId(network);
        const blockNumber = await services.getBlockNumber(network);
        const rpcUrl = getRpcUrl(network);
        return { contents: [{ uri: uri.href, text: JSON.stringify({ network, chainId, blockNumber: blockNumber.toString(), rpcUrl }, null, 2) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "supported_networks",
    "evm://networks",
    { description: "Get list of all supported EVM networks", mimeType: "application/json" },
    async (uri) => {
      try {
        const networks = getSupportedNetworks();
        return { contents: [{ uri: uri.href, text: JSON.stringify({ supportedNetworks: networks }, null, 2) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // ============================================================================
  // BLOCK RESOURCES
  // ============================================================================

  server.registerResource(
    "evm_block_by_number",
    new ResourceTemplate("evm://{network}/block/{blockNumber}", { list: undefined }),
    { description: "Get block by number for a specific network", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const blockNumber = params.blockNumber as string;
        const block = await services.getBlockByNumber(parseInt(blockNumber), network);
        return { contents: [{ uri: uri.href, text: services.helpers.formatJson(block) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "block_by_hash",
    new ResourceTemplate("evm://{network}/block/hash/{blockHash}", { list: undefined }),
    { description: "Get block by hash for a specific network", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const blockHash = params.blockHash as string;
        const block = await services.getBlockByHash(blockHash as Hash, network);
        return { contents: [{ uri: uri.href, text: services.helpers.formatJson(block) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "evm_latest_block",
    new ResourceTemplate("evm://{network}/block/latest", { list: undefined }),
    { description: "Get latest block for a specific network", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const block = await services.getLatestBlock(network);
        return { contents: [{ uri: uri.href, text: services.helpers.formatJson(block) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "default_latest_block",
    "evm://block/latest",
    { description: "Get latest Ethereum mainnet block", mimeType: "application/json" },
    async (uri) => {
      try {
        const block = await services.getLatestBlock("ethereum");
        return { contents: [{ uri: uri.href, text: services.helpers.formatJson(block) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // ============================================================================
  // BALANCE RESOURCES
  // ============================================================================

  server.registerResource(
    "evm_address_native_balance",
    new ResourceTemplate("evm://{network}/address/{address}/balance", { list: undefined }),
    { description: "Get native token balance for an address on a specific network", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const address = params.address as string;
        const balance = await services.getETHBalance(address as Address, network);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ network, address, balance: { wei: balance.wei.toString(), ether: balance.ether } }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "default_eth_balance",
    new ResourceTemplate("evm://address/{address}/eth-balance", { list: undefined }),
    { description: "Get ETH balance on Ethereum mainnet", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const address = params.address as string;
        const balance = await services.getETHBalance(address as Address, "ethereum");
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ network: "ethereum", address, balance: { wei: balance.wei.toString(), ether: balance.ether } }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "erc20_balance",
    new ResourceTemplate("evm://{network}/address/{address}/token/{tokenAddress}/balance", { list: undefined }),
    { description: "Get ERC20 token balance for an address", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const address = params.address as string;
        const tokenAddress = params.tokenAddress as string;
        const balance = await services.getERC20Balance(tokenAddress as Address, address as Address, network);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              network, address, tokenAddress,
              balance: { raw: balance.raw.toString(), formatted: balance.formatted, decimals: balance.token.decimals }
            }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "default_erc20_balance",
    new ResourceTemplate("evm://address/{address}/token/{tokenAddress}/balance", { list: undefined }),
    { description: "Get ERC20 token balance on Ethereum mainnet", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const address = params.address as string;
        const tokenAddress = params.tokenAddress as string;
        const balance = await services.getERC20Balance(tokenAddress as Address, address as Address, "ethereum");
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              network: "ethereum", address, tokenAddress,
              balance: { raw: balance.raw.toString(), formatted: balance.formatted, decimals: balance.token.decimals }
            }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // ============================================================================
  // TRANSACTION RESOURCES
  // ============================================================================

  server.registerResource(
    "evm_transaction_details",
    new ResourceTemplate("evm://{network}/tx/{txHash}", { list: undefined }),
    { description: "Get transaction details by hash", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const txHash = params.txHash as string;
        const tx = await services.getTransaction(txHash as Hash, network);
        return { contents: [{ uri: uri.href, text: services.helpers.formatJson(tx) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "default_transaction_by_hash",
    new ResourceTemplate("evm://tx/{txHash}", { list: undefined }),
    { description: "Get Ethereum mainnet transaction by hash", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const txHash = params.txHash as string;
        const tx = await services.getTransaction(txHash as Hash, "ethereum");
        return { contents: [{ uri: uri.href, text: services.helpers.formatJson(tx) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // ============================================================================
  // TOKEN INFO RESOURCES
  // ============================================================================

  server.registerResource(
    "erc20_token_details",
    new ResourceTemplate("evm://{network}/token/{tokenAddress}", { list: undefined }),
    { description: "Get ERC20 token details", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const tokenAddress = params.tokenAddress as Address;
        const tokenInfo = await services.getERC20TokenInfo(tokenAddress, network);
        return { contents: [{ uri: uri.href, text: JSON.stringify({ address: tokenAddress, network, ...tokenInfo }, null, 2) }] };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "erc20_token_address_balance",
    new ResourceTemplate("evm://{network}/token/{tokenAddress}/balanceOf/{address}", { list: undefined }),
    { description: "Get ERC20 token balance for an address", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const tokenAddress = params.tokenAddress as Address;
        const address = params.address as Address;
        const balance = await services.getERC20Balance(tokenAddress, address, network);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              tokenAddress, owner: address, network,
              raw: balance.raw.toString(), formatted: balance.formatted,
              symbol: balance.token.symbol, decimals: balance.token.decimals
            }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // ============================================================================
  // NFT (ERC721) RESOURCES
  // ============================================================================

  server.registerResource(
    "erc721_nft_token_details",
    new ResourceTemplate("evm://{network}/nft/{tokenAddress}/{tokenId}", { list: undefined }),
    { description: "Get NFT token details", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const tokenAddress = params.tokenAddress as Address;
        const tokenId = BigInt(params.tokenId as string);
        const nftInfo = await services.getERC721TokenMetadata(tokenAddress, tokenId, network);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ contract: tokenAddress, tokenId: tokenId.toString(), network, ...nftInfo }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "erc721_nft_ownership_check",
    new ResourceTemplate("evm://{network}/nft/{tokenAddress}/{tokenId}/isOwnedBy/{address}", { list: undefined }),
    { description: "Check NFT ownership", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const tokenAddress = params.tokenAddress as Address;
        const tokenId = BigInt(params.tokenId as string);
        const address = params.address as Address;
        const isOwner = await services.isNFTOwner(tokenAddress, address, tokenId, network);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ contract: tokenAddress, tokenId: tokenId.toString(), owner: address, network, isOwner }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  // ============================================================================
  // ERC1155 RESOURCES
  // ============================================================================

  server.registerResource(
    "erc1155_token_metadata_uri",
    new ResourceTemplate("evm://{network}/erc1155/{tokenAddress}/{tokenId}/uri", { list: undefined }),
    { description: "Get ERC1155 token metadata URI", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const tokenAddress = params.tokenAddress as Address;
        const tokenId = BigInt(params.tokenId as string);
        const tokenURI = await services.getERC1155TokenURI(tokenAddress, tokenId, network);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ contract: tokenAddress, tokenId: tokenId.toString(), network, uri: tokenURI }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );

  server.registerResource(
    "erc1155_token_address_balance",
    new ResourceTemplate("evm://{network}/erc1155/{tokenAddress}/{tokenId}/balanceOf/{address}", { list: undefined }),
    { description: "Get ERC1155 token balance", mimeType: "application/json" },
    async (uri, params) => {
      try {
        const network = params.network as string;
        const tokenAddress = params.tokenAddress as Address;
        const tokenId = BigInt(params.tokenId as string);
        const address = params.address as Address;
        const balance = await services.getERC1155Balance(tokenAddress, address, tokenId, network);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ contract: tokenAddress, tokenId: tokenId.toString(), owner: address, network, balance: balance.toString() }, null, 2)
          }]
        };
      } catch (error) {
        return { contents: [{ uri: uri.href, text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
      }
    }
  );
}
