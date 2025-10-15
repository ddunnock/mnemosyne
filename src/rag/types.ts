/**
 * RAG System Types
 *
 * Type definitions specific to the RAG (Retrieval-Augmented Generation) system
 */

import { ChunkMetadata, RAGChunk, RetrievedChunk, MetadataFilters } from '../types';

/**
 * Vector store entry with embedding
 */
export interface VectorEntry {
    id: string;
    embedding: number[];
    content: string;
    metadata: ChunkMetadata;
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
    id: string;
    score: number;
    content: string;
    metadata: ChunkMetadata;
    embedding?: number[];
}

/**
 * Embedding generation options
 */
export interface EmbeddingOptions {
    model?: string;
    dimensions?: number;
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
    storagePath: string;
    autoSave: boolean;
    saveInterval?: number; // milliseconds
}

/**
 * Search options for retrieval
 */
export interface SearchOptions {
    topK?: number;
    scoreThreshold?: number;
    filters?: MetadataFilters;
    includeEmbeddings?: boolean;
}

/**
 * Ingestion progress callback
 */
export type IngestionProgressCallback = (progress: IngestionProgress) => void;

/**
 * Ingestion progress information
 */
export interface IngestionProgress {
    total: number;
    processed: number;
    current: string;
    percentage: number;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
    success: boolean;
    totalChunks: number;
    ingestedChunks: number;
    skippedChunks: number;
    errors: Array<{ chunkId: string; error: string }>;
    duration: number; // milliseconds
}

/**
 * Cache entry for embeddings
 */
export interface EmbeddingCacheEntry {
    text: string;
    embedding: number[];
    model: string;
    timestamp: number;
}

/**
 * Vector store statistics
 */
export interface VectorStoreStats {
    totalVectors: number;
    dimensions: number;
    uniqueDocuments: number;
    memoryUsage: number; // bytes
    lastUpdated: number;
}
