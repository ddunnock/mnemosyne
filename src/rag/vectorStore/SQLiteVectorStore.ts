/**
 * SQLite + VSS Vector Store Implementation
 *
 * Embedded vector database using SQLite (sql.js - WebAssembly implementation)
 * Sweet spot for medium-sized vaults (10K-100K chunks)
 * No external server required, single file storage
 */

import { Notice, App } from 'obsidian';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
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
    SQLiteBackendConfig
} from './types';

/**
 * SQLite with VSS (Vector Similarity Search) implementation using sql.js
 */
export class SQLiteVectorStore implements IVectorStore {
    private db: SqlJsDatabase | null = null;
    private config: SQLiteBackendConfig;
    private embeddingModel: string;
    private dimension: number;
    private initialized: boolean = false;
    private app: App;
    private dbPath: string;

    constructor(
        app: App,
        config: SQLiteBackendConfig,
        embeddingModel: string = 'text-embedding-3-small',
        dimension: number = 1536
    ) {
        this.app = app;
        this.config = config;
        this.embeddingModel = embeddingModel;
        this.dimension = dimension;

        // Store relative path for vault adapter
        this.dbPath = `.obsidian/plugins/mnemosyne/${config.dbPath}`;
    }

    // ==================== Lifecycle ====================

    async initialize(): Promise<void> {
        try {
            console.log(`SQLite: Initializing database at: ${this.dbPath}`);

            // Read the WASM file from the plugin directory
            const wasmPath = '.obsidian/plugins/mnemosyne/sql-wasm.wasm';
            console.log(`SQLite: Loading WASM file from: ${wasmPath}`);

            let wasmBinary: ArrayBuffer;
            try {
                const wasmData = await this.app.vault.adapter.readBinary(wasmPath);
                wasmBinary = wasmData;
                console.log(`✅ WASM file loaded, size: ${wasmBinary.byteLength} bytes`);
            } catch (error) {
                console.error('Failed to load WASM file:', error);
                throw new Error(`Cannot find sql-wasm.wasm at ${wasmPath}. Make sure the plugin is properly installed.`);
            }

            // Initialize sql.js with the WASM binary
            const SQL = await initSqlJs({
                wasmBinary
            });

            // Try to load existing database
            try {
                const data = await this.app.vault.adapter.readBinary(this.dbPath);
                const uint8Array = new Uint8Array(data);
                this.db = new SQL.Database(uint8Array);
                console.log('✅ Loaded existing SQLite database');
            } catch (error) {
                // Create new database
                this.db = new SQL.Database();
                console.log('✅ Created new SQLite database');
            }

            // Create tables
            this.createTables();

            this.initialized = true;
            console.log('✅ SQLite vector store initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SQLite vector store:', error);
            throw new RAGError('Failed to initialize SQLite vector store', error);
        }
    }

    isReady(): boolean {
        return this.initialized && this.db !== null;
    }

    async isEmpty(): Promise<boolean> {
        this.ensureReady();
        const count = this.getChunkCount();
        return count === 0;
    }

    async close(): Promise<void> {
        if (this.db) {
            // Save before closing
            await this.save();
            this.db.close();
            this.db = null;
            this.initialized = false;
            console.log('SQLite vector store connection closed');
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
            // Ensure all required fields have values (sql.js doesn't accept undefined)
            const documentId = metadata.document_id || chunkId.split('_chunk_')[0] || 'unknown';
            const section = metadata.section || 'default';
            const contentType = metadata.content_type || 'markdown';

            this.db!.run(
                `INSERT OR REPLACE INTO embeddings (
                    id, content, embedding, metadata,
                    document_id, section, content_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    chunkId,
                    content,
                    JSON.stringify(embedding),
                    JSON.stringify(metadata),
                    documentId,
                    section,
                    contentType
                ]
            );
        } catch (error) {
            throw new RAGError(`Failed to insert chunk ${chunkId}`, error);
        }
    }

    async insertBatch(entries: BatchEntry[]): Promise<void> {
        if (!entries || entries.length === 0) return;
        this.ensureReady();

        let successCount = 0;
        let skippedCount = 0;

        try {
            // Use transaction for batch insert
            this.db!.run('BEGIN TRANSACTION');

            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];

                // Skip entries with invalid embeddings
                if (!entry.embedding || !Array.isArray(entry.embedding) || entry.embedding.length === 0) {
                    console.warn(`Skipping chunk ${entry.chunkId}: invalid or missing embedding`);
                    skippedCount++;
                    continue;
                }

                try {
                    // Ensure all required fields have values (sql.js doesn't accept undefined)
                    const documentId = entry.metadata.document_id || entry.chunkId.split('_chunk_')[0] || 'unknown';
                    const section = entry.metadata.section || 'default';
                    const contentType = entry.metadata.content_type || 'markdown';

                    this.db!.run(
                        `INSERT OR REPLACE INTO embeddings (
                            id, content, embedding, metadata,
                            document_id, section, content_type
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            entry.chunkId,
                            entry.content,
                            JSON.stringify(entry.embedding),
                            JSON.stringify(entry.metadata),
                            documentId,
                            section,
                            contentType
                        ]
                    );
                    successCount++;
                } catch (entryError) {
                    console.error(`Failed to insert entry ${i + 1}/${entries.length}:`, {
                        chunkId: entry.chunkId,
                        contentLength: entry.content?.length,
                        embeddingLength: entry.embedding?.length,
                        metadata: entry.metadata,
                        metadataKeys: Object.keys(entry.metadata || {}),
                        documentId: entry.metadata?.document_id,
                        section: entry.metadata?.section,
                        contentType: entry.metadata?.content_type,
                        error: entryError
                    });
                    throw entryError;
                }
            }

            this.db!.run('COMMIT');

            if (skippedCount > 0) {
                console.log(`✅ Batch inserted ${successCount} chunks (${skippedCount} skipped due to missing embeddings)`);
            } else {
                console.log(`✅ Batch inserted ${successCount} chunks`);
            }
        } catch (error) {
            try {
                this.db!.run('ROLLBACK');
            } catch (rollbackError) {
                console.error('Failed to rollback transaction:', rollbackError);
            }
            console.error('insertBatch failed:', error);
            throw new RAGError('Failed to insert batch', error);
        }
    }

    async upsert(entry: VectorEntry): Promise<void> {
        await this.insert(entry.id, entry.content, entry.embedding, entry.metadata);
    }

    async get(chunkId: string): Promise<VectorEntry | null> {
        this.ensureReady();

        try {
            const stmt = this.db!.prepare(
                `SELECT id, content, embedding, metadata
                 FROM embeddings
                 WHERE id = ?`
            );

            stmt.bind([chunkId]);

            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();

                return {
                    id: row.id as string,
                    content: row.content as string,
                    embedding: JSON.parse(row.embedding as string),
                    metadata: JSON.parse(row.metadata as string)
                };
            }

            stmt.free();
            return null;
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
            const params: any[] = [];

            // Add metadata filters
            for (const [key, values] of Object.entries(filters)) {
                if (!values || values.length === 0) continue;

                if (key === 'document_id' || key === 'section' || key === 'content_type') {
                    // Direct column filters
                    const placeholders = values.map(() => '?').join(',');
                    whereConditions.push(`${key} IN (${placeholders})`);
                    params.push(...values);
                }
            }

            const whereClause = whereConditions.length > 0
                ? 'WHERE ' + whereConditions.join(' AND ')
                : '';

            // Get all chunks (with filtering)
            // NOTE: Always select embedding column for similarity calculation
            const stmt = this.db!.prepare(
                `SELECT
                    id,
                    content,
                    embedding,
                    metadata
                FROM embeddings
                ${whereClause}`
            );

            stmt.bind(params);

            const results: any[] = [];

            // Calculate cosine similarity for each chunk
            while (stmt.step()) {
                const row = stmt.getAsObject();
                const embedding = JSON.parse(row.embedding as string);
                const score = this.cosineSimilarity(queryEmbedding, embedding);

                results.push({
                    chunk_id: row.id,
                    content: row.content,
                    metadata: JSON.parse(row.metadata as string),
                    score,
                    embedding: includeEmbeddings ? embedding : undefined
                });
            }

            stmt.free();

            // Sort by score (descending) and filter by threshold
            const filtered = results
                .filter(r => r.score >= scoreThreshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            const queryTime = Date.now() - startTime;

            return {
                chunks: filtered,
                totalFound: filtered.length,
                queryTime
            };
        } catch (error) {
            throw new RAGError('Vector search failed', error);
        }
    }

    async delete(chunkId: string): Promise<boolean> {
        this.ensureReady();

        try {
            this.db!.run('DELETE FROM embeddings WHERE id = ?', [chunkId]);
            return this.db!.getRowsModified() > 0;
        } catch (error) {
            throw new RAGError(`Failed to delete chunk ${chunkId}`, error);
        }
    }

    async clear(): Promise<void> {
        this.ensureReady();

        try {
            this.db!.run('DELETE FROM embeddings');
            this.db!.run('DELETE FROM document_chunks');
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

        try {
            this.db!.run('BEGIN TRANSACTION');

            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, content.length);
                const chunkContent = content.substring(start, end);
                const chunkId = `${docId}_chunk_${i}`;

                // TODO: Generate embedding for chunk
                // For now, using zero vector as placeholder
                const embedding = new Array(this.dimension).fill(0);

                this.db!.run(
                    `INSERT OR REPLACE INTO document_chunks (
                        document_id, chunk_index, chunk_content,
                        embedding, total_chunks, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        docId,
                        i,
                        chunkContent,
                        JSON.stringify(embedding),
                        totalChunks,
                        JSON.stringify(metadata)
                    ]
                );

                chunks.push(chunkId);
            }

            this.db!.run('COMMIT');
            console.log(`✅ Inserted large document: ${totalChunks} chunks`);

            return chunks;
        } catch (error) {
            this.db!.run('ROLLBACK');
            throw new RAGError('Failed to insert large document', error);
        }
    }

    async retrieveLargeDocument(docId: string): Promise<string> {
        this.ensureReady();

        try {
            const stmt = this.db!.prepare(
                `SELECT chunk_content
                 FROM document_chunks
                 WHERE document_id = ?
                 ORDER BY chunk_index ASC`
            );

            stmt.bind([docId]);

            const chunks: string[] = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                chunks.push(row.chunk_content as string);
            }

            stmt.free();

            if (chunks.length === 0) {
                throw new Error(`Document ${docId} not found`);
            }

            return chunks.join('');
        } catch (error) {
            throw new RAGError(`Failed to retrieve large document ${docId}`, error);
        }
    }

    async getDocumentChunks(docId: string): Promise<DocumentChunk[]> {
        this.ensureReady();

        try {
            const stmt = this.db!.prepare(
                `SELECT chunk_index, chunk_content, total_chunks, metadata
                 FROM document_chunks
                 WHERE document_id = ?
                 ORDER BY chunk_index ASC`
            );

            stmt.bind([docId]);

            const result: DocumentChunk[] = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                result.push({
                    chunkId: `${docId}_chunk_${row.chunk_index}`,
                    chunkIndex: row.chunk_index as number,
                    totalChunks: row.total_chunks as number,
                    content: row.chunk_content as string,
                    metadata: JSON.parse(row.metadata as string)
                });
            }

            stmt.free();
            return result;
        } catch (error) {
            throw new RAGError(`Failed to get document chunks for ${docId}`, error);
        }
    }

    // ==================== Management & Utilities ====================

    async getStats(): Promise<VectorStoreStats> {
        this.ensureReady();

        try {
            // Get total chunks
            const countStmt = this.db!.prepare('SELECT COUNT(*) as count FROM embeddings');
            countStmt.step();
            const totalChunks = countStmt.getAsObject().count as number;
            countStmt.free();

            // Get document counts
            const docCountStmt = this.db!.prepare(`
                SELECT document_id, COUNT(*) as count
                FROM embeddings
                GROUP BY document_id
            `);

            const documentCounts: Record<string, number> = {};
            while (docCountStmt.step()) {
                const row = docCountStmt.getAsObject();
                documentCounts[row.document_id as string] = row.count as number;
            }
            docCountStmt.free();

            // Get content type counts
            const typeCountStmt = this.db!.prepare(`
                SELECT content_type, COUNT(*) as count
                FROM embeddings
                GROUP BY content_type
            `);

            const contentTypeCounts: Record<string, number> = {};
            while (typeCountStmt.step()) {
                const row = typeCountStmt.getAsObject();
                contentTypeCounts[row.content_type as string] = row.count as number;
            }
            typeCountStmt.free();

            // Get creation/update times
            const timeStmt = this.db!.prepare(`
                SELECT MIN(created_at) as created, MAX(updated_at) as updated
                FROM embeddings
            `);

            let createdAt = new Date();
            let updatedAt = new Date();

            if (timeStmt.step()) {
                const row = timeStmt.getAsObject();
                createdAt = row.created ? new Date((row.created as number) * 1000) : new Date();
                updatedAt = row.updated ? new Date((row.updated as number) * 1000) : new Date();
            }
            timeStmt.free();

            return {
                totalChunks,
                embeddingModel: this.embeddingModel,
                dimension: this.dimension,
                createdAt,
                updatedAt,
                documentCounts,
                contentTypeCounts,
                backend: 'sqlite'
            };
        } catch (error) {
            throw new RAGError('Failed to get stats', error);
        }
    }

    async export(): Promise<string> {
        this.ensureReady();

        try {
            const stmt = this.db!.prepare(`
                SELECT id, content, embedding, metadata
                FROM embeddings
                ORDER BY id
            `);

            const entries: VectorEntry[] = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                entries.push({
                    id: row.id as string,
                    content: row.content as string,
                    embedding: JSON.parse(row.embedding as string),
                    metadata: JSON.parse(row.metadata as string)
                });
            }

            stmt.free();

            const exportData = {
                version: '1.0',
                embeddingModel: this.embeddingModel,
                dimension: this.dimension,
                totalChunks: entries.length,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                entries
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

            new Notice(`Imported ${data.entries.length} chunks to SQLite`);
        } catch (error) {
            throw new RAGError('Failed to import data', error);
        }
    }

    async save(): Promise<void> {
        if (!this.db) return;

        try {
            // Export database to binary (Uint8Array)
            const data = this.db.export();

            // Create a new ArrayBuffer from the Uint8Array
            const arrayBuffer = new ArrayBuffer(data.length);
            const view = new Uint8Array(arrayBuffer);
            view.set(data);

            // Ensure parent directory exists
            const dirPath = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'));
            try {
                await this.app.vault.adapter.exists(dirPath);
            } catch {
                // Directory doesn't exist, create it
                console.log(`Creating directory: ${dirPath}`);
                await this.app.vault.adapter.mkdir(dirPath);
            }

            // Save to vault using adapter
            await this.app.vault.adapter.writeBinary(this.dbPath, arrayBuffer);

            console.log(`✅ SQLite database saved to ${this.dbPath} (${(arrayBuffer.byteLength / 1024).toFixed(2)} KB)`);
        } catch (error) {
            console.error('Failed to save SQLite database:', error);
            throw new RAGError('Failed to save SQLite database', error);
        }
    }

    async load(): Promise<void> {
        // No-op for sql.js (data is loaded in initialize)
    }

    // ==================== Maintenance ====================

    async optimize(): Promise<void> {
        this.ensureReady();

        try {
            // Run VACUUM to reclaim space and optimize
            this.db!.run('VACUUM');

            // Analyze tables for query optimization
            this.db!.run('ANALYZE');

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
            const dupStmt = this.db!.prepare(`
                SELECT id, COUNT(*) as count
                FROM embeddings
                GROUP BY id
                HAVING COUNT(*) > 1
            `);

            while (dupStmt.step()) {
                const row = dupStmt.getAsObject();
                errors.push(`Duplicate ID found: ${row.id} (${row.count} occurrences)`);
            }
            dupStmt.free();

            // Check database integrity
            const integrityStmt = this.db!.prepare('PRAGMA integrity_check');
            integrityStmt.step();
            const integrityResult = integrityStmt.getAsObject();
            integrityStmt.free();

            if (integrityResult.integrity_check !== 'ok') {
                errors.push('Database integrity check failed');
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

    getBackend(): 'json' | 'sqlite' | 'pgvector' {
        return 'sqlite';
    }

    // ==================== Private Helpers ====================

    private ensureReady(): void {
        if (!this.isReady()) {
            throw new Error('SQLite vector store not initialized. Call initialize() first.');
        }
    }

    private getChunkCount(): number {
        this.ensureReady();
        const stmt = this.db!.prepare('SELECT COUNT(*) as count FROM embeddings');
        stmt.step();
        const result = stmt.getAsObject();
        stmt.free();
        return result.count as number;
    }

    private createTables(): void {
        // Create embeddings table
        this.db!.run(`
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                embedding TEXT NOT NULL,
                metadata TEXT,
                document_id TEXT,
                section TEXT,
                content_type TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);

        // Create indexes
        this.db!.run(`
            CREATE INDEX IF NOT EXISTS idx_embeddings_document_id
            ON embeddings (document_id)
        `);

        this.db!.run(`
            CREATE INDEX IF NOT EXISTS idx_embeddings_content_type
            ON embeddings (content_type)
        `);

        // Create document_chunks table for large documents
        this.db!.run(`
            CREATE TABLE IF NOT EXISTS document_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_content TEXT NOT NULL,
                embedding TEXT,
                total_chunks INTEGER NOT NULL,
                metadata TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                UNIQUE(document_id, chunk_index)
            )
        `);

        this.db!.run(`
            CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
            ON document_chunks (document_id)
        `);

        console.log('✅ Database tables and indexes created');
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            magnitudeA += a[i] * a[i];
            magnitudeB += b[i] * b[i];
        }

        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }
}
