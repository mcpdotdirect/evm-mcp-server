import { resolveAddress } from './name-resolution.js';
import { lookupAddress } from './name-resolution.js';
import { getEnsTextRecord } from './text-records.js';
import { getEnsOwnershipHistory } from './ownership.js';
import { getEnsAddressHistory } from './ownership.js';
import { createEnsSubdomain } from './subdomain-management.js';
import { wrapEnsName } from './name-wrapping.js';
import { unwrapEnsName } from './name-wrapping.js';
import { getWrappedNameDetails } from './name-wrapping.js';
import { getPublicClient } from '../../clients.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7fEd3e14E53A35aDd6e2e4e8';
const TEST_TEXT_KEY = 'url';
const TEST_SUBDOMAIN_LABEL = 'test';
const TEST_SUBDOMAIN_OWNER = '0x0000000000000000000000000000000000000000';

async function testNameResolution() {
  console.log('\n=== Testing Name Resolution ===');
  
  // Test resolveAddress
  console.log('\n1. Resolving ENS name to address...');
  const resolvedAddress = await resolveAddress(TEST_NAME, getPublicClient(mainnet));
  console.log(`Resolved ${TEST_NAME} to: ${resolvedAddress || 'Not found'}`);
  
  // Test lookupAddress
  console.log('\n2. Looking up address to ENS name...');
  const lookedUpName = await lookupAddress(TEST_ADDRESS, mainnet);
  console.log(`Looked up ${TEST_ADDRESS} to: ${lookedUpName || 'Not found'}`);
}

async function testTextRecords() {
  console.log('\n=== Testing Text Records ===');
  
  console.log('\n1. Getting text record...');
  const textRecord = await getEnsTextRecord(TEST_NAME, TEST_TEXT_KEY, mainnet);
  console.log(`Text record "${TEST_TEXT_KEY}" for ${TEST_NAME}: ${textRecord || 'Not found'}`);
}

async function testHistory() {
  console.log('\n=== Testing History ===');
  
  // Test ownership history
  console.log('\n1. Getting ownership history...');
  const ownershipHistory = await getEnsOwnershipHistory(TEST_NAME, mainnet);
  console.log(`Ownership history for ${TEST_NAME}:`);
  ownershipHistory.slice(0, 3).forEach((record, i) => {
    console.log(`${i + 1}. Owner: ${record.owner}`);
    console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
  });
  
  // Test address history
  console.log('\n2. Getting address history...');
  const addressHistory = await getEnsAddressHistory(TEST_NAME, mainnet);
  console.log(`Address history for ${TEST_NAME}:`);
  addressHistory.slice(0, 3).forEach((record, i) => {
    console.log(`${i + 1}. Address: ${record.address}`);
    console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
  });
}

async function testSubdomains() {
  console.log('\n=== Testing Subdomains ===');
  
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
}

async function testNameWrapping() {
  console.log('\n=== Testing Name Wrapping ===');
  
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
}

async function main() {
  try {
    console.log('Starting ENS functionality tests...');
    
    await testNameResolution();
    await testTextRecords();
    await testHistory();
    await testSubdomains();
    await testNameWrapping();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('\nError during testing:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Add signal handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log('\nTests interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nTests terminated');
  process.exit(0);
});

main(); 