/**
 * Conversation Memory Manager
 * 
 * Handles conversation memory with configurable compression and vector store integration
 */

import { Notice } from 'obsidian';
import { RAGRetriever } from '../rag/retriever';
import { LLMManager } from '../llm/llmManager';

export interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    tokens?: number;
}

export interface MemoryConfig {
    enabled: boolean;
    maxMessages: number;
    compressionThreshold: number; // When to start showing compression warnings
    compressionRatio: number; // How much to compress (0.1 = 10% of original)
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
}

export class ConversationMemoryManager {
    private messages: ConversationMessage[] = [];
    private config: MemoryConfig;
    private retriever: RAGRetriever;
    private llmManager: LLMManager;
    private compressedChunks: number = 0;

    constructor(retriever: RAGRetriever, llmManager: LLMManager, config: MemoryConfig) {
        this.retriever = retriever;
        this.llmManager = llmManager;
        this.config = config;
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
            tokens: this.estimateTokens(content)
        };

        this.messages.push(message);
        
        // Check if we need to compress
        if (this.config.autoCompress && this.messages.length > this.config.maxMessages) {
            this.compressMemory();
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

        return {
            totalMessages,
            messagesUntilCompression,
            compressionProgress,
            isNearCompression,
            lastCompression: this.messages.find(m => m.role === 'system' && m.content.includes('Memory compressed'))?.timestamp,
            compressedChunks: this.compressedChunks
        };
    }

    /**
     * Compress conversation memory using LLM
     */
    async compressMemory(): Promise<void> {
        if (this.messages.length <= this.config.maxMessages) {
            return;
        }

        try {
            console.log('🗜️ Starting memory compression...');
            
            // Get messages to compress (keep recent ones)
            const messagesToCompress = this.messages.slice(0, -Math.floor(this.config.maxMessages * 0.3));
            const recentMessages = this.messages.slice(-Math.floor(this.config.maxMessages * 0.3));

            // Create compression prompt
            const conversationText = messagesToCompress
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');

            const compressionPrompt = `${this.config.compressionPrompt}

Conversation to compress:
${conversationText}

Please provide a concise summary that captures the key points, decisions, and context from this conversation.`;

            // Use LLM to compress
            const compressedSummary = await this.compressWithLLM(compressionPrompt);
            
            // Create compressed message
            const compressedMessage: ConversationMessage = {
                id: this.generateId(),
                role: 'system',
                content: `Memory compressed: ${compressedSummary}`,
                timestamp: Date.now(),
                tokens: this.estimateTokens(compressedSummary)
            };

            // Replace old messages with compressed version
            this.messages = [compressedMessage, ...recentMessages];
            this.compressedChunks++;

            // Add to vector store if enabled
            // TODO: Implement vector store integration for compressed memory
            // if (this.config.addToVectorStore && this.retriever.isReady()) {
            //     await this.addToVectorStore(compressedSummary, messagesToCompress);
            // }

            console.log('✅ Memory compressed successfully');
            new Notice(`Memory compressed: ${this.compressedChunks} chunks created`);

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
     * Add compressed memory to vector store
     * TODO: Implement proper vector store integration
     */
    private async addToVectorStore(summary: string, originalMessages: ConversationMessage[]): Promise<void> {
        // TODO: Implement vector store integration for compressed memory chunks
        console.log('📚 Vector store integration not yet implemented for conversation memory');
    }

    /**
     * Clear conversation memory
     */
    clearMemory(): void {
        this.messages = [];
        this.compressedChunks = 0;
        console.log('🧹 Conversation memory cleared');
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
    } {
        const totalTokens = this.messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
        const memoryUsage = this.messages.length / this.config.maxMessages;

        return {
            totalMessages: this.messages.length,
            totalTokens,
            compressedChunks: this.compressedChunks,
            memoryUsage
        };
    }

    /**
     * Generate unique ID
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
