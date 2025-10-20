/**
 * Anthropic Claude Provider - Native HTTPS Implementation
 *
 * Uses Node.js https module directly instead of SDK to avoid CORS/fetch issues
 */

import { BaseLLMProvider, ToolDefinition } from './base';
import { Message, ChatOptions, ChatResponse, StreamChunk } from '../types';
import { LLMError } from '../types';

import * as https from 'https';

export class AnthropicProvider extends BaseLLMProvider {
    readonly name = 'Anthropic Claude';
    readonly supportsFunctionCalling = true; // ✨ NEW: Enable function calling

    constructor(apiKey: string, model: string, temperature: number = 0.7, maxTokens: number = 4096) {
        super(apiKey, model, temperature, maxTokens);
    }

    /**
     * Non-streaming chat completion
     */
    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        const mergedOptions = this.mergeOptions(options);

        try {
            const { systemMessage, userMessages } = this.formatMessagesForClaude(messages);

            interface AnthropicRequestBody {
                model: string;
                max_tokens: number;
                temperature: number;
                messages: Array<{ role: 'user' | 'assistant'; content: string }>;
                system?: string;
                stop_sequences?: string[];
            }

            const body: AnthropicRequestBody = {
                model: this.model,
                max_tokens: mergedOptions.maxTokens,
                temperature: mergedOptions.temperature,
                messages: userMessages
            };

            if (systemMessage) {
                body.system = systemMessage;
            }

            if (mergedOptions.stopSequences.length > 0) {
                body.stop_sequences = mergedOptions.stopSequences;
            }

            const responseText = await this.makeHttpsRequest(
                'https://api.anthropic.com/v1/messages',
                'POST',
                {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                JSON.stringify(body)
            );

            const json = JSON.parse(responseText);

            interface AnthropicContentBlock {
                type: string;
                text: string;
            }

            interface AnthropicResponse {
                content?: AnthropicContentBlock[];
                usage?: {
                    input_tokens?: number;
                    output_tokens?: number;
                };
                model?: string;
                stop_reason?: string;
            }

            const response = json as AnthropicResponse;
            
            // Extract text content
            const content = response.content
                ?.filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('') || '';

            return {
                content,
                usage: {
                    promptTokens: response.usage?.input_tokens || 0,
                    completionTokens: response.usage?.output_tokens || 0,
                    totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
                },
                model: response.model || this.model,
                finishReason: response.stop_reason || 'complete'
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new LLMError(`Anthropic chat failed: ${errorMessage}`, {
                originalError: error,
                provider: 'anthropic',
                model: this.model
            });
        }
    }

    /**
     * Streaming chat completion (not implemented in native version)
     */
    async stream(
        messages: Message[],
        onToken: (chunk: StreamChunk) => void,
        options?: ChatOptions
    ): Promise<void> {
        // For now, fallback to non-streaming
        const response = await this.chat(messages, options);

        // Simulate streaming by sending full response
        onToken({ content: response.content, done: false });
        onToken({ content: '', done: true });
    }

    /**
     * ✨ NEW: Chat with function calling support (Claude tool use)
     */
    async chatWithFunctions(
        messages: Message[],
        tools: unknown[],
        options?: ChatOptions
    ): Promise<ChatResponse> {
        const mergedOptions = this.mergeOptions(options);

        try {
            const { systemMessage, userMessages } = this.formatMessagesForClaude(messages);

            const body: any = {
                model: this.model,
                max_tokens: mergedOptions.maxTokens,
                temperature: mergedOptions.temperature,
                messages: userMessages,
                tools: tools // Claude native tool format
            };

            if (systemMessage) {
                body.system = systemMessage;
            }

            if (mergedOptions.stopSequences.length > 0) {
                body.stop_sequences = mergedOptions.stopSequences;
            }

            console.log('Anthropic function calling request:', {
                model: this.model,
                toolCount: Array.isArray(tools) ? tools.length : 0
            });

            const responseText = await this.makeHttpsRequest(
                'https://api.anthropic.com/v1/messages',
                'POST',
                {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                JSON.stringify(body)
            );

            const json = JSON.parse(responseText);
            const response = json as any;

            console.log('Anthropic function calling response:', {
                model: response.model,
                stopReason: response.stop_reason
            });

            // Check if Claude wants to use a tool
            if (response.content) {
                const toolUseBlock = response.content.find((block: any) => block.type === 'tool_use');

                if (toolUseBlock) {
                    // Extract text content if any
                    const textContent = response.content
                        .filter((block: any) => block.type === 'text')
                        .map((block: any) => block.text)
                        .join('') || '';

                    return {
                        content: textContent,
                        functionCall: {
                            name: toolUseBlock.name,
                            arguments: toolUseBlock.input
                        },
                        usage: {
                            promptTokens: response.usage?.input_tokens || 0,
                            completionTokens: response.usage?.output_tokens || 0,
                            totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
                        },
                        model: response.model || this.model,
                        finishReason: response.stop_reason || 'complete'
                    };
                }
            }

            // Normal response without tool use
            const content = response.content
                ?.filter((block: any) => block.type === 'text')
                .map((block: any) => block.text)
                .join('') || '';

            return {
                content,
                usage: {
                    promptTokens: response.usage?.input_tokens || 0,
                    completionTokens: response.usage?.output_tokens || 0,
                    totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
                },
                model: response.model || this.model,
                finishReason: response.stop_reason || 'complete'
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Anthropic function calling error:', errorMessage);

            throw new LLMError(`Anthropic function calling failed: ${errorMessage}`, {
                originalError: error,
                provider: 'anthropic',
                model: this.model
            });
        }
    }

    /**
     * Make HTTPS request using Node.js https module
     */
    private makeHttpsRequest(
        url: string,
        method: string,
        headers: Record<string, string>,
        body?: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: headers,
                rejectUnauthorized: false // Handle SSL certificate issues
            };

            const req = https.request(requestOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`Anthropic API error ${res.statusCode || 'unknown'}: ${data}`));
                    }
                });
            });

            req.on('error', (err: Error & { code?: string }) => {
                if (err.code === 'UNABLE_TO_GET_ISSUER_CERT' || err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
                    reject(new Error('SSL certificate verification failed. This may be due to corporate firewall or certificate issues.'));
                } else {
                    reject(err);
                }
            });

            if (body) {
                req.write(body);
            }

            req.end();
        });
    }

    /**
     * Format messages for Claude API
     */
    private formatMessagesForClaude(messages: Message[]): {
        systemMessage: string | null;
        userMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
    } {
        let systemMessage: string | null = null;
        const userMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                if (systemMessage) {
                    systemMessage += '\n\n' + msg.content;
                } else {
                    systemMessage = msg.content;
                }
            } else if (msg.role === 'function') {
                // ✨ Convert function results to user messages for Claude
                userMessages.push({
                    role: 'user',
                    content: `[Tool result from ${msg.name || 'function'}]: ${msg.content}`
                });
            } else {
                userMessages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                });
            }
        }

        // Ensure first message is from user
        if (userMessages.length > 0 && userMessages[0].role === 'assistant') {
            userMessages.unshift({
                role: 'user',
                content: '[Previous conversation context]'
            });
        }

        return { systemMessage, userMessages };
    }

    /**
     * Test connection
     */
    async test(): Promise<boolean> {
        try {

            const response = await this.chat([
                { role: 'user', content: 'Respond with just "OK"' }
            ], { maxTokens: 10 });

            const isOk = response.content.toLowerCase().includes('ok');

            // Connection test completed silently

            return isOk;
        } catch {
            // Test failed silently
            return false;
        }
    }

    /**
     * Get recommended models
     */
    static getRecommendedModels(): Array<{ value: string; label: string }> {
        return [
            { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Newest)' },
            { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)' },
            { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
            { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' },
            { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' }
        ];
    }
}
