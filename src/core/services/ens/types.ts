import { 
  type Address, 
  type Chain, 
  type Hash, 
  type TransactionReceipt, 
  type PublicClient, 
  type WalletClient, 
  type Account, 
  type WriteContractParameters,
  type Hex,
  type GetEnsResolverParameters,
  type Log,
  type WriteContractReturnType,
  type GetContractReturnType
} from 'viem';

export interface EnsOwnershipRecord {
  owner: Address;
  timestamp: number;
  transactionHash: Hash;
}

export interface EnsAddressRecord {
  address: Address;
  timestamp: number;
  transactionHash: Hash;
}

export type {
  Address,
  Chain,
  Hash,
  TransactionReceipt,
  PublicClient,
  WalletClient,
  Account,
  WriteContractParameters,
  Hex,
  GetEnsResolverParameters,
  Log,
  WriteContractReturnType,
  GetContractReturnType
}; 