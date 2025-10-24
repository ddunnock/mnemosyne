# Conversation Memory Optimizations

## ✅ Completed Optimizations

This document details the comprehensive optimizations made to the conversation memory system for both **performance** and **semantic retrieval quality**.

---

## 🧠 Adaptive Configuration System

### Backend-Specific Memory Profiles

The conversation memory system now **automatically adapts** based on your vector store backend, optimizing for performance and capabilities:

| Backend | Max Messages | Compression Threshold | Vector Store | Reasoning |
|---------|--------------|----------------------|--------------|-----------|
| **JSON** | 15 | 12 | ❌ Disabled | Conservative - in-memory storage, avoid overhead |
| **SQLite** | 30 | 25 | ✅ Enabled | Balanced - good performance, embedded database |
| **PostgreSQL** | 50 | 40 | ✅ Enabled | Aggressive - excellent performance, scalable |

### Configuration File: `src/memory/adaptiveMemoryConfig.ts`

**Key Features:**

```typescript
export function getAdaptiveMemoryConfig(backend: VectorStoreBackend): BackendMemoryProfile {
    switch (backend) {
        case 'json':
            return {
                maxMessages: 15,              // Smaller window
                compressionThreshold: 12,     // Compress earlier
                compressionRatio: 0.25,       // Keep 25% of messages
                addToVectorStore: false,      // Don't store (slow with JSON)
                batchCompression: false,
                vectorStoreChunkSize: 500
            };

        case 'sqlite':
            return {
                maxMessages: 30,              // Larger window
                compressionThreshold: 25,
                compressionRatio: 0.3,        // Keep 30% of messages
                addToVectorStore: true,       // Store for semantic retrieval
                batchCompression: true,       // Batch operations
                vectorStoreChunkSize: 1000
            };

        case 'pgvector':
            return {
                maxMessages: 50,              // Large window
                compressionThreshold: 40,
                compressionRatio: 0.35,       // Keep 35% of messages
                addToVectorStore: true,       // Definitely store
                batchCompression: true,
                vectorStoreChunkSize: 1500    // Larger chunks
            };
    }
}
```

---

## 🚀 Compression Optimizations

### 1. **Adaptive Compression Settings**

Compression now adapts to:
- **Backend capabilities** (JSON/SQLite/PostgreSQL)
- **Message complexity** (long vs short messages)
- **Target token counts** for optimal summaries

```typescript
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

    // Adjust compression based on message length
    let compressionRatio = profile.compressionRatio;

    // Long messages = more aggressive compression
    if (avgMessageLength > 1000) {
        compressionRatio = Math.max(0.2, compressionRatio - 0.1);
    }

    // Short messages = keep more context
    if (avgMessageLength < 200) {
        compressionRatio = Math.min(0.5, compressionRatio + 0.1);
    }

    // Calculate target tokens for summary
    const estimatedCurrentTokens = (messageCount * avgMessageLength) / 4;
    const targetTokens = Math.floor(estimatedCurrentTokens * compressionRatio);

    return {
        shouldCompress: messageCount >= profile.compressionThreshold,
        compressionRatio,
        targetTokens: Math.min(targetTokens, profile.vectorStoreChunkSize * 4)
    };
}
```

### 2. **Intelligent Compression Triggers**

**Before:**
```typescript
// Simple threshold check
if (this.messages.length > this.config.maxMessages) {
    await this.compressMemory();
}
```

**After:**
```typescript
// Adaptive compression based on backend and message complexity
const avgLength = this.messages.reduce((sum, m) => sum + m.content.length, 0) / this.messages.length;
const backend = this.retriever.getVectorStore()?.getBackend() || 'json';

const { shouldCompress } = getAdaptiveCompressionSettings(
    this.messages.length,
    avgLength,
    backend as VectorStoreBackend
);

if (shouldCompress) {
    // Compress in background (non-blocking)
    this.compressMemory().catch(err =>
        console.error('Background compression failed:', err)
    );
}
```

---

## 📚 Vector Store Integration

### Rich Metadata for Compressed Memories

When conversation memories are compressed and stored in the vector database, they now include comprehensive metadata for semantic retrieval:

```typescript
const metadata = {
    // Document identification
    document_id: `conversation_${this.currentConversationId}`,
    document_title: `Conversation Memory (2025-10-20)`,
    section: `compressed_${this.compressedChunks}`,
    section_title: 'Compressed Conversation',
    content_type: 'conversation_memory',
    conversation_id: this.currentConversationId,

    // ✨ Temporal metadata - when the conversation took place
    created: originalMessages[0]?.timestamp || Date.now(),
    modified: Date.now(),
    time_range_start: originalMessages[0]?.timestamp,
    time_range_end: originalMessages[originalMessages.length - 1]?.timestamp,

    // ✨ Content metadata
    original_message_count: originalMessages.length,
    compressed_chunk_index: this.compressedChunks,
    topics: ["authentication", "database", "API integration"],  // Extracted from summary
    keywords: ["implement", "configure", "optimize", "debug"],  // TF-IDF extraction

    // ✨ Conversation participants
    has_user_messages: true,
    has_assistant_messages: true,

    // Reference
    page_reference: `Memory/${this.currentConversationId}#${this.compressedChunks}`
};
```

### Benefits:

1. **Temporal Filtering**: Find conversations from specific time periods
2. **Topic-Based Retrieval**: Search by extracted topics
3. **Keyword Matching**: Enhanced search with relevant keywords
4. **Conversation Context**: Know the scope of the original conversation

---

## 🔍 Semantic Memory Retrieval

### New Feature: Retrieve Relevant Past Memories

The conversation memory manager can now **retrieve relevant memories from past conversations** using semantic search:

```typescript
// Retrieve memories related to current query
const relevantMemories = await memoryManager.retrieveRelevantMemories(
    "How did we implement authentication?",
    topK: 3
);

// Returns:
[
    {
        content: "[Compressed Memory] Discussed implementing JWT authentication with refresh tokens...",
        timestamp: 1729468800000,
        relevanceScore: 0.87,
        conversationId: "conv_1729468800000_abc123"
    },
    {
        content: "[Compressed Memory] Configured OAuth2 integration with Google...",
        timestamp: 1729382400000,
        relevanceScore: 0.75,
        conversationId: "conv_1729382400000_def456"
    }
]
```

### Implementation:

```typescript
async retrieveRelevantMemories(query: string, topK: number = 3): Promise<RetrievedMemory[]> {
    if (!this.config.addToVectorStore || !this.retriever.isReady()) {
        return [];
    }

    try {
        // Use RAG retriever to find relevant memories
        const results = await this.retriever.retrieve(
            query,
            topK,
            {
                content_type: ['conversation_memory']  // Only search memories
            },
            0.3  // Lower threshold for broader recall
        );

        return results.map(chunk => ({
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
```

### Use Cases:

- **Contextual Assistance**: "We discussed this before in..."
- **Decision History**: Recall why certain decisions were made
- **Cross-Conversation Learning**: Build on past conversations
- **Knowledge Continuity**: Don't lose important context from old conversations

---

## 📊 Memory Status & Monitoring

### Enhanced Memory Status

The `getMemoryStatus()` method now provides comprehensive information:

```typescript
interface MemoryStatus {
    totalMessages: number;              // Current message count
    messagesUntilCompression: number;   // How many more before compression
    compressionProgress: number;         // 0-1 progress toward compression
    isNearCompression: boolean;         // Warning flag
    lastCompression?: number;           // Timestamp of last compression
    compressedChunks: number;           // Total compressed chunks created
    backend?: VectorStoreBackend;       // Current backend (json/sqlite/pgvector)
    recommendedMaxMessages?: number;    // Recommended setting for backend
}
```

### Example Usage:

```typescript
const status = memoryManager.getMemoryStatus();

console.log(`
Memory Status:
- Messages: ${status.totalMessages}/${status.recommendedMaxMessages}
- Backend: ${status.backend}
- Compressed Chunks: ${status.compressedChunks}
- Progress: ${Math.round(status.compressionProgress * 100)}%
- Near Compression: ${status.isNearCompression ? 'Yes' : 'No'}
`);
```

---

## 🎯 Topic & Keyword Extraction

### Topic Extraction from Summaries

Extracts meaningful topics from compressed conversation summaries:

```typescript
private extractTopics(text: string): string[] {
    const topics = new Set<string>();

    // Extract phrases in quotes
    const quotedPhrases = text.match(/"([^"]+)"/g);
    if (quotedPhrases) {
        quotedPhrases.forEach(phrase => topics.add(phrase.replace(/"/g, '')));
    }

    // Extract capitalized phrases (potential topics)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedWords) {
        capitalizedWords.forEach(word => {
            if (word.length > 3 && !['The', 'This', 'That'].includes(word)) {
                topics.add(word);
            }
        });
    }

    return Array.from(topics).slice(0, 10);
}
```

### Keyword Extraction (TF-IDF Inspired)

Extracts relevant keywords with stopword filtering:

```typescript
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

    // Return top 10 most frequent keywords
    return Array.from(wordCount.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
}
```

---

## 🔧 Settings Integration

### Default Settings (src/settings.ts)

The default settings now include **adaptive comments** explaining how settings adjust based on backend:

```typescript
// Conversation Memory Configuration
// ✨ ADAPTIVE: Settings auto-adjust based on vector store backend
// JSON: maxMessages=15 (conservative), addToVectorStore=false
// SQLite: maxMessages=30 (balanced), addToVectorStore=true
// PostgreSQL: maxMessages=50 (aggressive), addToVectorStore=true
memory: {
    enabled: true,
    maxMessages: 30, // Balanced default (adapts: JSON=15, SQLite=30, PG=50)
    compressionThreshold: 25, // When to show compression warnings
    compressionRatio: 0.3, // Keep 30% of original messages after compression
    autoCompress: true, // Automatically compress when maxMessages reached
    addToVectorStore: true, // Store compressed memories for semantic retrieval
    compressionPrompt: 'Summarize this conversation, focusing on key decisions, important context, and actionable items. Preserve the essential information while making it concise.'
},
```

### User Override

Users can still override adaptive defaults in settings. The system respects user preferences:

```typescript
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
        compressionPrompt: userConfig.compressionPrompt ?? '...'
    };
}
```

---

## 📈 Backend Recommendations

### In-UI Recommendations

The system provides backend-specific recommendations for optimal settings:

```typescript
export function getBackendRecommendations(backend: VectorStoreBackend): {
    title: string;
    description: string;
    recommendations: string[];
}
```

#### JSON Backend
```
Title: JSON Backend - Conservative Settings
Description: Optimized for minimal memory usage with in-memory storage

Recommendations:
✅ Keep maxMessages ≤ 20 (avoid memory issues)
✅ Enable aggressive compression (ratio ≤ 0.25)
⚠️ Disable vector store integration (slow with JSON)
✅ Compress frequently to maintain performance
```

#### SQLite Backend
```
Title: SQLite Backend - Balanced Settings
Description: Optimized for good performance with embedded database

Recommendations:
✅ maxMessages: 20-40 (good balance)
✅ Enable vector store integration (fast with SQLite)
✅ Moderate compression (ratio ~0.3)
✅ Batch compression for efficiency
```

#### PostgreSQL Backend
```
Title: PostgreSQL Backend - Aggressive Settings
Description: Optimized for maximum performance and scalability

Recommendations:
✅ maxMessages: 40-60 (excellent performance)
✅ Definitely enable vector store integration
✅ Gentle compression (ratio ~0.35)
✅ Large context windows for better semantic search
✅ Batch all operations for best performance
```

---

## 🎨 Advanced Usage

### Example 1: Basic Usage with Adaptive Settings

```typescript
// Memory manager automatically uses backend-specific settings
const memoryManager = new ConversationMemoryManager(
    retriever,
    llmManager,
    config,  // Uses adaptive defaults based on backend
    updateCallback
);

// Add messages - compression happens automatically
memoryManager.addMessage('user', 'How do I implement caching?');
memoryManager.addMessage('assistant', 'Here are three approaches...');
```

### Example 2: Retrieve Relevant Memories

```typescript
// Find related memories from past conversations
const memories = await memoryManager.retrieveRelevantMemories(
    "caching strategies we discussed",
    topK: 5
);

console.log(`Found ${memories.length} relevant past conversations`);
memories.forEach(memory => {
    console.log(`[${new Date(memory.timestamp).toLocaleDateString()}]`);
    console.log(`Score: ${memory.relevanceScore.toFixed(2)}`);
    console.log(memory.content);
});
```

### Example 3: Manual Configuration Override

```typescript
// Override adaptive settings if needed
memoryManager.updateConfig({
    maxMessages: 100,           // Much larger than adaptive default
    compressionThreshold: 80,   // Allow more messages before warning
    addToVectorStore: false     // Disable vector storage
});
```

### Example 4: Export/Import Conversations

```typescript
// Export current conversation
const exported = memoryManager.exportConversation();
await vault.write('conversations/session-2025-10-20.json', JSON.stringify(exported, null, 2));

// Import a previous conversation
const imported = JSON.parse(await vault.read('conversations/session-2025-10-15.json'));
memoryManager.importConversation(imported);
```

### Example 5: Monitor Memory Status

```typescript
// Get detailed memory status
const status = memoryManager.getMemoryStatus();

if (status.isNearCompression) {
    new Notice(`⚠️ Memory approaching compression (${status.messagesUntilCompression} messages left)`);
}

if (status.backend !== 'sqlite') {
    new Notice(`💡 Consider switching to SQLite for better memory performance`);
}
```

---

## 🧪 Testing the Optimizations

### Test 1: Verify Adaptive Configuration

```typescript
const jsonBackend = getAdaptiveMemoryConfig('json');
console.log('JSON:', jsonBackend);
// Should show: maxMessages=15, addToVectorStore=false

const sqliteBackend = getAdaptiveMemoryConfig('sqlite');
console.log('SQLite:', sqliteBackend);
// Should show: maxMessages=30, addToVectorStore=true

const pgBackend = getAdaptiveMemoryConfig('pgvector');
console.log('PostgreSQL:', pgBackend);
// Should show: maxMessages=50, addToVectorStore=true
```

### Test 2: Verify Compression

```typescript
// Add messages until compression triggers
for (let i = 0; i < 35; i++) {
    memoryManager.addMessage('user', `Test message ${i}`);
}

// Check memory status
const status = memoryManager.getMemoryStatus();
console.log(`Messages: ${status.totalMessages}`);
console.log(`Compressed chunks: ${status.compressedChunks}`);
// Should show compression occurred (messages < 35)
```

### Test 3: Verify Vector Store Integration

```typescript
// Check if compressed memory was added to vector store
const stats = await retriever.getStats();
console.log(`Total chunks in vector store: ${stats?.totalChunks}`);

// Try to retrieve compressed memories
const memories = await memoryManager.retrieveRelevantMemories(
    "test message",
    topK: 1
);
console.log(`Retrieved ${memories.length} memories`);
if (memories.length > 0) {
    console.log('✅ Vector store integration working!');
}
```

### Test 4: Verify Metadata Extraction

```typescript
// After compression, search for the compressed chunk
const results = await retriever.retrieve('test', 1, {
    content_type: ['conversation_memory']
});

if (results.length > 0) {
    const metadata = results[0].metadata;
    console.log('Metadata:', {
        topics: metadata.topics,
        keywords: metadata.keywords,
        messageCount: metadata.original_message_count,
        timeRange: {
            start: new Date(metadata.time_range_start),
            end: new Date(metadata.time_range_end)
        }
    });
}
```

---

## 🎯 Summary

### What's New:

#### Adaptive Configuration:
- ✅ **Backend-specific memory profiles** (JSON/SQLite/PostgreSQL)
- ✅ **Automatic settings adjustment** based on backend capabilities
- ✅ **Intelligent compression triggers** based on message complexity
- ✅ **User preferences always respected** (can override adaptive defaults)

#### Vector Store Integration:
- ✅ **Compressed memories stored in vector database** (SQLite/PostgreSQL only)
- ✅ **Rich metadata extraction** (topics, keywords, temporal info)
- ✅ **Semantic memory retrieval** - find relevant past conversations
- ✅ **Proper batch operations** for performance

#### Quality Improvements:
- ✅ **Topic extraction** from compressed summaries
- ✅ **Keyword extraction** with stopword filtering
- ✅ **Temporal metadata** for time-based filtering
- ✅ **Conversation context** (participant info, message counts)

#### Monitoring & Control:
- ✅ **Enhanced memory status** with backend info
- ✅ **Backend-specific recommendations** for optimal settings
- ✅ **Export/import conversations** for backup and analysis
- ✅ **Memory statistics** for debugging and optimization

### Performance Characteristics:

| Backend | Max Messages | Compression | Vector Storage | Retrieval Speed |
|---------|--------------|-------------|----------------|-----------------|
| JSON | 15 | Aggressive | ❌ No | N/A |
| SQLite | 30 | Moderate | ✅ Yes | Fast |
| PostgreSQL | 50 | Gentle | ✅ Yes | Very Fast |

### Build Status:
✅ **All optimizations compiled successfully**
✅ **No breaking changes to existing API**
✅ **Backward compatible**
✅ **Ready for testing**

---

**The conversation memory system is now optimized for adaptive performance and semantic retrieval!** 🧠✨
