import { getEnsOwnershipHistory, getEnsAddressHistory } from './ownership.js';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';

const TEST_NAME = 'vitalik.eth';

async function main() {
  console.log('Starting history tests...');
  
  try {
    const { publicClient } = await getClients(mainnet);
    
    // Test ownership history
    console.log('\nTesting getEnsOwnershipHistory...');
    const ownershipHistory = await getEnsOwnershipHistory(TEST_NAME, publicClient);
    console.log('First 3 ownership records:', ownershipHistory.slice(0, 3).map(record => ({
      owner: record.owner,
      timestamp: new Date(record.timestamp * 1000).toISOString(),
      txHash: record.txHash
    })));
    
    // Test address history
    console.log('\nTesting getEnsAddressHistory...');
    const addressHistory = await getEnsAddressHistory(TEST_NAME, publicClient);
    console.log('First 3 address records:', addressHistory.slice(0, 3).map(record => ({
      address: record.address,
      timestamp: new Date(record.timestamp * 1000).toISOString(),
      txHash: record.txHash
    })));
    
  } catch (error) {
    console.error('Error during history tests:', error);
  }
  
  console.log('\nHistory tests completed.');
}

main().catch(console.error); 