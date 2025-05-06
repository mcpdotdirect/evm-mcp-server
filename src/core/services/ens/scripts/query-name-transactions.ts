import { getClients } from '../utils.js';
import { namehash } from 'viem/ens';

// ENS Registry address
const REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';

async function getENSInfo(name: string) {
  try {
    const { publicClient } = await getClients('mainnet');
    const node = namehash(name);
    
    // Get owner
    const owner = await publicClient.readContract({
      address: REGISTRY_ADDRESS as `0x${string}`,
      abi: [{
        inputs: [{ name: 'node', type: 'bytes32' }],
        name: 'owner',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
      }],
      functionName: 'owner',
      args: [node]
    });

    // Get resolver
    const resolver = await publicClient.readContract({
      address: REGISTRY_ADDRESS as `0x${string}`,
      abi: [{
        inputs: [{ name: 'node', type: 'bytes32' }],
        name: 'resolver',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
      }],
      functionName: 'resolver',
      args: [node]
    });

    // Get address if resolver is set
    let address = 'Not set';
    if (resolver !== '0x0000000000000000000000000000000000000000') {
      try {
        address = await publicClient.readContract({
          address: resolver as `0x${string}`,
          abi: [{
            inputs: [{ name: 'node', type: 'bytes32' }],
            name: 'addr',
            outputs: [{ name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function'
          }],
          functionName: 'addr',
          args: [node]
        });
      } catch {
        // If resolver doesn't support addr function
      }
    }

    return { owner, resolver, address };
  } catch (error) {
    throw new Error(`Failed to fetch ENS info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const name = process.argv[2];
  
  if (!name) {
    console.error('Please provide an ENS name to query');
    console.error('Usage: bun run src/core/services/ens/scripts/query-name-transactions.ts <name>');
    process.exit(1);
  }

  try {
    const info = await getENSInfo(name);
    
    console.log(`\nENS Information for ${name}:`);
    console.log('============================');
    console.log(`Owner: ${info.owner}`);
    console.log(`Resolver: ${info.resolver}`);
    console.log(`Address: ${info.address}`);
    
    console.log('\nTo see transaction history, visit:');
    console.log(`https://etherscan.io/address/${info.owner}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 