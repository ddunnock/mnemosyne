/**
 * VaultIngestor - Optimized Version
 *
 * Handles ingestion of individual vault files into the vector store.
 * Optimized for batch processing with semantic chunking.
 */

import { TFile, Notice } from 'obsidian';
import type { IVectorStore } from './vectorStore/IVectorStore';
import { EmbeddingsGenerator } from './embeddings';
import { ChunkMetadata, RAGChunk } from '../types';
import { SemanticChunker, ChunkingConfig } from './SemanticChunker';
import type RiskManagementPlugin from '../main';
import { BatchEntry } from './vectorStore/types';

export interface IngestionStats {
    filesProcessed: number;
    chunksCreated: number;
    chunksIngested: number;
    chunksSkipped: number;
    errors: number;
    duration: number;
}

export class VaultIngestor {
    private plugin: RiskManagementPlugin;
    private vectorStore: IVectorStore;
    private embeddings: EmbeddingsGenerator;
    private semanticChunker: SemanticChunker;
    private batchSize: number = 50; // Save every 50 chunks
    private pendingBatch: BatchEntry[] = [];

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
        this.vectorStore = plugin.retriever?.getVectorStore();
        this.embeddings = new EmbeddingsGenerator();

        // Initialize semantic chunker with settings
        const chunkingConfig: Partial<ChunkingConfig> = {
            maxChunkSize: plugin.settings?.chunkSize || 1000,
            minChunkSize: Math.floor((plugin.settings?.chunkSize || 1000) * 0.3),
            overlapSize: plugin.settings?.chunkOverlap || 200,
            respectBoundaries: true
        };

        this.semanticChunker = new SemanticChunker(chunkingConfig);
    }

    /**
     * Ingest a single file by path
     */
    async ingestFile(filePath: string): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
            throw new Error(`File not found or is not a file: ${filePath}`);
        }

        await this.ingestTFile(file);
    }

    /**
     * Ingest a TFile object - OPTIMIZED VERSION
     */
    async ingestTFile(file: TFile): Promise<void> {
        if (!this.vectorStore) {
            throw new Error('Vector store not available');
        }

        // Ensure embeddings are initialized
        if (!this.isEmbeddingsReady()) {
            await this.initializeEmbeddings();
        }

        try {
            // Read file content
            const content = await this.plugin.app.vault.read(file);

            // Skip empty files
            if (!content.trim()) {
                console.log(`Skipping empty file: ${file.path}`);
                return;
            }

            // Create semantic chunks
            const chunks = this.semanticChunker.createChunks(file, content);

            if (chunks.length === 0) {
                console.log(`No chunks created for file: ${file.path}`);
                return;
            }

            console.log(`Created ${chunks.length} chunks for ${file.path}`);

            // Remove existing chunks for this file (handle updates)
            await this.removeExistingChunks(file.path);

            // ✅ OPTIMIZATION: Batch embed all chunks at once
            const contents = chunks.map(c => c.content);
            console.log(`Generating embeddings for ${contents.length} chunks...`);

            const embeddings = await this.embeddings.generateEmbeddings(contents);

            // ✅ OPTIMIZATION: Prepare batch entries (filter out undefined embeddings)
            const batchEntries: BatchEntry[] = chunks
                .map((chunk, i) => ({
                    chunkId: chunk.chunk_id,
                    content: chunk.content,
                    embedding: embeddings[i],
                    metadata: chunk.metadata
                }))
                .filter(entry => entry.embedding !== undefined) as BatchEntry[];

            // ✅ OPTIMIZATION: Insert all chunks in one transaction
            await this.vectorStore.insertBatch(batchEntries);

            // Save periodically
            await this.vectorStore.save();

            console.log(`✅ Successfully ingested ${chunks.length} chunks from ${file.path}`);
        } catch (error) {
            console.error(`Error ingesting file ${file.path}:`, error);
            throw error;
        }
    }

    /**
     * Ingest multiple files with batch optimization
     */
    async ingestFiles(files: TFile[], onProgress?: (current: number, total: number) => void): Promise<IngestionStats> {
        const startTime = Date.now();
        const stats: IngestionStats = {
            filesProcessed: 0,
            chunksCreated: 0,
            chunksIngested: 0,
            chunksSkipped: 0,
            errors: 0,
            duration: 0
        };

        if (!this.vectorStore) {
            throw new Error('Vector store not available');
        }

        // Ensure embeddings are initialized
        if (!this.isEmbeddingsReady()) {
            await this.initializeEmbeddings();
        }

        let allBatchEntries: BatchEntry[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                if (onProgress) {
                    onProgress(i + 1, files.length);
                }

                // Read and chunk file
                const content = await this.plugin.app.vault.read(file);

                if (!content.trim()) {
                    console.log(`Skipping empty file: ${file.path}`);
                    continue;
                }

                const chunks = this.semanticChunker.createChunks(file, content);
                stats.chunksCreated += chunks.length;

                // Remove existing chunks
                await this.removeExistingChunks(file.path);

                // Generate embeddings for this file's chunks
                const contents = chunks.map(c => c.content);
                const embeddings = await this.embeddings.generateEmbeddings(contents);

                // Prepare batch entries (filter out undefined embeddings)
                const fileBatchEntries: BatchEntry[] = chunks
                    .map((chunk, j) => ({
                        chunkId: chunk.chunk_id,
                        content: chunk.content,
                        embedding: embeddings[j],
                        metadata: chunk.metadata
                    }))
                    .filter(entry => entry.embedding !== undefined) as BatchEntry[];

                allBatchEntries.push(...fileBatchEntries);

                // ✅ OPTIMIZATION: Periodic saves to prevent memory issues
                if (allBatchEntries.length >= this.batchSize) {
                    await this.vectorStore.insertBatch(allBatchEntries);
                    await this.vectorStore.save();
                    stats.chunksIngested += allBatchEntries.length;
                    console.log(`💾 Saved batch of ${allBatchEntries.length} chunks`);
                    allBatchEntries = [];
                }

                stats.filesProcessed++;
            } catch (error) {
                console.error(`Error ingesting file ${file.path}:`, error);
                stats.errors++;
            }
        }

        // Insert remaining chunks
        if (allBatchEntries.length > 0) {
            await this.vectorStore.insertBatch(allBatchEntries);
            await this.vectorStore.save();
            stats.chunksIngested += allBatchEntries.length;
        }

        stats.duration = Date.now() - startTime;

        console.log(`
📊 Ingestion Complete:
   Files: ${stats.filesProcessed}/${files.length}
   Chunks: ${stats.chunksIngested} ingested
   Errors: ${stats.errors}
   Time: ${(stats.duration / 1000).toFixed(2)}s
        `.trim());

        return stats;
    }

    /**
     * Remove a file from the vector store
     */
    async removeFile(filePath: string): Promise<void> {
        if (!this.vectorStore) {
            throw new Error('Vector store not available');
        }

        try {
            await this.removeExistingChunks(filePath);
            await this.vectorStore.save();
            console.log(`Removed file from index: ${filePath}`);
        } catch (error) {
            console.error(`Error removing file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Remove existing chunks for a file
     *
     * This searches for all chunks with the file path as document_id
     * and removes them from the vector store.
     */
    private async removeExistingChunks(filePath: string): Promise<void> {
        if (!this.vectorStore) return;

        try {
            // Get all chunks to find ones from this file
            const stats = await this.vectorStore.getStats();

            // Check if this file has chunks
            if (stats.documentCounts && stats.documentCounts[filePath]) {
                console.log(`Removing ${stats.documentCounts[filePath]} existing chunks for: ${filePath}`);

                // Search for chunks from this document
                // We use a dummy embedding since we're filtering by metadata
                const dummyEmbedding = new Array(stats.dimension).fill(0);

                const results = await this.vectorStore.search(dummyEmbedding, {
                    topK: 10000, // Large number to get all
                    filters: { document_id: [filePath] }
                });

                // Delete each chunk
                for (const chunk of results.chunks) {
                    await this.vectorStore.delete(chunk.chunk_id);
                }
            }
        } catch (error) {
            console.error(`Error removing existing chunks for ${filePath}:`, error);
            // Don't throw - allow ingestion to continue
        }
    }

    /**
     * Check if embeddings are ready
     */
    private isEmbeddingsReady(): boolean {
        try {
            this.embeddings.getDimension();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Initialize embeddings using the same logic as the retriever
     */
    private async initializeEmbeddings(): Promise<void> {
        try {
            // Import the enum
            const { EmbeddingProviderType } = await import('./embeddings');

            // Check if we have embeddingProvider config (new format)
            const embeddingProvider = this.plugin.settings.embeddingProvider;

            // Support both string and object formats for embeddingProvider
            const provider = typeof embeddingProvider === 'string'
                ? embeddingProvider
                : embeddingProvider?.provider || 'openai';

            if (provider === 'local') {
                // Use local embeddings
                const model = typeof embeddingProvider === 'object'
                    ? embeddingProvider.model || 'Xenova/all-MiniLM-L6-v2'
                    : 'Xenova/all-MiniLM-L6-v2';

                await this.embeddings.initialize(EmbeddingProviderType.LOCAL, {
                    model: model
                });

                console.log('✓ VaultIngestor local embeddings initialized');
            } else if (provider === 'azure') {
                // Use Azure/L3Harris embeddings
                const l3harrisConfig = this.plugin.settings.llmConfigs.find(
                    c => c.baseUrl?.includes('l3harris.com') && c.enabled
                );

                if (!l3harrisConfig) {
                    throw new Error(
                        'No L3Harris/Azure configuration found. Please add an L3Harris provider in settings for embeddings.'
                    );
                }

                const encryptedData = JSON.parse(l3harrisConfig.encryptedApiKey);
                const apiKey = this.plugin.keyManager.decrypt(encryptedData);

                const model = typeof embeddingProvider === 'object'
                    ? embeddingProvider.model || 'text-embedding-ada-002'
                    : 'text-embedding-ada-002';

                await this.embeddings.initialize(EmbeddingProviderType.OPENAI, {
                    apiKey: apiKey,
                    model: model,
                    baseUrl: l3harrisConfig.baseUrl
                });

                console.log('✓ VaultIngestor Azure/L3Harris embeddings initialized');
            } else {
                // Use OpenAI embeddings
                const openAIConfig = this.plugin.settings.llmConfigs.find(
                    c => c.provider === 'openai' && c.enabled
                );

                if (!openAIConfig) {
                    throw new Error(
                        'No OpenAI configuration found. Please add an OpenAI provider in settings for embeddings.'
                    );
                }

                const encryptedData = JSON.parse(openAIConfig.encryptedApiKey);
                const apiKey = this.plugin.keyManager.decrypt(encryptedData);

                await this.embeddings.initialize(EmbeddingProviderType.OPENAI, {
                    apiKey: apiKey,
                    model: this.plugin.settings.embeddingModel || 'text-embedding-3-small',
                });

                console.log('✓ VaultIngestor OpenAI embeddings initialized');
            }
        } catch (error: any) {
            throw new Error(`Failed to initialize embeddings: ${error.message}`);
        }
    }

    /**
     * Check if the ingestor is ready for use
     */
    isReady(): boolean {
        return !!(this.vectorStore && this.isEmbeddingsReady());
    }

    /**
     * Update chunking configuration
     */
    updateChunkingConfig(config: Partial<ChunkingConfig>): void {
        this.semanticChunker = new SemanticChunker(config);
    }

    /**
     * Get chunking statistics for a file
     */
    async getChunkingPreview(file: TFile): Promise<{ chunks: number; avgSize: number; sections: number }> {
        const content = await this.plugin.app.vault.read(file);
        const chunks = this.semanticChunker.createChunks(file, content);

        const avgSize = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;
        const sections = new Set(chunks.map(c => c.metadata.section_title)).size;

        return {
            chunks: chunks.length,
            avgSize: Math.round(avgSize),
            sections
        };
    }
}
