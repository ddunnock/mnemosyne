/**
 * PostgreSQL + pgvector Vector Store Implementation
 *
 * Production-grade vector database using PostgreSQL with pgvector extension
 * Supports massive scale (millions of chunks), HNSW indexing, and large document chunking
 */

import { Notice } from 'obsidian';
import { Pool, PoolClient, QueryResult } from 'pg';
import { ChunkMetadata } from '../../types';
import { RAGError } from '../../types';
import { IVectorStore } from './IVectorStore';
import {
    VectorEntry,
    SearchOptions,
    SearchResult,
    VectorStoreStats,
    BatchEntry,
    DocumentChunk,
    PgVectorBackendConfig
} from './types';

/**
 * PostgreSQL with pgvector implementation
 */
export class PgVectorStore implements IVectorStore {
    private pool: Pool | null = null;
    private config: PgVectorBackendConfig;
    private embeddingModel: string;
    private dimension: number;
    private initialized: boolean = false;

    constructor(
        config: PgVectorBackendConfig,
        embeddingModel: string = 'text-embedding-3-small',
        dimension: number = 1536
    ) {
        this.config = config;
        this.embeddingModel = embeddingModel;
        this.dimension = dimension;
    }

    // ==================== Lifecycle ====================

    async initialize(): Promise<void> {
        try {
            // Create connection pool
            this.pool = new Pool({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user,
                password: this.config.encryptedPassword, // TODO: Decrypt this
                ssl: this.config.ssl,
                max: this.config.poolSize || 10,
                connectionTimeoutMillis: this.config.connectionTimeout || 5000
            });

            // Test connection
            const client = await this.pool.connect();

            try {
                // Check if pgvector extension is available
                const extResult = await client.query(
                    "SELECT * FROM pg_extension WHERE extname = 'vector'"
                );

                if (extResult.rows.length === 0) {
                    throw new Error('pgvector extension not installed. Run: CREATE EXTENSION vector;');
                }

                // Create tables if they don't exist
                await this.createTables(client);

                this.initialized = true;
                console.log('✅ PgVector store initialized successfully');
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Failed to initialize PgVector store:', error);
            throw new RAGError('Failed to initialize PostgreSQL vector store', error);
        }
    }

    isReady(): boolean {
        return this.initialized && this.pool !== null;
    }

    isEmpty(): Promise<boolean> {
        return this.getChunkCount().then(count => count === 0);
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.initialized = false;
            console.log('PgVector store connection closed');
        }
    }

    // ==================== Basic Operations ====================

    async insert(
        chunkId: string,
        content: string,
        embedding: number[],
        metadata: ChunkMetadata
    ): Promise<void> {
        this.ensureReady();

        try {
            await this.pool!.query(
                `INSERT INTO embeddings (id, content, embedding, metadata, document_id, section, content_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()`,
                [
                    chunkId,
                    content,
                    `[${embedding.join(',')}]`, // pgvector format
                    JSON.stringify(metadata),
                    metadata.document_id,
                    metadata.section,
                    metadata.content_type
                ]
            );
        } catch (error) {
            throw new RAGError(`Failed to insert chunk ${chunkId}`, error);
        }
    }

    async insertBatch(entries: BatchEntry[]): Promise<void> {
        if (!entries || entries.length === 0) return;
        this.ensureReady();

        const client = await this.pool!.connect();

        try {
            await client.query('BEGIN');

            for (const entry of entries) {
                await client.query(
                    `INSERT INTO embeddings (id, content, embedding, metadata, document_id, section, content_type)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (id) DO UPDATE SET
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW()`,
                    [
                        entry.chunkId,
                        entry.content,
                        `[${entry.embedding.join(',')}]`,
                        JSON.stringify(entry.metadata),
                        entry.metadata.document_id,
                        entry.metadata.section,
                        entry.metadata.content_type
                    ]
                );
            }

            await client.query('COMMIT');
            console.log(`✅ Batch inserted ${entries.length} chunks`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw new RAGError('Failed to insert batch', error);
        } finally {
            client.release();
        }
    }

    async upsert(entry: VectorEntry): Promise<void> {
        await this.insert(entry.id, entry.content, entry.embedding, entry.metadata);
    }

    async get(chunkId: string): Promise<VectorEntry | null> {
        this.ensureReady();

        try {
            const result = await this.pool!.query(
                'SELECT id, content, embedding, metadata FROM embeddings WHERE id = $1',
                [chunkId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                content: row.content,
                embedding: this.parseVector(row.embedding),
                metadata: row.metadata
            };
        } catch (error) {
            throw new RAGError(`Failed to get chunk ${chunkId}`, error);
        }
    }

    async search(
        queryEmbedding: number[],
        options: SearchOptions = {}
    ): Promise<SearchResult> {
        this.ensureReady();

        const startTime = Date.now();
        const {
            topK = 5,
            scoreThreshold = 0.0,
            filters = {},
            includeEmbeddings = false
        } = options;

        try {
            // Build WHERE clause for metadata filters
            const whereConditions: string[] = [];
            const params: any[] = [`[${queryEmbedding.join(',')}]`];
            let paramIndex = 2;

            // Add metadata filters
            for (const [key, values] of Object.entries(filters)) {
                if (!values || values.length === 0) continue;

                if (key === 'document_id' || key === 'section' || key === 'content_type') {
                    // Direct column filters
                    whereConditions.push(`${key} = ANY($${paramIndex})`);
                    params.push(values);
                    paramIndex++;
                } else {
                    // JSON metadata filters
                    whereConditions.push(`metadata->>'${key}' = ANY($${paramIndex})`);
                    params.push(values);
                    paramIndex++;
                }
            }

            const whereClause = whereConditions.length > 0
                ? 'WHERE ' + whereConditions.join(' AND ')
                : '';

            // Cosine similarity search with HNSW index
            const query = `
                SELECT
                    id,
                    content,
                    ${includeEmbeddings ? 'embedding,' : ''}
                    metadata,
                    1 - (embedding <=> $1::vector) as score
                FROM embeddings
                ${whereClause}
                ORDER BY embedding <=> $1::vector
                LIMIT ${topK}
            `;

            const result = await this.pool!.query(query, params);

            // Filter by score threshold
            const chunks = result.rows
                .filter(row => row.score >= scoreThreshold)
                .map(row => ({
                    chunk_id: row.id,
                    content: row.content,
                    metadata: row.metadata,
                    score: row.score,
                    embedding: includeEmbeddings ? this.parseVector(row.embedding) : undefined
                }));

            const queryTime = Date.now() - startTime;

            return {
                chunks,
                totalFound: chunks.length,
                queryTime
            };
        } catch (error) {
            throw new RAGError('Vector search failed', error);
        }
    }

    async delete(chunkId: string): Promise<boolean> {
        this.ensureReady();

        try {
            const result = await this.pool!.query(
                'DELETE FROM embeddings WHERE id = $1',
                [chunkId]
            );

            return result.rowCount !== null && result.rowCount > 0;
        } catch (error) {
            throw new RAGError(`Failed to delete chunk ${chunkId}`, error);
        }
    }

    async clear(): Promise<void> {
        this.ensureReady();

        try {
            await this.pool!.query('TRUNCATE TABLE embeddings');
            await this.pool!.query('TRUNCATE TABLE document_chunks');
            console.log('✅ Vector store cleared');
        } catch (error) {
            throw new RAGError('Failed to clear vector store', error);
        }
    }

    // ==================== Large Document Support ====================

    supportsChunking(): boolean {
        return true;
    }

    async insertLargeDocument(
        docId: string,
        content: string,
        metadata: ChunkMetadata,
        chunkSize: number = 50000
    ): Promise<string[]> {
        this.ensureReady();

        const chunks: string[] = [];
        const totalChunks = Math.ceil(content.length / chunkSize);

        const client = await this.pool!.connect();

        try {
            await client.query('BEGIN');

            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, content.length);
                const chunkContent = content.substring(start, end);
                const chunkId = `${docId}_chunk_${i}`;

                // TODO: Generate embedding for chunk
                // For now, using zero vector as placeholder
                const embedding = new Array(this.dimension).fill(0);

                await client.query(
                    `INSERT INTO document_chunks (document_id, chunk_index, chunk_content, embedding, total_chunks, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (document_id, chunk_index) DO UPDATE SET
                        chunk_content = EXCLUDED.chunk_content,
                        embedding = EXCLUDED.embedding,
                        total_chunks = EXCLUDED.total_chunks`,
                    [
                        docId,
                        i,
                        chunkContent,
                        `[${embedding.join(',')}]`,
                        totalChunks,
                        JSON.stringify(metadata)
                    ]
                );

                chunks.push(chunkId);
            }

            await client.query('COMMIT');
            console.log(`✅ Inserted large document: ${totalChunks} chunks`);

            return chunks;
        } catch (error) {
            await client.query('ROLLBACK');
            throw new RAGError('Failed to insert large document', error);
        } finally {
            client.release();
        }
    }

    async retrieveLargeDocument(docId: string): Promise<string> {
        this.ensureReady();

        try {
            const result = await this.pool!.query(
                `SELECT chunk_content FROM document_chunks
                 WHERE document_id = $1
                 ORDER BY chunk_index ASC`,
                [docId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Document ${docId} not found`);
            }

            return result.rows.map(row => row.chunk_content).join('');
        } catch (error) {
            throw new RAGError(`Failed to retrieve large document ${docId}`, error);
        }
    }

    async getDocumentChunks(docId: string): Promise<DocumentChunk[]> {
        this.ensureReady();

        try {
            const result = await this.pool!.query(
                `SELECT chunk_index, chunk_content, total_chunks, metadata
                 FROM document_chunks
                 WHERE document_id = $1
                 ORDER BY chunk_index ASC`,
                [docId]
            );

            return result.rows.map(row => ({
                chunkId: `${docId}_chunk_${row.chunk_index}`,
                chunkIndex: row.chunk_index,
                totalChunks: row.total_chunks,
                content: row.chunk_content,
                metadata: row.metadata
            }));
        } catch (error) {
            throw new RAGError(`Failed to get document chunks for ${docId}`, error);
        }
    }

    // ==================== Management & Utilities ====================

    async getStats(): Promise<VectorStoreStats> {
        this.ensureReady();

        try {
            // Get total chunks
            const countResult = await this.pool!.query('SELECT COUNT(*) as count FROM embeddings');
            const totalChunks = parseInt(countResult.rows[0].count);

            // Get document counts
            const docCountResult = await this.pool!.query(
                'SELECT document_id, COUNT(*) as count FROM embeddings GROUP BY document_id'
            );
            const documentCounts: Record<string, number> = {};
            docCountResult.rows.forEach(row => {
                documentCounts[row.document_id] = parseInt(row.count);
            });

            // Get content type counts
            const typeCountResult = await this.pool!.query(
                'SELECT content_type, COUNT(*) as count FROM embeddings GROUP BY content_type'
            );
            const contentTypeCounts: Record<string, number> = {};
            typeCountResult.rows.forEach(row => {
                contentTypeCounts[row.content_type] = parseInt(row.count);
            });

            // Get creation/update times
            const timeResult = await this.pool!.query(
                'SELECT MIN(created_at) as created, MAX(updated_at) as updated FROM embeddings'
            );

            return {
                totalChunks,
                embeddingModel: this.embeddingModel,
                dimension: this.dimension,
                createdAt: new Date(timeResult.rows[0]?.created || Date.now()),
                updatedAt: new Date(timeResult.rows[0]?.updated || Date.now()),
                documentCounts,
                contentTypeCounts,
                backend: 'pgvector'
            };
        } catch (error) {
            throw new RAGError('Failed to get stats', error);
        }
    }

    async export(): Promise<string> {
        this.ensureReady();

        try {
            const result = await this.pool!.query(
                'SELECT id, content, embedding, metadata FROM embeddings ORDER BY id'
            );

            const exportData = {
                version: '1.0',
                embeddingModel: this.embeddingModel,
                dimension: this.dimension,
                totalChunks: result.rows.length,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                entries: result.rows.map(row => ({
                    id: row.id,
                    content: row.content,
                    embedding: this.parseVector(row.embedding),
                    metadata: row.metadata
                }))
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            throw new RAGError('Failed to export data', error);
        }
    }

    async import(jsonData: string): Promise<void> {
        this.ensureReady();

        try {
            const data = JSON.parse(jsonData);

            if (!data.entries || !Array.isArray(data.entries)) {
                throw new Error('Invalid export format');
            }

            await this.insertBatch(data.entries.map((entry: VectorEntry) => ({
                chunkId: entry.id,
                content: entry.content,
                embedding: entry.embedding,
                metadata: entry.metadata
            })));

            new Notice(`Imported ${data.entries.length} chunks to PostgreSQL`);
        } catch (error) {
            throw new RAGError('Failed to import data', error);
        }
    }

    async save(): Promise<void> {
        // No-op for PostgreSQL (data is persisted immediately)
    }

    async load(): Promise<void> {
        // No-op for PostgreSQL (data is loaded on query)
    }

    // ==================== Maintenance ====================

    async optimize(): Promise<void> {
        this.ensureReady();

        try {
            // Vacuum and analyze for better performance
            await this.pool!.query('VACUUM ANALYZE embeddings');
            await this.pool!.query('VACUUM ANALYZE document_chunks');
            console.log('✅ Database optimized');
        } catch (error) {
            throw new RAGError('Failed to optimize database', error);
        }
    }

    async verify(): Promise<{ valid: boolean; errors: string[] }> {
        this.ensureReady();

        const errors: string[] = [];

        try {
            // Check for duplicate IDs
            const dupResult = await this.pool!.query(
                'SELECT id, COUNT(*) as count FROM embeddings GROUP BY id HAVING COUNT(*) > 1'
            );

            if (dupResult.rows.length > 0) {
                dupResult.rows.forEach(row => {
                    errors.push(`Duplicate ID found: ${row.id} (${row.count} occurrences)`);
                });
            }

            // Check embedding dimensions
            const dimResult = await this.pool!.query(
                `SELECT id FROM embeddings WHERE array_length(embedding, 1) != ${this.dimension}`
            );

            if (dimResult.rows.length > 0) {
                errors.push(`Found ${dimResult.rows.length} chunks with incorrect embedding dimension`);
            }

            return {
                valid: errors.length === 0,
                errors
            };
        } catch (error) {
            errors.push(`Verification failed: ${error}`);
            return { valid: false, errors };
        }
    }

    getBackend(): 'json' | 'pgvector' {
        return 'pgvector';
    }

    // ==================== Private Helpers ====================

    private ensureReady(): void {
        if (!this.isReady()) {
            throw new Error('PgVector store not initialized. Call initialize() first.');
        }
    }

    private async getChunkCount(): Promise<number> {
        this.ensureReady();
        const result = await this.pool!.query('SELECT COUNT(*) as count FROM embeddings');
        return parseInt(result.rows[0].count);
    }

    private parseVector(vectorString: string): number[] {
        // PostgreSQL returns vectors as "[1,2,3]" string
        return JSON.parse(vectorString);
    }

    private async createTables(client: PoolClient): Promise<void> {
        // Create embeddings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                embedding vector(${this.dimension}),
                metadata JSONB,
                document_id TEXT,
                section TEXT,
                content_type TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS embeddings_embedding_idx
            ON embeddings USING hnsw (embedding vector_cosine_ops)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS embeddings_metadata_idx
            ON embeddings USING GIN (metadata)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS embeddings_document_id_idx
            ON embeddings (document_id)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS embeddings_content_type_idx
            ON embeddings (content_type)
        `);

        // Create document_chunks table for large documents
        await client.query(`
            CREATE TABLE IF NOT EXISTS document_chunks (
                id SERIAL PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_content TEXT NOT NULL,
                embedding vector(${this.dimension}),
                total_chunks INTEGER NOT NULL,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(document_id, chunk_index)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
            ON document_chunks (document_id)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
            ON document_chunks USING hnsw (embedding vector_cosine_ops)
        `);

        console.log('✅ Database tables and indexes created');
    }
}
