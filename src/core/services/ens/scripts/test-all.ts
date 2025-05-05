import { resolveAddress, lookupAddress } from './name-resolution.js';
import { getEnsTextRecord } from './text-records.js';
import { getEnsOwnershipHistory, getEnsAddressHistory } from './ownership.js';
import { createEnsSubdomain } from './subdomain-management.js';
import { getWrappedNameDetails } from './name-wrapping.js';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7fEd3e14E53A35aDd6e2e4e8';
const TEST_TEXT_KEY = 'url';
const TEST_SUBDOMAIN_LABEL = 'test';
const TEST_SUBDOMAIN_OWNER = '0x0000000000000000000000000000000000000000';

async function testNameResolution(publicClient: any) {
  console.log('\n=== Testing Name Resolution ===');
  
  // Test forward resolution
  console.log('\n1. Resolving ENS name to address...');
  const resolvedAddress = await resolveAddress(TEST_NAME, publicClient);
  console.log(`Resolved ${TEST_NAME} to: ${resolvedAddress || 'Not found'}`);
  
  // Test reverse resolution
  console.log('\n2. Looking up address to ENS name...');
  const lookedUpName = await lookupAddress(TEST_ADDRESS, publicClient);
  console.log(`Looked up ${TEST_ADDRESS} to: ${lookedUpName || 'Not found'}`);
}

async function testTextRecords(publicClient: any) {
  console.log('\n=== Testing Text Records ===');
  
  // Test getting text record
  console.log('\n1. Getting text record...');
  const textRecord = await getEnsTextRecord(TEST_NAME, TEST_TEXT_KEY, publicClient);
  console.log(`Text record for ${TEST_TEXT_KEY}: ${textRecord || 'Not set'}`);
}

async function testHistory(publicClient: any) {
  console.log('\n=== Testing History ===');
  
  // Test ownership history
  console.log('\n1. Getting ownership history...');
  const ownershipHistory = await getEnsOwnershipHistory(TEST_NAME, publicClient);
  console.log(`Ownership history for ${TEST_NAME}:`);
  ownershipHistory.slice(0, 3).forEach((record, i) => {
    console.log(`\n${i + 1}. Owner: ${record.owner}`);
    console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
    console.log(`   Transaction: ${record.transactionHash}`);
  });
  
  // Test address history
  console.log('\n2. Getting address history...');
  const addressHistory = await getEnsAddressHistory(TEST_NAME, publicClient);
  console.log(`Address history for ${TEST_NAME}:`);
  addressHistory.slice(0, 3).forEach((record, i) => {
    console.log(`\n${i + 1}. Address: ${record.address}`);
    console.log(`   Timestamp: ${new Date(record.timestamp * 1000).toISOString()}`);
    console.log(`   Transaction: ${record.transactionHash}`);
  });
}

async function testSubdomains(publicClient: any) {
  console.log('\n=== Testing Subdomains ===');
  
  // Test subdomain creation
  console.log('\n1. Creating subdomain...');
  const txHash = await createEnsSubdomain(
    TEST_NAME,
    TEST_SUBDOMAIN_LABEL,
    TEST_SUBDOMAIN_OWNER,
    publicClient
  );
  console.log(`Subdomain created! Transaction hash: ${txHash}`);
}

async function testNameWrapping(publicClient: any) {
  console.log('\n=== Testing Name Wrapping ===');
  
  // Test getting wrapped name details
  console.log('\n1. Getting wrapped name details...');
  const details = await getWrappedNameDetails(TEST_NAME, publicClient);
  console.log(`Wrapped name details for ${TEST_NAME}:`);
  console.log(`Token ID: ${details.tokenId}`);
  console.log(`Owner: ${details.owner}`);
  console.log(`Expiry: ${new Date(details.expiry * 1000).toISOString()}`);
}

async function main() {
  console.log('Starting all ENS tests...');
  
  try {
    const { publicClient } = await getClients(mainnet);
    
    await testNameResolution(publicClient);
    await testTextRecords(publicClient);
    await testHistory(publicClient);
    await testSubdomains(publicClient);
    await testNameWrapping(publicClient);
    
  } catch (error) {
    console.error('Error during tests:', error);
  }
  
  console.log('\nAll tests completed.');
}

main().catch(console.error); 