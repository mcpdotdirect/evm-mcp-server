import { lookupAddress } from '../resolution.js';
import { type Chain } from '../types/index.js';
import { getPublicClient } from '../../../clients.js';

interface ScriptOptions {
  address: string;
  network: string | Chain;
}

function parseArgs(): ScriptOptions {
  const DEFAULT_NETWORK = 'mainnet';
  
  try {
    const address = process.argv[2];
    const networkArg = process.argv.find(arg => arg.startsWith('--network='));
    const network = networkArg ? networkArg.split('=')[1] : DEFAULT_NETWORK;

    if (!address) {
      throw new Error('Ethereum address is required');
    }

    return { address, network };
  } catch (error) {
    console.error('\nError parsing arguments:', error instanceof Error ? error.message : String(error));
    console.error('\nUsage: bun run lookup-address.ts <address> [--network=<network>]');
    console.error('  address : Ethereum address to look up');
    console.error('  --network : Network to query (default: mainnet)');
    process.exit(1);
  }
}

async function main() {
  try {
    const { address, network } = parseArgs();
    const client = getPublicClient(network);
    
    console.log(`\nLooking up ENS name for ${address} on ${network}...`);
    const name = await lookupAddress(address, client);
    
    if (name) {
      console.log(`\nResolved name: ${name}`);
    } else {
      console.log('\nNo ENS name found for this address');
    }
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 