import { resolveAddress, lookupAddress } from './name-resolution.js';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7fEd3e14E53A35aDd6e2e4e8';

async function main() {
  console.log('Starting name resolution tests...');
  
  try {
    const { publicClient } = await getClients(mainnet);
    
    // Test forward resolution
    console.log('\nTesting resolveAddress...');
    const resolvedAddress = await resolveAddress(TEST_NAME, publicClient);
    console.log('Resolved address:', resolvedAddress);
    
    // Test reverse resolution
    console.log('\nTesting lookupAddress...');
    const resolvedName = await lookupAddress(TEST_ADDRESS, publicClient);
    console.log('Resolved name:', resolvedName || 'Not set');
    
  } catch (error) {
    console.error('Error during name resolution tests:', error);
  }
  
  console.log('\nName resolution tests completed.');
}

main().catch(console.error); 