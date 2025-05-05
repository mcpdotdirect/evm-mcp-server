import { getEnsAddressHistory } from './history.js';
import { type Chain } from './types.js';

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
    console.error('\nUsage: bun run get-address-history.ts <name> [--network=<network>]');
    console.error('  name    : ENS name to query');
    console.error('  --network : Network to query (default: mainnet)');
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
    console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
    console.log(`   Transaction: ${record.transactionHash}`);
  });
}

async function main() {
  try {
    const { name, network } = parseArgs();
    
    console.log(`\nFetching address history for ${name} from ${network}...`);
    const history = await getEnsAddressHistory(name, network);
    await displayAddressHistory(name, history);
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
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