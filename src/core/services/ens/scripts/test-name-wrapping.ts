import { wrapEnsName, unwrapEnsName, getWrappedNameDetails } from './name-wrapping.js';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';

async function main() {
  console.log('Starting name wrapping tests...');
  
  try {
    const { publicClient } = await getClients(mainnet);
    
    // Test getting wrapped name details
    console.log('\nTesting getWrappedNameDetails...');
    const details = await getWrappedNameDetails(TEST_NAME, publicClient);
    console.log('Wrapped name details:', {
      owner: details.owner,
      expiry: new Date(details.expiry * 1000).toISOString(),
      fuses: details.fuses
    });
    
  } catch (error) {
    console.error('Error during name wrapping tests:', error);
  }
  
  console.log('\nName wrapping tests completed.');
}

main().catch(console.error); 