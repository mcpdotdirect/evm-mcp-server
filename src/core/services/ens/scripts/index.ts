// Resolution functions
export { resolveAddress } from './name-resolution.js';
export { lookupAddress } from './name-resolution.js';
export { isValidEnsName } from './name-resolution.js';

// Record functions
export { getEnsTextRecord } from './text-records.js';
export { setEnsTextRecord } from './text-records.js';
export { setEnsAddressRecord } from './text-records.js';

// Subdomain functions
export { createEnsSubdomain } from './subdomain-management.js';
export { setSubdomainResolver } from './subdomain-management.js';
export { isValidSubdomain } from './subdomain-management.js';

// Wrapping functions
export { wrapEnsName } from './name-wrapping.js';
export { unwrapEnsName } from './name-wrapping.js';
export { getWrappedNameDetails } from './name-wrapping.js';

// History functions
export { getEnsOwnershipHistory } from './ownership.js';
export { getEnsAddressHistory } from './ownership.js';

// Types
export type { EnsOwnershipRecord, EnsAddressRecord } from './types.js'; 