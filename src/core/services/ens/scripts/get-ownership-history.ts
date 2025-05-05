import { getEnsOwnershipHistory } from './history.js';
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
    console.error('\nUsage: bun run get-ownership-history.ts <name> [--network=<network>]');
    console.error('  name    : ENS name to query');
    console.error('  --network : Network to query (default: mainnet)');
    process.exit(1);
  }
}

async function displayOwnershipHistory(name: string, history: Awaited<ReturnType<typeof getEnsOwnershipHistory>>) {
  console.log(`\nOwnership History for ${name}:`);
  console.log('------------------------');
  
  if (history.length === 0) {
    console.log('No ownership history found.');
    return;
  }

  history.forEach((record, index) => {
    console.log(`\n${index + 1}. Owner: ${record.owner}`);
    console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
    console.log(`   Transaction: ${record.transactionHash}`);
  });
}

async function main() {
  try {
    const { name, network } = parseArgs();
    
    console.log(`\nFetching ownership history for ${name} from ${network}...`);
    const history = await getEnsOwnershipHistory(name, network);
    await displayOwnershipHistory(name, history);
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 