/**
 * KeyManager - Secure API Key Encryption
 *
 * Handles encryption and decryption of API keys using AES-256-CBC
 * with PBKDF2 key derivation and vault-specific salts.
 */

import CryptoJS from 'crypto-js';
import { App } from 'obsidian';
import { EncryptionError } from '../types';

export interface EncryptedData {
    ciphertext: string;
    iv: string;
    salt: string;
}

export class KeyManager {
    private app: App;
    private masterPassword: string | null = null;
    private sessionKey: string | null = null;
    private readonly ITERATIONS = 10000;
    private readonly KEY_SIZE = 256 / 32; // 256 bits = 32 bytes = 8 words in CryptoJS

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Set the master password for this session
     * The password is never stored permanently
     */
    setMasterPassword(password: string): void {
        if (!password || password.length < 8) {
            throw new EncryptionError('Master password must be at least 8 characters');
        }

        console.log('KeyManager: Setting master password...');
        this.masterPassword = password;
        // Pre-compute session key for faster operations
        this.sessionKey = this.deriveKey(password, this.getVaultSalt());
        console.log('KeyManager: Master password set successfully');
        console.log('KeyManager: hasMasterPassword():', this.hasMasterPassword());
        console.log('KeyManager: masterPassword length:', this.masterPassword?.length);
    }

    /**
     * Clear the master password from memory
     */
    clearMasterPassword(): void {
        this.masterPassword = null;
        this.sessionKey = null;
    }

    /**
     * Check if master password is set for this session
     */
    hasMasterPassword(): boolean {
        const hasPassword = this.masterPassword !== null;
        console.log('KeyManager: hasMasterPassword() called - result:', hasPassword, 'masterPassword:', this.masterPassword ? 'set' : 'null');
        return hasPassword;
    }

    /**
     * Get the master password (use carefully!)
     */
    getMasterPassword(): string | null {
        return this.masterPassword;
    }

    /**
     * Encrypt an API key
     */
    encrypt(apiKey: string): EncryptedData {
        if (!apiKey) {
            throw new EncryptionError('Cannot encrypt empty API key');
        }

        if (!this.sessionKey) {
            throw new EncryptionError('Master password not set. Call setMasterPassword() first.');
        }

        try {
            // Generate random IV (Initialization Vector)
            const iv = CryptoJS.lib.WordArray.random(128 / 8);

            // Get vault salt
            const salt = this.getVaultSalt();

            // Encrypt using AES-256-CBC
            const encrypted = CryptoJS.AES.encrypt(apiKey, this.sessionKey, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });

            return {
                ciphertext: encrypted.toString(),
                iv: iv.toString(CryptoJS.enc.Base64),
                salt: salt
            };
        } catch (error) {
            throw new EncryptionError('Encryption failed', { originalError: error });
        }
    }

    /**
     * Decrypt an API key
     */
    decrypt(encryptedData: EncryptedData): string {
        if (!encryptedData || !encryptedData.ciphertext) {
            throw new EncryptionError('Invalid encrypted data');
        }

        if (!this.sessionKey) {
            throw new EncryptionError('Master password not set. Call setMasterPassword() first.');
        }

        // Verify the salt matches current vault
        const currentSalt = this.getVaultSalt();
        if (encryptedData.salt !== currentSalt) {
            throw new EncryptionError(
                'This encrypted key was created in a different vault or the vault path has changed. ' +
                'You will need to re-enter your API keys.'
            );
        }

        try {
            // Parse IV from base64
            const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);

            // Decrypt using AES-256-CBC
            const decrypted = CryptoJS.AES.decrypt(
                encryptedData.ciphertext,
                this.sessionKey,
                {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            // Convert to UTF8 string
            const apiKey = decrypted.toString(CryptoJS.enc.Utf8);

            if (!apiKey) {
                throw new EncryptionError('Decryption failed. Password may be incorrect.');
            }

            return apiKey;
        } catch (error) {
            if (error instanceof EncryptionError) {
                throw error;
            }
            throw new EncryptionError('Decryption failed. Password may be incorrect.', { originalError: error });
        }
    }

    /**
     * Verify that a password can decrypt existing data
     * Returns true if password is correct, false otherwise
     */
    async verifyPassword(password: string, testData: EncryptedData): Promise<boolean> {
        try {
            const tempKey = this.deriveKey(password, testData.salt);
            const iv = CryptoJS.enc.Base64.parse(testData.iv);

            const decrypted = CryptoJS.AES.decrypt(
                testData.ciphertext,
                tempKey,
                {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            const result = decrypted.toString(CryptoJS.enc.Utf8);
            return result.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Change master password (re-encrypts all API keys)
     */
    async changePassword(
        oldPassword: string,
        newPassword: string,
        encryptedKeys: EncryptedData[]
    ): Promise<EncryptedData[]> {
        if (newPassword.length < 8) {
            throw new EncryptionError('New password must be at least 8 characters');
        }

        // First, decrypt all keys with old password
        const tempSessionKey = this.sessionKey;
        const tempMasterPassword = this.masterPassword;

        try {
            // Set old password
            this.setMasterPassword(oldPassword);

            // Decrypt all keys
            const decryptedKeys = encryptedKeys.map(data => this.decrypt(data));

            // Set new password
            this.setMasterPassword(newPassword);

            // Re-encrypt all keys
            const reencryptedKeys = decryptedKeys.map(key => this.encrypt(key));

            return reencryptedKeys;
        } catch (error) {
            // Restore original session
            this.sessionKey = tempSessionKey;
            this.masterPassword = tempMasterPassword;
            throw new EncryptionError('Password change failed', { originalError: error });
        }
    }

    /**
     * Derive encryption key from password using PBKDF2
     */
    private deriveKey(password: string, salt: string): string {
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: this.KEY_SIZE,
            iterations: this.ITERATIONS,
            hasher: CryptoJS.algo.SHA256
        });

        return key.toString();
    }

    /**
     * Get vault-specific salt
     * Uses vault path as a unique identifier
     */
    private getVaultSalt(): string {
        // Use vault adapter base path as salt
        // This ensures keys are vault-specific
        // Cast to any to access basePath (available in FileSystemAdapter)
        const adapter = this.app.vault.adapter as any;
        const vaultPath = adapter.basePath || this.app.vault.getName();

        // Hash the path to create a consistent salt
        const salt = CryptoJS.SHA256(vaultPath).toString();

        return salt;
    }

    /**
     * Get vault identifier for display purposes
     */
    getVaultIdentifier(): string {
        const adapter = this.app.vault.adapter as any;
        return adapter.basePath || this.app.vault.getName();
    }

    /**
     * Generate a test encrypted value for password verification
     * This can be stored in settings to verify password on startup
     */
    generatePasswordTest(): EncryptedData {
        const testValue = 'password-verification-test';
        return this.encrypt(testValue);
    }

    /**
     * Verify that the encryption system is working
     */
    async testEncryption(): Promise<boolean> {
        try {
            const testKey = 'test-api-key-123';
            const encrypted = this.encrypt(testKey);
            const decrypted = this.decrypt(encrypted);
            return testKey === decrypted;
        } catch (error) {
            console.error('Encryption test failed:', error);
            return false;
        }
    }

    /**
     * Sanitize an API key for display (show only first/last chars)
     */
    static sanitizeApiKey(apiKey: string, showChars: number = 4): string {
        if (!apiKey || apiKey.length <= showChars * 2) {
            return '****';
        }

        const start = apiKey.substring(0, showChars);
        const end = apiKey.substring(apiKey.length - showChars);
        const middle = '*'.repeat(Math.min(apiKey.length - showChars * 2, 20));

        return `${start}${middle}${end}`;
    }

    /**
     * Validate API key format for a provider
     */
    static validateApiKeyFormat(apiKey: string, provider: string): boolean {
        if (!apiKey) return false;

        switch (provider) {
            case 'anthropic':
                // Anthropic keys start with 'sk-ant-'
                return apiKey.startsWith('sk-ant-') && apiKey.length > 20;

            case 'openai':
                // OpenAI keys start with 'sk-'
                return apiKey.startsWith('sk-') && apiKey.length > 20;

            default:
                // For custom providers, just check it's not empty
                return apiKey.length > 0;
        }
    }
}
