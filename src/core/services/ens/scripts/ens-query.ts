import { executeQueries } from './ens-configurator.js';

// Available query types
const AVAILABLE_QUERIES = [
  'owner',
  'resolver',
  'address',
  'registration',
  'wrapped',
  'ownedNames',
  'textRecords',
  'contentHash',
  'reverseRecord',
  'subdomains',
  'allRecords'
] as const;

// Parse command line arguments
function parseArgs(args: string[]): { name: string; queries: string[] }[] {
  const configs: { name: string; queries: string[] }[] = [];
  let currentName: string | null = null;
  let currentQueries: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--')) {
      // New name
      if (currentName) {
        configs.push({ name: currentName, queries: currentQueries });
        currentQueries = [];
      }
      currentName = arg.slice(2);
    } else if (AVAILABLE_QUERIES.includes(arg as any)) {
      // Query type
      currentQueries.push(arg);
    }
  }

  // Add the last config
  if (currentName) {
    configs.push({ name: currentName, queries: currentQueries });
  }

  return configs;
}

// Print usage instructions
function printUsage() {
  console.log('\nENS Query Tool');
  console.log('==============');
  console.log('\nUsage:');
  console.log('  bun run src/core/services/ens/scripts/ens-query.ts --<name1> <query1> <query2> ... --<name2> <query1> <query2> ...');
  console.log('\nAvailable queries:');
  console.log('Basic queries:');
  console.log('  owner        - Get the owner of the name');
  console.log('  resolver     - Get the resolver address');
  console.log('  address      - Get the resolved address');
  console.log('  registration - Get registration and expiry dates');
  console.log('  wrapped      - Check if the name is wrapped');
  console.log('\nAdvanced queries:');
  console.log('  ownedNames   - Get all names owned by this address');
  console.log('  textRecords  - Get all text records');
  console.log('  contentHash  - Get IPFS/Swarm content hash');
  console.log('  reverseRecord - Get reverse record');
  console.log('  subdomains   - Get all subdomains');
  console.log('  allRecords   - Get all records (text, multi-coin addresses, content)');
  console.log('\nExamples:');
  console.log('  Basic lookup:');
  console.log('    bun run src/core/services/ens/scripts/ens-query.ts --vitalik.eth owner resolver address');
  console.log('  Full profile:');
  console.log('    bun run src/core/services/ens/scripts/ens-query.ts --vitalik.eth allRecords reverseRecord');
  console.log('  Multiple names:');
  console.log('    bun run src/core/services/ens/scripts/ens-query.ts --vitalik.eth owner --nick.eth owner');
  console.log('  Check wrapped status:');
  console.log('    bun run src/core/services/ens/scripts/ens-query.ts --name.eth wrapped ownedNames');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  try {
    const configs = parseArgs(args);
    
    if (configs.length === 0) {
      console.error('No valid configurations found');
      printUsage();
      process.exit(1);
    }

    const results = await executeQueries(configs);
    
    // Print results
    for (const result of results) {
      console.log(`\nResults for ${result.name}:`);
      console.log('============================');
      
      if (result.owner) console.log(`Owner: ${result.owner}`);
      if (result.resolver) console.log(`Resolver: ${result.resolver}`);
      if (result.address) console.log(`Address: ${result.address}`);
      if (result.registrationDate) console.log(`Registration Date: ${result.registrationDate.toLocaleString()}`);
      if (result.expiryDate) console.log(`Expiry Date: ${result.expiryDate.toLocaleString()}`);
      if (result.wrapped !== undefined) console.log(`Wrapped: ${result.wrapped}`);
      if (result.contentHash) console.log(`Content Hash: ${result.contentHash}`);
      if (result.reverseRecord) console.log(`Reverse Record: ${result.reverseRecord}`);
      
      if (result.ownedNames?.length) {
        console.log('\nOwned Names:');
        result.ownedNames.forEach(name => console.log(`- ${name}`));
      }
      
      if (result.subdomains?.length) {
        console.log('\nSubdomains:');
        result.subdomains.forEach(name => console.log(`- ${name}`));
      }
      
      if (result.textRecords && Object.keys(result.textRecords).length > 0) {
        console.log('\nText Records:');
        Object.entries(result.textRecords).forEach(([key, value]) => {
          console.log(`- ${key}: ${value}`);
        });
      }
      
      if (result.allRecords) {
        if (result.allRecords.texts && Object.keys(result.allRecords.texts).length > 0) {
          console.log('\nText Records:');
          Object.entries(result.allRecords.texts).forEach(([key, value]) => {
            console.log(`- ${key}: ${value}`);
          });
        }
        
        if (result.allRecords.addresses && Object.keys(result.allRecords.addresses).length > 0) {
          console.log('\nCrypto Addresses:');
          Object.entries(result.allRecords.addresses).forEach(([coin, addr]) => {
            console.log(`- ${coin}: ${addr}`);
          });
        }
        
        if (result.allRecords.contentHash) {
          console.log(`\nContent Hash: ${result.allRecords.contentHash}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 