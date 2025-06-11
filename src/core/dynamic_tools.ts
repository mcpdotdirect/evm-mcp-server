import { ethers } from 'ethers';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as services from "./services/index.js";
import { type Address } from 'viem';
import { networkNameMap, endpointMap, scanApiKeyMap, getChain } from "./chains.js";
import { createClient } from "../lib/supabase/server.js";

// TODO: this will get an object of data types
// for it to work we would have to re-compose the args into an array before calling .readContract
// const paramsArray = read.params.map((item: any) => {
//   return ({[item.name]: z.string().describe(`${item.name} is ${item.type}`)})
// });
// const params = Object.assign({}, ...paramsArray);

/**
 * Register all EVM-related tools with the MCP server
 * 
 * All tools that accept Ethereum addresses also support ENS names (e.g., 'vitalik.eth').
 * ENS names are automatically resolved to addresses using the Ethereum Name Service.
 * 
 * @param server The MCP server instance
 */
export async function registerDynamicTools(server: McpServer) {

  const dynamicTools = await buildTools(process.env.PROTOCOL, process.env.CONTRACT!, process.env.CHAIN!);

  for(const tool in dynamicTools) {
    console.log("TOOL:", tool);
    console.log("TOOL OBJECT:", dynamicTools[tool]);

    server.tool(
      dynamicTools[tool].name,
      dynamicTools[tool].description,
      dynamicTools[tool].parameters,
      dynamicTools[tool].execute
    );
  }
}

async function buildTools(protocol: string | undefined, address: string, chain: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let _contracts: any[] = [];

  if (protocol) {
    const supabase = await createClient();
    const { data: contracts, error } = await supabase.from("contracts").select().eq('protocol', protocol?.toLowerCase());
    _contracts = contracts || [];

    if (_contracts.length === 0 || error) {
      console.error("Error fetching contracts:", error);
      return tools;
    }
  } else if (address && chain) {
    try {
      const { name, abi, chainId } = await fetchABI(address, chain);
      _contracts = [{ name, address, abi, chain_id: chainId }];
    } catch (error) {
      console.error("Error fetching contract:", error);
      return tools;
    }
  }

  for (const contract of _contracts) {
    const parsedABI = JSON.parse(contract.abi);
    const { read: reads, write: writes, signatures } = decodeABI(parsedABI);

    for (const read of reads) {
      const readTool = buildReadTool(contract, read, parsedABI);
      tools[read.fname] = readTool;
    }

    for (const write of writes) {
      const writeTool = buildWriteTool(contract, write);
      tools[write.fname] = writeTool;
    }

    // tools[`available_tools_${contract.name}`] = availableTools(contract.name, signatures);
    tools[`available_tools`] = availableTools(contract.name, signatures);

  }

  return tools;
}

async function fetchABI(address: string, chain: string) {
  const chainId = networkNameMap[chain];
  const endpoint = endpointMap[chainId];
  const apiKey = scanApiKeyMap[chainId];

  console.log(chain, chainId, endpoint, apiKey);

  if(!chainId) {
    throw new Error("Invalid chain");
  }

  if (!endpoint) {
    throw new Error("No endpoint found for chain");
  }

  if (!apiKey) {
    throw new Error("No API key found for chain");
  }

  const url = `${endpoint}?module=contract&action=getabi&address=${address}&apikey=${apiKey}`;

  const resp = await fetch(url);
  const abi = await resp.json();

  return { name: "contract", abi: abi.result, chainId };
}

interface AbiInput {
  name: string;
  type: string;
  index?: number;
}

interface AbiFunction {
  type: string;
  name: string;
  inputs: AbiInput[];
  stateMutability: "view" | "pure" | "nonpayable" | "payable";
}

function decodeABI(abi: AbiFunction[]) {
  const read = [];
  const write = [];
  const signatures = [];

  for (const item of abi) {
    if (item.type !== "function") continue

    const fn = item
    const signature = `${fn.name}(${fn.inputs.map((i: AbiInput) => i.type).join(",")})`
    const fname = fn.name;
    const params = fn.inputs.map((input: AbiInput) => ({
      name: input.name || `arg-${input.index}`,
      type: input.type,
    }));

    if (fn.stateMutability === "view" || fn.stateMutability === "pure") {
      read.push({ signature, fname, params });
    } else if (fn.stateMutability === "nonpayable" || fn.stateMutability === "payable") {
      write.push({ signature, fname, params });
    }

    signatures.push(signature);
  }

  return { read, write, signatures }
}


const buildReadTool = (contract: any, read: any, abi: any) => {
  return {
    name: `read_${read.fname}`,
    description: `Read function named ${read.fname} with signature ${read.signature}`,
    parameters: z.object({
      args: z.array(z.any()).optional().describe("The arguments to pass to the function, as an array (e.g., ['0x1234...', 123, true])"),
    }),
    execute: async ({ args = [] }) => {
      try {
        const params = {
          address: contract.address as Address,
          abi,
          functionName: read.fname,
          args: args
        };

        const network = getChain(contract.chain_id).name.replace(' ', '-');
        const result = await services.readContract(params, network);

        return {
          content: [{
            type: "text",
            text: services.helpers.formatJson(result)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error reading contract: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  };
};


const buildWriteTool = (contract: any, write: any) => {
  return {
    name: `write_${write.fname}`,
    description: `Write function named ${write.fname} with signature ${write.signature}`,
    parameters: z.object({
      args: z.array(z.any()).optional().describe("The arguments to pass to the function, as an array (e.g., ['0x1234...', 123, true])"),
    }),
    execute: async ({ args = [] }) => {
      try {
        const _args = args.map((arg: any) => arg.toString());

        const txParams: Record<string, any> = {
          address: contract.address as Address,
          functionName: write.fname,
          args: _args,
        };

        const cInterface = new ethers.Interface([`function ${write.signature}`]);
        const stringifiedArgs = _args;
        const data = cInterface.encodeFunctionData(write.fname, stringifiedArgs);

        const tx = {
          to: contract.address,
          data,
          chainId: contract.chain_id,
          value: 0 // TODO: send value if the function is payable
        };

        return {
          content: [{
            type: "text",
            text: `${JSON.stringify(txParams, null, 2)}`
          }],
          data: [{
            type: "transaction",
            transaction: tx
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error building transaction: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  }
};

const availableTools = (contract: any, signatures: any) => {
  const _dynamicTools = signatures.join("\n");
  const _staticTools = [
    "get_chain_info",
    "resolve_ens",
    "get_supported_networks",
    "get_block_by_number",
    "get_latest_block",
    "get_balance",
    "get_erc20_balance",
    "get_token_balance",
    "get_transaction",
    "get_transaction_receipt",
    "estimate_gas",
    "transfer_eth",
    "transfer_erc20",
    "approve_token_spending",
    "transfer_nft",
    "transfer_erc1155", 
    "transfer_token",
    "read_contract",
    "write_contract",
    "is_contract",
    "get_token_info",
    "get_token_balance_erc20",
    "get_nft_info",
    "check_nft_ownership",
    "get_erc1155_token_uri",
    "get_nft_balance",
    "get_erc1155_balance",
    "get_address_from_private_key",
  ].join("\n");

  const availableTools = `${_dynamicTools}\n\n${_staticTools}`;

  return {
    name: `available_tools_${contract.name}`,
    description: `List the availables tools for ${contract.name}`,
    parameters: z.object({}),
    execute: async () => {
      return {
        content: [{
          type: "text",
          text: availableTools
        }],
        isError: false
      };
    }
  };
};
