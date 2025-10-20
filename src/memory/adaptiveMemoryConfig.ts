/**
 * Adaptive Memory Configuration
 *
 * Provides optimized memory settings based on vector store backend
 */

import { MemoryConfig } from './conversationMemory';
import { VectorStoreBackend } from '../rag/vectorStore/types';

export interface BackendMemoryProfile {
    maxMessages: number;
    compressionThreshold: number;
    compressionRatio: number;
    autoCompress: boolean;
    addToVectorStore: boolean;
    batchCompression: boolean; // Whether to batch compress multiple conversations
    vectorStoreChunkSize: number; // Size of memory chunks to store
}

/**
 * Get optimized memory configuration based on vector store backend
 */
export function getAdaptiveMemoryConfig(backend: VectorStoreBackend): BackendMemoryProfile {
    switch (backend) {
        case 'json':
            // JSON: Conservative settings due to in-memory storage
            return {
                maxMessages: 15,              // Smaller window to manage memory
                compressionThreshold: 12,     // Compress earlier
                compressionRatio: 0.25,       // More aggressive compression (keep 25%)
                autoCompress: true,
                addToVectorStore: false,      // Don't store in JSON (slow, memory-intensive)
                batchCompression: false,
                vectorStoreChunkSize: 500     // Smaller chunks
            };

        case 'sqlite':
            // SQLite: Balanced settings - good performance, embedded
            return {
                maxMessages: 30,              // Larger window (better performance)
                compressionThreshold: 25,     // More runway before compression
                compressionRatio: 0.3,        // Moderate compression (keep 30%)
                autoCompress: true,
                addToVectorStore: true,       // Store compressed memories for retrieval
                batchCompression: true,       // Batch multiple compressions
                vectorStoreChunkSize: 1000    // Standard chunks
            };

        case 'pgvector':
            // PostgreSQL: Aggressive settings - best performance, scalable
            return {
                maxMessages: 50,              // Large window (excellent performance)
                compressionThreshold: 40,     // Lots of room
                compressionRatio: 0.35,       // Gentle compression (keep 35%)
                autoCompress: true,
                addToVectorStore: true,       // Definitely store for semantic search
                batchCompression: true,       // Batch operations are very efficient
                vectorStoreChunkSize: 1500    // Larger chunks (better context)
            };

        default:
            // Fallback to SQLite defaults
            return getAdaptiveMemoryConfig('sqlite');
    }
}

/**
 * Get optimized compression prompt based on backend
 */
export function getCompressionPrompt(backend: VectorStoreBackend): string {
    switch (backend) {
        case 'json':
            // JSON: Ultra-concise, only critical facts
            return 'Create an extremely concise summary containing ONLY the most critical information: key decisions made, essential context needed for future conversations, and specific actionable items. Omit examples, explanations, and tangential details. Prioritize facts over narrative.';

        case 'sqlite':
            // SQLite: Balanced, preserve important context
            return 'Create a balanced summary that captures: (1) key decisions and their rationale, (2) important context and relationships between topics, (3) actionable items with relevant details, and (4) any significant insights or conclusions. Maintain clarity while being concise.';

        case 'pgvector':
            // PostgreSQL: Detailed, preserve nuance and relationships
            return 'Create a comprehensive summary that preserves: (1) all key decisions with their context and rationale, (2) important relationships between topics and concepts, (3) detailed actionable items with context, (4) nuanced insights and conclusions, and (5) relevant technical details or constraints discussed. Maintain narrative flow and preserve semantic richness for future retrieval.';

        default:
            return getCompressionPrompt('sqlite');
    }
}

/**
 * Merge adaptive profile with user preferences
 */
export function mergeMemoryConfig(
    userConfig: Partial<MemoryConfig>,
    backend: VectorStoreBackend
): MemoryConfig {
    const adaptiveProfile = getAdaptiveMemoryConfig(backend);

    // User preferences override adaptive defaults
    return {
        enabled: userConfig.enabled ?? true,
        maxMessages: userConfig.maxMessages ?? adaptiveProfile.maxMessages,
        compressionThreshold: userConfig.compressionThreshold ?? adaptiveProfile.compressionThreshold,
        compressionRatio: userConfig.compressionRatio ?? adaptiveProfile.compressionRatio,
        autoCompress: userConfig.autoCompress ?? adaptiveProfile.autoCompress,
        addToVectorStore: userConfig.addToVectorStore ?? adaptiveProfile.addToVectorStore,
        compressionPrompt: userConfig.compressionPrompt ?? getCompressionPrompt(backend)
    };
}

/**
 * Get recommended settings description for UI
 */
export function getBackendRecommendations(backend: VectorStoreBackend): {
    title: string;
    description: string;
    recommendations: string[];
} {
    switch (backend) {
        case 'json':
            return {
                title: 'JSON Backend - Conservative Settings',
                description: 'Optimized for minimal memory usage with in-memory storage',
                recommendations: [
                    '✅ Keep maxMessages ≤ 20 (avoid memory issues)',
                    '✅ Enable aggressive compression (ratio ≤ 0.25)',
                    '⚠️ Disable vector store integration (slow with JSON)',
                    '✅ Compress frequently to maintain performance',
                    '📝 Use ultra-concise prompt (facts only, no narrative)'
                ]
            };

        case 'sqlite':
            return {
                title: 'SQLite Backend - Balanced Settings',
                description: 'Optimized for good performance with embedded database',
                recommendations: [
                    '✅ maxMessages: 20-40 (good balance)',
                    '✅ Enable vector store integration (fast with SQLite)',
                    '✅ Moderate compression (ratio ~0.3)',
                    '✅ Batch compression for efficiency',
                    '📝 Use balanced prompt (context + conciseness)'
                ]
            };

        case 'pgvector':
            return {
                title: 'PostgreSQL Backend - Aggressive Settings',
                description: 'Optimized for maximum performance and scalability',
                recommendations: [
                    '✅ maxMessages: 40-60 (excellent performance)',
                    '✅ Definitely enable vector store integration',
                    '✅ Gentle compression (ratio ~0.35)',
                    '✅ Large context windows for better semantic search',
                    '✅ Batch all operations for best performance',
                    '📝 Use comprehensive prompt (preserve nuance & relationships)'
                ]
            };

        default:
            return getBackendRecommendations('sqlite');
    }
}

/**
 * Calculate optimal compression settings based on conversation complexity
 */
export function getAdaptiveCompressionSettings(
    messageCount: number,
    avgMessageLength: number,
    backend: VectorStoreBackend
): {
    shouldCompress: boolean;
    compressionRatio: number;
    targetTokens: number;
} {
    const profile = getAdaptiveMemoryConfig(backend);
    const shouldCompress = messageCount >= profile.compressionThreshold;

    // Adjust compression ratio based on message complexity
    let compressionRatio = profile.compressionRatio;

    // If messages are very long, compress more aggressively
    if (avgMessageLength > 1000) {
        compressionRatio = Math.max(0.2, compressionRatio - 0.1);
    }

    // If messages are short, keep more of them
    if (avgMessageLength < 200) {
        compressionRatio = Math.min(0.5, compressionRatio + 0.1);
    }

    // Calculate target tokens for compressed summary
    const estimatedCurrentTokens = (messageCount * avgMessageLength) / 4;
    const targetTokens = Math.floor(estimatedCurrentTokens * compressionRatio);

    return {
        shouldCompress,
        compressionRatio,
        targetTokens: Math.min(targetTokens, profile.vectorStoreChunkSize * 4)
    };
}
