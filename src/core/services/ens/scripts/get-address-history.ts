import { getEnsAddressHistory } from '../history.js';
import { type Chain } from '../types.js';

interface ScriptOptions {
  names: string[];
  network: string | Chain;
}

function parseArgs(): ScriptOptions {
  const DEFAULT_NETWORK = 'mainnet';
  
  try {
    // Get names from command line arguments
    const names = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
    const networkArg = process.argv.find(arg => arg.startsWith('--network='));
    const network = networkArg ? networkArg.split('=')[1] : DEFAULT_NETWORK;

    // Validate names
    if (names.length === 0) {
      throw new Error('At least one ENS name must be provided');
    }

    // Validate network (basic check)
    if (typeof network !== 'string' || !network.trim()) {
      throw new Error('Network must be a valid string');
    }

    return { names, network };
  } catch (error) {
    console.error('\nError parsing arguments:', error.message);
    console.error('\nUsage: bun run get-address-history.ts <name1> [name2] [name3] [--network=<network>]');
    console.error('  name1, name2, name3 : ENS names to query (at least one required)');
    console.error('  --network           : Network to query (default: mainnet)');
    console.error('\nExample: bun run get-address-history.ts vitalik.eth --network=mainnet');
    process.exit(1);
  }
}

async function displayAddressHistory(name: string, history: Awaited<ReturnType<typeof getEnsAddressHistory>>) {
  console.log(`\nAddress History for ${name}:`);
  console.log('------------------------');
  
  if (history.length === 0) {
    console.log('No address history found.');
    return;
  }

  history.forEach((record, index) => {
    console.log(`\n${index + 1}. Address: ${record.address}`);
    console.log(`   Block: ${record.blockNumber}`);
    console.log(`   Transaction: ${record.transactionHash}`);
  });
}

async function main() {
  try {
    const { names, network } = parseArgs();
    
    for (const name of names) {
      console.log(`\nFetching address history for ${name} from ${network}...`);
      const history = await getEnsAddressHistory(name, network);
      await displayAddressHistory(name, history);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('\nError:', error.message);
      if (error.stack && process.env.DEBUG) {
        console.error('\nStack trace:', error.stack);
      }
    } else {
      console.error('\nUnknown error occurred:', error);
    }
    process.exit(1);
  }
}

// Add signal handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log('\nScript interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nScript terminated');
  process.exit(0);
});

main(); 