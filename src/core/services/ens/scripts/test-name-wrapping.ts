import { wrapEnsName } from './name-wrapping.js';
import { unwrapEnsName } from './name-wrapping.js';
import { getWrappedNameDetails } from './name-wrapping.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';

async function main() {
  try {
    console.log('=== Testing Name Wrapping ===');
    
    console.log('\n1. Getting wrapped name details...');
    try {
      const details = await getWrappedNameDetails(TEST_NAME, mainnet);
      console.log(`Wrapped name details for ${TEST_NAME}:`);
      console.log(`Owner: ${details.owner}`);
      console.log(`Expiry: ${new Date(details.expiry * 1000).toISOString()}`);
      console.log(`Fuses: ${details.fuses}`);
    } catch (error) {
      console.error('Error getting wrapped name details:', error instanceof Error ? error.message : String(error));
    }
    
    console.log('\nName wrapping tests completed!');
  } catch (error) {
    console.error('\nError during testing:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 