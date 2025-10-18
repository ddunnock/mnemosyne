/**
 * Chunk Ingestor
 *
 * Loads RAG chunks from JSON files and ingests them into the vector store
 */

import { Notice, App } from 'obsidian';
import { VectorStore } from './vectorStore';
import { EmbeddingsGenerator } from './embeddings';
import { RAGChunk } from '../types';
import { RAGError } from '../types';

export interface IngestionProgress {
    total: number;
    processed: number;
    current: string;
    percentage: number;
}

export type IngestionProgressCallback = (progress: IngestionProgress) => void;

export interface IngestionResult {
    success: boolean;
    totalChunks: number;
    ingestedChunks: number;
    skippedChunks: number;
    errors: Array<{ chunkId: string; error: string }>;
    duration: number;
}

export class ChunkIngestor {
    private vectorStore: VectorStore;
    private embeddings: EmbeddingsGenerator;
    private app: App;
    /**
     * Delay helper for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    constructor(vectorStore: VectorStore, embeddings: EmbeddingsGenerator, app: App) {
        this.vectorStore = vectorStore;
        this.embeddings = embeddings;
        this.app = app;
    }

    /**
     * Ingest chunks from the plugin's data directory
     */
    async ingestFromDirectory(
        directoryPath: string = 'data/rag_chunks',
        onProgress?: IngestionProgressCallback
    ): Promise<IngestionResult> {
        const startTime = Date.now();
        let totalChunks = 0;
        let ingestedChunks = 0;
        let skippedChunks = 0;
        const errors: Array<{ chunkId: string; error: string }> = [];

        try {
            // Get list of JSON files in directory
            const files = await this.getJSONFiles(directoryPath);

            if (files.length === 0) {
                return {
                    success: false,
                    totalChunks: 0,
                    ingestedChunks: 0,
                    skippedChunks: 0,
                    errors: [{ chunkId: 'none', error: `No JSON files found in ${directoryPath}` }],
                    duration: Date.now() - startTime,
                };
            }

            console.log(`Found ${files.length} chunk files in ${directoryPath}`);

            // Load all chunks from files
            const allChunks: RAGChunk[] = [];

            for (const file of files) {
                try {
                    const chunks = await this.loadChunksFromFile(file);
                    allChunks.push(...chunks);
                    console.log(`Loaded ${chunks.length} chunks from ${file}`);
                } catch (error: any) {
                    console.error(`Error loading file ${file}:`, error);
                    errors.push({
                        chunkId: file,
                        error: error.message || 'Failed to load file',
                    });
                }
            }

            totalChunks = allChunks.length;

            if (totalChunks === 0) {
                return {
                    success: false,
                    totalChunks: 0,
                    ingestedChunks: 0,
                    skippedChunks: 0,
                    errors: [{ chunkId: 'none', error: 'No chunks found to ingest' }],
                    duration: Date.now() - startTime,
                };
            }

            console.log(`Loaded ${totalChunks} chunks from ${files.length} files`);

            // Ingest chunks in batches
            const batchSize = 10;

            for (let i = 0; i < allChunks.length; i += batchSize) {
                const batch = allChunks.slice(i, i + batchSize);

                // Add delay between batches to respect rate limits
                if (i > 0) {
                    await this.delay(2000); // 2 second delay to avoid API rate limits
                }

                // Report progress
                if (onProgress) {
                    onProgress({
                        total: totalChunks,
                        processed: i,
                        current: batch[0].chunk_id,
                        percentage: Math.round((i / totalChunks) * 100),
                    });
                }

                // Ingest batch
                const batchResult = await this.ingestChunksBatch(batch);
                ingestedChunks += batchResult.ingested;
                skippedChunks += batchResult.skipped;
                errors.push(...batchResult.errors);
            }

            // Final progress update
            if (onProgress) {
                onProgress({
                    total: totalChunks,
                    processed: totalChunks,
                    current: 'Complete',
                    percentage: 100,
                });
            }

            // Save vector store
            await this.vectorStore.save();

            const duration = Date.now() - startTime;
            console.log(`Ingestion complete: ${ingestedChunks}/${totalChunks} chunks in ${duration}ms`);

            return {
                success: errors.length === 0,
                totalChunks,
                ingestedChunks,
                skippedChunks,
                errors,
                duration,
            };
        } catch (error: any) {
            console.error('Ingestion failed:', error);
            throw new RAGError('Failed to ingest chunks', { originalError: error });
        }
    }

    /**
     * Get list of JSON files in the plugin's data directory
     */
    private async getJSONFiles(directoryPath: string): Promise<string[]> {
        try {
            // Get the plugin directory using Obsidian's adapter
            const adapter = this.app.vault.adapter;

            // Check if adapter has the necessary methods
            if (!('list' in adapter)) {
                throw new Error('Vault adapter does not support listing files');
            }

            // Construct full path to data directory
            const pluginDataPath = `.obsidian/plugins/rag-agent-manager/${directoryPath}`;

            // List files in directory
            try {
                // @ts-ignore - list method exists but isn't in types
                const listing = await adapter.list(pluginDataPath);

                // Filter for JSON files, excluding metadata files
                const jsonFiles = listing.files
                    .filter((f: string) =>
                        f.endsWith('.json') &&
                        !f.includes('complete.json') &&
                        !f.includes('schema.json') &&
                        !f.includes('migration')
                    )
                    .map((f: string) => f);

                return jsonFiles;
            } catch (e) {
                // If listing fails, try with the default chunk files
                console.warn('Could not list directory, using default chunk files');
                return [
                    '.obsidian/plugins/rag-agent-manager/data/rag_chunks/rag_chunks_definitions.json',
                    '.obsidian/plugins/rag-agent-manager/data/rag_chunks/rag_chunks_handling.json',
                    '.obsidian/plugins/rag-agent-manager/data/rag_chunks/rag_chunks_assessment.json',
                    '.obsidian/plugins/rag-agent-manager/data/rag_chunks/rag_chunks_roles.json',
                    '.obsidian/plugins/rag-agent-manager/data/rag_chunks/rag_chunks_figures.json',
                ];
            }
        } catch (error: any) {
            throw new RAGError('Failed to list files in ' + directoryPath, {
                originalError: error,
            });
        }
    }

    /**
     * Ingest a batch of chunks
     */
    private async ingestChunksBatch(chunks: RAGChunk[]): Promise<{
        ingested: number;
        skipped: number;
        errors: Array<{ chunkId: string; error: string }>;
    }> {
        let ingested = 0;
        let skipped = 0;
        const errors: Array<{ chunkId: string; error: string }> = [];

        try {
            // Generate embeddings for all chunks in batch
            const texts = chunks.map(c => c.content);
            const embeddings = await this.embeddings.generateEmbeddings(texts);

            // Create vector entries
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const embedding = embeddings[i];

                try {
                    // Check if chunk already exists
                    const existing = this.vectorStore.get(chunk.chunk_id);
                    if (existing) {
                        skipped++;
                        continue;
                    }

                    // Insert into vector store
                    this.vectorStore.insert(
                        chunk.chunk_id,
                        chunk.content,
                        embedding,
                        chunk.metadata
                    );
                    ingested++;
                } catch (error: any) {
                    console.error(`Error ingesting chunk ${chunk.chunk_id}:`, error);
                    errors.push({
                        chunkId: chunk.chunk_id,
                        error: error.message || 'Failed to ingest',
                    });
                }
            }
        } catch (error: any) {
            console.error('Error in batch ingestion:', error);
            chunks.forEach(chunk => {
                errors.push({
                    chunkId: chunk.chunk_id,
                    error: error.message || 'Batch processing failed',
                });
            });
        }

        return { ingested, skipped, errors };
    }

    /**
     * Load chunks from a JSON file using Obsidian's file system
     */
    private async loadChunksFromFile(filePath: string): Promise<RAGChunk[]> {
        try {
            const adapter = this.app.vault.adapter;

            // Read file content
            const content = await adapter.read(filePath);

            // Parse JSON
            const data = JSON.parse(content);

            // Handle both array and object with array formats
            if (Array.isArray(data)) {
                return data;
            } else if (data.chunks && Array.isArray(data.chunks)) {
                return data.chunks;
            } else {
                throw new Error('Invalid chunk file format');
            }
        } catch (error: any) {
            throw new RAGError(`Failed to load chunks from ${filePath}`, {
                originalError: error,
            });
        }
    }

    /**
     * Ingest a single chunk (for testing or manual addition)
     */
    async ingestChunk(chunk: RAGChunk): Promise<void> {
        try {
            // Generate embedding
            const embedding = await this.embeddings.generateEmbedding(chunk.content);

            // Add to vector store
            this.vectorStore.insert(
                chunk.chunk_id,
                chunk.content,
                embedding,
                chunk.metadata
            );

            console.log(`Chunk ${chunk.chunk_id} ingested successfully`);
        } catch (error: any) {
            throw new RAGError(`Failed to ingest chunk ${chunk.chunk_id}`, {
                originalError: error,
            });
        }
    }

    /**
     * Re-ingest all chunks (useful after changing embedding model)
     */
    async reingestAll(
        directoryPath: string = 'data/rag_chunks',
        onProgress?: IngestionProgressCallback
    ): Promise<IngestionResult> {
        // Clear existing vectors
        await this.vectorStore.clear();

        // Ingest fresh
        return await this.ingestFromDirectory(directoryPath, onProgress);
    }
}
