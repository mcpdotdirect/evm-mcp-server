import { normalize, namehash } from 'viem/ens';
import { getClients } from '../utils.js';
import { mainnet } from 'viem/chains';
import { type PublicClient, type WalletClient } from './types.js';
import { keccak256, toBytes, randomBytes } from 'viem';
import { waitForTransaction } from 'viem/actions';

// ENS Resolver ABI
const RESOLVER_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' }
    ],
    name: 'setText',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'coinType', type: 'uint256' },
      { name: 'a', type: 'bytes' }
    ],
    name: 'setAddr',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

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
  },
  {
    inputs: [
      { name: 'name', type: 'string' }
    ],
    name: 'available',
    outputs: [
      { name: '', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'commitment', type: 'bytes32' }
    ],
    name: 'makeCommitment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'commitment', type: 'bytes32' }
    ],
    name: 'commitments',
    outputs: [
      { name: '', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ENS Contract Addresses
const ENS_CONTRACTS = {
  // Mainnet
  mainnet: {
    registrarController: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5',
    publicResolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
    legacyResolver: '0xdaaf96c344f63131acadd0ea35170e7892d3dfba',
    defaultResolver: '0x0000000000000000000000000000000000000000',
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    reverseRegistrar: '0x084b1c3C81545d370f3634392De611CaaBFf8148',
    nameWrapper: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    dnsRegistrar: '0x58774Bb8acD458A640aF0B88238369A167546ef2',
    bulkRenewal: '0x7fDd3f96cBDE51737A9E24b461E7E92A1B9cCf9e'
  },
  // Goerli
  goerli: {
    registrarController: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5',
    publicResolver: '0x4B1488B7a6B320d2D721406204aBc3eeAa9AD329',
    legacyResolver: '0x4B1488B7a6B320d2D721406204aBc3eeAa9AD329',
    defaultResolver: '0x0000000000000000000000000000000000000000',
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    reverseRegistrar: '0x084b1c3C81545d370f3634392De611CaaBFf8148',
    nameWrapper: '0x114D4603199df73e7D157787f8778E21FdCd723b',
    dnsRegistrar: '0x8edc487D26F6c8Fa76e032066A3D4F87E273515d',
    bulkRenewal: '0x7fDd3f96cBDE51737A9E24b461E7E92A1B9cCf9e'
  }
} as const;

/**
 * Checks if an ENS name is available for registration
 * @param name The ENS name to check
 * @param client The public client to use for the query
 * @returns True if the name is available, false otherwise
 */
async function isNameAvailable(
  name: string,
  client: PublicClient
): Promise<boolean> {
  try {
    const normalizedName = normalize(name);
    return await client.readContract({
      address: REGISTRAR_CONTROLLER_ADDRESS,
      abi: REGISTRAR_CONTROLLER_ABI,
      functionName: 'available',
      args: [normalizedName]
    });
  } catch (error) {
    throw new Error(`Failed to check name availability: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
 * Generates a commitment for name registration
 * @param name The ENS name to register
 * @param owner The owner's address
 * @param secret The secret for the commitment
 * @returns The commitment hash
 */
function generateCommitment(
  name: string,
  owner: `0x${string}`,
  secret: `0x${string}`
): `0x${string}` {
  const normalizedName = normalize(name);
  const label = normalizedName.split('.')[0];
  const commitment = keccak256(
    toBytes(
      `${label}${owner.slice(2)}${secret.slice(2)}`
    )
  );
  return commitment;
}

/**
 * Makes a commitment for name registration
 * @param commitment The commitment hash
 * @param walletClient The wallet client to use for the transaction
 * @returns The transaction hash
 */
async function makeCommitment(
  commitment: `0x${string}`,
  walletClient: WalletClient
): Promise<`0x${string}`> {
  try {
    const hash = await walletClient.writeContract({
      address: REGISTRAR_CONTROLLER_ADDRESS,
      abi: REGISTRAR_CONTROLLER_ABI,
      functionName: 'makeCommitment',
      args: [commitment]
    });
    return hash;
  } catch (error) {
    throw new Error(`Failed to make commitment: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Registers an ENS name
 * @param name The ENS name to register
 * @param owner The owner's address
 * @param duration The duration in seconds
 * @param secret The secret for the commitment
 * @param walletClient The wallet client to use for the transaction
 * @returns The transaction hash
 */
async function registerName(
  name: string,
  owner: `0x${string}`,
  duration: number,
  secret: `0x${string}`,
  walletClient: WalletClient
): Promise<`0x${string}`> {
  try {
    const normalizedName = normalize(name);
    const hash = await walletClient.writeContract({
      address: REGISTRAR_CONTROLLER_ADDRESS,
      abi: REGISTRAR_CONTROLLER_ABI,
      functionName: 'register',
      args: [
        normalizedName,
        owner,
        BigInt(duration),
        secret,
        '0x0000000000000000000000000000000000000000', // Default resolver
        [], // No data
        true, // Set reverse record
        0 // No fuses
      ],
      value: await estimateRegistrationCost(name, duration, walletClient)
    });
    return hash;
  } catch (error) {
    throw new Error(`Failed to register name: ${error instanceof Error ? error.message : String(error)}`);
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

/**
 * Sets a text record for an ENS name
 * @param name The ENS name
 * @param key The text record key
 * @param value The text record value
 * @param resolver The resolver address
 * @param walletClient The wallet client to use for the transaction
 * @returns The transaction hash
 */
async function setTextRecord(
  name: string,
  key: string,
  value: string,
  resolver: `0x${string}`,
  walletClient: WalletClient
): Promise<`0x${string}`> {
  try {
    const node = namehash(name);
    const hash = await walletClient.writeContract({
      address: resolver,
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [node, key, value]
    });
    return hash;
  } catch (error) {
    throw new Error(`Failed to set text record: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Sets an address record for an ENS name
 * @param name The ENS name
 * @param address The address to set
 * @param coinType The coin type (0 for ETH)
 * @param resolver The resolver address
 * @param walletClient The wallet client to use for the transaction
 * @returns The transaction hash
 */
async function setAddressRecord(
  name: string,
  address: `0x${string}`,
  coinType: number,
  resolver: `0x${string}`,
  walletClient: WalletClient
): Promise<`0x${string}`> {
  try {
    const node = namehash(name);
    const hash = await walletClient.writeContract({
      address: resolver,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [node, BigInt(coinType), address]
    });
    return hash;
  } catch (error) {
    throw new Error(`Failed to set address record: ${error instanceof Error ? error.message : String(error)}`);
  }
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
    const { publicClient, walletClient } = await getClients(mainnet);

    // Check if name is available
    console.log('\nChecking name availability...');
    const available = await isNameAvailable(name, publicClient);
    if (!available) {
      console.error(`Name ${name} is not available for registration`);
      process.exit(1);
    }
    console.log('Name is available!');

    // Estimate the cost
    console.log('\nEstimating registration cost...');
    const costWei = await estimateRegistrationCost(name, durationSeconds, publicClient);
    const costEth = weiToEth(costWei);

    console.log('\nRegistration Details:');
    console.log(`Name: ${name}`);
    console.log(`Duration: ${durationYears} year${durationYears > 1 ? 's' : ''}`);
    console.log(`Estimated Cost: ${costEth} ETH (${costWei} wei)`);

    // Get owner address
    const owner = walletClient.account?.address;
    if (!owner) {
      console.error('No wallet connected');
      process.exit(1);
    }

    // Generate secret and commitment
    console.log('\nGenerating commitment...');
    const secret = `0x${randomBytes(32).toString('hex')}`;
    const commitment = generateCommitment(name, owner, secret);

    // Make commitment
    console.log('Making commitment transaction...');
    const commitmentHash = await makeCommitment(commitment, walletClient);
    console.log(`Commitment transaction hash: ${commitmentHash}`);

    // Wait for commitment to be confirmed
    console.log('Waiting for commitment to be confirmed...');
    await waitForTransaction(publicClient, { hash: commitmentHash });
    console.log('Commitment confirmed!');

    // Wait for commitment to be ready (1 minute)
    console.log('Waiting for commitment to be ready (1 minute)...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    // Register name with public resolver
    console.log('\nRegistering name...');
    const registrationHash = await registerName(
      name,
      owner,
      durationSeconds,
      secret,
      walletClient,
      ENS_CONTRACTS.mainnet.publicResolver
    );
    console.log(`Registration transaction hash: ${registrationHash}`);

    // Wait for registration to be confirmed
    console.log('Waiting for registration to be confirmed...');
    await waitForTransaction(publicClient, { hash: registrationHash });
    console.log('Registration confirmed!');

    // Set up resolver records
    console.log('\nSetting up resolver records...');
    
    // Set ETH address
    console.log('Setting ETH address...');
    const addressHash = await setAddressRecord(
      name,
      owner,
      60, // ETH coin type
      ENS_CONTRACTS.mainnet.publicResolver,
      walletClient
    );
    await waitForTransaction(publicClient, { hash: addressHash });
    console.log('ETH address set!');

    // Set common text records
    const textRecords = {
      'url': 'https://example.com',
      'email': 'owner@example.com',
      'avatar': 'https://example.com/avatar.png',
      'description': 'My ENS name',
      'com.twitter': '@example',
      'com.github': 'example'
    };

    for (const [key, value] of Object.entries(textRecords)) {
      console.log(`Setting ${key} record...`);
      const textHash = await setTextRecord(
        name,
        key,
        value,
        ENS_CONTRACTS.mainnet.publicResolver,
        walletClient
      );
      await waitForTransaction(publicClient, { hash: textHash });
      console.log(`${key} record set!`);
    }

    console.log('\nRegistration complete!');
    console.log(`Name ${name} has been registered to ${owner}`);
    console.log('\nENS Contract Addresses:');
    console.log(JSON.stringify(ENS_CONTRACTS.mainnet, null, 2));

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 