/**
 * Custom error types for better error handling
 */

export class EVMError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'EVMError';
  }
}

export class NetworkError extends EVMError {
  constructor(message: string, public network: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class ContractError extends EVMError {
  constructor(message: string, public contractAddress: string, details?: any) {
    super(message, 'CONTRACT_ERROR', details);
    this.name = 'ContractError';
  }
}

export class TransactionError extends EVMError {
  constructor(message: string, public txHash?: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

export class ValidationError extends EVMError {
  constructor(message: string, public field: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ENSResolutionError extends EVMError {
  constructor(message: string, public ensName: string, details?: any) {
    super(message, 'ENS_RESOLUTION_ERROR', details);
    this.name = 'ENSResolutionError';
  }
}

/**
 * Error handler utility
 */
export function handleError(error: any): { message: string; code?: string; details?: any } {
  if (error instanceof EVMError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }

  return {
    message: String(error),
    code: 'UNKNOWN_ERROR'
  };
}
