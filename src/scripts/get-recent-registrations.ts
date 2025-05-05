import { getRecentRegistrations } from '../core/services/ens/ens/records.js';

async function main() {
  try {
    console.log('Fetching recent ENS registrations...');
    const registrations = await getRecentRegistrations(10);
    
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