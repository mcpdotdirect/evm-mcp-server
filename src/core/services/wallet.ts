import { type Address, type Hex } from 'viem';
import { privateKeyToAccount, mnemonicToAccount, type HDAccount, type PrivateKeyAccount } from 'viem/accounts';

/**
 * Get the configured account from environment (private key or mnemonic)
 *
 * Configuration options:
 * - EVM_PRIVATE_KEY: Hex private key (with or without 0x prefix)
 * - EVM_MNEMONIC: BIP-39 mnemonic phrase (12 or 24 words)
 * - EVM_ACCOUNT_INDEX: Optional account index for HD wallet derivation (default: 0)
 */
export const getConfiguredAccount = (): HDAccount | PrivateKeyAccount => {
    const privateKey = process.env.EVM_PRIVATE_KEY;
    const mnemonic = process.env.EVM_MNEMONIC;
    const accountIndexStr = process.env.EVM_ACCOUNT_INDEX || '0';
    const accountIndex = parseInt(accountIndexStr, 10);

    // Validate account index
    if (isNaN(accountIndex) || accountIndex < 0 || !Number.isInteger(accountIndex)) {
        throw new Error(
            `Invalid EVM_ACCOUNT_INDEX: "${accountIndexStr}". Must be a non-negative integer.`
        );
    }

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
 *
 * For HDAccount (from mnemonic): extracts private key from HD key
 * For PrivateKeyAccount: returns the original private key
 */
export const getConfiguredPrivateKey = (): Hex => {
    const account = getConfiguredAccount();

    // Check if this is an HDAccount (has getHdKey method)
    if ('getHdKey' in account && typeof account.getHdKey === 'function') {
        const hdKey = account.getHdKey();
        if (!hdKey.privateKey) {
            throw new Error("Unable to derive private key from HD account - no private key in HD key");
        }
        // Convert Uint8Array to hex string (compatible with Bun and Node)
        const privateKeyHex = Array.from(hdKey.privateKey)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        return `0x${privateKeyHex}` as Hex;
    }

    // For PrivateKeyAccount, re-read from environment since we created from it
    if ('source' in account && account.source === 'privateKey') {
        const privateKey = process.env.EVM_PRIVATE_KEY;
        if (privateKey) {
            return (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex;
        }
    }

    throw new Error("Unable to extract private key from account");
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

/**
 * Sign an arbitrary message using the configured wallet
 * @param message The message to sign (can be a string or hex data)
 * @returns The signature as a hex string
 */
export const signMessage = async (message: string): Promise<string> => {
    const account = getConfiguredAccount();

    // Use the account's signMessage method directly
    const signature = await account.signMessage({
        message: message
    });

    return signature;
};

/**
 * Sign typed data (EIP-712) using the configured wallet
 * @param domain The EIP-712 domain
 * @param types The types definition (excluding EIP712Domain)
 * @param primaryType The primary type name
 * @param message The message data to sign
 * @returns The signature as a hex string
 */
export const signTypedData = async (
    domain: {
        name?: string;
        version?: string;
        chainId?: number;
        verifyingContract?: Address;
        salt?: `0x${string}`;
    },
    types: Record<string, Array<{ name: string; type: string }>>,
    primaryType: string,
    message: Record<string, any>
): Promise<string> => {
    const account = getConfiguredAccount();

    // Use the account's signTypedData method
    const signature = await account.signTypedData({
        domain,
        types,
        primaryType,
        message
    });

    return signature;
};
