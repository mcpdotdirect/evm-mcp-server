import { createEnsSubdomain } from './subdomain-management.js';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';
const TEST_SUBDOMAIN_LABEL = 'test';
const TEST_SUBDOMAIN_OWNER = '0x0000000000000000000000000000000000000000';

async function main() {
  console.log('Starting subdomain tests...');
  
  try {
    const { publicClient } = await getClients(mainnet);
    
    // Test creating a subdomain
    console.log('\nTesting createEnsSubdomain...');
    const txHash = await createEnsSubdomain(
      TEST_NAME,
      TEST_SUBDOMAIN_LABEL,
      TEST_SUBDOMAIN_OWNER,
      publicClient
    );
    console.log('Subdomain creation transaction hash:', txHash);
    
  } catch (error) {
    console.error('Error during subdomain tests:', error);
  }
  
  console.log('\nSubdomain tests completed.');
}

main().catch(console.error); 