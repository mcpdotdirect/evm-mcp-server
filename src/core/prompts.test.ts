import { registerEVMPrompts } from './prompts.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('registerEVMPrompts', () => {
  let mockServer: jest.Mocked<McpServer>;
  let registerPromptMock: jest.Mock;

  beforeEach(() => {
    registerPromptMock = jest.fn();
    mockServer = {
      registerPrompt: registerPromptMock,
    } as unknown as jest.Mocked<McpServer>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register all EVM prompts with the MCP server', () => {
    registerEVMPrompts(mockServer);

    expect(registerPromptMock).toHaveBeenCalledTimes(10);
  });

  describe('prepare_transfer prompt', () => {
    it('should register prepare_transfer prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'prepare_transfer'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('token transfer');
      expect(call![1].argsSchema).toBeDefined();
    });

    it('should generate correct prompt for native token transfer', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'prepare_transfer'
      );
      const promptFn = call![2];
      const result = promptFn({
        tokenType: 'native',
        recipient: '0x1234567890123456789012345678901234567890',
        amount: '1.5',
        network: 'ethereum',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
      expect(result.messages[0].content.text).toContain('Token Transfer Task');
      expect(result.messages[0].content.text).toContain('get_balance');
      expect(result.messages[0].content.text).toContain('transfer_native');
    });

    it('should generate correct prompt for ERC20 token transfer', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'prepare_transfer'
      );
      const promptFn = call![2];
      const result = promptFn({
        tokenType: 'erc20',
        recipient: '0x1234567890123456789012345678901234567890',
        amount: '100',
        network: 'polygon',
        tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      });

      expect(result.messages[0].content.text).toContain('Token Transfer Task');
      expect(result.messages[0].content.text).toContain('get_token_balance');
      expect(result.messages[0].content.text).toContain('get_allowance');
      expect(result.messages[0].content.text).toContain('transfer_erc20');
    });

    it('should use default network when not provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'prepare_transfer'
      );
      const promptFn = call![2];
      const result = promptFn({
        tokenType: 'native',
        recipient: '0x1234567890123456789012345678901234567890',
        amount: '1.0',
      });

      expect(result.messages[0].content.text).toContain('ethereum');
    });
  });

  describe('diagnose_transaction prompt', () => {
    it('should register diagnose_transaction prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'diagnose_transaction'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('debugging');
    });

    it('should generate correct prompt for transaction diagnosis', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'diagnose_transaction'
      );
      const promptFn = call![2];
      const result = promptFn({
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        network: 'ethereum',
      });

      expect(result.messages[0].content.text).toContain('Transaction Diagnosis');
      expect(result.messages[0].content.text).toContain('get_transaction');
      expect(result.messages[0].content.text).toContain('get_transaction_receipt');
      expect(result.messages[0].content.text).toContain('get_gas_price');
    });

    it('should use default network when not provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'diagnose_transaction'
      );
      const promptFn = call![2];
      const result = promptFn({
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      });

      expect(result.messages[0].content.text).toContain('ethereum');
    });
  });

  describe('analyze_wallet prompt', () => {
    it('should register analyze_wallet prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'analyze_wallet'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('asset');
    });

    it('should generate correct prompt for wallet analysis', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'analyze_wallet'
      );
      const promptFn = call![2];
      const result = promptFn({
        address: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
      });

      expect(result.messages[0].content.text).toContain('Wallet Analysis');
      expect(result.messages[0].content.text).toContain('get_balance');
    });

    it('should handle specific token addresses', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'analyze_wallet'
      );
      const promptFn = call![2];
      const result = promptFn({
        address: '0x1234567890123456789012345678901234567890',
        tokens: '0xaaa,0xbbb,0xccc',
      });

      expect(result.messages[0].content.text).toContain('get_token_balance');
      expect(result.messages[0].content.text).toContain('0xaaa');
      expect(result.messages[0].content.text).toContain('0xbbb');
      expect(result.messages[0].content.text).toContain('0xccc');
    });

    it('should use default network when not provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'analyze_wallet'
      );
      const promptFn = call![2];
      const result = promptFn({
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(result.messages[0].content.text).toContain('ethereum');
    });
  });

  describe('audit_approvals prompt', () => {
    it('should register audit_approvals prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'audit_approvals'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('security');
    });

    it('should generate correct prompt for approval audit', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'audit_approvals'
      );
      const promptFn = call![2];
      const result = promptFn({
        address: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'ethereum',
      });

      expect(result.messages[0].content.text).toContain('Token Approval Audit');
      expect(result.messages[0].content.text).toContain('get_allowance');
    });

    it('should use get_wallet_address when no address provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'audit_approvals'
      );
      const promptFn = call![2];
      const result = promptFn({
        tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      });

      expect(result.messages[0].content.text).toContain('get_wallet_address');
    });
  });

  describe('fetch_and_analyze_abi prompt', () => {
    it('should register fetch_and_analyze_abi prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'fetch_and_analyze_abi'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('ABI');
    });

    it('should generate correct prompt for ABI analysis', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'fetch_and_analyze_abi'
      );
      const promptFn = call![2];
      const result = promptFn({
        contractAddress: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
      });

      expect(result.messages[0].content.text).toContain('ABI Fetch and Analysis');
      expect(result.messages[0].content.text).toContain('get_contract_abi');
    });

    it('should include specific function analysis when findFunction provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'fetch_and_analyze_abi'
      );
      const promptFn = call![2];
      const result = promptFn({
        contractAddress: '0x1234567890123456789012345678901234567890',
        findFunction: 'swap',
      });

      expect(result.messages[0].content.text).toContain('swap');
    });
  });

  describe('explore_contract prompt', () => {
    it('should register explore_contract prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'explore_contract'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('Analyze contract');
    });

    it('should generate correct prompt for contract exploration without ABI', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'explore_contract'
      );
      const promptFn = call![2];
      const result = promptFn({
        contractAddress: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
      });

      expect(result.messages[0].content.text).toContain('Contract Exploration');
      expect(result.messages[0].content.text).toContain('read_contract');
    });

    it('should include ABI fetch when fetchAbi is true', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'explore_contract'
      );
      const promptFn = call![2];
      const result = promptFn({
        contractAddress: '0x1234567890123456789012345678901234567890',
        fetchAbi: 'true',
      });

      expect(result.messages[0].content.text).toContain('get_contract_abi');
    });
  });

  describe('interact_with_contract prompt', () => {
    it('should register interact_with_contract prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'interact_with_contract'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('write operations');
    });

    it('should generate correct prompt for contract interaction', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'interact_with_contract'
      );
      const promptFn = call![2];
      const result = promptFn({
        contractAddress: '0x1234567890123456789012345678901234567890',
        functionName: 'mint',
        network: 'ethereum',
      });

      expect(result.messages[0].content.text).toContain('Smart Contract Interaction');
      expect(result.messages[0].content.text).toContain('mint');
      expect(result.messages[0].content.text).toContain('write_contract');
    });

    it('should include arguments when provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'interact_with_contract'
      );
      const promptFn = call![2];
      const result = promptFn({
        contractAddress: '0x1234567890123456789012345678901234567890',
        functionName: 'transfer',
        args: '0xrecipient,1000',
      });

      expect(result.messages[0].content.text).toContain('0xrecipient');
      expect(result.messages[0].content.text).toContain('1000');
    });

    it('should include value when provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'interact_with_contract'
      );
      const promptFn = call![2];
      const result = promptFn({
        contractAddress: '0x1234567890123456789012345678901234567890',
        functionName: 'deposit',
        value: '1.5',
      });

      expect(result.messages[0].content.text).toContain('1.5 ETH');
    });
  });

  describe('explain_evm_concept prompt', () => {
    it('should register explain_evm_concept prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'explain_evm_concept'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('Explain');
    });

    it('should generate correct prompt for concept explanation', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'explain_evm_concept'
      );
      const promptFn = call![2];
      const result = promptFn({
        concept: 'gas',
      });

      expect(result.messages[0].content.text).toContain('Concept Explanation: gas');
    });
  });

  describe('compare_networks prompt', () => {
    it('should register compare_networks prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'compare_networks'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('Compare');
    });

    it('should generate correct prompt for network comparison', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'compare_networks'
      );
      const promptFn = call![2];
      const result = promptFn({
        networks: 'ethereum,polygon,arbitrum',
      });

      expect(result.messages[0].content.text).toContain('Network Comparison');
      expect(result.messages[0].content.text).toContain('ethereum');
      expect(result.messages[0].content.text).toContain('polygon');
      expect(result.messages[0].content.text).toContain('arbitrum');
    });
  });

  describe('check_network_status prompt', () => {
    it('should register check_network_status prompt with correct schema', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'check_network_status'
      );
      expect(call).toBeDefined();
      expect(call![1].description).toContain('health');
    });

    it('should generate correct prompt for network status check', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'check_network_status'
      );
      const promptFn = call![2];
      const result = promptFn({
        network: 'ethereum',
      });

      expect(result.messages[0].content.text).toContain('Network Status Check');
      expect(result.messages[0].content.text).toContain('get_chain_info');
      expect(result.messages[0].content.text).toContain('get_gas_price');
    });

    it('should use default network when not provided', () => {
      registerEVMPrompts(mockServer);

      const call = registerPromptMock.mock.calls.find(
        (c) => c[0] === 'check_network_status'
      );
      const promptFn = call![2];
      const result = promptFn({});

      expect(result.messages[0].content.text).toContain('ethereum');
    });
  });
});
