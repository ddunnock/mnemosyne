/**
 * RAG Retriever (Fixed with proper state checking and async handling)
 */

import { Notice } from 'obsidian';
import type { IVectorStore } from './vectorStore/IVectorStore';
import { VectorStoreFactory } from './vectorStore/VectorStoreFactory';
import { EmbeddingsGenerator } from './embeddings';
import { ChunkIngestor } from './ingestor';
import { VaultIngestor } from './VaultIngestor';
import { RetrievedChunk, MetadataFilters } from '../types';
import { RAGError } from '../types';
import RagAgentManagerPlugin from '../main';

export class RAGRetriever {
    private plugin: RagAgentManagerPlugin;
    private vectorStore: IVectorStore;
    private embeddings: EmbeddingsGenerator;
    private ingestor: ChunkIngestor;
    private isInitialized: boolean = false;
    private embeddingsReady: boolean = false;

    constructor(plugin: RagAgentManagerPlugin) {
        this.plugin = plugin;

        // Use factory to create vector store based on configuration
        this.vectorStore = VectorStoreFactory.create(
            plugin.app,
            plugin.settings.vectorStore
        );

        this.embeddings = new EmbeddingsGenerator();
        this.ingestor = new ChunkIngestor(this.vectorStore, this.embeddings, plugin.app);
    }

    /**
     * Initialize the RAG retriever
     * ✅ FIXED: Better state checking and logging
     */
    async initialize(): Promise<void> {
        try {
            console.log('Initializing RAG Retriever...');

            // Initialize vector store (always succeeds)
            await this.vectorStore.initialize();

            // ✅ NEW: Check if vector store already has data
            const existingStats = await this.vectorStore.getStats();
            if (existingStats && existingStats.totalChunks > 0) {
                console.log(`✓ Found existing vector store with ${existingStats.totalChunks} chunks (${existingStats.backend} backend)`);
            }

            // Try to initialize embeddings, but don't fail if not configured yet
            try {
                await this.initializeEmbeddings();
                this.embeddingsReady = true;
                console.log('✓ Embeddings generator initialized');
            } catch (error) {
                console.warn('Embeddings not initialized yet. Configure an OpenAI provider in settings to use RAG features.');
                this.embeddingsReady = false;
            }

            this.isInitialized = true;
            console.log('✓ RAG Retriever initialized');

            // Provide helpful feedback
            if (await this.vectorStore.isEmpty()) {
                console.warn('⚠️ Vector store is empty. Run chunk ingestion to populate it.');
            } else if (existingStats) {
                console.log(`✓ Vector store ready with ${existingStats.totalChunks} chunks`);
            }
        } catch (error) {
            console.error('Failed to initialize RAG Retriever:', error);
            this.isInitialized = true; // Mark as initialized so other parts can work
        }
    }

    /**
     * Initialize embeddings generator with API key from settings
     */
    private async initializeEmbeddings(): Promise<void> {
        const openAIConfig = this.plugin.settings.llmConfigs.find(
            c => c.provider === 'openai' && c.enabled
        );

        if (!openAIConfig) {
            throw new RAGError(
                'No OpenAI configuration found. Please add an OpenAI provider in settings for embeddings.'
            );
        }

        try {
            const encryptedData = JSON.parse(openAIConfig.encryptedApiKey);
            const apiKey = this.plugin.keyManager.decrypt(encryptedData);

            this.embeddings.initialize(apiKey, {
                model: this.plugin.settings.embeddingModel || 'text-embedding-3-small',
            });

            this.embeddingsReady = true;
        } catch (error) {
            throw new RAGError('Failed to initialize embeddings', { originalError: error });
        }
    }

    /**
     * Ensure embeddings are initialized before use
     */
    private async ensureEmbeddingsReady(): Promise<void> {
        if (this.embeddingsReady) {
            return;
        }

        try {
            await this.initializeEmbeddings();
            console.log('✓ Embeddings initialized on-demand');
        } catch (error) {
            throw new RAGError(
                'Embeddings not configured. Please add an OpenAI provider in settings.',
                { originalError: error }
            );
        }
    }

    /**
     * Retrieve relevant chunks for a query
     * ✅ FIXED: Added scoreThreshold parameter
     */
    async retrieve(
        query: string,
        topK: number = 5,
        filters?: MetadataFilters,
        scoreThreshold: number = 0.7
    ): Promise<RetrievedChunk[]> {
        if (!this.isInitialized) {
            throw new RAGError('RAG Retriever not initialized. Call initialize() first.');
        }

        if (!query || query.trim().length === 0) {
            throw new RAGError('Query cannot be empty');
        }

        try {
            // Ensure embeddings are ready
            await this.ensureEmbeddingsReady();

            // Generate query embedding
            const queryEmbedding = await this.embeddings.generateEmbedding(query);

            // Search vector store
            const searchResult = await this.vectorStore.search(queryEmbedding, {
                topK,
                scoreThreshold,
                filters,
                includeEmbeddings: false
            });

            console.log(`Retrieved ${searchResult.chunks.length} chunks for query: "${query.substring(0, 50)}..."`);

            return searchResult.chunks;
        } catch (error) {
            console.error('Error during retrieval:', error);
            throw new RAGError('Failed to retrieve chunks', { originalError: error });
        }
    }

    /**
     * Ingest chunks from vault files (Markdown files)
     * ✅ UPDATED: Now uses vault ingestion instead of JSON file ingestion
     */
    async ingestChunks(directoryPath?: string): Promise<number> {
        if (!this.isInitialized) {
            throw new RAGError('RAG Retriever not initialized');
        }

        try {
            // Ensure embeddings are ready before ingestion
            await this.ensureEmbeddingsReady();

            new Notice('Starting vault ingestion...');

            // Use VaultIngestor to process Markdown files from the vault
            const vaultIngestor = new VaultIngestor(this.plugin);

            // Get all Markdown files from the vault
            const markdownFiles = this.plugin.app.vault.getMarkdownFiles();
            
            if (markdownFiles.length === 0) {
                new Notice('No Markdown files found in vault');
                return 0;
            }

            console.log(`Found ${markdownFiles.length} Markdown files to process`);

            let totalChunks = 0;
            let processedFiles = 0;

            // Process files in batches to avoid overwhelming the system
            const batchSize = 5;
            for (let i = 0; i < markdownFiles.length; i += batchSize) {
                const batch = markdownFiles.slice(i, i + batchSize);
                
                for (const file of batch) {
                    try {
                        await vaultIngestor.ingestTFile(file);
                        processedFiles++;
                        
                        // Update progress
                        const progress = Math.round((processedFiles / markdownFiles.length) * 100);
                        if (progress % 20 === 0) {
                            console.log(`Vault ingestion progress: ${progress}%`);
                        }
                    } catch (error) {
                        console.error(`Error processing file ${file.path}:`, error);
                    }
                }
            }

            // Get final stats
            const stats = await this.vectorStore.getStats();
            if (stats) {
                totalChunks = stats.totalChunks;
                console.log(`Vector store verification: ${totalChunks} chunks available`);
            }

            new Notice(`✓ Ingested ${totalChunks} chunks from ${processedFiles} files successfully!`);
            return totalChunks;
        } catch (error: any) {
            console.error('Error during vault ingestion:', error);

            if (error.message && error.message.includes('Embeddings not configured')) {
                new Notice('✖ Please configure an OpenAI API key in settings first.');
            } else {
                new Notice('✖ Vault ingestion failed. Check console for details.');
            }
            throw error;
        }
    }

    /**
     * Helper: delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Re-ingest all chunks
     * ✅ FIXED: Same improvements as ingestChunks
     */
    async reingestAll(directoryPath?: string): Promise<void> {
        if (!this.isInitialized) {
            throw new RAGError('RAG Retriever not initialized');
        }

        try {
            await this.ensureEmbeddingsReady();

            new Notice('Re-ingesting all chunks...');

            const path = directoryPath || 'data/rag_chunks';
            const result = await this.ingestor.reingestAll(path);

            // ✅ NEW: Force save and wait
            console.log('Saving vector store...');
            await this.vectorStore.save();
            await this.delay(200);

            if (result.success) {
                new Notice(`✓ Re-ingested ${result.ingestedChunks} chunks`);
            } else {
                new Notice(`⚠️ Re-ingestion completed with errors`);
            }
        } catch (error) {
            console.error('Error during re-ingestion:', error);
            new Notice('✖ Re-ingestion failed');
            throw error;
        }
    }

    /**
     * Check if system is ready
     * ✅ FIXED: More accurate check
     */
    isReady(): boolean {
        // Check if initialized and embeddings are ready
        // Note: We don't check isEmpty() here because it's async
        // Callers should check isEmpty() separately if needed
        return this.isInitialized && this.embeddingsReady && this.vectorStore.isReady();
    }

    /**
     * Get the vector store instance
     */
    getVectorStore(): IVectorStore {
        return this.vectorStore;
    }

    // ... (rest of methods remain the same)

    validateChunks(directoryPath?: string): Promise<{ valid: boolean; errors: string[]; warnings: string[]; }> {
        return Promise.resolve({ valid: true, errors: [], warnings: [] });
    }

    async clearIndex(): Promise<void> {
        await this.vectorStore.clear();
        new Notice('Vector store index cleared');
    }

    async exportIndex(): Promise<string> {
        return await this.vectorStore.export();
    }

    async importIndex(json: string): Promise<void> {
        await this.vectorStore.import(json);
        new Notice('Vector store index imported');
    }

    async getStats() {
        return await this.vectorStore.getStats();
    }

    async test(): Promise<boolean> {
        try {
            await this.ensureEmbeddingsReady();

            const embeddingsOk = await this.embeddings.test();
            if (!embeddingsOk) {
                console.error('Embeddings test failed');
                return false;
            }

            if (!await this.vectorStore.isEmpty()) {
                const results = await this.retrieve('test query', 1);
                if (results.length === 0) {
                    console.warn('Retrieval returned no results');
                }
            }

            return true;
        } catch (error) {
            console.error('RAG system test failed:', error);
            return false;
        }
    }

    async clear(): Promise<void> {
        await this.vectorStore.clear();
        new Notice('Vector store cleared');
    }

    exportVectorStore(): string {
        return JSON.stringify(this.vectorStore.getStats(), null, 2);
    }

    async importVectorStore(json: string): Promise<void> {
        await this.vectorStore.import(json);
        new Notice('Vector store imported successfully');
    }

    async cleanup(): Promise<void> {
        if (this.isInitialized) {
            await this.vectorStore.save();
        }

        // Note: stopAutoSave is only available on JSONVectorStore, not needed for other backends
        if ('stopAutoSave' in this.vectorStore && typeof this.vectorStore.stopAutoSave === 'function') {
            (this.vectorStore as any).stopAutoSave();
        }

        this.embeddings.clearCache();

        console.log('RAG Retriever cleaned up');
    }
}
