/**
 * Vector Store Module
 *
 * Exports all vector store implementations and utilities
 */

export { type IVectorStore } from './IVectorStore';
export { JSONVectorStore } from './JSONVectorStore';
export { SQLiteVectorStore } from './SQLiteVectorStore';
// PgVectorStore is NOT exported to prevent eager loading of 'pg' dependency
// Import directly from './PgVectorStore' when needed (only for PostgreSQL backend)
export { VectorStoreFactory } from './VectorStoreFactory';
export { VectorStoreMigration, type MigrationProgress, type MigrationResult } from './VectorStoreMigration';

export {
    type VectorEntry,
    type SearchOptions,
    type SearchResult,
    type VectorStoreStats,
    type BatchEntry,
    type DocumentChunk,
    type VectorStoreBackend,
    type JSONBackendConfig,
    type SQLiteBackendConfig,
    type PgVectorBackendConfig,
    type VectorStoreConfig
} from './types';
