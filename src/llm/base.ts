/**
 * Base LLM Provider Interface
 *
 * Defines the contract that all LLM providers must implement.
 * Supports both streaming and non-streaming responses.
 */

import { Message, ChatOptions, ChatResponse, StreamChunk } from '../types';

/**
 * Base interface for all LLM providers
 */
export interface ILLMProvider {
    /**
     * Provider identification
     */
    readonly name: string;
    readonly model: string;

    /**
     * Non-streaming chat completion
     */
    chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

    /**
     * Streaming chat completion
     */
    stream(
        messages: Message[],
        onToken: (chunk: StreamChunk) => void,
        options?: ChatOptions
    ): Promise<void>;

    /**
     * Test the provider connection
     */
    test(): Promise<boolean>;

    /**
     * Get provider-specific info
     */
    getInfo(): ProviderInfo;
}

/**
 * Provider information
 */
export interface ProviderInfo {
    name: string;
    model: string;
    supportsStreaming: boolean;
    maxTokens: number;
    temperature: number;
}

/**
 * Abstract base class with common functionality
 */
export abstract class BaseLLMProvider implements ILLMProvider {
    abstract readonly name: string;
    readonly model: string;

    protected apiKey: string;
    protected temperature: number;
    protected maxTokens: number;

    constructor(apiKey: string, model: string, temperature: number = 0.7, maxTokens: number = 4096) {
        if (!apiKey) {
            throw new Error('API key is required');
        }

        this.apiKey = apiKey;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
    }

    /**
     * Abstract methods that must be implemented by concrete providers
     */
    abstract chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
    abstract stream(
        messages: Message[],
        onToken: (chunk: StreamChunk) => void,
        options?: ChatOptions
    ): Promise<void>;

    /**
     * Test connection with a simple query
     */
    async test(): Promise<boolean> {
        try {
            const response = await this.chat([
                { role: 'user', content: 'Hello! Respond with just "OK" if you can read this.' }
            ], { maxTokens: 10 });

            return response.content.toLowerCase().includes('ok');
        } catch (error) {
            console.error(`${this.name} test failed:`, error);
            return false;
        }
    }

    /**
     * Get provider info
     */
    getInfo(): ProviderInfo {
        return {
            name: this.name,
            model: this.model,
            supportsStreaming: true,
            maxTokens: this.maxTokens,
            temperature: this.temperature
        };
    }

    /**
     * Format messages for API (helper for subclasses)
     */
    protected formatMessages(messages: Message[]): Message[] {
        // Some providers don't support system role in the same way
        // Subclasses can override this if needed
        return messages;
    }

    /**
     * Merge options with defaults
     */
    protected mergeOptions(options?: ChatOptions): Required<ChatOptions> {
        return {
            temperature: options?.temperature ?? this.temperature,
            maxTokens: options?.maxTokens ?? this.maxTokens,
            stopSequences: options?.stopSequences ?? [],
            stream: options?.stream ?? false
        };
    }

    /**
     * Handle rate limiting with exponential backoff
     */
    protected async retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Check if it's a rate limit error
                if (error.status === 429 || error.message?.includes('rate limit')) {
                    const delay = baseDelay * Math.pow(2, i);
                    console.warn(`Rate limited, retrying in ${delay}ms...`);
                    await this.delay(delay);
                    continue;
                }

                // For other errors, throw immediately
                throw error;
            }
        }

        throw lastError!;
    }

    /**
     * Delay helper
     */
    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Sanitize API key for logging
     */
    protected sanitizeKey(key: string): string {
        if (key.length <= 8) return '***';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    }
}

/**
 * Factory function to create provider from config
 */
export function createProvider(
    provider: 'anthropic' | 'openai' | 'custom',
    apiKey: string,
    model: string,
    temperature?: number,
    maxTokens?: number
): ILLMProvider {
    // Import will be done dynamically to avoid circular dependencies
    // This is just the interface - actual implementation in llmManager.ts
    throw new Error('Use LLMManager.createProvider() instead');
}