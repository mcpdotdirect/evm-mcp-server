# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-11-12

### Added

#### New Tools
- **`get_token_allowance`**: Check ERC20 token allowances for DeFi operations
- **`wait_for_transaction`**: Wait for transaction confirmations with configurable timeout
- **`get_gas_price`**: Get current gas prices in wei and gwei
- **`estimate_fees_per_gas`**: Get EIP-1559 fee estimates (maxFeePerGas, maxPriorityFeePerGas)
- **`get_contract_events`**: Retrieve contract event logs with block range filtering
- **`batch_read_contracts`**: Execute multiple contract read calls in parallel

#### New Services
- ERC20 allowance checking functionality in balance.ts
- Transaction waiting/confirmation with configurable confirmations
- Gas price and fee estimation services
- EIP-1559 fee history support
- Contract event filtering and logging
- Batch contract read operations for improved efficiency

#### Error Handling & Validation
- Custom error types (EVMError, NetworkError, ContractError, TransactionError, ValidationError, ENSResolutionError)
- Comprehensive input validation utilities
- Better error messages and error handling throughout the codebase

#### Testing
- Basic unit test suite for validation utilities
- Test infrastructure setup with Bun test runner
- New test scripts in package.json

### Improved
- Enhanced gas fee management with EIP-1559 support
- Better transaction monitoring and confirmation tracking
- More efficient batch operations for contract reads
- Improved error handling across all services
- Updated documentation with new features
- Version bump to 1.2.0

### Documentation
- Updated README with new tools and features
- Added comprehensive API reference for new tools
- Documented gas and fee management features
- Added examples for new functionality

## [1.1.3] - Previous Release

Previous changes... (see git history)
