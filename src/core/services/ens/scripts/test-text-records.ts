import { getEnsTextRecord } from './text-records.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';
const TEST_TEXT_KEYS = ['url', 'email', 'description', 'avatar', 'notice'];

async function main() {
  try {
    console.log('=== Testing Text Records ===');
    
    for (const key of TEST_TEXT_KEYS) {
      console.log(`\nGetting text record "${key}"...`);
      const value = await getEnsTextRecord(TEST_NAME, key, mainnet);
      console.log(`Value: ${value || 'Not set'}`);
    }
    
    console.log('\nText record tests completed!');
  } catch (error) {
    console.error('\nError during testing:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 