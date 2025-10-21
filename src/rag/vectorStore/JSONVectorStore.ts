/**
 * JSON Vector Store Implementation
 *
 * Simple JSON-based vector database for storing and searching embeddings
 * Uses cosine similarity for semantic search
 * Best for small to medium vaults (<50K chunks)
 */

import { App, Notice } from 'obsidian';
import { ChunkMetadata, MetadataFilters, RetrievedChunk } from '../../types';
import { RAGError } from '../../types';
import { OpenAIEmbeddingProvider } from '../embeddings';
import { IVectorStore } from './IVectorStore';
import {
    VectorEntry,
    SearchOptions,
    SearchResult,
    VectorStoreStats,
    BatchEntry,
    DocumentChunk,
    JSONBackendConfig
} from './types';

/**
 * JSON Vector Store Index Structure
 */
interface VectorStoreIndex {
    version: string;
    embeddingModel: string;
    dimension: number;
    totalChunks: number;
    createdAt: number;
    updatedAt: number;
    entries: VectorEntry[];
}

/**
 * JSON-based vector store implementation
 */
export class JSONVectorStore implements IVectorStore {
    private app: App;
    private index: VectorStoreIndex | null = null;
    private config: JSONBackendConfig;
    private embeddingModel: string;
    private loaded: boolean = false;

    constructor(app: App, config: JSONBackendConfig, embeddingModel: string = 'text-embedding-3-small') {
        this.app = app;
        this.config = config;
        this.embeddingModel = embeddingModel;
    }

    // ==================== Lifecycle ====================

    async initialize(): Promise<void> {
        try {
            await this.load();
            this.loaded = true;
            console.log(`JSON Vector store initialized with ${this.index?.totalChunks || 0} chunks`);
        } catch (error) {
            console.log('No existing index found, will create new one on first insert');
            this.loaded = true;
        }
    }

    isReady(): boolean {
        return this.loaded;
    }

    async isEmpty(): Promise<boolean> {
        return !this.index || this.index.entries.length === 0;
    }

    async close(): Promise<void> {
        // Save before closing
        if (this.index) {
            await this.save();
        }
        this.loaded = false;
    }

    // ==================== Basic Operations ====================

    async insert(
        chunkId: string,
        content: string,
        embedding: number[],
        metadata: ChunkMetadata
    ): Promise<void> {
        if (!this.index) {
            this.index = this.createEmptyIndex(embedding.length);
        }

        // Check if chunk already exists
        const existingIndex = this.index.entries.findIndex(e => e.id === chunkId);

        const entry: VectorEntry = {
            id: chunkId,
            embedding,
            content,
            metadata
        };

        if (existingIndex >= 0) {
            // Update existing
            this.index.entries[existingIndex] = entry;
        } else {
            // Add new
            this.index.entries.push(entry);
            this.index.totalChunks++;
        }

        this.index.updatedAt = Date.now();
    }

    async insertBatch(entries: BatchEntry[]): Promise<void> {
        if (!entries || entries.length === 0) return;

        if (!this.index) {
            this.index = this.createEmptyIndex(entries[0].embedding.length);
        }

        for (const entry of entries) {
            await this.insert(entry.chunkId, entry.content, entry.embedding, entry.metadata);
        }
    }

    async upsert(entry: VectorEntry): Promise<void> {
        await this.insert(entry.id, entry.content, entry.embedding, entry.metadata);
    }

    async get(chunkId: string): Promise<VectorEntry | null> {
        if (!this.index) return null;
        return this.index.entries.find(e => e.id === chunkId) || null;
    }

    async search(
        queryEmbedding: number[],
        options: SearchOptions = {}
    ): Promise<SearchResult> {
        if (!this.index || this.index.entries.length === 0) {
            return {
                chunks: [],
                totalFound: 0,
                queryTime: 0
            };
        }

        const startTime = Date.now();
        const {
            topK = 5,
            scoreThreshold = 0.0,
            filters = {},
            includeEmbeddings = false
        } = options;

        // Filter by metadata first
        let candidates = this.index.entries;
        if (Object.keys(filters).length > 0) {
            candidates = this.filterByMetadata(candidates, filters);
        }

        // Calculate similarities
        const results: Array<{ entry: VectorEntry; score: number }> = [];

        for (const entry of candidates) {
            const score = OpenAIEmbeddingProvider.cosineSimilarity(
                queryEmbedding,
                entry.embedding
            );

            if (score >= scoreThreshold) {
                results.push({ entry, score });
            }
        }

        // Sort by score (descending)
        results.sort((a, b) => b.score - a.score);

        // Take top K
        const topResults = results.slice(0, topK);

        // Convert to RetrievedChunk format
        const chunks: RetrievedChunk[] = topResults.map(({ entry, score }) => ({
            chunk_id: entry.id,
            content: entry.content,
            metadata: entry.metadata,
            score,
            embedding: includeEmbeddings ? entry.embedding : undefined
        }));

        const queryTime = Date.now() - startTime;

        return {
            chunks,
            totalFound: results.length,
            queryTime
        };
    }

    async delete(chunkId: string): Promise<boolean> {
        if (!this.index) return false;

        const initialLength = this.index.entries.length;
        this.index.entries = this.index.entries.filter(e => e.id !== chunkId);

        if (this.index.entries.length < initialLength) {
            this.index.totalChunks = this.index.entries.length;
            this.index.updatedAt = Date.now();
            await this.save();
            return true;
        }

        return false;
    }

    async clear(): Promise<void> {
        if (this.index) {
            this.index.entries = [];
            this.index.totalChunks = 0;
            this.index.updatedAt = Date.now();
            await this.save();
        }
    }

    // ==================== Large Document Support ====================

    supportsChunking(): boolean {
        // JSON backend doesn't support native chunking (would cause memory issues)
        return false;
    }

    async insertLargeDocument(
        docId: string,
        content: string,
        metadata: ChunkMetadata,
        chunkSize?: number
    ): Promise<string[]> {
        throw new Error('Large document chunking not supported in JSON backend. Use pgvector backend for this feature.');
    }

    async retrieveLargeDocument(docId: string): Promise<string> {
        throw new Error('Large document retrieval not supported in JSON backend. Use pgvector backend for this feature.');
    }

    async getDocumentChunks(docId: string): Promise<DocumentChunk[]> {
        throw new Error('Document chunks not supported in JSON backend. Use pgvector backend for this feature.');
    }

    // ==================== Management & Utilities ====================

    async getStats(): Promise<VectorStoreStats> {
        if (!this.index) {
            return {
                totalChunks: 0,
                embeddingModel: this.embeddingModel,
                dimension: 1536,
                createdAt: new Date(),
                updatedAt: new Date(),
                memoryUsage: 0,
                documentCounts: {},
                contentTypeCounts: {},
                backend: 'json'
            };
        }

        // Count documents and content types
        const documentCounts: Record<string, number> = {};
        const contentTypeCounts: Record<string, number> = {};

        for (const entry of this.index.entries) {
            const docId = entry.metadata.document_id;
            const contentType = entry.metadata.content_type;

            documentCounts[docId] = (documentCounts[docId] || 0) + 1;
            contentTypeCounts[contentType] = (contentTypeCounts[contentType] || 0) + 1;
        }

        // Estimate memory usage
        const embeddingSize = this.index.dimension * 8; // 8 bytes per float64
        const metadataSize = 500; // Rough estimate per chunk
        const memoryUsage = this.index.totalChunks * (embeddingSize + metadataSize);

        return {
            totalChunks: this.index.totalChunks,
            embeddingModel: this.index.embeddingModel,
            dimension: this.index.dimension,
            createdAt: new Date(this.index.createdAt),
            updatedAt: new Date(this.index.updatedAt),
            memoryUsage,
            documentCounts,
            contentTypeCounts,
            backend: 'json'
        };
    }

    async export(): Promise<string> {
        if (!this.index) {
            throw new RAGError('No index to export');
        }
        return JSON.stringify(this.index, null, 2);
    }

    async import(jsonData: string): Promise<void> {
        try {
            const imported = JSON.parse(jsonData) as VectorStoreIndex;

            // Validate structure
            if (!imported.entries || !Array.isArray(imported.entries)) {
                throw new Error('Invalid index structure');
            }

            this.index = imported;
            await this.save();

            new Notice(`Imported ${this.index.totalChunks} chunks`);
        } catch (error) {
            throw new RAGError('Failed to import index', error);
        }
    }

    async save(): Promise<void> {
        if (!this.index) {
            // Create empty index if none exists
            this.index = this.createEmptyIndex(1536); // Default dimension
            console.warn('Creating empty index to save');
        }

        try {
            const pluginDir = '.obsidian/plugins/mnemosyne';
            const indexFile = `${pluginDir}/${this.config.indexPath}`;

            const indexData = JSON.stringify(this.index, null, 2);
            await this.app.vault.adapter.write(indexFile, indexData);

            console.log(`Vector store saved: ${this.index.totalChunks} chunks`);
        } catch (error) {
            console.error(`Failed to save vector store:`, error);
            throw new RAGError('Failed to save vector store index', error);
        }
    }

    async load(): Promise<void> {
        try {
            const pluginDir = '.obsidian/plugins/mnemosyne';
            const indexFile = `${pluginDir}/${this.config.indexPath}`;

            const indexData = await this.app.vault.adapter.read(indexFile);
            this.index = JSON.parse(indexData);

            console.log(`Vector store loaded: ${this.index?.totalChunks || 0} chunks`);
        } catch (error) {
            console.error(`Failed to load vector store:`, error);
            throw new RAGError('Failed to load vector store index', error);
        }
    }

    // ==================== Maintenance ====================

    async optimize(): Promise<void> {
        // JSON backend doesn't need optimization
        console.log('JSON vector store does not require optimization');
    }

    async verify(): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        if (!this.index) {
            errors.push('No index loaded');
            return { valid: false, errors };
        }

        // Check for duplicate IDs
        const ids = new Set<string>();
        for (const entry of this.index.entries) {
            if (ids.has(entry.id)) {
                errors.push(`Duplicate chunk ID: ${entry.id}`);
            }
            ids.add(entry.id);

            // Validate embedding dimension
            if (entry.embedding.length !== this.index.dimension) {
                errors.push(`Invalid embedding dimension for chunk ${entry.id}: expected ${this.index.dimension}, got ${entry.embedding.length}`);
            }
        }

        // Check total chunks count
        if (this.index.entries.length !== this.index.totalChunks) {
            errors.push(`Chunk count mismatch: index says ${this.index.totalChunks}, found ${this.index.entries.length}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    getBackend(): 'json' | 'pgvector' {
        return 'json';
    }

    // ==================== Private Helpers ====================

    private filterByMetadata(
        entries: VectorEntry[],
        filters: MetadataFilters
    ): VectorEntry[] {
        return entries.filter(entry => {
            for (const [key, values] of Object.entries(filters)) {
                if (!values || values.length === 0) continue;

                const metadataValue = entry.metadata[key];

                // Handle array metadata fields
                if (Array.isArray(metadataValue)) {
                    const hasMatch = values.some(filterValue =>
                        metadataValue.includes(filterValue)
                    );
                    if (!hasMatch) return false;
                } else {
                    // Handle single value metadata fields
                    if (!values.includes(String(metadataValue))) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    private createEmptyIndex(dimension: number): VectorStoreIndex {
        return {
            version: '1.0',
            embeddingModel: this.embeddingModel,
            dimension,
            totalChunks: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            entries: []
        };
    }

    // ==================== Legacy Compatibility ====================

    /**
     * Get chunk by ID (synchronous version for compatibility)
     */
    getChunk(chunkId: string): VectorEntry | null {
        if (!this.index) return null;
        return this.index.entries.find(e => e.id === chunkId) || null;
    }

    /**
     * Export to JSON (alias for export)
     */
    async exportToJSON(): Promise<string> {
        return await this.export();
    }

    /**
     * Import from JSON (alias for import)
     */
    async importFromJSON(json: string): Promise<void> {
        await this.import(json);
    }

    /**
     * Stop auto-save (no-op in current implementation)
     */
    stopAutoSave(): void {
        // No-op - auto-save not implemented yet
    }
}
