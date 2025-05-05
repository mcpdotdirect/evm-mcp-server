import { getRecentRegistrations } from '../records.js';
import { type Chain } from '../types.js';

interface ScriptOptions {
  count: number;
  network: string | Chain;
}

function parseArgs(): ScriptOptions {
  const DEFAULT_COUNT = 10;
  const DEFAULT_NETWORK = 'mainnet';
  
  try {
    const count = process.argv[2] ? parseInt(process.argv[2], 10) : DEFAULT_COUNT;
    const network = process.argv[3] || DEFAULT_NETWORK;

    // Validate count
    if (isNaN(count) || count < 1) {
      throw new Error('Registration count must be a positive number');
    }

    // Validate network (basic check)
    if (typeof network !== 'string' || !network.trim()) {
      throw new Error('Network must be a valid string');
    }

    return { count, network };
  } catch (error) {
    console.error('\nError parsing arguments:', error.message);
    console.error('\nUsage: bun run get-recent-registrations.ts [count] [network]');
    console.error('  count   : Number of registrations to fetch (default: 10)');
    console.error('  network : Network to query (default: mainnet)');
    console.error('\nExample: bun run get-recent-registrations.ts 5 mainnet');
    process.exit(1);
  }
}

async function displayRegistrations(registrations: Awaited<ReturnType<typeof getRecentRegistrations>>) {
  console.log('\nRecent ENS Registrations:');
  console.log('------------------------');
  
  if (registrations.length === 0) {
    console.log('\nNo registrations found in the specified range.');
    return;
  }

  registrations.forEach((reg, index) => {
    console.log(`\n${index + 1}. Name: ${reg.name}`);
    console.log(`   Owner: ${reg.owner}`);
    console.log(`   Block: ${reg.blockNumber}`);
    console.log(`   Transaction: ${reg.transactionHash}`);
  });
}

async function main() {
  try {
    const { count, network } = parseArgs();
    
    console.log(`Fetching ${count} recent ENS registrations from ${network}...`);
    const registrations = await getRecentRegistrations(count, network);
    
    await displayRegistrations(registrations);
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