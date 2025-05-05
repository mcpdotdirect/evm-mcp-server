import { getEnsOwnershipHistory } from './ownership.js';
import { getEnsAddressHistory } from './ownership.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';

async function main() {
  try {
    console.log('=== Testing History ===');
    
    // Test ownership history
    console.log('\n1. Getting ownership history...');
    const ownershipHistory = await getEnsOwnershipHistory(TEST_NAME, mainnet);
    console.log(`Ownership history for ${TEST_NAME}:`);
    ownershipHistory.slice(0, 3).forEach((record, i) => {
      console.log(`\n${i + 1}. Owner: ${record.owner}`);
      console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
      console.log(`   Transaction: ${record.transactionHash}`);
    });
    
    // Test address history
    console.log('\n2. Getting address history...');
    const addressHistory = await getEnsAddressHistory(TEST_NAME, mainnet);
    console.log(`Address history for ${TEST_NAME}:`);
    addressHistory.slice(0, 3).forEach((record, i) => {
      console.log(`\n${i + 1}. Address: ${record.address}`);
      console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
      console.log(`   Transaction: ${record.transactionHash}`);
    });
    
    console.log('\nHistory tests completed!');
  } catch (error) {
    console.error('\nError during testing:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 