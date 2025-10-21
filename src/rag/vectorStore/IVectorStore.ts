/**
 * IVectorStore Interface
 *
 * Abstraction layer for vector storage backends
 * Allows swapping between JSON-based and PostgreSQL-based storage
 */

import { ChunkMetadata } from '../../types';
import {
    VectorEntry,
    SearchOptions,
    SearchResult,
    VectorStoreStats,
    BatchEntry,
    DocumentChunk
} from './types';

/**
 * Vector Store Interface
 *
 * All vector store implementations must implement this interface
 */
export interface IVectorStore {
    // ==================== Lifecycle ====================

    /**
     * Initialize the vector store
     * Sets up connections, loads indexes, etc.
     */
    initialize(): Promise<void>;

    /**
     * Check if the vector store is ready for operations
     */
    isReady(): boolean;

    /**
     * Check if the vector store is empty
     */
    isEmpty(): Promise<boolean>;

    /**
     * Close connections and cleanup resources
     */
    close(): Promise<void>;

    // ==================== Basic Operations ====================

    /**
     * Insert a single chunk with its embedding
     */
    insert(
        chunkId: string,
        content: string,
        embedding: number[],
        metadata: ChunkMetadata
    ): Promise<void>;

    /**
     * Insert multiple chunks in batch
     * More efficient than individual inserts
     */
    insertBatch(entries: BatchEntry[]): Promise<void>;

    /**
     * Upsert entry (insert or update if exists)
     */
    upsert(entry: VectorEntry): Promise<void>;

    /**
     * Get a chunk by ID
     */
    get(chunkId: string): Promise<VectorEntry | null>;

    /**
     * Search for similar chunks using vector similarity
     */
    search(
        queryEmbedding: number[],
        options?: SearchOptions
    ): Promise<SearchResult>;

    /**
     * Delete a chunk by ID
     */
    delete(chunkId: string): Promise<boolean>;

    /**
     * Clear all entries from the vector store
     */
    clear(): Promise<void>;

    // ==================== Large Document Support ====================

    /**
     * Check if this backend supports large document chunking
     */
    supportsChunking(): boolean;

    /**
     * Insert a large document by automatically chunking it
     * Returns array of chunk IDs created
     */
    insertLargeDocument(
        docId: string,
        content: string,
        metadata: ChunkMetadata,
        chunkSize?: number
    ): Promise<string[]>;

    /**
     * Retrieve all chunks of a large document and reconstruct it
     */
    retrieveLargeDocument(docId: string): Promise<string>;

    /**
     * Get individual chunks of a document
     */
    getDocumentChunks(docId: string): Promise<DocumentChunk[]>;

    // ==================== Management & Utilities ====================

    /**
     * Get statistics about the vector store
     */
    getStats(): Promise<VectorStoreStats>;

    /**
     * Export vector store data (for backup/migration)
     */
    export(): Promise<string>;

    /**
     * Import vector store data (for restore/migration)
     */
    import(data: string): Promise<void>;

    /**
     * Save/persist current state
     * (No-op for some backends like PostgreSQL)
     */
    save(): Promise<void>;

    /**
     * Load/refresh from persistent storage
     * (No-op for some backends like PostgreSQL)
     */
    load(): Promise<void>;

    // ==================== Maintenance ====================

    /**
     * Optimize indexes for better search performance
     * (Backend-specific implementation)
     */
    optimize(): Promise<void>;

    /**
     * Verify data integrity
     */
    verify(): Promise<{ valid: boolean; errors: string[] }>;

    /**
     * Get the backend type
     */
    getBackend(): 'json' | 'sqlite' | 'pgvector';
}
