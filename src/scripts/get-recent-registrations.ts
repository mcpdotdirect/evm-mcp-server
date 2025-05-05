import { getRecentRegistrations } from '../core/services/ens/ens/records.js';

// Parse command line arguments
const DEFAULT_COUNT = 10;
const count = process.argv[2] ? parseInt(process.argv[2], 10) : DEFAULT_COUNT;

if (isNaN(count) || count < 1) {
  console.error('Error: Please provide a valid positive number for the registration count.');
  console.error('Usage: bun run src/scripts/get-recent-registrations.ts [count]');
  process.exit(1);
}

async function main() {
  try {
    console.log(`Fetching ${count} recent ENS registrations...`);
    const registrations = await getRecentRegistrations(count, 'mainnet');
    
    console.log('\nRecent ENS Registrations:');
    console.log('------------------------');
    registrations.forEach((reg, index) => {
      console.log(`\n${index + 1}. Name: ${reg.name}`);
      console.log(`   Owner: ${reg.owner}`);
      console.log(`   Block: ${reg.blockNumber}`);
      console.log(`   Transaction: ${reg.transactionHash}`);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 