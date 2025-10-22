/**
 * Conversation Memory Manager - Optimized Version
 *
 * Handles conversation memory with:
 * - Backend-adaptive configuration
 * - Batch vector store integration
 * - Semantic memory retrieval
 * - Intelligent compression
 */

import { Notice } from 'obsidian';
import { RAGRetriever } from '../rag/retriever';
import { LLMManager } from '../llm/llmManager';
import { getAdaptiveCompressionSettings, getAdaptiveMemoryConfig } from './adaptiveMemoryConfig';
import { VectorStoreBackend } from '../rag/vectorStore/types';
import { BatchEntry } from '../rag/vectorStore/types';

export interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    tokens?: number;
    conversationId?: string; // For grouping related conversations
}

export interface MemoryConfig {
    enabled: boolean;
    maxMessages: number;
    compressionThreshold: number;
    compressionRatio: number;
    autoCompress: boolean;
    addToVectorStore: boolean;
    compressionPrompt: string;
}

export interface MemoryStatus {
    totalMessages: number;
    messagesUntilCompression: number;
    compressionProgress: number; // 0-1
    isNearCompression: boolean;
    lastCompression?: number;
    compressedChunks: number;
    backend?: VectorStoreBackend;
    recommendedMaxMessages?: number;
}

export interface RetrievedMemory {
    content: string;
    timestamp: number;
    relevanceScore: number;
    conversationId?: string;
}

export class ConversationMemoryManager {
    private messages: ConversationMessage[] = [];
    private config: MemoryConfig;
    private retriever: RAGRetriever;
    private llmManager: LLMManager;
    private compressedChunks: number = 0;
    private triggerUIUpdate?: () => void;
    private currentConversationId: string;
    private pendingCompressions: ConversationMessage[][] = [];

    constructor(
        retriever: RAGRetriever,
        llmManager: LLMManager,
        config: MemoryConfig,
        uiUpdateCallback?: () => void
    ) {
        this.retriever = retriever;
        this.llmManager = llmManager;
        this.config = config;
        this.triggerUIUpdate = uiUpdateCallback;
        this.currentConversationId = this.generateConversationId();
    }

    /**
     * Add a message to the conversation memory
     */
    addMessage(role: 'user' | 'assistant' | 'system', content: string): ConversationMessage {
        const message: ConversationMessage = {
            id: this.generateId(),
            role,
            content,
            timestamp: Date.now(),
            tokens: this.estimateTokens(content),
            conversationId: this.currentConversationId
        };

        this.messages.push(message);

        // Check if we need to compress
        if (this.config.autoCompress && this.messages.length > this.config.maxMessages) {
            // Use adaptive compression settings
            const avgLength = this.messages.reduce((sum, m) => sum + m.content.length, 0) / this.messages.length;
            const backend = this.retriever.getVectorStore()?.getBackend() || 'json';

            const { shouldCompress } = getAdaptiveCompressionSettings(
                this.messages.length,
                avgLength,
                backend as VectorStoreBackend
            );

            if (shouldCompress) {
                // Don't await - compress in background
                this.compressMemory().catch(err =>
                    console.error('Background compression failed:', err)
                );
            }
        }

        return message;
    }

    /**
     * Get conversation history for context
     */
    getConversationHistory(limit?: number): ConversationMessage[] {
        if (limit) {
            return this.messages.slice(-limit);
        }
        return [...this.messages];
    }

    /**
     * Get memory status for UI display
     */
    getMemoryStatus(): MemoryStatus {
        const totalMessages = this.messages.length;
        const messagesUntilCompression = Math.max(0, this.config.maxMessages - totalMessages);
        const compressionProgress = Math.min(1, totalMessages / this.config.maxMessages);
        const isNearCompression = totalMessages >= this.config.compressionThreshold;

        const backend = this.retriever.getVectorStore()?.getBackend() as VectorStoreBackend;
        const adaptiveProfile = backend ? getAdaptiveMemoryConfig(backend) : undefined;

        return {
            totalMessages,
            messagesUntilCompression,
            compressionProgress,
            isNearCompression,
            lastCompression: this.messages.find(m =>
                m.role === 'system' && m.content.includes('Memory compressed')
            )?.timestamp,
            compressedChunks: this.compressedChunks,
            backend,
            recommendedMaxMessages: adaptiveProfile?.maxMessages
        };
    }

    /**
     * Retrieve relevant memories from vector store
     */
    async retrieveRelevantMemories(query: string, topK: number = 3): Promise<RetrievedMemory[]> {
        if (!this.config.addToVectorStore || !this.retriever.isReady()) {
            return [];
        }

        try {
            const results = await this.retriever.retrieve(
                query,
                topK,
                {
                    content_type: ['conversation_memory']
                },
                0.3 // Lower threshold for memory retrieval
            );

            return results.map((chunk: any) => ({
                content: chunk.content,
                timestamp: chunk.metadata.created || Date.now(),
                relevanceScore: chunk.score,
                conversationId: chunk.metadata.conversation_id
            }));
        } catch (error) {
            console.error('Failed to retrieve memories:', error);
            return [];
        }
    }

    /**
     * Compress conversation memory using LLM - OPTIMIZED
     */
    async compressMemory(): Promise<void> {
        if (this.messages.length <= this.config.maxMessages) {
            return;
        }

        try {
            console.log('🗜️ Starting optimized memory compression...');

            // Get backend for adaptive settings
            const backend = this.retriever.getVectorStore()?.getBackend() as VectorStoreBackend || 'json';

            // Get messages to compress (keep recent ones)
            const keepRatio = this.config.compressionRatio;
            const messagesToKeep = Math.floor(this.config.maxMessages * keepRatio);
            const messagesToCompress = this.messages.slice(0, -messagesToKeep);
            const recentMessages = this.messages.slice(-messagesToKeep);

            if (messagesToCompress.length === 0) {
                return;
            }

            // Create compression prompt
            const conversationText = messagesToCompress
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');

            const avgLength = messagesToCompress.reduce((sum, m) => sum + m.content.length, 0) / messagesToCompress.length;
            const { targetTokens } = getAdaptiveCompressionSettings(
                messagesToCompress.length,
                avgLength,
                backend
            );

            const compressionPrompt = `${this.config.compressionPrompt}

Target summary length: approximately ${targetTokens} tokens.

Conversation to compress:
${conversationText}

Please provide a concise summary that captures the key points, decisions, and context from this conversation.`;

            // Use LLM to compress
            const compressedSummary = await this.compressWithLLM(compressionPrompt);

            // Create compressed message
            const compressedMessage: ConversationMessage = {
                id: this.generateId(),
                role: 'system',
                content: `[Compressed Memory] ${compressedSummary}`,
                timestamp: Date.now(),
                tokens: this.estimateTokens(compressedSummary),
                conversationId: this.currentConversationId
            };

            // Replace old messages with compressed version
            this.messages = [compressedMessage, ...recentMessages];
            this.compressedChunks++;

            // ✅ OPTIMIZATION: Add to vector store with proper metadata
            if (this.config.addToVectorStore && this.retriever.isReady()) {
                await this.addToVectorStore(compressedSummary, messagesToCompress);
            }

            console.log(`✅ Memory compressed: ${messagesToCompress.length} messages → 1 summary`);
            new Notice(`Memory compressed: ${this.compressedChunks} chunks created`);

            // Trigger UI update after compression
            this.triggerUIUpdate?.();
        } catch (error) {
            console.error('❌ Memory compression failed:', error);
            new Notice('Memory compression failed. Conversation history may be truncated.');
        }
    }

    /**
     * Use LLM to compress conversation
     */
    private async compressWithLLM(prompt: string): Promise<string> {
        if (!this.llmManager.isReady()) {
            throw new Error('LLM Manager not ready for compression');
        }

        // Get the first available provider for compression
        const providers = this.llmManager.getStats();
        if (providers.initializedProviders === 0) {
            throw new Error('No LLM providers available for compression');
        }

        // Use the default provider or first available
        const providerIds = Array.from(this.llmManager['providers'].keys());
        const providerId = providerIds[0];

        const response = await this.llmManager.chat(providerId, [
            { role: 'user', content: prompt }
        ], {
            temperature: 0.3, // Low temperature for consistent compression
            maxTokens: 1000
        });

        return response.content;
    }

    /**
     * Add compressed memory to vector store - OPTIMIZED
     */
    private async addToVectorStore(
        summary: string,
        originalMessages: ConversationMessage[]
    ): Promise<void> {
        try {
            const vectorStore = this.retriever.getVectorStore();
            if (!vectorStore) {
                throw new Error('Vector store not available');
            }

            // Extract topics and keywords from compressed memory
            const topics = this.extractTopics(summary);
            const keywords = this.extractKeywords(summary);

            // Create metadata
            const metadata = {
                document_id: `conversation_${this.currentConversationId}`,
                document_title: `Conversation Memory (${new Date().toISOString().split('T')[0]})`,
                section: `compressed_${this.compressedChunks}`,
                section_title: 'Compressed Conversation',
                content_type: 'conversation_memory',
                conversation_id: this.currentConversationId,

                // Temporal metadata
                created: originalMessages[0]?.timestamp || Date.now(),
                modified: Date.now(),
                time_range_start: originalMessages[0]?.timestamp,
                time_range_end: originalMessages[originalMessages.length - 1]?.timestamp,

                // Content metadata
                original_message_count: originalMessages.length,
                compressed_chunk_index: this.compressedChunks,
                topics,
                keywords,

                // Conversation participants
                has_user_messages: originalMessages.some(m => m.role === 'user'),
                has_assistant_messages: originalMessages.some(m => m.role === 'assistant'),

                page_reference: `Memory/${this.currentConversationId}#${this.compressedChunks}`
            };

            // Generate embedding for the compressed summary
            const embeddings = await this.retriever['embeddings'].generateEmbeddings([summary]);
            const embedding = embeddings[0];

            // Skip if embedding is undefined
            if (!embedding) {
                console.warn('⚠️ Failed to generate embedding for compressed memory');
                return;
            }

            // Create chunk ID
            const chunkId = `memory_${this.currentConversationId}_chunk_${this.compressedChunks}`;

            // ✅ OPTIMIZATION: Use insertBatch for consistency
            const batchEntry: BatchEntry = {
                chunkId,
                content: summary,
                embedding,
                metadata
            };

            await vectorStore.insertBatch([batchEntry]);
            await vectorStore.save();

            console.log(`📚 Compressed memory added to vector store: ${chunkId}`);
        } catch (error) {
            console.error('❌ Failed to add compressed memory to vector store:', error);
            // Don't throw - memory compression should still succeed even if storage fails
        }
    }

    /**
     * Extract topics from conversation summary
     */
    private extractTopics(text: string): string[] {
        // Simple topic extraction - look for capitalized phrases, project names, etc.
        const topics = new Set<string>();

        // Extract phrases in quotes
        const quotedPhrases = text.match(/"([^"]+)"/g);
        if (quotedPhrases) {
            quotedPhrases.forEach(phrase => topics.add(phrase.replace(/"/g, '')));
        }

        // Extract capitalized words (potential topics)
        const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
        if (capitalizedWords) {
            capitalizedWords.forEach(word => {
                if (word.length > 3 && !['The', 'This', 'That', 'These', 'Those'].includes(word)) {
                    topics.add(word);
                }
            });
        }

        return Array.from(topics).slice(0, 10);
    }

    /**
     * Extract keywords from conversation summary
     */
    private extractKeywords(text: string): string[] {
        const stopwords = new Set([
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from'
        ]);

        const words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopwords.has(word));

        const wordCount = new Map<string, number>();
        words.forEach(word => {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        });

        return Array.from(wordCount.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    /**
     * Start a new conversation (creates new conversation ID)
     */
    startNewConversation(): void {
        this.currentConversationId = this.generateConversationId();
        console.log(`🆕 Started new conversation: ${this.currentConversationId}`);
    }

    /**
     * Clear conversation memory
     */
    clearMemory(): void {
        this.messages = [];
        this.compressedChunks = 0;
        this.startNewConversation();
        console.log('🧹 Conversation memory cleared');
        this.triggerUIUpdate?.();
    }

    /**
     * Update memory configuration
     */
    updateConfig(newConfig: Partial<MemoryConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Memory configuration updated');
    }

    /**
     * Get memory statistics
     */
    getMemoryStats(): {
        totalMessages: number;
        totalTokens: number;
        compressedChunks: number;
        memoryUsage: number;
        currentConversationId: string;
        backend?: VectorStoreBackend;
    } {
        const totalTokens = this.messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
        const memoryUsage = this.messages.length / this.config.maxMessages;
        const backend = this.retriever.getVectorStore()?.getBackend() as VectorStoreBackend;

        return {
            totalMessages: this.messages.length,
            totalTokens,
            compressedChunks: this.compressedChunks,
            memoryUsage,
            currentConversationId: this.currentConversationId,
            backend
        };
    }

    /**
     * Export conversation history
     */
    exportConversation(): {
        conversationId: string;
        messages: ConversationMessage[];
        compressedChunks: number;
        exportDate: number;
    } {
        return {
            conversationId: this.currentConversationId,
            messages: [...this.messages],
            compressedChunks: this.compressedChunks,
            exportDate: Date.now()
        };
    }

    /**
     * Import conversation history
     */
    importConversation(data: {
        conversationId: string;
        messages: ConversationMessage[];
        compressedChunks: number;
    }): void {
        this.currentConversationId = data.conversationId;
        this.messages = data.messages;
        this.compressedChunks = data.compressedChunks;
        console.log(`📥 Imported conversation: ${data.conversationId}`);
        this.triggerUIUpdate?.();
    }

    /**
     * Generate unique conversation ID
     */
    private generateConversationId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique message ID
     */
    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Estimate token count (rough approximation)
     */
    private estimateTokens(text: string): number {
        // Rough approximation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
}
