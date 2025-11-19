import { type Address, type Hex } from 'viem';
import { privateKeyToAccount, mnemonicToAccount } from 'viem/accounts';

/**
 * Get the configured account from environment (private key or mnemonic)
 * 
 * Configuration options:
 * - EVM_PRIVATE_KEY: Hex private key (with or without 0x prefix)
 * - EVM_MNEMONIC: BIP-39 mnemonic phrase (12 or 24 words)
 * - EVM_ACCOUNT_INDEX: Optional account index for HD wallet derivation (default: 0)
 */
export const getConfiguredAccount = () => {
    const privateKey = process.env.EVM_PRIVATE_KEY;
    const mnemonic = process.env.EVM_MNEMONIC;
    const accountIndex = parseInt(process.env.EVM_ACCOUNT_INDEX || '0');

    if (privateKey) {
        // Use private key if provided
        const key = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex;
        return privateKeyToAccount(key);
    } else if (mnemonic) {
        // Use mnemonic if provided
        return mnemonicToAccount(mnemonic, { accountIndex });
    } else {
        throw new Error(
            "Neither EVM_PRIVATE_KEY nor EVM_MNEMONIC environment variable is set. " +
            "Configure one of them to enable write operations.\n" +
            "- EVM_PRIVATE_KEY: Your private key in hex format\n" +
            "- EVM_MNEMONIC: Your 12 or 24 word mnemonic phrase\n" +
            "- EVM_ACCOUNT_INDEX: (Optional) Account index for HD wallet (default: 0)"
        );
    }
};

/**
 * Helper to get the configured private key (for services that need it)
 */
export const getConfiguredPrivateKey = (): Hex => {
    const account = getConfiguredAccount();
    // For mnemonic-based accounts, we need to extract the private key
    // Viem accounts have a privateKey property but it's not always in the type definition
    const accountWithKey = account as any;
    if (!accountWithKey.privateKey) {
        throw new Error("Unable to extract private key from account");
    }
    return accountWithKey.privateKey;
};

/**
 * Helper to get wallet address
 */
export const getWalletAddressFromKey = (): Address => {
    const account = getConfiguredAccount();
    return account.address;
};

/**
 * Helper to get configured wallet object
 */
export const getConfiguredWallet = (): { address: Address } => {
    return { address: getWalletAddressFromKey() };
};
