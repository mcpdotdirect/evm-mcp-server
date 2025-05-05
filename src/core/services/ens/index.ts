// Resolution functions
export { resolveAddress } from './resolution.js';
export { lookupAddress } from './resolution.js';
export { isValidEnsName } from './resolution.js';

// Record functions
export { getEnsTextRecord } from './records.js';
export { setEnsTextRecord } from './records.js';
export { setEnsAddressRecord } from './records.js';

// Subdomain functions
export { createEnsSubdomain } from './subdomains.js';
export { setSubdomainResolver } from './subdomains.js';
export { isValidSubdomain } from './subdomains.js';

// Wrapping functions
export { wrapEnsName } from './wrapping.js';
export { unwrapEnsName } from './wrapping.js';
export { getWrappedNameDetails } from './wrapping.js';

// History functions
export { getEnsOwnershipHistory } from './history.js';
export { getEnsAddressHistory } from './history.js';

// Types
export type { EnsOwnershipRecord, EnsAddressRecord } from './types.js'; 