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
            // Decrypt API key
            if (!config.encryptedApiKey) {
                throw new Error('No API key configured');
            }

            console.log(`Initializing provider: ${config.name} (${config.provider})`);

            const encryptedData = JSON.parse(config.encryptedApiKey);
            const apiKey = this.plugin.keyManager.decrypt(encryptedData);

            if (!apiKey) {
                throw new Error('Failed to decrypt API key');
            }

            console.log(`API key decrypted successfully for ${config.name}`);

            // Create provider instance
            const provider = this.createProviderInstance(
                config.provider,
                apiKey,
                config.model,
                config.temperature,
                config.maxTokens
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
     */
    private createProviderInstance(
        providerType: LLMProviderEnum,
        apiKey: string,
        model: string,
        temperature: number,
        maxTokens: number
    ): ILLMProvider {
        switch (providerType) {
            case LLMProviderEnum.ANTHROPIC:
                return new AnthropicProvider(apiKey, model, temperature, maxTokens);

            case LLMProviderEnum.OPENAI:
                return new OpenAIProvider(apiKey, model, temperature, maxTokens);

            case LLMProviderEnum.CUSTOM:
                throw new Error('Custom providers not yet supported');

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
