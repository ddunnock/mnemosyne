/**
 * Embedding Generation
 *
 * Handles text-to-vector embedding using OpenAI's API or local models
 * Supports both cloud (OpenAI) and local (Transformers.js) providers
 */

import OpenAI from 'openai';
import { RAGError } from '../types';

// Lazy import for Transformers.js to avoid bundling issues
// Will be loaded dynamically when LocalEmbeddingProvider is instantiated
type FeatureExtractionPipeline = any;

/**
 * Embedding Provider Interface
 */
export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<(number[] | undefined)[]>;
    getDimension(): number;
    getModel(): string;
}

/**
 * OpenAI Embedding Provider
 * Uses text-embedding-3-small (1536 dimensions, fast and cost-effective)
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    private client: OpenAI;
    private model: string;
    private dimension: number;
    private rateLimitDelay: number = 150; // ms between requests

    constructor(apiKey: string, model: string = 'text-embedding-3-small') {
        if (!apiKey) {
            throw new RAGError('OpenAI API key is required for embeddings');
        }

        this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        this.model = model;

        // Set dimensions based on model
        this.dimension = model === 'text-embedding-3-large' ? 3072 : 1536;
    }

    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<number[]> {
        if (!text || text.trim().length === 0) {
            throw new RAGError('Cannot embed empty text');
        }

        try {
            const response = await this.client.embeddings.create({
                model: this.model,
                input: text,
            });

            return response.data[0].embedding;
        } catch (error: any) {
            if (error.status === 429) {
                throw new RAGError('OpenAI rate limit exceeded. Please wait and try again.', error);
            }
            throw new RAGError(`Failed to generate embedding: ${error.message}`, error);
        }
    }

    /**
     * Generate embeddings for multiple texts (batch processing)
     * Automatically handles rate limiting with delays
     */
    async embedBatch(texts: string[]): Promise<(number[] | undefined)[]> {
        if (!texts || texts.length === 0) {
            return [];
        }

        // Create a map to track which indices are valid
        const indexMap: Map<number, number> = new Map(); // original index -> valid index
        const validTexts: string[] = [];

        texts.forEach((text, i) => {
            if (text && text.trim().length > 0) {
                indexMap.set(i, validTexts.length);
                validTexts.push(text);
            }
        });

        // If no valid texts, return array of undefined with same length as input
        if (validTexts.length === 0) {
            return new Array(texts.length).fill(undefined);
        }

        try {
            // OpenAI allows batch embedding, but we'll process in chunks to avoid limits
            const batchSize = 100; // OpenAI supports up to 2048, but we'll be conservative
            const embeddings: number[][] = [];

            for (let i = 0; i < validTexts.length; i += batchSize) {
                const batch = validTexts.slice(i, i + batchSize);

                // Add delay between batches to respect rate limits
                if (i > 0) {
                    await this.delay(this.rateLimitDelay);
                }

                const response = await this.client.embeddings.create({
                    model: this.model,
                    input: batch,
                });

                embeddings.push(...response.data.map((d: { embedding: number[] }) => d.embedding));
            }

            // Map embeddings back to original indices, preserving undefined for empty texts
            const results: (number[] | undefined)[] = new Array(texts.length);
            for (let i = 0; i < texts.length; i++) {
                const validIndex = indexMap.get(i);
                results[i] = validIndex !== undefined ? embeddings[validIndex] : undefined;
            }

            return results;
        } catch (error: any) {
            if (error.status === 429) {
                throw new RAGError('OpenAI rate limit exceeded during batch processing. Try reducing batch size.', error);
            }
            throw new RAGError(`Failed to generate batch embeddings: ${error.message}`, error);
        }
    }

    /**
     * Get the embedding dimension for this model
     */
    getDimension(): number {
        return this.dimension;
    }

    /**
     * Get the model name
     */
    getModel(): string {
        return this.model;
    }

    /**
     * Delay helper for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validate that an embedding vector is valid
     */
    static validateEmbedding(embedding: number[], expectedDimension: number): boolean {
        if (!Array.isArray(embedding)) return false;
        if (embedding.length !== expectedDimension) return false;
        if (!embedding.every(n => typeof n === 'number' && !isNaN(n))) return false;
        return true;
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    static cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have same dimension');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

        // Clamp to [-1, 1] to handle floating point errors
        return Math.max(-1, Math.min(1, similarity));
    }

    /**
     * Normalize an embedding vector to unit length
     */
    static normalize(embedding: number[]): number[] {
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / norm);
    }
}

/**
 * Local Embedding Provider using Transformers.js
 *
 * ✨ NEW: 100% local, privacy-preserving embeddings
 * - No external API calls
 * - Works completely offline
 * - Perfect for air-gapped environments
 * - Uses sentence-transformers models (384 dimensions)
 *
 * Default model: Xenova/all-MiniLM-L6-v2
 * - Size: ~23MB
 * - Dimensions: 384
 * - Quality: Excellent for semantic search
 * - Speed: Fast, runs in-browser via WASM
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
    private model: string;
    private dimension: number;
    private pipeline: FeatureExtractionPipeline | null = null;
    private initPromise: Promise<void> | null = null;

    constructor(model: string = 'Xenova/all-MiniLM-L6-v2') {
        this.model = model;
        // Most sentence-transformers models use 384 dimensions
        // Can be overridden if needed for specific models
        this.dimension = 384;
    }

    /**
     * Initialize the model pipeline (lazy loading)
     * Only loads once and caches for subsequent calls
     */
    private async initialize(): Promise<void> {
        if (this.pipeline) {
            return; // Already initialized
        }

        if (this.initPromise) {
            return this.initPromise; // Initialization in progress
        }

        this.initPromise = (async () => {
            try {
                console.log(`🔧 Loading local embedding model: ${this.model}...`);
                console.log('First load may take 10-30s to download model (~23MB)');
                console.log('Subsequent loads will be instant (cached)');

                // Dynamically import Transformers.js to avoid bundling issues
                const { pipeline } = await import('@xenova/transformers');

                // Create feature extraction pipeline
                // @ts-ignore - Transformers.js types are sometimes incomplete
                this.pipeline = await pipeline('feature-extraction', this.model, {
                    // Configure for optimal performance
                    quantized: true, // Use quantized model for smaller size and faster inference
                });

                console.log(`✓ Local embedding model loaded successfully`);
            } catch (error: any) {
                console.error('Failed to load local embedding model:', error);
                this.pipeline = null;
                this.initPromise = null;
                throw new RAGError(
                    `Failed to initialize local embedding model: ${error.message}`,
                    error
                );
            }
        })();

        return this.initPromise;
    }

    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<number[]> {
        if (!text || text.trim().length === 0) {
            throw new RAGError('Cannot embed empty text');
        }

        try {
            // Ensure model is loaded
            await this.initialize();

            if (!this.pipeline) {
                throw new RAGError('Local embedding pipeline not initialized');
            }

            // Generate embedding
            // Transformers.js returns a Tensor, we need to convert to array
            const output = await this.pipeline(text, {
                pooling: 'mean', // Mean pooling for sentence embeddings
                normalize: true,  // Normalize to unit length (important for cosine similarity)
            });

            // Convert tensor to regular array
            // @ts-ignore - Transformers.js types
            const embedding = Array.from(output.data) as number[];

            // Validate embedding dimension
            if (embedding.length !== this.dimension) {
                console.warn(
                    `Unexpected embedding dimension: ${embedding.length}, expected ${this.dimension}. Updating dimension.`
                );
                this.dimension = embedding.length;
            }

            return embedding;
        } catch (error: any) {
            throw new RAGError(`Failed to generate local embedding: ${error.message}`, error);
        }
    }

    /**
     * Generate embeddings for multiple texts (batch processing)
     * Processes texts sequentially to manage memory
     */
    async embedBatch(texts: string[]): Promise<(number[] | undefined)[]> {
        if (!texts || texts.length === 0) {
            return [];
        }

        // Ensure model is loaded once before batch processing
        await this.initialize();

        // Process each text and handle errors individually
        const results: (number[] | undefined)[] = [];

        for (const text of texts) {
            try {
                if (!text || text.trim().length === 0) {
                    results.push(undefined);
                } else {
                    const embedding = await this.embed(text);
                    results.push(embedding);
                }
            } catch (error) {
                console.error('Failed to embed text in batch:', error);
                results.push(undefined);
            }
        }

        return results;
    }

    /**
     * Get the embedding dimension for this model
     */
    getDimension(): number {
        return this.dimension;
    }

    /**
     * Get the model name
     */
    getModel(): string {
        return this.model;
    }

    /**
     * Check if the model is loaded
     */
    isLoaded(): boolean {
        return this.pipeline !== null;
    }

    /**
     * Unload the model to free memory
     */
    async unload(): Promise<void> {
        if (this.pipeline) {
            // @ts-ignore
            await this.pipeline.dispose?.();
            this.pipeline = null;
            this.initPromise = null;
            console.log('✓ Local embedding model unloaded');
        }
    }
}

/**
 * Embedding Provider Type
 */
export enum EmbeddingProviderType {
    OPENAI = 'openai',
    LOCAL = 'local'
}

/**
 * Factory function to create embedding provider from plugin settings
 * ✨ ENHANCED: Now supports both OpenAI and Local providers
 */
export async function createEmbeddingProvider(
    providerType: EmbeddingProviderType,
    apiKey?: string,
    model?: string
): Promise<EmbeddingProvider> {
    switch (providerType) {
        case EmbeddingProviderType.OPENAI:
            if (!apiKey) {
                throw new RAGError('OpenAI API key is required for OpenAI embeddings');
            }
            return new OpenAIEmbeddingProvider(apiKey, model);

        case EmbeddingProviderType.LOCAL:
            // Local embeddings don't need API key
            return new LocalEmbeddingProvider(model);

        default:
            throw new RAGError(`Unknown embedding provider type: ${providerType}`);
    }
}

/**
 * Embeddings Generator - Wrapper for embedding providers
 * ✨ ENHANCED: Now supports both OpenAI and Local providers
 */
export class EmbeddingsGenerator {
    private provider: EmbeddingProvider | null = null;
    private providerType: EmbeddingProviderType | null = null;

    /**
     * Initialize with provider type and options
     * ✨ NEW: Supports both OpenAI and Local providers
     */
    async initialize(
        providerType: EmbeddingProviderType,
        options?: { apiKey?: string; model?: string }
    ): Promise<void> {
        this.providerType = providerType;
        this.provider = await createEmbeddingProvider(
            providerType,
            options?.apiKey,
            options?.model
        );
    }

    /**
     * Legacy method for backwards compatibility
     * @deprecated Use initialize(EmbeddingProviderType, options) instead
     */
    initializeLegacy(apiKey: string, options?: { model?: string }): void {
        this.providerType = EmbeddingProviderType.OPENAI;
        this.provider = new OpenAIEmbeddingProvider(apiKey, options?.model);
    }

    /**
     * Generate embedding for single text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.provider) {
            throw new RAGError('Embeddings generator not initialized');
        }
        return await this.provider.embed(text);
    }

    /**
     * Generate embeddings for multiple texts
     */
    async generateEmbeddings(texts: string[]): Promise<(number[] | undefined)[]> {
        if (!this.provider) {
            throw new RAGError('Embeddings generator not initialized');
        }
        return await this.provider.embedBatch(texts);
    }

    /**
     * Get embedding dimension
     */
    getDimension(): number {
        if (!this.provider) {
            throw new RAGError('Embeddings generator not initialized');
        }
        return this.provider.getDimension();
    }

    /**
     * Get current provider type
     */
    getProviderType(): EmbeddingProviderType | null {
        return this.providerType;
    }

    /**
     * Check if using local embeddings
     */
    isLocal(): boolean {
        return this.providerType === EmbeddingProviderType.LOCAL;
    }

    /**
     * Test embeddings
     */
    async test(): Promise<boolean> {
        try {
            const embedding = await this.generateEmbedding('test');
            return embedding.length > 0;
        } catch (error) {
            console.error('Embeddings test failed:', error);
            return false;
        }
    }

    /**
     * Clear cache and unload models
     */
    async clearCache(): Promise<void> {
        // If using local provider, unload the model
        if (this.provider instanceof LocalEmbeddingProvider) {
            await this.provider.unload();
        }
    }
}
