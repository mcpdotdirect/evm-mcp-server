// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerEVMTools } from './tools.js';

jest.mock('./services/index.js', () => {
    return {
        getChainId: jest.fn(),
        getBlockNumber: jest.fn(),
        getPublicClient: jest.fn(),
        resolveAddress: jest.fn(),
        getETHBalance: jest.fn(),
        getERC20Balance: jest.fn(),
        getBlockByHash: jest.fn(),
        getBlockByNumber: jest.fn(),
        getLatestBlock: jest.fn(),
        getTransaction: jest.fn(),
        fetchContractABI: jest.fn(),
        parseABI: jest.fn(),
        getFunctionFromABI: jest.fn(),
        writeContract: jest.fn(),
        transferETH: jest.fn(),
        transferERC20: jest.fn(),
        approveERC20: jest.fn(),
        getERC721TokenMetadata: jest.fn(),
        getERC1155Balance: jest.fn(),
        signMessage: jest.fn(),
        signTypedData: jest.fn(),
        multicall: jest.fn(),
        getConfiguredWallet: jest.fn(),
        getWalletAddressFromKey: jest.fn(),
        getConfiguredPrivateKey: jest.fn(),
        helpers: { formatJson: jest.fn((obj) => JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)) },
        getReadableFunctions: jest.fn(),
    };
});

jest.mock('./chains.js', () => ({
    getSupportedNetworks: jest.fn(() => ['ethereum', 'optimism', 'arbitrum', 'base', 'polygon']),
    getRpcUrl: jest.fn((network) => `https://rpc.${network || 'ethereum'}.com`)
}));

jest.mock('viem/ens', () => ({
    normalize: jest.fn((name) => name.toLowerCase())
}));

import * as services from './services/index.js';

describe('tools', () => {
    let server;
    let mockRegisterTool;

    beforeEach(() => {
        mockRegisterTool = jest.fn();
        server = { registerTool: mockRegisterTool };
        jest.clearAllMocks();
    });

    afterEach(() => { jest.resetModules(); });

    describe('registerEVMTools', () => {
        it('should register all EVM tools with the MCP server', () => {
            registerEVMTools(server);
            const registeredTools = mockRegisterTool.mock.calls.map(call => call[0]);
            expect(registeredTools).toContain('get_wallet_address');
            expect(registeredTools).toContain('get_chain_info');
            expect(registeredTools).toContain('get_supported_networks');
            expect(registeredTools).toContain('get_gas_price');
            expect(registeredTools).toContain('resolve_ens_name');
            expect(registeredTools).toContain('lookup_ens_address');
            expect(registeredTools).toContain('get_block');
            expect(registeredTools).toContain('get_latest_block');
            expect(registeredTools).toContain('get_balance');
            expect(registeredTools).toContain('get_token_balance');
            expect(registeredTools).toContain('get_allowance');
            expect(registeredTools).toContain('get_transaction');
            expect(registeredTools).toContain('get_transaction_receipt');
            expect(registeredTools).toContain('wait_for_transaction');
            expect(registeredTools).toContain('get_contract_abi');
            expect(registeredTools).toContain('read_contract');
            expect(registeredTools).toContain('write_contract');
            expect(registeredTools).toContain('multicall');
            expect(registeredTools).toContain('transfer_native');
            expect(registeredTools).toContain('transfer_erc20');
            expect(registeredTools).toContain('approve_token_spending');
            expect(registeredTools).toContain('get_nft_info');
            expect(registeredTools).toContain('get_erc1155_balance');
            expect(registeredTools).toContain('sign_message');
            expect(registeredTools).toContain('sign_typed_data');
            expect(registeredTools.length).toBeGreaterThanOrEqual(23);
        });

        describe('get_wallet_address tool', () => {
            it('should return wallet address when wallet is configured', async () => {
                services.getWalletAddressFromKey.mockReturnValue('0x1234567890123456789012345678901234567890');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_wallet_address')?.[2];
                expect(handler).toBeDefined();
                const result = await handler({});
                expect(result).toEqual({
                    content: [{ type: "text", text: JSON.stringify({ address: '0x1234567890123456789012345678901234567890', message: "This is the wallet that will be used for all transactions" }, null, 2) }]
                });
            });
            it('should handle errors gracefully', async () => {
                services.getWalletAddressFromKey.mockImplementation(() => { throw new Error('Wallet not configured'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_wallet_address')?.[2];
                const result = await handler({});
                expect(result).toEqual({ content: [{ type: "text", text: "Error: Wallet not configured" }], isError: true });
            });
        });

        describe('get_chain_info tool', () => {
            it('should return chain info for specified network', async () => {
                services.getChainId.mockResolvedValue(1);
                services.getBlockNumber.mockResolvedValue(BigInt(18000000));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_chain_info')?.[2];
                const result = await handler({ network: 'ethereum' });
                expect(result).toEqual({
                    content: [{ type: "text", text: JSON.stringify({ network: 'ethereum', chainId: 1, blockNumber: '18000000', rpcUrl: 'https://rpc.ethereum.com' }, null, 2) }]
                });
            });
            it('should default to ethereum network when not specified', async () => {
                services.getChainId.mockResolvedValue(1);
                services.getBlockNumber.mockResolvedValue(BigInt(18000000));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_chain_info')?.[2];
                await handler({});
                expect(services.getChainId).toHaveBeenCalledWith('ethereum');
            });
            it('should handle errors gracefully', async () => {
                services.getChainId.mockImplementation(() => { throw new Error('Network not found'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_chain_info')?.[2];
                const result = await handler({ network: 'unknown' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching chain info: Network not found" }], isError: true });
            });
        });

        describe('get_supported_networks tool', () => {
            it('should return list of supported networks', async () => {
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_supported_networks')?.[2];
                const result = await handler({});
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ supportedNetworks: ['ethereum', 'optimism', 'arbitrum', 'base', 'polygon'] }, null, 2) }] });
            });
        });

        describe('get_gas_price tool', () => {
            it('should return gas prices for specified network', async () => {
                const mockClient = { getGasPrice: jest.fn().mockResolvedValue(BigInt(20000000000)), estimateMaxPriorityFeePerGas: jest.fn().mockResolvedValue(BigInt(1500000000)) };
                services.getPublicClient.mockResolvedValue(mockClient);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_gas_price')?.[2];
                const result = await handler({ network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ network: 'ethereum', baseFeePerGas: '20000000000', priorityFeePerGas: '1500000000', currency: 'wei' }, null, 2) }] });
            });
            it('should handle missing priority fee', async () => {
                const mockClient = { getGasPrice: jest.fn().mockResolvedValue(BigInt(20000000000)), estimateMaxPriorityFeePerGas: jest.fn().mockResolvedValue(null) };
                services.getPublicClient.mockResolvedValue(mockClient);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_gas_price')?.[2];
                const result = await handler({ network: 'ethereum' });
                expect(result.content[0].text).toContain('"priorityFeePerGas": "N/A"');
            });
            it('should handle errors gracefully', async () => {
                services.getPublicClient.mockImplementation(() => { throw new Error('Client not available'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_gas_price')?.[2];
                const result = await handler({ network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching gas prices: Client not available" }], isError: true });
            });
        });

        describe('resolve_ens_name tool', () => {
            it('should resolve ENS name to address', async () => {
                services.resolveAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'resolve_ens_name')?.[2];
                const result = await handler({ ensName: 'vitalik.eth', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ ensName: 'vitalik.eth', normalizedName: 'vitalik.eth', resolvedAddress: '0x1234567890123456789012345678901234567890', network: 'ethereum' }, null, 2) }] });
            });
            it('should reject ENS name without dot', async () => {
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'resolve_ens_name')?.[2];
                const result = await handler({ ensName: 'vitalik', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error: \"vitalik\" is not a valid ENS name. ENS names must contain a dot (e.g., 'name.eth')." }], isError: true });
            });
            it('should handle errors gracefully', async () => {
                services.resolveAddress.mockImplementation(() => { throw new Error('ENS name not found'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'resolve_ens_name')?.[2];
                const result = await handler({ ensName: 'nonexistent.eth', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error resolving ENS name: ENS name not found" }], isError: true });
            });
        });

        describe('lookup_ens_address tool', () => {
            it('should lookup ENS name for address', async () => {
                const mockClient = { getEnsName: jest.fn().mockResolvedValue('vitalik.eth') };
                services.getPublicClient.mockResolvedValue(mockClient);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'lookup_ens_address')?.[2];
                const result = await handler({ address: '0x1234567890123456789012345678901234567890', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ address: '0x1234567890123456789012345678901234567890', ensName: 'vitalik.eth', network: 'ethereum' }, null, 2) }] });
            });
            it('should handle address with no ENS name', async () => {
                const mockClient = { getEnsName: jest.fn().mockResolvedValue(null) };
                services.getPublicClient.mockResolvedValue(mockClient);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'lookup_ens_address')?.[2];
                const result = await handler({ address: '0x1234567890123456789012345678901234567890', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ address: '0x1234567890123456789012345678901234567890', ensName: 'No ENS name found', network: 'ethereum' }, null, 2) }] });
            });
            it('should handle errors gracefully', async () => {
                services.getPublicClient.mockImplementation(() => { throw new Error('Client not available'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'lookup_ens_address')?.[2];
                const result = await handler({ address: '0x1234567890123456789012345678901234567890', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error looking up ENS name: Client not available" }], isError: true });
            });
        });

        describe('get_block tool', () => {
            it('should get block by number', async () => {
                const mockBlock = { number: 18000000, hash: '0xabc' };
                services.getBlockByNumber.mockResolvedValue(mockBlock);
                services.helpers.formatJson.mockReturnValue(JSON.stringify(mockBlock));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_block')?.[2];
                const result = await handler({ blockIdentifier: '18000000', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify(mockBlock) }] });
            });
            it('should get block by hash', async () => {
                const mockBlock = { number: 18000000, hash: '0xabc123' };
                services.getBlockByHash.mockResolvedValue(mockBlock);
                services.helpers.formatJson.mockReturnValue(JSON.stringify(mockBlock));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_block')?.[2];
                await handler({ blockIdentifier: '0xabc123def456789012345678901234567890123456789012345678901234abcd', network: 'ethereum' });
                expect(services.getBlockByHash).toHaveBeenCalledWith('0xabc123def456789012345678901234567890123456789012345678901234abcd', 'ethereum');
            });
            it('should handle errors gracefully', async () => {
                services.getBlockByNumber.mockImplementation(() => { throw new Error('Block not found'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_block')?.[2];
                const result = await handler({ blockIdentifier: '999999999', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching block: Block not found" }], isError: true });
            });
        });

        describe('get_latest_block tool', () => {
            it('should return latest block', async () => {
                const mockBlock = { number: 18000000, hash: '0xabc' };
                services.getLatestBlock.mockResolvedValue(mockBlock);
                services.helpers.formatJson.mockReturnValue(JSON.stringify(mockBlock));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_latest_block')?.[2];
                const result = await handler({ network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify(mockBlock) }] });
            });
            it('should handle errors gracefully', async () => {
                services.getLatestBlock.mockImplementation(() => { throw new Error('Failed to fetch block'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_latest_block')?.[2];
                const result = await handler({ network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching latest block: Failed to fetch block" }], isError: true });
            });
        });

        describe('get_balance tool', () => {
            it('should return native token balance', async () => {
                services.getETHBalance.mockResolvedValue({ wei: BigInt('1000000000000000000'), ether: '1.0' });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_balance')?.[2];
                const result = await handler({ address: '0x1234567890123456789012345678901234567890', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ network: 'ethereum', address: '0x1234567890123456789012345678901234567890', balance: { wei: '1000000000000000000', ether: '1.0' } }, null, 2) }] });
            });
            it('should handle errors gracefully', async () => {
                services.getETHBalance.mockImplementation(() => { throw new Error('Failed to fetch balance'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_balance')?.[2];
                const result = await handler({ address: '0x1234567890123456789012345678901234567890', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching balance: Failed to fetch balance" }], isError: true });
            });
        });

        describe('get_token_balance tool', () => {
            it('should return ERC20 token balance', async () => {
                services.getERC20Balance.mockResolvedValue({ raw: BigInt(1000000), formatted: '1.0', token: { symbol: 'USDC', decimals: 6 } });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_token_balance')?.[2];
                const result = await handler({ address: '0x1234567890123456789012345678901234567890', tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ network: 'ethereum', tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', address: '0x1234567890123456789012345678901234567890', balance: { raw: '1000000', formatted: '1.0', symbol: 'USDC', decimals: 6 } }, null, 2) }] });
            });
            it('should handle errors gracefully', async () => {
                services.getERC20Balance.mockImplementation(() => { throw new Error('Failed to fetch token balance'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_token_balance')?.[2];
                const result = await handler({ address: '0x1234567890123456789012345678901234567890', tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching token balance: Failed to fetch token balance" }], isError: true });
            });
        });

        describe('get_allowance tool', () => {
            it('should return token allowance', async () => {
                const mockClient = { readContract: jest.fn().mockResolvedValue(BigInt(1000000)) };
                services.getPublicClient.mockResolvedValue(mockClient);
                services.getConfiguredWallet.mockReturnValue({ address: '0xOwner123' });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_allowance')?.[2];
                const result = await handler({ tokenAddress: '0xToken123', spenderAddress: '0xSpender123', ownerAddress: '0xOwner123', network: 'ethereum' });
                expect(result.content[0].text).toContain('"allowance": "1000000"');
            });
            it('should use configured wallet when ownerAddress not provided', async () => {
                const mockClient = { readContract: jest.fn().mockResolvedValue(BigInt(0)) };
                services.getPublicClient.mockResolvedValue(mockClient);
                services.getConfiguredWallet.mockReturnValue({ address: '0xConfiguredWallet' });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_allowance')?.[2];
                await handler({ tokenAddress: '0xToken123', spenderAddress: '0xSpender123', network: 'ethereum' });
                expect(mockClient.readContract).toHaveBeenCalledWith(expect.objectContaining({ args: ['0xConfiguredWallet', '0xSpender123'] }));
            });
            it('should handle errors gracefully', async () => {
                services.getPublicClient.mockImplementation(() => { throw new Error('Client not available'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_allowance')?.[2];
                const result = await handler({ tokenAddress: '0xToken123', spenderAddress: '0xSpender123', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching allowance: Client not available" }], isError: true });
            });
        });

        describe('get_transaction tool', () => {
            it('should return transaction details', async () => {
                const mockTx = { hash: '0xtx123', from: '0x123', to: '0x456' };
                services.getTransaction.mockResolvedValue(mockTx);
                services.helpers.formatJson.mockReturnValue(JSON.stringify(mockTx));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_transaction')?.[2];
                const result = await handler({ txHash: '0xtx123', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify(mockTx) }] });
            });
            it('should handle errors gracefully', async () => {
                services.getTransaction.mockImplementation(() => { throw new Error('Transaction not found'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_transaction')?.[2];
                const result = await handler({ txHash: '0xtx123', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching transaction: Transaction not found" }], isError: true });
            });
        });

        describe('get_transaction_receipt tool', () => {
            it('should return transaction receipt', async () => {
                const mockClient = { getTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success', blockNumber: BigInt(18000000), gasUsed: BigInt(21000) }) };
                services.getPublicClient.mockResolvedValue(mockClient);
                services.helpers.formatJson.mockImplementation((obj) => JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_transaction_receipt')?.[2];
                const result = await handler({ txHash: '0xtx123', network: 'ethereum' });
                expect(result.content[0].text).toContain('success');
            });
            it('should handle errors gracefully', async () => {
                services.getPublicClient.mockImplementation(() => { throw new Error('Client not available'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_transaction_receipt')?.[2];
                const result = await handler({ txHash: '0xtx123', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching transaction receipt: Client not available" }], isError: true });
            });
        });

        describe('wait_for_transaction tool', () => {
            it('should wait for transaction confirmation', async () => {
                const mockClient = { waitForTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success', blockNumber: BigInt(18000000), gasUsed: BigInt(21000) }) };
                services.getPublicClient.mockResolvedValue(mockClient);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'wait_for_transaction')?.[2];
                const result = await handler({ txHash: '0xtx123', confirmations: 1, network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify({ network: 'ethereum', txHash: '0xtx123', status: 'confirmed', blockNumber: '18000000', gasUsed: '21000', confirmations: 1 }, null, 2) }] });
            });
            it('should handle failed transactions', async () => {
                const mockClient = { waitForTransactionReceipt: jest.fn().mockResolvedValue({ status: 'reverted', blockNumber: BigInt(18000000), gasUsed: BigInt(21000) }) };
                services.getPublicClient.mockResolvedValue(mockClient);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'wait_for_transaction')?.[2];
                const result = await handler({ txHash: '0xtx123', network: 'ethereum' });
                expect(result.content[0].text).toContain('"status": "failed"');
            });
            it('should handle errors gracefully', async () => {
                services.getPublicClient.mockImplementation(() => { throw new Error('Client not available'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'wait_for_transaction')?.[2];
                const result = await handler({ txHash: '0xtx123', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error waiting for transaction: Client not available" }], isError: true });
            });
        });

        describe('get_contract_abi tool', () => {
            it('should return contract ABI', async () => {
                const mockABI = [{ name: 'transfer', type: 'function' }];
                services.fetchContractABI.mockResolvedValue(JSON.stringify(mockABI));
                services.parseABI.mockReturnValue(mockABI);
                services.getReadableFunctions.mockReturnValue(['transfer']);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_contract_abi')?.[2];
                const result = await handler({ contractAddress: '0xContract123', network: 'ethereum' });
                expect(result.content[0].text).toContain('"totalFunctions": 1');
            });
            it('should handle errors gracefully', async () => {
                services.fetchContractABI.mockImplementation(() => { throw new Error('Contract not verified'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_contract_abi')?.[2];
                const result = await handler({ contractAddress: '0xContract123', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching ABI: Contract not verified" }], isError: true });
            });
        });

        describe('read_contract tool', () => {
            it('should read contract function with provided ABI', async () => {
                const mockClient = { readContract: jest.fn().mockResolvedValue('TestToken') };
                services.getPublicClient.mockResolvedValue(mockClient);
                services.parseABI.mockReturnValue([{ name: 'name', type: 'function' }]);
                services.getFunctionFromABI.mockReturnValue({ name: 'name', type: 'function' });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'read_contract')?.[2];
                const result = await handler({ contractAddress: '0xContract123', functionName: 'name', abiJson: '[{"name":"name","type":"function"}]' });
                expect(result.content[0].text).toContain('"result": "TestToken"');
            });
            it('should use built-in common functions when ABI not provided', async () => {
                const mockClient = { readContract: jest.fn().mockResolvedValue(BigInt(1000000)) };
                services.getPublicClient.mockResolvedValue(mockClient);
                services.fetchContractABI.mockImplementation(() => { throw new Error('Not verified'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'read_contract')?.[2];
                const result = await handler({ contractAddress: '0xContract123', functionName: 'totalSupply' });
                expect(result.content[0].text).toContain('"abiSource": "auto-fetched or built-in"');
            });
            it('should error for unknown function without ABI', async () => {
                services.getPublicClient.mockResolvedValue({});
                services.fetchContractABI.mockImplementation(() => { throw new Error('Not verified'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'read_contract')?.[2];
                const result = await handler({ contractAddress: '0xContract123', functionName: 'unknownFunction' });
                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Could not auto-fetch ABI');
            });
            it('should handle invalid ABI gracefully', async () => {
                services.parseABI.mockImplementation(() => { throw new Error('Invalid JSON'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'read_contract')?.[2];
                const result = await handler({ contractAddress: '0xContract123', functionName: 'name', abiJson: 'invalid json' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error parsing provided ABI: Invalid JSON" }], isError: true });
            });
        });

        describe('write_contract tool', () => {
            const originalEnv = process.env;
            beforeEach(() => { process.env = { ...originalEnv }; });
            afterEach(() => { process.env = originalEnv; });
            it('should write to contract with provided ABI', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                const mockClient = { estimateGas: jest.fn() };
                services.getPublicClient.mockResolvedValue(mockClient);
                services.parseABI.mockReturnValue([{ name: 'transfer', type: 'function', stateMutability: 'nonpayable' }]);
                services.getFunctionFromABI.mockReturnValue({ name: 'transfer', type: 'function', stateMutability: 'nonpayable' });
                services.writeContract.mockResolvedValue('0xtxHash123');
                services.getWalletAddressFromKey.mockReturnValue('0xWallet123');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'write_contract')?.[2];
                const result = await handler({ contractAddress: '0xContract123', functionName: 'transfer', args: ['0xRecipient123', '1000'], abiJson: '[{"name":"transfer","type":"function","stateMutability":"nonpayable"}]' });
                expect(result.content[0].text).toContain('"txHash": "0xtxHash123"');
            });
            it('should reject view functions', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.getPublicClient.mockResolvedValue({});
                services.parseABI.mockReturnValue([{ name: 'balanceOf', type: 'function', stateMutability: 'view' }]);
                services.getFunctionFromABI.mockReturnValue({ name: 'balanceOf', type: 'function', stateMutability: 'view' });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'write_contract')?.[2];
                const result = await handler({ contractAddress: '0xContract123', functionName: 'balanceOf', abiJson: '[{"name":"balanceOf","type":"function","stateMutability":"view"}]' });
                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('is a view function');
            });
            it('should handle errors gracefully', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.getPublicClient.mockImplementation(() => { throw new Error('Client not available'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'write_contract')?.[2];
                const result = await handler({ contractAddress: '0xContract123', functionName: 'transfer', args: ['0xRecipient123', '1000'] });
                expect(result).toEqual({ content: [{ type: "text", text: "Error writing to contract: Client not available" }], isError: true });
            });
        });

        describe('multicall tool', () => {
            it('should execute multiple contract calls in batch', async () => {
                services.parseABI.mockReturnValue([{ name: 'name', type: 'function', stateMutability: 'view' }]);
                services.getFunctionFromABI.mockReturnValue({ name: 'name', type: 'function', stateMutability: 'view' });
                services.multicall.mockResolvedValue([{ status: 'success', result: 'Token1' }, { status: 'success', result: 'Token2' }]);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'multicall')?.[2];
                const result = await handler({ calls: [{ contractAddress: '0xToken1', functionName: 'name' }, { contractAddress: '0xToken2', functionName: 'name' }] });
                expect(result.content[0].text).toContain('"totalCalls": 2');
                expect(result.content[0].text).toContain('"successfulCalls": 2');
            });
            it('should handle failed calls with allowFailure', async () => {
                services.parseABI.mockReturnValue([{ name: 'name', type: 'function', stateMutability: 'view' }]);
                services.getFunctionFromABI.mockReturnValue({ name: 'name', type: 'function', stateMutability: 'view' });
                services.multicall.mockResolvedValue([{ status: 'success', result: 'Token1' }, { status: 'failure', error: { message: 'Reverted' } }]);
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'multicall')?.[2];
                const result = await handler({ calls: [{ contractAddress: '0xToken1', functionName: 'name' }, { contractAddress: '0xToken2', functionName: 'name' }], allowFailure: true });
                expect(result.content[0].text).toContain('"failedCalls": 1');
            });
            it('should handle errors gracefully', async () => {
                services.parseABI.mockImplementation(() => { throw new Error('Invalid ABI'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'multicall')?.[2];
                const result = await handler({ calls: [{ contractAddress: '0xToken1', functionName: 'name', abiJson: 'invalid' }] });
                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Error executing multicall');
            });
        });

        describe('transfer_native tool', () => {
            const originalEnv = process.env;
            beforeEach(() => { process.env = { ...originalEnv }; });
            afterEach(() => { process.env = originalEnv; });
            it('should transfer native tokens', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.transferETH.mockResolvedValue('0xtxHash123');
                services.getWalletAddressFromKey.mockReturnValue('0xWallet123');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'transfer_native')?.[2];
                const result = await handler({ to: '0xRecipient123', amount: '0.5', network: 'ethereum' });
                expect(result.content[0].text).toContain('"txHash": "0xtxHash123"');
            });
            it('should handle errors gracefully', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.transferETH.mockImplementation(() => { throw new Error('Insufficient balance'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'transfer_native')?.[2];
                const result = await handler({ to: '0xRecipient123', amount: '0.5', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error transferring native tokens: Insufficient balance" }], isError: true });
            });
        });

        describe('transfer_erc20 tool', () => {
            const originalEnv = process.env;
            beforeEach(() => { process.env = { ...originalEnv }; });
            afterEach(() => { process.env = originalEnv; });
            it('should transfer ERC20 tokens', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.transferERC20.mockResolvedValue({ amount: { raw: BigInt(100000000), formatted: '100' }, token: { symbol: 'USDC', decimals: 6 }, txHash: '0xtxHash123' });
                services.getWalletAddressFromKey.mockReturnValue('0xWallet123');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'transfer_erc20')?.[2];
                const result = await handler({ tokenAddress: '0xUSDC', to: '0xRecipient123', amount: '100', network: 'ethereum' });
                expect(result.content[0].text).toContain('"txHash": "0xtxHash123"');
            });
            it('should handle errors gracefully', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.transferERC20.mockImplementation(() => { throw new Error('Insufficient allowance'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'transfer_erc20')?.[2];
                const result = await handler({ tokenAddress: '0xUSDC', to: '0xRecipient123', amount: '100', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error transferring ERC20 tokens: Insufficient allowance" }], isError: true });
            });
        });

        describe('approve_token_spending tool', () => {
            const originalEnv = process.env;
            beforeEach(() => { process.env = { ...originalEnv }; });
            afterEach(() => { process.env = originalEnv; });
            it('should approve token spending', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.approveERC20.mockResolvedValue('0xtxHash123');
                services.getWalletAddressFromKey.mockReturnValue('0xWallet123');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'approve_token_spending')?.[2];
                const result = await handler({ tokenAddress: '0xUSDC', spenderAddress: '0xSpender123', amount: '1000000', network: 'ethereum' });
                expect(result.content[0].text).toContain('"txHash": "0xtxHash123"');
            });
            it('should handle errors gracefully', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.approveERC20.mockImplementation(() => { throw new Error('Approval failed'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'approve_token_spending')?.[2];
                const result = await handler({ tokenAddress: '0xUSDC', spenderAddress: '0xSpender123', amount: '1000000', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error approving token spending: Approval failed" }], isError: true });
            });
        });

        describe('get_nft_info tool', () => {
            it('should return NFT metadata', async () => {
                services.getERC721TokenMetadata.mockResolvedValue({ name: 'Cool NFT', symbol: 'CNFT', tokenURI: 'https://example.com/nft.json' });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_nft_info')?.[2];
                const result = await handler({ contractAddress: '0xNFT123', tokenId: '1', network: 'ethereum' });
                expect(result.content[0].text).toContain('"name": "Cool NFT"');
            });
            it('should handle errors gracefully', async () => {
                services.getERC721TokenMetadata.mockImplementation(() => { throw new Error('NFT not found'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_nft_info')?.[2];
                const result = await handler({ contractAddress: '0xNFT123', tokenId: '1', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching NFT info: NFT not found" }], isError: true });
            });
        });

        describe('get_erc1155_balance tool', () => {
            it('should return ERC1155 balance', async () => {
                services.getERC1155Balance.mockResolvedValue(BigInt(5));
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_erc1155_balance')?.[2];
                const result = await handler({ contractAddress: '0xERC1155', tokenId: '1', address: '0xOwner123', network: 'ethereum' });
                expect(result.content[0].text).toContain('"balance": "5"');
            });
            it('should handle errors gracefully', async () => {
                services.getERC1155Balance.mockImplementation(() => { throw new Error('Failed to fetch balance'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'get_erc1155_balance')?.[2];
                const result = await handler({ contractAddress: '0xERC1155', tokenId: '1', address: '0xOwner123', network: 'ethereum' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error fetching ERC1155 balance: Failed to fetch balance" }], isError: true });
            });
        });

        describe('sign_message tool', () => {
            const originalEnv = process.env;
            beforeEach(() => { process.env = { ...originalEnv }; });
            afterEach(() => { process.env = originalEnv; });
            it('should sign a message', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.signMessage.mockResolvedValue('0xSignature123');
                services.getWalletAddressFromKey.mockReturnValue('0xWallet123');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'sign_message')?.[2];
                const result = await handler({ message: 'Hello, World!' });
                expect(result.content[0].text).toContain('"signature": "0xSignature123"');
            });
            it('should handle errors gracefully', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.signMessage.mockImplementation(() => { throw new Error('Signing failed'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'sign_message')?.[2];
                const result = await handler({ message: 'Hello, World!' });
                expect(result).toEqual({ content: [{ type: "text", text: "Error signing message: Signing failed" }], isError: true });
            });
        });

        describe('sign_typed_data tool', () => {
            const originalEnv = process.env;
            beforeEach(() => { process.env = { ...originalEnv }; });
            afterEach(() => { process.env = originalEnv; });
            it('should sign typed data', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.signTypedData.mockResolvedValue('0xSignature123');
                services.getWalletAddressFromKey.mockReturnValue('0xWallet123');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'sign_typed_data')?.[2];
                const result = await handler({ domainJson: JSON.stringify({ name: 'TestDApp', version: '1', chainId: 1, verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' }), typesJson: JSON.stringify({ Person: [{ name: 'name', type: 'string' }] }), primaryType: 'Person', messageJson: JSON.stringify({ name: 'Alice' }) });
                expect(result.content[0].text).toContain('"signature": "0xSignature123"');
            });
            it('should handle invalid JSON inputs', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.getWalletAddressFromKey.mockReturnValue('0xWallet123');
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'sign_typed_data')?.[2];
                const result = await handler({ domainJson: 'invalid json', typesJson: JSON.stringify({}), primaryType: 'Person', messageJson: JSON.stringify({}) });
                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Error parsing JSON inputs');
            });
            it('should handle errors gracefully', async () => {
                process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
                services.signTypedData.mockImplementation(() => { throw new Error('Signing failed'); });
                registerEVMTools(server);
                const handler = mockRegisterTool.mock.calls.find(call => call[0] === 'sign_typed_data')?.[2];
                const result = await handler({ domainJson: JSON.stringify({ name: 'TestDApp' }), typesJson: JSON.stringify({}), primaryType: 'Person', messageJson: JSON.stringify({}) });
                expect(result).toEqual({ content: [{ type: "text", text: "Error signing typed data: Signing failed" }], isError: true });
            });
        });
    });
});
