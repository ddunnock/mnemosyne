/**
 * Vector Store Types
 *
 * Shared types and interfaces for vector storage backends
 */

import { ChunkMetadata, MetadataFilters, RetrievedChunk } from '../../types';

/**
 * Vector Entry - represents a single embedded chunk
 */
export interface VectorEntry {
    id: string;
    embedding: number[];
    content: string;
    metadata: ChunkMetadata;
}

/**
 * Search options for vector similarity search
 */
export interface SearchOptions {
    topK?: number;
    scoreThreshold?: number;
    filters?: MetadataFilters;
    includeEmbeddings?: boolean;
}

/**
 * Search result structure
 */
export interface SearchResult {
    chunks: RetrievedChunk[];
    totalFound: number;
    queryTime: number;
}

/**
 * Vector store statistics
 */
export interface VectorStoreStats {
    totalChunks: number;
    embeddingModel: string;
    dimension: number;
    createdAt: Date;
    updatedAt: Date;
    memoryUsage?: number;
    documentCounts: Record<string, number>;
    contentTypeCounts: Record<string, number>;
    backend: 'json' | 'sqlite' | 'pgvector';
}

/**
 * Batch insert entry
 */
export interface BatchEntry {
    chunkId: string;
    content: string;
    embedding: number[];
    metadata: ChunkMetadata;
}

/**
 * Large document chunk result
 */
export interface DocumentChunk {
    chunkId: string;
    chunkIndex: number;
    totalChunks: number;
    content: string;
    metadata: ChunkMetadata;
}

/**
 * Vector store backend configuration
 */
export type VectorStoreBackend = 'json' | 'sqlite' | 'pgvector';

/**
 * JSON backend configuration
 */
export interface JSONBackendConfig {
    indexPath: string;
}

/**
 * SQLite backend configuration
 */
export interface SQLiteBackendConfig {
    dbPath: string;
    enableWAL?: boolean; // Write-Ahead Logging for better concurrency
    cacheSize?: number;  // Cache size in KB
}

/**
 * PostgreSQL (pgvector) backend configuration
 */
export interface PgVectorBackendConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    encryptedPassword: string;
    ssl: boolean;
    poolSize?: number;
    connectionTimeout?: number;
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
    backend: VectorStoreBackend;
    embeddingModel: string;
    dimension: number;

    // Backend-specific configs
    json?: JSONBackendConfig;
    sqlite?: SQLiteBackendConfig;
    pgvector?: PgVectorBackendConfig;
}
