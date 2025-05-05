import { getEnsTextRecord } from '../records.js';
import { type Chain } from '../types/index.js';

interface ScriptOptions {
  name: string;
  key: string;
  network: string | Chain;
}

function parseArgs(): ScriptOptions {
  const DEFAULT_NETWORK = 'mainnet';
  
  try {
    const name = process.argv[2];
    const key = process.argv[3];
    const networkArg = process.argv.find(arg => arg.startsWith('--network='));
    const network = networkArg ? networkArg.split('=')[1] : DEFAULT_NETWORK;

    if (!name) {
      throw new Error('ENS name is required');
    }
    if (!key) {
      throw new Error('Text record key is required');
    }

    return { name, key, network };
  } catch (error) {
    console.error('\nError parsing arguments:', error instanceof Error ? error.message : String(error));
    console.error('\nUsage: bun run get-text-record.ts <name> <key> [--network=<network>]');
    console.error('  name    : ENS name to query');
    console.error('  key     : Text record key to retrieve');
    console.error('  --network : Network to query (default: mainnet)');
    process.exit(1);
  }
}

async function main() {
  try {
    const { name, key, network } = parseArgs();
    
    console.log(`\nFetching text record "${key}" for ${name} from ${network}...`);
    const value = await getEnsTextRecord(name, key, network);
    
    if (value) {
      console.log(`\nText record value: ${value}`);
    } else {
      console.log('\nNo text record found for this key');
    }
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 