import { GraphQLClient } from 'graphql-request';

// ENS Subgraph URLs
const SUBGRAPH_URLS = {
  mainnet: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
  goerli: 'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli'
} as const;

async function getRecentRegistrations(limit: number = 20, network: 'mainnet' | 'goerli' = 'mainnet') {
  try {
    const client = new GraphQLClient(SUBGRAPH_URLS[network]);
    const query = `
      query GetRecentRegistrations($limit: Int!) {
        registrations(
          first: $limit,
          orderBy: registrationDate,
          orderDirection: desc
        ) {
          id
          domain {
            name
            labelName
          }
          registrant {
            id
          }
          registrationDate
          expiryDate
        }
      }
    `;

    const result = await client.request(query, { limit });
    return result.registrations;
  } catch (error) {
    throw new Error(`Failed to query subgraph: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  try {
    const registrations = await getRecentRegistrations();
    
    console.log('Most Recent ENS Registrations:');
    console.log('=============================');
    
    registrations.forEach((reg: any, index: number) => {
      console.log(`\n${index + 1}. ${reg.domain.name}`);
      console.log(`   Registrant: ${reg.registrant.id}`);
      console.log(`   Registration Date: ${new Date(reg.registrationDate * 1000).toLocaleString()}`);
      console.log(`   Expiry Date: ${new Date(reg.expiryDate * 1000).toLocaleString()}`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 