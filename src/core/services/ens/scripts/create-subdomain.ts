import { createEnsSubdomain } from '../subdomains.js';
import { type Chain } from '../types/index.js';

interface ScriptOptions {
  parentName: string;
  label: string;
  owner: string;
  network: string | Chain;
}

function parseArgs(): ScriptOptions {
  const DEFAULT_NETWORK = 'mainnet';
  
  try {
    const parentName = process.argv[2];
    const label = process.argv[3];
    const owner = process.argv[4];
    const networkArg = process.argv.find(arg => arg.startsWith('--network='));
    const network = networkArg ? networkArg.split('=')[1] : DEFAULT_NETWORK;

    if (!parentName) {
      throw new Error('Parent ENS name is required');
    }
    if (!label) {
      throw new Error('Subdomain label is required');
    }
    if (!owner) {
      throw new Error('Owner address is required');
    }

    return { parentName, label, owner, network };
  } catch (error) {
    console.error('\nError parsing arguments:', error instanceof Error ? error.message : String(error));
    console.error('\nUsage: bun run create-subdomain.ts <parentName> <label> <owner> [--network=<network>]');
    console.error('  parentName : Parent ENS name (e.g., example.eth)');
    console.error('  label     : Subdomain label (e.g., sub)');
    console.error('  owner     : Owner address for the subdomain');
    console.error('  --network : Network to query (default: mainnet)');
    process.exit(1);
  }
}

async function main() {
  try {
    const { parentName, label, owner, network } = parseArgs();
    
    console.log(`\nCreating subdomain ${label}.${parentName} on ${network}...`);
    const receipt = await createEnsSubdomain(parentName, label, owner, network);
    
    console.log('\nSubdomain created successfully!');
    console.log(`Transaction hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 