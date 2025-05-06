import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupportedNetworks, getRpcUrl } from "./chains.js";
import * as services from "./services/index.js";
import type { Address, Hash } from "viem";
import type { URL } from "url";
import { resolveAddress, lookupAddress, isValidEnsName } from "./services/ens/utils.js";

interface ResourceParams {
  network?: string;
  blockNumber?: string;
  blockHash?: string;
  address?: string;
  name?: string;
  tokenAddress?: string;
  tokenId?: string;
  [key: string]: string | undefined;
}

/**
 * Register all EVM-related resources
 * @param server The MCP server instance
 */
export function registerEVMResources(server: McpServer & { resource: (name: string, template: string | { new (uri: string, options: { list?: boolean }): any }, handler: (uri: URL, params: ResourceParams) => Promise<{ contents: Array<{ uri: string; text: string }> }>) => void }) {
  // Get supported networks
  server.resource(
    "evm_networks",
    "evm://networks",
    async (uri: URL) => {
      const networks = getSupportedNetworks();
        return {
          contents: [{
          uri: uri.toString(),
          text: JSON.stringify(networks, null, 2)
          }]
        };
    }
  );

  // Get RPC URL for a specific network
  server.resource(
    "evm_rpc_url",
    "evm://{network}/rpc",
    async (uri: URL, params: ResourceParams) => {
      const network = params.network as string;
        const rpcUrl = getRpcUrl(network);
        return {
          contents: [{
          uri: uri.toString(),
          text: JSON.stringify({ network, rpcUrl }, null, 2)
          }]
        };
    }
  );

  // Get block by number for a specific network
  server.resource(
    "evm_block_by_number",
    "evm://{network}/block/{blockNumber}",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const blockNumber = BigInt(params.blockNumber as string);
        const block = await services.getBlockByNumber(blockNumber, network);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              blockNumber: blockNumber.toString(),
              block
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching block: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get block by hash for a specific network
  server.resource(
    "evm_block_by_hash",
    "evm://{network}/block/{blockHash}",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const blockHash = params.blockHash as Hash;
        const block = await services.getBlockByHash(blockHash, network);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              blockHash,
              block
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching block: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get latest block for a specific network
  server.resource(
    "evm_latest_block",
    "evm://{network}/block/latest",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const block = await services.getLatestBlock(network);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              block
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching latest block: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get transaction by hash for a specific network
  server.resource(
    "evm_transaction",
    "evm://{network}/transaction/{hash}",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const hash = params.hash as Hash;
        const transaction = await services.getTransaction(hash, network);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              hash,
              transaction
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching transaction: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get transaction receipt by hash for a specific network
  server.resource(
    "evm_transaction_receipt",
    "evm://{network}/transaction/{hash}/receipt",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const hash = params.hash as Hash;
        const receipt = await services.getTransactionReceipt(hash, network);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              hash,
              receipt
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching transaction receipt: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get transaction count for an address on a specific network
  server.resource(
    "evm_transaction_count",
    "evm://{network}/address/{address}/nonce",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const address = params.address as Address;
        const count = await services.getTransactionCount(address, network);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              address,
              count
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching transaction count: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get ETH balance for an address on a specific network
  server.resource(
    "evm_eth_balance",
    "evm://{network}/address/{address}/balance",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const address = params.address as string;
        const balance = await services.getETHBalance(address, network);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              address,
              ...balance
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching ETH balance: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get ENS name details for a specific network
  server.resource(
    "evm_ens_details",
    "evm://{network}/ens/{name}",
    async (uri: URL, params: ResourceParams) => {
      try {
        const network = params.network as string;
        const name = params.name as string;
        const publicClient = services.getPublicClient(network);
        const address = await resolveAddress(name, publicClient);
        const ensName = address ? await lookupAddress(address, publicClient) : null;
        
        return {
          contents: [{
            uri: uri.toString(),
            text: JSON.stringify({
              network,
              name,
              address,
              ensName,
              isValid: isValidEnsName(name)
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.toString(),
            text: `Error fetching ENS details: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
} 