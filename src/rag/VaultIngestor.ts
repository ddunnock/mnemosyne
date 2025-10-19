/**
 * VaultIngestor
 * 
 * Handles ingestion of individual vault files into the vector store.
 * Used by AutoIngestionManager for automatic file processing.
 */

import { TFile } from 'obsidian';
import { VectorStore } from './vectorStore';
import { EmbeddingsGenerator } from './embeddings';
import { ChunkMetadata, RAGChunk } from '../types';
import RiskManagementPlugin from '../main';

export class VaultIngestor {
    private plugin: RiskManagementPlugin;
    private vectorStore: VectorStore;
    private embeddings: EmbeddingsGenerator;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
        this.vectorStore = plugin.retriever?.getVectorStore();
        // Access embeddings from the retriever's internal embeddings generator
        // We'll need to get it via the retriever's initialization method
        this.embeddings = new EmbeddingsGenerator();
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
     * Ingest a TFile object
     */
    async ingestTFile(file: TFile): Promise<void> {
        if (!this.vectorStore) {
            throw new Error('Vector store not available');
        }

        // Ensure embeddings are initialized via the retriever
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

            // Create chunks from the file content
            const chunks = await this.createChunks(file, content);
            
            if (chunks.length === 0) {
                console.log(`No chunks created for file: ${file.path}`);
                return;
            }

            // Remove existing chunks for this file (in case it's an update)
            await this.removeExistingChunks(file.path);

            // Process each chunk
            for (const chunk of chunks) {
                try {
                    // Generate embedding
                    const embedding = await this.embeddings.generateEmbedding(chunk.content);
                    
                    // Add to vector store using the correct method
                    await this.vectorStore.insert(
                        chunk.chunk_id,
                        chunk.content,
                        embedding,
                        chunk.metadata
                    );
                } catch (error) {
                    console.error(`Error processing chunk ${chunk.chunk_id}:`, error);
                    // Continue with other chunks
                }
            }

            // Save vector store
            await this.vectorStore.save();
            
            console.log(`Successfully ingested ${chunks.length} chunks from ${file.path}`);
        } catch (error) {
            console.error(`Error ingesting file ${file.path}:`, error);
            throw error;
        }
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
     * Create chunks from file content
     */
    private async createChunks(file: TFile, content: string): Promise<RAGChunk[]> {
        const chunks: RAGChunk[] = [];
        
        // Get chunk size from settings
        const chunkSize = this.plugin.settings?.chunkSize || 1000;
        const chunkOverlap = this.plugin.settings?.chunkOverlap || 200;
        
        // Split content into chunks
        const contentChunks = this.splitIntoChunks(content, chunkSize, chunkOverlap);
        
        for (let i = 0; i < contentChunks.length; i++) {
            const chunkContent = contentChunks[i];
            
            // Create metadata for the chunk
            const metadata: ChunkMetadata = {
                document_id: file.path,
                document_title: file.basename,
                section: `chunk_${i}`,
                section_title: this.extractFirstHeading(chunkContent),
                content_type: this.getContentType(file),
                keywords: this.extractKeywords(chunkContent),
                page_reference: `${file.basename}#chunk_${i}`,
                // Add file stats
                created: file.stat.ctime,
                modified: file.stat.mtime,
                size: file.stat.size
            };

            chunks.push({
                chunk_id: `${file.path}_chunk_${i}`,
                content: chunkContent,
                metadata
            });
        }
        
        return chunks;
    }

    /**
     * Split content into overlapping chunks
     */
    private splitIntoChunks(content: string, chunkSize: number, overlap: number): string[] {
        const chunks: string[] = [];
        let start = 0;
        
        while (start < content.length) {
            const end = Math.min(start + chunkSize, content.length);
            let chunk = content.slice(start, end);
            
            // Try to break at word boundaries if not at the end
            if (end < content.length) {
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastSpace > chunkSize * 0.8) { // Only if we don't lose too much
                    chunk = chunk.slice(0, lastSpace);
                    start += lastSpace + 1;
                } else {
                    start = end;
                }
            } else {
                start = end;
            }
            
            if (chunk.trim()) {
                chunks.push(chunk.trim());
            }
            
            // Add overlap for next chunk (except for the last chunk)
            if (start < content.length) {
                start = Math.max(0, start - overlap);
            }
        }
        
        return chunks;
    }

    /**
     * Extract first heading from content for section title
     */
    private extractFirstHeading(content: string): string | undefined {
        const headingMatch = content.match(/^#+\s+(.+)$/m);
        return headingMatch ? headingMatch[1].trim() : undefined;
    }

    /**
     * Determine content type based on file extension
     */
    private getContentType(file: TFile): string {
        switch (file.extension) {
            case 'md':
                return 'markdown';
            case 'txt':
                return 'text';
            default:
                return 'unknown';
        }
    }

    /**
     * Extract keywords from content (simple implementation)
     */
    private extractKeywords(content: string): string[] {
        // Simple keyword extraction - get words that appear frequently
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        const wordCount = new Map<string, number>();
        words.forEach(word => {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        });
        
        // Return top 10 most frequent words
        return Array.from(wordCount.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    /**
     * Remove existing chunks for a file
     */
    private async removeExistingChunks(filePath: string): Promise<void> {
        if (!this.vectorStore) return;
        
        // This would need to be implemented in the VectorStore
        // For now, we'll assume the vector store handles duplicate IDs
        console.log(`Removing existing chunks for: ${filePath}`);
        
        // In a real implementation, you would:
        // 1. Query for all chunks with document_id === filePath
        // 2. Remove them from the vector store
        // For now, this is a placeholder
    }

    /**
     * Check if embeddings are ready
     */
    private isEmbeddingsReady(): boolean {
        try {
            // Try to get dimension - if this works, embeddings are initialized
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
        const openAIConfig = this.plugin.settings.llmConfigs.find(
            c => c.provider === 'openai' && c.enabled
        );

        if (!openAIConfig) {
            throw new Error(
                'No OpenAI configuration found. Please add an OpenAI provider in settings for embeddings.'
            );
        }

        try {
            const encryptedData = JSON.parse(openAIConfig.encryptedApiKey);
            const apiKey = this.plugin.keyManager.decrypt(encryptedData);

            this.embeddings.initialize(apiKey, {
                model: this.plugin.settings.embeddingModel || 'text-embedding-3-small',
            });

            console.log('✓ VaultIngestor embeddings initialized');
        } catch (error) {
            throw new Error(`Failed to initialize embeddings: ${error.message}`);
        }
    }

    /**
     * Check if the ingestor is ready for use
     */
    isReady(): boolean {
        return !!(this.vectorStore && this.isEmbeddingsReady());
    }
}
