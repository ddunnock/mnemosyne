/**
 * LLM Manager
 *
 * Central coordinator for all LLM providers.
 * Handles provider instantiation, API key decryption, and provider selection.
 */

import { Notice } from 'obsidian';
import { ILLMProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { LLMConfig, Message, ChatOptions, ChatResponse, StreamChunk } from '../types';
import { LLMError } from '../types';
import { LLMProvider as LLMProviderEnum } from '../constants';
import RiskManagementPlugin from '../main';

export class LLMManager {
    private plugin: RiskManagementPlugin;
    private providers: Map<string, ILLMProvider> = new Map();
    private initialized: boolean = false;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
    }

    /**
     * Initialize all configured LLM providers
     */
    async initialize(): Promise<void> {
        try {
            console.log('Initializing LLM Manager...');

            // Clear existing providers
            this.providers.clear();

            // Load and initialize each configured provider
            for (const config of this.plugin.settings.llmConfigs) {
                if (!config.enabled) {
                    console.log(`Skipping disabled provider: ${config.name}`);
                    continue;
                }

                try {
                    await this.initializeProvider(config);
                    console.log(`✓ Initialized provider: ${config.name}`);
                } catch (error: any) {
                    console.error(`✗ Failed to initialize ${config.name}:`, error);
                    new Notice(`Failed to initialize ${config.name}: ${error.message}`);
                }
            }

            this.initialized = true;
            console.log(`✓ LLM Manager initialized with ${this.providers.size} providers`);
        } catch (error: any) {
            throw new LLMError('Failed to initialize LLM Manager', {
                originalError: error
            });
        }
    }

    /**
     * Initialize a single provider from config
     */
    private async initializeProvider(config: LLMConfig): Promise<void> {
        try {
            console.log(`Initializing provider: ${config.name} (${config.provider})`);
            console.log(`  - Config ID: ${config.id}`);
            console.log(`  - Encrypted API key exists: ${!!config.encryptedApiKey}`);
            console.log(`  - Encrypted API key length: ${config.encryptedApiKey?.length || 0}`);

            // Decrypt API key
            if (!config.encryptedApiKey || config.encryptedApiKey.trim() === '') {
                throw new Error(`No API key configured for ${config.name}. Please configure an API key in settings.`);
            }

            let encryptedData;
            try {
                encryptedData = JSON.parse(config.encryptedApiKey);
            } catch (parseError) {
                console.error('Failed to parse encrypted API key:', parseError);
                throw new Error(`Invalid encrypted API key format for ${config.name}`);
            }

            // Check if KeyManager is ready
            if (!this.plugin.keyManager || !this.plugin.keyManager.hasMasterPassword()) {
                throw new Error(`Master password not set. Please set up your master password in settings before initializing providers.`);
            }

            let apiKey;
            try {
                apiKey = this.plugin.keyManager.decrypt(encryptedData);
            } catch (decryptError) {
                console.error('Decryption failed:', decryptError);
                throw new Error(`Failed to decrypt API key for ${config.name}. Your master password may have changed.`);
            }

            if (!apiKey || apiKey.trim() === '') {
                throw new Error(`Decrypted API key is empty for ${config.name}`);
            }

            console.log(`API key decrypted successfully for ${config.name}`);

            // Create provider instance
            const provider = this.createProviderInstance(
                config.provider,
                apiKey,
                config.model,
                config.temperature,
                config.maxTokens,
                config.baseUrl  // Pass custom base URL for local/enterprise LLMs
            );

            console.log(`Provider instance created for ${config.name}`);

            // Store provider
            this.providers.set(config.id, provider);

            console.log(`✓ Provider ${config.name} initialized successfully`);
        } catch (error: any) {
            console.error(`Error initializing ${config.name}:`, error);
            throw new LLMError(`Failed to initialize provider ${config.name}`, {
                originalError: error,
                configId: config.id,
                details: error.message
            });
        }
    }

    /**
     * Create provider instance based on type
     * ✨ ENHANCED: Now supports custom base URLs for local/enterprise LLMs
     */
    private createProviderInstance(
        providerType: LLMProviderEnum,
        apiKey: string,
        model: string,
        temperature: number,
        maxTokens: number,
        baseUrl?: string
    ): ILLMProvider {
        switch (providerType) {
            case LLMProviderEnum.ANTHROPIC:
                return new AnthropicProvider(apiKey, model, temperature, maxTokens);

            case LLMProviderEnum.OPENAI:
                // OpenAI with optional custom base URL
                return new OpenAIProvider(apiKey, model, temperature, maxTokens, baseUrl);

            case LLMProviderEnum.CUSTOM:
                // Custom OpenAI-compatible endpoints (Open WebUI, Ollama, LM Studio, etc.)
                if (!baseUrl) {
                    throw new Error('Custom provider requires a base URL');
                }
                console.log(`🔧 Creating custom OpenAI-compatible provider: ${baseUrl}`);
                return new OpenAIProvider(apiKey, model, temperature, maxTokens, baseUrl);

            default:
                throw new Error(`Unknown provider type: ${providerType}`);
        }
    }

    /**
     * Get provider by config ID
     */
    getProvider(configId: string): ILLMProvider | null {
        return this.providers.get(configId) || null;
    }

    /**
     * Get provider by name (for convenience)
     */
    getProviderByName(name: string): ILLMProvider | null {
        const config = this.plugin.settings.llmConfigs.find(c => c.name === name);
        return config ? this.getProvider(config.id) : null;
    }

    /**
     * Get all initialized providers
     */
    getAllProviders(): Array<{ id: string; config: LLMConfig; provider: ILLMProvider }> {
        return Array.from(this.providers.entries()).map(([id, provider]) => {
            const config = this.plugin.settings.llmConfigs.find(c => c.id === id)!;
            return { id, config, provider };
        });
    }

    /**
     * Chat with a specific provider
     */
    async chat(
        configId: string,
        messages: Message[],
        options?: ChatOptions
    ): Promise<ChatResponse> {
        if (!this.initialized) {
            throw new LLMError('LLM Manager not initialized');
        }

        const provider = this.getProvider(configId);
        if (!provider) {
            throw new LLMError(`Provider not found: ${configId}`);
        }

        try {
            return await provider.chat(messages, options);
        } catch (error: any) {
            throw new LLMError(`Chat failed with provider ${configId}`, {
                originalError: error,
                configId
            });
        }
    }

    /**
     * Stream chat with a specific provider
     */
    async stream(
        configId: string,
        messages: Message[],
        onToken: (chunk: StreamChunk) => void,
        options?: ChatOptions
    ): Promise<void> {
        if (!this.initialized) {
            throw new LLMError('LLM Manager not initialized');
        }

        const provider = this.getProvider(configId);
        if (!provider) {
            throw new LLMError(`Provider not found: ${configId}`);
        }

        try {
            await provider.stream(messages, onToken, options);
        } catch (error: any) {
            throw new LLMError(`Streaming failed with provider ${configId}`, {
                originalError: error,
                configId
            });
        }
    }

    /**
     * Test a specific provider
     */
    async testProvider(configId: string): Promise<boolean> {
        if (!this.initialized) {
            throw new LLMError('LLM Manager not initialized');
        }

        const provider = this.getProvider(configId);
        if (!provider) {
            throw new LLMError(`Provider not found: ${configId}`);
        }

        try {
            return await provider.test();
        } catch (error: any) {
            console.error(`Test failed for provider ${configId}:`, error);
            return false;
        }
    }

    /**
     * Test all providers
     */
    async testAllProviders(): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        for (const [id, provider] of this.providers.entries()) {
            try {
                const result = await provider.test();
                results.set(id, result);
            } catch (error) {
                results.set(id, false);
            }
        }

        return results;
    }

    /**
     * Reload a specific provider (after config change)
     */
    async reloadProvider(configId: string): Promise<void> {
        const config = this.plugin.settings.llmConfigs.find(c => c.id === configId);

        if (!config) {
            throw new LLMError(`Config not found: ${configId}`);
        }

        // Remove old provider
        this.providers.delete(configId);

        // Initialize new provider if enabled
        if (config.enabled) {
            await this.initializeProvider(config);
            console.log(`✓ Reloaded provider: ${config.name}`);
        } else {
            console.log(`Removed disabled provider: ${config.name}`);
        }
    }

    /**
     * Reload all providers (after settings change)
     */
    async reloadAllProviders(): Promise<void> {
        await this.initialize();
    }

    /**
     * Get provider statistics
     */
    getStats(): {
        totalProviders: number;
        enabledProviders: number;
        initializedProviders: number;
        providers: Array<{
            id: string;
            name: string;
            provider: string;
            model: string;
            enabled: boolean;
            initialized: boolean;
        }>;
    } {
        const stats = {
            totalProviders: this.plugin.settings.llmConfigs.length,
            enabledProviders: this.plugin.settings.llmConfigs.filter(c => c.enabled).length,
            initializedProviders: this.providers.size,
            providers: this.plugin.settings.llmConfigs.map(config => ({
                id: config.id,
                name: config.name,
                provider: config.provider,
                model: config.model,
                enabled: config.enabled,
                initialized: this.providers.has(config.id)
            }))
        };

        return stats;
    }

    /**
     * Check if manager is ready
     */
    isReady(): boolean {
        return this.initialized && this.providers.size > 0;
    }

    /**
     * Check if a specific provider is ready
     */
    hasProvider(configId: string): boolean {
        return this.providers.has(configId);
    }

    /**
     * Get recommended models for a provider type
     */
    static getRecommendedModels(provider: LLMProviderEnum): Array<{ value: string; label: string }> {
        switch (provider) {
            case LLMProviderEnum.ANTHROPIC:
                return AnthropicProvider.getRecommendedModels();
            case LLMProviderEnum.OPENAI:
                return OpenAIProvider.getRecommendedModels();
            default:
                return [];
        }
    }

    /**
     * Cleanup (call on plugin unload)
     */
    cleanup(): void {
        this.providers.clear();
        this.initialized = false;
        console.log('LLM Manager cleaned up');
    }
}
