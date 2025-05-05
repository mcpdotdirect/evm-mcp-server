import { resolveAddress } from './name-resolution.js';
import { lookupAddress } from './name-resolution.js';
import { getPublicClient } from '../../clients.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7fEd3e14E53A35aDd6e2e4e8';

async function main() {
  try {
    console.log('=== Testing Name Resolution ===');
    
    // Test resolveAddress
    console.log('\n1. Resolving ENS name to address...');
    const resolvedAddress = await resolveAddress(TEST_NAME, getPublicClient(mainnet));
    console.log(`Resolved ${TEST_NAME} to: ${resolvedAddress || 'Not found'}`);
    
    // Test lookupAddress
    console.log('\n2. Looking up address to ENS name...');
    const lookedUpName = await lookupAddress(TEST_ADDRESS, mainnet);
    console.log(`Looked up ${TEST_ADDRESS} to: ${lookedUpName || 'Not found'}`);
    
    console.log('\nName resolution tests completed!');
  } catch (error) {
    console.error('\nError during testing:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 