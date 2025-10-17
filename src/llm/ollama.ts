import { BaseLLMProvider } from './base';
import { Message, ChatResponse, ChatOptions, StreamChunk, MnemosyneError, ErrorCodes } from '../types';
import { DEFAULT_OLLAMA_URL } from '../constants';

export interface OllamaConfig {
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens?: number;
    timeout?: number;
}

export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export class OllamaProvider extends BaseLLMProvider {
    readonly name: string = 'Ollama';
    private config: OllamaConfig;
    private isConnected: boolean = false;
    private availableModels: string[] = [];

    constructor(config: OllamaConfig) {
        super('', config.model, config.temperature, config.maxTokens || 4096);
        this.config = {
            timeout: 30000,
            ...config
        };
    }

    async initialize(): Promise<void> {
        try {
            await this.checkConnection();
            await this.loadAvailableModels();
            this.isConnected = true;
            console.log(`✅ Ollama provider initialized: ${this.config.baseUrl}`);
        } catch (error) {
            console.warn('⚠️ Failed to initialize Ollama provider:', error);
            this.isConnected = false;
            throw new MnemosyneError(
                'Failed to connect to Ollama server',
                ErrorCodes.OLLAMA_CONNECTION_FAILED,
                { baseUrl: this.config.baseUrl, error: error.message }
            );
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/version`, {
                method: 'GET',
                signal: AbortSignal.timeout(this.config.timeout!)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return true;
        } catch (error) {
            throw new MnemosyneError(
                `Cannot connect to Ollama server at ${this.config.baseUrl}`,
                ErrorCodes.OLLAMA_CONNECTION_FAILED,
                { error: error.message }
            );
        }
    }

    async listModels(): Promise<string[]> {
        if (!this.isConnected) {
            await this.initialize();
        }
        return this.availableModels;
    }

    async loadAvailableModels(): Promise<void> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(this.config.timeout!)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.availableModels = data.models?.map((model: OllamaModel) =>
                model.name.replace(':latest', '')
            ) || [];

            console.log('📋 Available Ollama models:', this.availableModels);
        } catch (error) {
            console.warn('Failed to load Ollama models:', error);
            this.availableModels = [];
        }
    }

    async isModelAvailable(modelName: string): Promise<boolean> {
        const models = await this.listModels();
        return models.includes(modelName) || models.includes(`${modelName}:latest`);
    }

    async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName, stream: true })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                if (data.total && data.completed && onProgress) {
                                    const progress = (data.completed / data.total) * 100;
                                    onProgress(Math.round(progress));
                                }
                                if (data.status === 'success') {
                                    await this.loadAvailableModels(); // Refresh model list
                                    return;
                                }
                            } catch (e) {
                                console.warn('Failed to parse pull response:', e);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } catch (error) {
            throw new MnemosyneError(
                `Failed to pull model ${modelName}`,
                ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
                { modelName, error: error.message }
            );
        }
    }

    async generateResponse(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        if (!this.isConnected) {
            await this.initialize();
        }

        const modelAvailable = await this.isModelAvailable(this.config.model);
        if (!modelAvailable) {
            throw new MnemosyneError(
                `Model ${this.config.model} is not available. Please pull the model first.`,
                ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
                { model: this.config.model }
            );
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(this.config.timeout!),
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? this.config.temperature,
                        num_predict: options?.maxTokens ?? this.config.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: OllamaResponse = await response.json();

            return {
                content: data.message?.content || '',
                usage: {
                    promptTokens: data.prompt_eval_count || 0,
                    completionTokens: data.eval_count || 0,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                }
            };
        } catch (error) {
            throw new MnemosyneError(
                `Ollama API request failed: ${error.message}`,
                ErrorCodes.OLLAMA_CONNECTION_FAILED,
                { model: this.config.model, error: error.message }
            );
        }
    }

    async *streamResponse(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
        if (!this.isConnected) {
            await this.initialize();
        }

        const modelAvailable = await this.isModelAvailable(this.config.model);
        if (!modelAvailable) {
            throw new MnemosyneError(
                `Model ${this.config.model} is not available. Please pull the model first.`,
                ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
                { model: this.config.model }
            );
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    stream: true,
                    options: {
                        temperature: options?.temperature ?? this.config.temperature,
                        num_predict: options?.maxTokens ?? this.config.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data: OllamaResponse = JSON.parse(line);
                                yield {
                                    content: data.message?.content || '',
                                    done: data.done || false
                                };
                                if (data.done) return;
                            } catch (e) {
                                console.warn('Failed to parse Ollama stream response:', e);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } catch (error) {
            throw new MnemosyneError(
                `Ollama stream request failed: ${error.message}`,
                ErrorCodes.OLLAMA_CONNECTION_FAILED,
                { model: this.config.model, error: error.message }
            );
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isConnected) {
            await this.initialize();
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(this.config.timeout!),
                body: JSON.stringify({
                    model: this.config.model,
                    prompt: text
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.embedding || [];
        } catch (error) {
            throw new MnemosyneError(
                `Ollama embedding request failed: ${error.message}`,
                ErrorCodes.OLLAMA_CONNECTION_FAILED,
                { model: this.config.model, error: error.message }
            );
        }
    }

    getConfig(): OllamaConfig {
        return { ...this.config };
    }

    updateConfig(config: Partial<OllamaConfig>): void {
        this.config = { ...this.config, ...config };
        this.isConnected = false; // Force re-initialization
    }

    // Required methods from BaseLLMProvider
    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        return this.generateResponse(messages, options);
    }

    async stream(messages: Message[], onToken: (chunk: StreamChunk) => void, options?: ChatOptions): Promise<void> {
        for await (const chunk of this.streamResponse(messages, options)) {
            onToken(chunk);
        }
    }
}
