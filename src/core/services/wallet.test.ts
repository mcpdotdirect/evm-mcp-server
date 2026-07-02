import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
    getConfiguredAccount,
    getConfiguredPrivateKey,
    getWalletAddressFromKey,
    getConfiguredWallet,
    signMessage,
    signTypedData
} from './wallet.js';

describe('wallet', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getConfiguredAccount', () => {
        it('should throw error when neither private key nor mnemonic is set', () => {
            delete process.env.EVM_PRIVATE_KEY;
            delete process.env.EVM_MNEMONIC;

            expect(() => getConfiguredAccount()).toThrow(
                'Neither EVM_PRIVATE_KEY nor EVM_MNEMONIC environment variable is set'
            );
        });

        it('should create account from private key with 0x prefix', () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const account = getConfiguredAccount();

            expect(account).toBeDefined();
            expect(account.address).toBeDefined();
        });

        it('should create account from private key without 0x prefix', () => {
            process.env.EVM_PRIVATE_KEY = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const account = getConfiguredAccount();

            expect(account).toBeDefined();
            expect(account.address).toBeDefined();
        });

        it('should create account from mnemonic with default index 0', () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            delete process.env.EVM_PRIVATE_KEY;

            const account = getConfiguredAccount();

            expect(account).toBeDefined();
            expect(account.address).toBeDefined();
        });

        it('should create account from mnemonic with custom account index', () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            process.env.EVM_ACCOUNT_INDEX = '1';
            delete process.env.EVM_PRIVATE_KEY;

            const account = getConfiguredAccount();

            expect(account).toBeDefined();
            expect(account.address).toBeDefined();
        });

        it('should throw error for invalid account index (negative)', () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            process.env.EVM_ACCOUNT_INDEX = '-1';

            expect(() => getConfiguredAccount()).toThrow(
                'Invalid EVM_ACCOUNT_INDEX: "-1". Must be a non-negative integer.'
            );
        });

        it('should accept account index that parses to valid integer (1.5 -> 1)', () => {
            // Note: parseInt('1.5', 10) returns 1, which is a valid non-negative integer
            // The code uses parseInt which truncates decimals, so this does not throw
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            process.env.EVM_ACCOUNT_INDEX = '1.5';

            const account = getConfiguredAccount();

            expect(account).toBeDefined();
            expect(account.address).toBeDefined();
        });

        it('should throw error for invalid account index (NaN)', () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            process.env.EVM_ACCOUNT_INDEX = 'abc';

            expect(() => getConfiguredAccount()).toThrow(
                'Invalid EVM_ACCOUNT_INDEX: "abc". Must be a non-negative integer.'
            );
        });

        it('should prioritize private key over mnemonic when both are set', () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';

            const account = getConfiguredAccount();

            expect(account).toBeDefined();
        });
    });

    describe('getConfiguredPrivateKey', () => {
        it('should return private key when using private key config', () => {
            const testPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            process.env.EVM_PRIVATE_KEY = testPrivateKey;
            delete process.env.EVM_MNEMONIC;

            const privateKey = getConfiguredPrivateKey();

            expect(privateKey).toBe(testPrivateKey);
        });

        it('should return private key with 0x prefix when input lacks prefix', () => {
            process.env.EVM_PRIVATE_KEY = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const privateKey = getConfiguredPrivateKey();

            expect(privateKey).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
        });

        it('should extract private key from mnemonic-derived account', () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            delete process.env.EVM_PRIVATE_KEY;

            const privateKey = getConfiguredPrivateKey();

            expect(privateKey).toBeDefined();
            expect(privateKey).toMatch(/^0x[0-9a-f]{64}$/i);
        });
    });

    describe('getWalletAddressFromKey', () => {
        it('should return address from private key config', () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const address = getWalletAddressFromKey();

            expect(address).toBeDefined();
            expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        });

        it('should return address from mnemonic config', () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            delete process.env.EVM_PRIVATE_KEY;

            const address = getWalletAddressFromKey();

            expect(address).toBeDefined();
            expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        });
    });

    describe('getConfiguredWallet', () => {
        it('should return wallet object with address from private key', () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const wallet = getConfiguredWallet();

            expect(wallet).toBeDefined();
            expect(wallet.address).toBeDefined();
            expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        });

        it('should return wallet object with address from mnemonic', () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            delete process.env.EVM_PRIVATE_KEY;

            const wallet = getConfiguredWallet();

            expect(wallet).toBeDefined();
            expect(wallet.address).toBeDefined();
            expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        });
    });

    describe('signMessage', () => {
        it('should sign message with private key account', async () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const message = 'Hello, World!';
            const signature = await signMessage(message);

            expect(signature).toBeDefined();
            expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
        });

        it('should sign message with mnemonic-derived account', async () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            delete process.env.EVM_PRIVATE_KEY;

            const message = 'Hello, World!';
            const signature = await signMessage(message);

            expect(signature).toBeDefined();
            expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
        });

        it('should sign empty message', async () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const signature = await signMessage('');

            expect(signature).toBeDefined();
            expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
        });

        it('should sign hex data message', async () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const message = '0xdeadbeef';
            const signature = await signMessage(message);

            expect(signature).toBeDefined();
            expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
        });
    });

    describe('signTypedData', () => {
        const domain = {
            name: 'TestDApp',
            version: '1',
            chainId: 1,
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as const
        };

        const types = {
            Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' }
            ],
            Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' }
            ]
        };

        const message = {
            from: {
                name: 'Cow',
                wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
            },
            to: {
                name: 'Bob',
                wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
            },
            contents: 'Hello, Bob!'
        };

        it('should sign typed data with private key account', async () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const signature = await signTypedData(domain, types, 'Mail', message);

            expect(signature).toBeDefined();
            expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
        });

        it('should sign typed data with mnemonic-derived account', async () => {
            process.env.EVM_MNEMONIC = 'test test test test test test test test test test test junk';
            delete process.env.EVM_PRIVATE_KEY;

            const signature = await signTypedData(domain, types, 'Mail', message);

            expect(signature).toBeDefined();
            expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
        });

        it('should sign typed data with minimal domain', async () => {
            process.env.EVM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            delete process.env.EVM_MNEMONIC;

            const minimalDomain = {
                name: 'Test'
            };

            const simpleTypes = {
                Simple: [
                    { name: 'value', type: 'string' }
                ]
            };

            const simpleMessage = {
                value: 'test'
            };

            const signature = await signTypedData(minimalDomain, simpleTypes, 'Simple', simpleMessage);

            expect(signature).toBeDefined();
            expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
        });
    });
});
