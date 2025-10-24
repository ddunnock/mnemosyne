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
import { BaseLLMProvider, ToolDefinition } from './base';
import { Message, ChatOptions, ChatResponse, StreamChunk } from '../types';
import { LLMError } from '../types';
import { requestUrl } from 'obsidian';

/**
 * Custom fetch implementation using Obsidian's requestUrl to bypass CORS
 * Also handles Azure/L3Harris-style endpoints with custom headers
 */
async function obsidianFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
        let urlString = url.toString();
        const method = init?.method || 'GET';
        const body = init?.body as string;

        // Convert Headers object to plain object
        let headers: Record<string, string> = {};
        if (init?.headers) {
            if (init.headers instanceof Headers) {
                init.headers.forEach((value, key) => {
                    headers[key] = value;
                });
            } else if (Array.isArray(init.headers)) {
                // Handle [key, value] array format
                for (const [key, value] of init.headers) {
                    headers[key] = value;
                }
            } else {
                headers = init.headers as Record<string, string>;
            }
        }

        // Handle Azure/L3Harris-style endpoints that use "api-key" header
        // instead of "Authorization: Bearer"
        const isL3Harris = urlString.includes('l3harris.com') ||
                          urlString.includes('/cgp/openai/') ||
                          urlString.includes('/deployments/');

        // Add api-version query parameter for L3Harris/Azure-style endpoints
        if (isL3Harris && !urlString.includes('api-version=')) {
            const separator = urlString.includes('?') ? '&' : '?';
            urlString = `${urlString}${separator}api-version=2024-06-01`;
        }

        // Check for Authorization header (case-insensitive) and convert to api-key for L3Harris
        const authHeader = headers['Authorization'] || headers['authorization'];
        if (authHeader && isL3Harris) {
            const apiKey = authHeader.replace('Bearer ', '').trim();

            // Create new headers object without Authorization
            const newHeaders = { ...headers };
            delete newHeaders['Authorization'];
            delete newHeaders['authorization'];
            newHeaders['api-key'] = apiKey;
            headers = newHeaders;
        }

        const response = await requestUrl({
            url: urlString,
            method: method,
            headers: headers,
            body: body,
            contentType: headers['Content-Type'] || headers['content-type'] || 'application/json',
            throw: false // Don't throw on non-200 status codes
        });

        // Convert Obsidian response to standard Response object
        const responseHeaders = new Headers(response.headers);

        return new Response(response.text, {
            status: response.status,
            statusText: `${response.status}`,
            headers: responseHeaders
        });
    } catch (error) {
        console.error('[ObsidianFetch] Error:', error);
        throw error;
    }
}

export class OpenAIProvider extends BaseLLMProvider {
    readonly name = 'OpenAI GPT';
    readonly supportsFunctionCalling = true; // ✨ NEW: Enable function calling
    private client: OpenAI;
    private customBaseUrl?: string;

    constructor(apiKey: string, model: string, temperature: number = 0.7, maxTokens: number = 4096, baseUrl?: string) {
        super(apiKey, model, temperature, maxTokens);
        this.customBaseUrl = baseUrl;

        // Initialize OpenAI client with optional custom base URL
        // This enables:
        // - Open WebUI (corporate LLM interfaces)
        // - Local LLMs (Ollama, LM Studio, etc.)
        // - Any OpenAI-compatible API endpoint
        const clientConfig: any = {
            apiKey,
            dangerouslyAllowBrowser: true,
            // Use Obsidian's requestUrl to bypass CORS restrictions
            fetch: obsidianFetch
        };

        if (baseUrl) {
            // Handle Azure/L3Harris-style endpoints
            // Format: https://api-lhxgpt.ai.l3harris.com/cgp/openai/deployments/{model}/chat/completions
            if (baseUrl.includes('l3harris.com') || baseUrl.includes('/deployments/')) {
                // Extract deployment name from model (e.g., "gpt-4o")
                const deployment = model;

                // Build the full base URL with deployment
                // The OpenAI SDK will append /chat/completions to this
                clientConfig.baseURL = `${baseUrl}/cgp/openai/deployments/${deployment}`;
                console.log(`🔗 Using L3Harris/Azure-style endpoint: ${clientConfig.baseURL}`);
            } else {
                clientConfig.baseURL = baseUrl;
                console.log(`🔗 Using custom OpenAI-compatible endpoint: ${baseUrl}`);
            }
        }

        console.log('✓ OpenAI client configured with Obsidian fetch (CORS bypass enabled)');
        this.client = new OpenAI(clientConfig);
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
                } : undefined,
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
     * ✨ NEW: Chat with function calling support
     */
    async chatWithFunctions(
        messages: Message[],
        tools: unknown[],
        options?: ChatOptions
    ): Promise<ChatResponse> {
        const mergedOptions = this.mergeOptions(options);

        try {
            // Prepare request parameters
            const requestParams: any = {
                model: this.model,
                messages: messages.map(msg => {
                    // Handle function role messages
                    if (msg.role === 'function') {
                        return {
                            role: 'function',
                            name: msg.name || 'unknown',
                            content: msg.content
                        };
                    }

                    // Handle assistant with function call
                    if (msg.functionCall) {
                        return {
                            role: 'assistant',
                            content: msg.content || null,
                            function_call: {
                                name: msg.functionCall.name,
                                arguments: JSON.stringify(msg.functionCall.arguments)
                            }
                        };
                    }

                    return {
                        role: msg.role,
                        content: msg.content
                    };
                }),
                tools: tools, // OpenAI expects tools array
                tool_choice: 'auto' // Let the model decide when to use functions
            };

            // Handle model-specific requirements
            if (this.isGPT5()) {
                requestParams.max_completion_tokens = mergedOptions.maxTokens;
                requestParams.temperature = 1.0;
            } else {
                requestParams.max_tokens = mergedOptions.maxTokens;
                requestParams.temperature = mergedOptions.temperature;
            }

            console.log('OpenAI function calling request:', {
                model: this.model,
                toolCount: Array.isArray(tools) ? tools.length : 0
            });

            // Make API call
            const response = await this.client.chat.completions.create(requestParams);

            console.log('OpenAI function calling response:', {
                model: response.model,
                finishReason: response.choices?.[0]?.finish_reason,
                hasToolCalls: !!response.choices?.[0]?.message?.tool_calls
            });

            const choice = response.choices?.[0];
            const message = choice?.message;

            // Check if model wants to call a function
            if (message?.tool_calls && message.tool_calls.length > 0) {
                const toolCall = message.tool_calls[0];

                // Type assertion to access function property
                const func = (toolCall as any).function;
                if (!func) {
                    throw new Error('Tool call missing function property');
                }

                // ✨ FIXED: Add robust JSON parsing with error handling
                let parsedArguments;
                try {
                    parsedArguments = JSON.parse(func.arguments);
                } catch (parseError) {
                    console.error('Failed to parse function arguments:', parseError);
                    console.error('Function name:', func.name);
                    console.error('Raw arguments string (first 500 chars):', func.arguments.substring(0, 500));
                    console.error('Raw arguments string (last 500 chars):', func.arguments.substring(Math.max(0, func.arguments.length - 500)));
                    console.error('Arguments length:', func.arguments.length);

                    // Try to repair common JSON issues
                    try {
                        // Remove any trailing commas before closing braces/brackets
                        let repairedJson = func.arguments
                            .replace(/,(\s*[}\]])/g, '$1')
                            // Remove any control characters that might break JSON
                            .replace(/[\x00-\x1F\x7F]/g, '');

                        parsedArguments = JSON.parse(repairedJson);
                        console.log('✓ JSON repaired successfully');
                    } catch (repairError) {
                        // If repair fails, throw a more helpful error
                        throw new LLMError(
                            `Failed to parse function arguments. The generated content may be too large or contain invalid characters. ` +
                            `Function: ${func.name}, Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                            {
                                originalError: parseError,
                                provider: 'openai',
                                model: this.model,
                                functionName: func.name,
                                argumentsLength: func.arguments.length,
                                argumentsPreview: func.arguments.substring(0, 200) + '...'
                            }
                        );
                    }
                }

                return {
                    content: message.content || '',
                    functionCall: {
                        name: func.name,
                        arguments: parsedArguments
                    },
                    usage: response.usage ? {
                        promptTokens: response.usage.prompt_tokens,
                        completionTokens: response.usage.completion_tokens,
                        totalTokens: response.usage.total_tokens
                    } : undefined,
                    model: response.model,
                    finishReason: choice.finish_reason
                };
            }

            // Normal response without function call
            return {
                content: message?.content || '',
                usage: response.usage ? {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens
                } : undefined,
                model: response.model,
                finishReason: choice.finish_reason
            };
        } catch (error: any) {
            console.error('OpenAI function calling error:', error);

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

            throw new LLMError(`OpenAI function calling failed: ${error.message}`, {
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
