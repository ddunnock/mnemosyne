/**
 * Vector Store
 *
 * Simple JSON-based vector database for storing and searching embeddings
 * Uses cosine similarity for semantic search
 */

import { App, Notice } from 'obsidian';
import { ChunkMetadata, MetadataFilters, RetrievedChunk } from '../types';
import { VectorEntry, SearchOptions } from './types';
import { OpenAIEmbeddingProvider } from './embeddings';
import { RAGError } from '../types';

/**
 * Vector Store Index Structure
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
 * Search Result Structure
 */
interface SearchResult {
    chunks: RetrievedChunk[];
    totalFound: number;
    queryTime: number;
}

/**
 * Vector Store Statistics
 */
interface VectorStoreStats {
    totalChunks: number;
    embeddingModel: string;
    dimension: number;
    createdAt: Date;
    updatedAt: Date;
    memoryUsage: number;
    documentCounts: Record<string, number>;
    contentTypeCounts: Record<string, number>;
}

export class VectorStore {
    private app: App;
    private index: VectorStoreIndex | null = null;
    private indexPath: string;
    private loaded: boolean = false;

    constructor(app: App, indexPath: string = 'vector-store-index.json') {
        this.app = app;
        this.indexPath = indexPath;
    }

    /**
     * Initialize the vector store (create or load index)
     */
    async initialize(): Promise<void> {
        try {
            await this.load();
            this.loaded = true;
            console.log(`Vector store initialized with ${this.index?.totalChunks || 0} chunks`);
        } catch (error) {
            console.log('No existing index found, will create new one on first insert');
            this.loaded = true;
        }
    }

    /**
     * Check if vector store is ready
     */
    isReady(): boolean {
        return this.loaded;
    }

    /**
     * Check if store is empty
     */
    isEmpty(): boolean {
        return !this.index || this.index.entries.length === 0;
    }

    /**
     * Insert a single chunk with its embedding
     */
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

    /**
     * Insert multiple chunks in batch
     */
    async insertBatch(entries: Array<{
        chunkId: string;
        content: string;
        embedding: number[];
        metadata: ChunkMetadata;
    }>): Promise<void> {
        if (!entries || entries.length === 0) return;

        if (!this.index) {
            this.index = this.createEmptyIndex(entries[0].embedding.length);
        }

        for (const entry of entries) {
            await this.insert(entry.chunkId, entry.content, entry.embedding, entry.metadata);
        }
    }

    /**
     * Upsert entry (insert or update)
     */
    async upsert(entry: VectorEntry): Promise<void> {
        await this.insert(entry.id, entry.content, entry.embedding, entry.metadata);
    }

    /**
     * Get entry by ID
     */
    get(chunkId: string): VectorEntry | null {
        return this.getChunk(chunkId);
    }

    /**
     * Search for similar chunks using cosine similarity
     */
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

    /**
     * Filter entries by metadata criteria
     */
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
                    // Check if any filter value exists in the metadata array
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

    /**
     * Get a chunk by ID
     */
    getChunk(chunkId: string): VectorEntry | null {
        if (!this.index) return null;
        return this.index.entries.find(e => e.id === chunkId) || null;
    }

    /**
     * Delete a chunk by ID
     */
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

    /**
     * Clear all entries
     */
    async clear(): Promise<void> {
        if (this.index) {
            this.index.entries = [];
            this.index.totalChunks = 0;
            this.index.updatedAt = Date.now();
            await this.save();
        }
    }

    /**
     * Get statistics about the vector store
     */
    getStats(): VectorStoreStats | null {
        if (!this.index) return null;

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
            contentTypeCounts
        };
    }

    /**
     * Save index to disk
     */
    async save(): Promise<void> {
        if (!this.index) {
            // Create empty index if none exists
            this.index = this.createEmptyIndex(1536); // Default dimension
            console.warn('Creating empty index to save');
        }

        try {
            const pluginDir = '.obsidian/plugins/rag-agent-manager';
            const indexFile = `${pluginDir}/${this.indexPath}`;

            const indexData = JSON.stringify(this.index, null, 2);
            await this.app.vault.adapter.write(indexFile, indexData);

            console.log(`Vector store saved: ${this.index.totalChunks} chunks`);
        } catch (error) {
            throw new RAGError('Failed to save vector store index', error);
        }
    }
    /**
     * Load index from disk
     */
    async load(): Promise<void> {
        try {
            const pluginDir = '.obsidian/plugins/rag-agent-manager';
            const indexFile = `${pluginDir}/${this.indexPath}`;

            const indexData = await this.app.vault.adapter.read(indexFile);
            this.index = JSON.parse(indexData);

            console.log(`Vector store loaded: ${this.index?.totalChunks || 0} chunks`);
        } catch (error) {
            throw new RAGError('Failed to load vector store index', error);
        }
    }

    /**
     * Create empty index structure
     */
    private createEmptyIndex(dimension: number): VectorStoreIndex {
        return {
            version: '1.0',
            embeddingModel: 'text-embedding-3-small',
            dimension,
            totalChunks: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            entries: []
        };
    }

    /**
     * Export index for backup or transfer
     */
    async export(): Promise<string> {
        if (!this.index) {
            throw new RAGError('No index to export');
        }
        return JSON.stringify(this.index, null, 2);
    }

    /**
     * Export to JSON (alias for export)
     */
    async exportToJSON(): Promise<string> {
        return await this.export();
    }

    /**
     * Import index from JSON string
     */
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
        // Can be added later if needed
    }
}
