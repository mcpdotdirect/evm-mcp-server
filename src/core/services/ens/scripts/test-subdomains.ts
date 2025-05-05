import { createEnsSubdomain } from './subdomain-management.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';
const TEST_SUBDOMAIN_LABEL = 'test';
const TEST_SUBDOMAIN_OWNER = '0x0000000000000000000000000000000000000000';

async function main() {
  try {
    console.log('=== Testing Subdomains ===');
    
    console.log('\n1. Creating subdomain...');
    try {
      const txHash = await createEnsSubdomain(
        TEST_NAME,
        TEST_SUBDOMAIN_LABEL,
        TEST_SUBDOMAIN_OWNER as `0x${string}`,
        mainnet
      );
      console.log(`Created subdomain ${TEST_SUBDOMAIN_LABEL}.${TEST_NAME}`);
      console.log(`Transaction hash: ${txHash}`);
    } catch (error) {
      console.error('Error creating subdomain:', error instanceof Error ? error.message : String(error));
    }
    
    console.log('\nSubdomain tests completed!');
  } catch (error) {
    console.error('\nError during testing:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 