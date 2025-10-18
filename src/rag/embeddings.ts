/**
 * Embedding Generation
 *
 * Handles text-to-vector embedding using OpenAI's API
 */

import OpenAI from 'openai';
import { RAGError } from '../types';

/**
 * Embedding Provider Interface
 */
export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
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
    async embedBatch(texts: string[]): Promise<number[][]> {
        if (!texts || texts.length === 0) {
            return [];
        }

        // Filter out empty texts
        const validTexts = texts.filter(t => t && t.trim().length > 0);
        if (validTexts.length === 0) {
            return [];
        }

        try {
            // OpenAI allows batch embedding, but we'll process in chunks to avoid limits
            const batchSize = 100; // OpenAI supports up to 2048, but we'll be conservative
            const results: number[][] = [];

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

results.push(...response.data.map((d: { embedding: number[] }) => d.embedding));
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
        if (embedding.length !== expectedDim    /**
     * Calculate cosine similarity between two embeddings
     * Optimized version with proper edge case handling
     */
    static cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have same dimension');
        }

        if (a.length === 0) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        // Single loop for better performance
        for (let i = 0; i < a.length; i++) {
            const ai = a[i];
            const bi = b[i];
            
            // Check for NaN or Infinity values
            if (!isFinite(ai) || !isFinite(bi)) {
                console.warn('Non-finite values detected in embedding vectors');
                return 0;
            }
            
            dotProduct += ai * bi;
            normA += ai * ai;
            normB += bi * bi;
        }

        // Handle edge cases where one or both vectors are zero
        if (normA === 0 || normB === 0) {
            return 0;
        }

        const sqrtNormA = Math.sqrt(normA);
        const sqrtNormB = Math.sqrt(normB);
        
        // Avoid division by zero
        if (sqrtNormA === 0 || sqrtNormB === 0) {
            return 0;
        }

        const similarity = dotProduct / (sqrtNormA * sqrtNormB);

        // Clamp to [-1, 1] to handle floating point errors
        // Also check for NaN or Infinity
        if (!isFinite(similarity)) {
            console.warn('Non-finite similarity value calculated');
            return 0;
        }

        return Math.max(-1, Math.min(1, similarity));
    }Math.sqrt(normA) * Math.sqrt(normB));

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
 * Factory function to create embedding provider from plugin settings
 */
export async function createEmbeddingProvider(
    apiKey: string,
    model?: string
): Promise<EmbeddingProvider> {
    // For now, we only support OpenAI
    // Future: Add support for local models, Anthropic, etc.
    return new OpenAIEmbeddingProvider(apiKey, model);
}

/**
 * Embeddings Generator - Wrapper for embedding providers
 */
export class EmbeddingsGenerator {
    private provider: EmbeddingProvider | null = null;

    /**
     * Initialize with API key and options
     */
    initialize(apiKey: string, options?: { model?: string }): void {
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
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
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
     * Clear cache
     */
    clearCache(): void {
        // No-op for now, can implement caching later
    }
}
