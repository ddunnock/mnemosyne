/**
 * OpenAI GPT Provider - Using OpenAI SDK
 *
 * Uses the same pattern as embeddings.ts which works successfully
 *
 * Model-specific requirements:
 * - GPT-5: Uses max_completion_tokens, temperature locked at 1.0
 * - GPT-4/3.5: Uses max_tokens, custom temperature supported
 */

import OpenAI from 'openai';
import { BaseLLMProvider } from './base';
import { Message, ChatOptions, ChatResponse, StreamChunk } from '../types';
import { LLMError } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
    readonly name = 'OpenAI GPT';
    private client: OpenAI;

    constructor(apiKey: string, model: string, temperature: number = 0.7, maxTokens: number = 4096) {
        super(apiKey, model, temperature, maxTokens);

        // Initialize OpenAI client - same pattern as embeddings.ts
        this.client = new OpenAI({
            apiKey,
            dangerouslyAllowBrowser: true
        });
    }

    /**
     * Non-streaming chat completion
     */
    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        const mergedOptions = this.mergeOptions(options);

        try {
            // Prepare request parameters
            const requestParams: any = {
                model: this.model,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
            };

            // Handle model-specific requirements
            if (this.isGPT5()) {
                // GPT-5 requires max_completion_tokens and temperature must be 1.0
                requestParams.max_completion_tokens = mergedOptions.maxTokens;
                requestParams.temperature = 1.0;
                console.log(`GPT-5 detected - Using max_completion_tokens: ${mergedOptions.maxTokens}, forcing temperature to 1.0`);
            } else {
                // Standard models use max_tokens and custom temperature
                requestParams.max_tokens = mergedOptions.maxTokens;
                requestParams.temperature = mergedOptions.temperature;
                console.log(`Standard model - Using max_tokens: ${mergedOptions.maxTokens}, temperature: ${mergedOptions.temperature}`);
            }

            // Add stop sequences if provided
            if (mergedOptions.stopSequences && mergedOptions.stopSequences.length > 0) {
                requestParams.stop = mergedOptions.stopSequences;
            }

            console.log('OpenAI request params:', JSON.stringify(requestParams, null, 2));

            // Make API call using OpenAI SDK
            const response = await this.client.chat.completions.create(requestParams);

            console.log('OpenAI response received:', {
                model: response.model,
                choices: response.choices?.length,
                usage: response.usage,
                finishReason: response.choices?.[0]?.finish_reason
            });

            // Extract content from response
            const choice = response.choices?.[0];
            const content = choice?.message?.content;

            if (!content) {
                console.error('OpenAI response structure:', JSON.stringify(response, null, 2));

                // Check if GPT-5 used all tokens for reasoning
                if (this.isGPT5() && choice?.finish_reason === 'length') {
                    throw new Error(
                        'GPT-5 used all tokens for reasoning. Increase max_completion_tokens or simplify the prompt.'
                    );
                }

                throw new Error('No content in OpenAI response');
            }

            return {
                content,
                usage: response.usage ? {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens
                } : {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                model: response.model,
                finishReason: choice.finish_reason
            };
        } catch (error: any) {
            console.error('OpenAI chat error:', error);

            // Handle specific OpenAI errors
            if (error.status === 401) {
                throw new LLMError('Invalid OpenAI API key', {
                    originalError: error,
                    provider: 'openai',
                    model: this.model
                });
            }

            if (error.status === 429) {
                throw new LLMError('OpenAI rate limit exceeded. Please try again later.', {
                    originalError: error,
                    provider: 'openai',
                    model: this.model
                });
            }

            if (error.status === 404) {
                throw new LLMError(`Model '${this.model}' not found. Please check the model name.`, {
                    originalError: error,
                    provider: 'openai',
                    model: this.model
                });
            }

            throw new LLMError(`OpenAI chat failed: ${error.message}`, {
                originalError: error,
                provider: 'openai',
                model: this.model
            });
        }
    }

    /**
     * Streaming chat completion
     */
    async stream(
        messages: Message[],
        onToken: (chunk: StreamChunk) => void,
        options?: ChatOptions
    ): Promise<void> {
        const mergedOptions = this.mergeOptions(options);

        try {
            console.log(`OpenAI streaming chat - Model: ${this.model}`);

            const requestParams: any = {
                model: this.model,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                stream: true,
            };

            // Handle model-specific requirements
            if (this.isGPT5()) {
                requestParams.max_completion_tokens = mergedOptions.maxTokens;
                requestParams.temperature = 1.0;
            } else {
                requestParams.max_tokens = mergedOptions.maxTokens;
                requestParams.temperature = mergedOptions.temperature;
            }

            // Create stream with proper typing
            const stream = await this.client.chat.completions.create(requestParams) as any;

            // Process stream
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                const done = chunk.choices[0]?.finish_reason !== null;

                onToken({ content, done });

                if (done) break;
            }
        } catch (error: any) {
            console.error('OpenAI streaming error:', error);
            throw new LLMError(`OpenAI streaming failed: ${error.message}`, {
                originalError: error,
                provider: 'openai',
                model: this.model
            });
        }
    }

    /**
     * Check if current model is GPT-5
     */
    private isGPT5(): boolean {
        return this.model.toLowerCase().includes('gpt-5');
    }

    /**
     * Test connection
     */
    async test(): Promise<boolean> {
        try {
            console.log('Testing OpenAI connection...');

            // GPT-5 needs more tokens due to reasoning token usage
            const maxTokens = this.isGPT5() ? 1000 : 10;

            const response = await this.chat([
                { role: 'user', content: 'Respond with just "OK"' }
            ], { maxTokens });

            const isOk = response.content.toLowerCase().includes('ok');

            if (isOk) {
                console.log('✓ OpenAI connection test passed');
            } else {
                console.warn('⚠ OpenAI test returned unexpected response:', response.content);
            }

            return isOk;
        } catch (error: any) {
            console.error('✗ OpenAI test failed:', error.message);
            return false;
        }
    }

    /**
     * Get recommended models
     */
    static getRecommendedModels(): Array<{ value: string; label: string }> {
        return [
            { value: 'gpt-5', label: 'GPT-5 (Latest - Preview Access)' },
            { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo (Most Capable)' },
            { value: 'gpt-4', label: 'GPT-4 (Powerful & Reliable)' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast & Economical)' }
        ];
    }

    /**
     * Check if a model supports function calling
     */
    static supportsFunctions(model: string): boolean {
        return model.startsWith('gpt-4') || model.startsWith('gpt-3.5-turbo');
    }

    /**
     * Check if a model supports vision
     */
    static supportsVision(model: string): boolean {
        return model.includes('vision') ||
            model === 'gpt-4-turbo-preview' ||
            model === 'gpt-4-turbo';
    }
}
