import { resolveAddress } from './resolution.js';
import { type Chain } from './types.js';
import { getPublicClient } from '../../clients.js';

interface ScriptOptions {
  name: string;
  network: string | Chain;
}

function parseArgs(): ScriptOptions {
  const DEFAULT_NETWORK = 'mainnet';
  
  try {
    const name = process.argv[2];
    const networkArg = process.argv.find(arg => arg.startsWith('--network='));
    const network = networkArg ? networkArg.split('=')[1] : DEFAULT_NETWORK;

    if (!name) {
      throw new Error('ENS name is required');
    }

    return { name, network };
  } catch (error) {
    console.error('\nError parsing arguments:', error instanceof Error ? error.message : String(error));
    console.error('\nUsage: bun run resolve-address.ts <name> [--network=<network>]');
    console.error('  name    : ENS name to resolve');
    console.error('  --network : Network to query (default: mainnet)');
    process.exit(1);
  }
}

async function main() {
  try {
    const { name, network } = parseArgs();
    const client = getPublicClient(network);
    
    console.log(`\nResolving ${name} on ${network}...`);
    const address = await resolveAddress(name, client);
    
    if (address) {
      console.log(`\nResolved address: ${address}`);
    } else {
      console.log('\nNo address found for this ENS name');
    }
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 