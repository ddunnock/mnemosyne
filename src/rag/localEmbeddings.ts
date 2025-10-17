import { pipeline, Pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { EmbeddingsGenerator } from './embeddings';
import { MnemosyneError, ErrorCodes } from '../types';
import { DEFAULT_LOCAL_EMBEDDING_MODEL, PERFORMANCE_LIMITS } from '../constants';

export interface LocalEmbeddingConfig {
    modelName: string;
    quantized: boolean;
    maxInputLength: number;
    batchSize: number;
    device: 'cpu' | 'gpu' | 'auto';
    cacheDir?: string;
}

export class LocalEmbeddingsGenerator extends EmbeddingsGenerator {
    private model: FeatureExtractionPipeline | null = null;
    private config: LocalEmbeddingConfig;
    private fallback?: EmbeddingsGenerator;
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;

    constructor(
        config: Partial<LocalEmbeddingConfig> = {},
        fallback?: EmbeddingsGenerator
    ) {
        super();
        this.config = {
            modelName: DEFAULT_LOCAL_EMBEDDING_MODEL,
            quantized: false,
            maxInputLength: 512,
            batchSize: PERFORMANCE_LIMITS.EMBEDDING_BATCH_SIZE,
            device: 'auto',
            ...config
        };
        this.fallback = fallback;
    }

    async initialize(apiKey?: string, options?: unknown): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initialize(apiKey, options);
        return this.initializationPromise;
    }

    private async _initialize(apiKey?: string, options?: unknown): Promise<void> {
        try {
            console.log(`🔄 Loading local embedding model: ${this.config.modelName}...`);

            // Show progress for model download
            const progressCallback = (progress: { progress: number; file: string }) => {
                if (progress.progress) {
                    console.log(`📥 Downloading ${progress.file}: ${Math.round(progress.progress)}%`);
                }
            };

            this.model = await pipeline('feature-extraction', this.config.modelName, {
                quantized: this.config.quantized,
                progress_callback: progressCallback,
                cache_dir: this.config.cacheDir
            });

            console.log(`✅ Local embedding model loaded: ${this.config.modelName}`);
            this.isInitialized = true;
        } catch (error) {
            console.warn('⚠️ Failed to load local embedding model:', error);

            if (this.fallback) {
                console.log('🔄 Initializing fallback embedding provider...');
                try {
                    await this.fallback.initialize(apiKey || '', options as { model?: string });
                    console.log('✅ Fallback embedding provider initialized');
                } catch (fallbackError) {
                    throw new MnemosyneError(
                        'Failed to initialize both local and fallback embedding providers',
                        ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
                        {
                            localError: error.message,
                            fallbackError: fallbackError.message
                        }
                    );
                }
            } else {
                throw new MnemosyneError(
                    `Failed to initialize local embeddings: ${error.message}`,
                    ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
                    { modelName: this.config.modelName, error: error.message }
                );
            }
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Validate input
        if (!text || typeof text !== 'string') {
            throw new MnemosyneError(
                'Input text must be a non-empty string',
                ErrorCodes.INVALID_QUERY
            );
        }

        // Truncate text if too long
        const truncatedText = this.truncateText(text);

        if (this.model) {
            try {
                const output = await this.model(truncatedText, {
                    pooling: 'mean',
                    normalize: true
                });

                // Convert to regular array
                const embedding = Array.from(output.data as Float32Array);

                if (embedding.length === 0) {
                    throw new Error('Model returned empty embedding');
                }

                return embedding;
            } catch (error) {
                console.warn('Local embedding failed:', error);

                if (this.fallback) {
                    console.log('🔄 Trying fallback embedding provider...');
                    return await this.fallback.generateEmbedding(text);
                }

                throw new MnemosyneError(
                    `Local embedding generation failed: ${error.message}`,
                    ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
                    { text: truncatedText.slice(0, 100) + '...', error: error.message }
                );
            }
        }

        if (this.fallback) {
            return await this.fallback.generateEmbedding(text);
        }

        throw new MnemosyneError(
            'No embedding method available',
            ErrorCodes.LOCAL_MODEL_LOAD_FAILED
        );
    }

    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!Array.isArray(texts) || texts.length === 0) {
            throw new MnemosyneError(
                'Input must be a non-empty array of strings',
                ErrorCodes.INVALID_QUERY
            );
        }

        // Process in batches for better performance
        const results: number[][] = [];
        const batchSize = this.config.batchSize;

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchPromises = batch.map(text => this.generateEmbedding(text));

            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                console.warn(`Batch ${i / batchSize + 1} failed:`, error);

                // Try individual embeddings for failed batch
                for (const text of batch) {
                    try {
                        const embedding = await this.generateEmbedding(text);
                        results.push(embedding);
                    } catch (individualError) {
                        console.warn('Individual embedding failed:', individualError);
                        // Use zero vector as fallback
                        results.push(new Array(384).fill(0)); // Common embedding dimension
                    }
                }
            }
        }

        return results;
    }

    async test(): Promise<boolean> {
        try {
            const testEmbedding = await this.generateEmbedding('test embedding');
            return Array.isArray(testEmbedding) && testEmbedding.length > 0;
        } catch (error) {
            console.warn('Embedding test failed:', error);
            return false;
        }
    }

    clearCache(): void {
        // Clear any cached embeddings if implemented
        if (this.fallback) {
            this.fallback.clearCache();
        }
    }

    private truncateText(text: string): string {
        if (text.length <= this.config.maxInputLength) {
            return text;
        }

        // Truncate at word boundary when possible
        const truncated = text.slice(0, this.config.maxInputLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');

        if (lastSpaceIndex > this.config.maxInputLength * 0.8) {
            return truncated.slice(0, lastSpaceIndex);
        }

        return truncated;
    }

    getConfig(): LocalEmbeddingConfig {
        return { ...this.config };
    }

    updateConfig(config: Partial<LocalEmbeddingConfig>): void {
        this.config = { ...this.config, ...config };

        // If model name changed, reinitialize
        if (config.modelName && config.modelName !== this.config.modelName) {
            this.isInitialized = false;
            this.initializationPromise = null;
            this.model = null;
        }
    }

    isReady(): boolean {
        return this.isInitialized && (this.model !== null || this.fallback !== undefined);
    }

    getModelInfo(): { name: string; isLocal: boolean; isReady: boolean } {
        return {
            name: this.config.modelName,
            isLocal: true,
            isReady: this.isReady()
        };
    }
}