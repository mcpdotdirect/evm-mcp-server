import { normalize, namehash } from 'viem/ens';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';
import { type PublicClient } from './types.js';

// ENS Registrar Controller ABI
const REGISTRAR_CONTROLLER_ABI = [
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'secret', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
      { name: 'data', type: 'bytes[]' },
      { name: 'reverseRecord', type: 'bool' },
      { name: 'ownerControlledFuses', type: 'uint16' }
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'duration', type: 'uint256' }
    ],
    name: 'rentPrice',
    outputs: [
      { name: 'base', type: 'uint256' },
      { name: 'premium', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ENS Registrar Controller address
const REGISTRAR_CONTROLLER_ADDRESS = '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5' as const;

/**
 * Estimates the cost of registering an ENS name for a given duration
 * @param name The ENS name to register
 * @param duration The duration in seconds
 * @param client The public client to use for the query
 * @returns The estimated cost in wei
 */
async function estimateRegistrationCost(
  name: string,
  duration: number,
  client: PublicClient
): Promise<bigint> {
  try {
    const normalizedName = normalize(name);
    const result = await client.readContract({
      address: REGISTRAR_CONTROLLER_ADDRESS,
      abi: REGISTRAR_CONTROLLER_ABI,
      functionName: 'rentPrice',
      args: [normalizedName, BigInt(duration)]
    });

    // Total cost is base + premium
    return result[0] + result[1];
  } catch (error) {
    throw new Error(`Failed to estimate registration cost: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Converts wei to ETH
 * @param wei The amount in wei
 * @returns The amount in ETH
 */
function weiToEth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4);
}

async function main() {
  console.log('ENS Name Registration Tool');
  console.log('=========================');

  // Get the name to register
  const name = process.argv[2];
  if (!name) {
    console.error('Please provide an ENS name to register (e.g., "example.eth")');
    process.exit(1);
  }

  // Validate the name
  if (!name.endsWith('.eth')) {
    console.error('Only .eth names are supported for registration');
    process.exit(1);
  }

  // Get the duration in years
  const durationYears = parseInt(process.argv[3] || '1');
  if (isNaN(durationYears) || durationYears < 1) {
    console.error('Please provide a valid duration in years (minimum 1 year)');
    process.exit(1);
  }

  // Convert years to seconds
  const durationSeconds = durationYears * 365 * 24 * 60 * 60;

  try {
    const { publicClient } = await getClients(mainnet);

    // Estimate the cost
    console.log('\nEstimating registration cost...');
    const costWei = await estimateRegistrationCost(name, durationSeconds, publicClient);
    const costEth = weiToEth(costWei);

    console.log('\nRegistration Details:');
    console.log(`Name: ${name}`);
    console.log(`Duration: ${durationYears} year${durationYears > 1 ? 's' : ''}`);
    console.log(`Estimated Cost: ${costEth} ETH (${costWei} wei)`);
    console.log('\nNote: This is an estimate. The actual cost may vary slightly due to network conditions.');

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 