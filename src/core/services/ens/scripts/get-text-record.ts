import { getEnsTextRecord } from './text-records.js';
import { type Chain } from './types.js';

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

    if (!name || !key) {
      throw new Error('ENS name and key are required');
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

async function displayTextRecord(name: string, key: string, value: string | null) {
  console.log(`\nText Record for ${name}:`);
  console.log('------------------------');
  console.log(`Key: ${key}`);
  console.log(`Value: ${value || 'Not set'}`);
}

async function main() {
  try {
    const { name, key, network } = parseArgs();
    
    console.log(`\nFetching text record for ${name} from ${network}...`);
    const value = await getEnsTextRecord(name, key, network);
    await displayTextRecord(name, key, value);
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 