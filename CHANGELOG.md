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
# [1.2.0](https://github.com/mcpdotdirect/evm-mcp-server/compare/v1.1.3...v1.2.0) (2025-05-23)


### Features

* add Filecoin Calibration network to chains and update mappings ([9790118](https://github.com/mcpdotdirect/evm-mcp-server/commit/97901181139a8574f688179864331777c7fda422))



## [1.1.3](https://github.com/mcpdotdirect/evm-mcp-server/compare/v1.1.2...v1.1.3) (2025-03-22)



## [1.1.2](https://github.com/mcpdotdirect/evm-mcp-server/compare/v1.1.1...v1.1.2) (2025-03-22)



## [1.1.1](https://github.com/mcpdotdirect/evm-mcp-server/compare/v1.1.0...v1.1.1) (2025-03-22)


### Bug Fixes

* fixed naming of github secret ([4300dad](https://github.com/mcpdotdirect/evm-mcp-server/commit/4300dad343dc696c9e345d9b18e37bbb481db961))



# [1.1.0](https://github.com/mcpdotdirect/evm-mcp-server/compare/db4d20f0aeb0b34f67b4be3b38c6bb662682bfb6...v1.1.0) (2025-03-22)


### Bug Fixes

* fixed tools names to be callable by Cursor ([3938549](https://github.com/mcpdotdirect/evm-mcp-server/commit/3938549381d2b1abb406d25ccda365a53ef3555d))
* following standard naming, fixed SSE server ([b20a12d](https://github.com/mcpdotdirect/evm-mcp-server/commit/b20a12d81c25a262389bd8781d73095ec69d265b))


### Features

* add Lumia mainnet and testnet support in chains.ts and update README ([ee55fa7](https://github.com/mcpdotdirect/evm-mcp-server/commit/ee55fa750d4759d5d4e7254ce811f62a4fd5c6e9))
* adding ENS support ([4f19f12](https://github.com/mcpdotdirect/evm-mcp-server/commit/4f19f12c0df163fbade10f2334f2690d735831ea))
* adding get_address_from_private_key tool ([befc357](https://github.com/mcpdotdirect/evm-mcp-server/commit/befc35769dd21cfa031c084115ea59eeeecbf5b4))
* implemented v0 of EVM MCP server, needs testing ([db4d20f](https://github.com/mcpdotdirect/evm-mcp-server/commit/db4d20f0aeb0b34f67b4be3b38c6bb662682bfb6))
* npm public release ([df6d52d](https://github.com/mcpdotdirect/evm-mcp-server/commit/df6d52db01e0b290f0da7ea1a087243484ce4e5c))



