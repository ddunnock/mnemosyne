# Data Model: RAG Agent System Refactor

**Date**: 2025-10-18
**Feature**: RAG Agent System Refactor
**Input**: Generalized entities from spec.md and research.md decisions

## Overview

This document defines the data structures for the refactored Mnemosyne plugin, removing risk management-specific concepts and introducing general-purpose, domain-agnostic entities that support any knowledge domain.

---

## Entity Definitions

### 1. Agent

**Purpose**: Represents a specialized AI assistant with configuration, system prompt, and retrieval settings.

**Attributes**:
```typescript
interface Agent {
  // Identity
  id: string;                    // UUID v4
  name: string;                  // Display name (e.g., "Research Analyst")
  description: string;           // Brief description of purpose

  // Template source
  templateId?: string;           // Reference to template if created from one
  isCustom: boolean;             // true if user-created, false if from template

  // AI Configuration
  systemPrompt: string;          // LLM system prompt (500-700 words)
  llmProvider: LLMProviderType;  // 'openai' | 'anthropic' | 'ollama'
  model: string;                 // Model name (e.g., 'gpt-4', 'llama2')
  temperature: number;           // 0.0 to 2.0, default 0.7

  // Retrieval Settings
  retrievalConfig: {
    enabled: boolean;            // Whether to use RAG
    maxResults: number;          // Max chunks to retrieve (1-20)
    minRelevance: number;        // Similarity threshold (0.0-1.0)
    folderScope?: string[];      // Optional folder restrictions
    excludePatterns?: string[];  // Glob patterns to exclude
    prioritizeTags?: string[];   // Boost relevance for these tags
  };

  // UI Customization
  icon: string;                  // Lucide icon name
  color?: string;                // Optional accent color
  category: AgentCategory;       // For organization in UI

  // Metadata
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
  lastUsed?: number;             // Unix timestamp
  usageCount: number;            // Number of times queried
}

type LLMProviderType = 'openai' | 'anthropic' | 'ollama';

type AgentCategory =
  | 'research'       // Academic, analysis, literature review
  | 'business'       // Strategy, consulting, project management
  | 'creative'       // Brainstorming, ideation, content creation
  | 'technical'      // Code review, documentation, development
  | 'personal'       // Coaching, productivity, journaling
  | 'custom';        // User-defined category
```

**Relationships**:
- Many-to-One with `AgentTemplate` (optional)
- One-to-Many with `Conversation`
- References `LLMProviderConfig` via `llmProvider` + `model`

**Validation Rules**:
- `name`: 1-100 characters, must be unique
- `systemPrompt`: 10-5000 characters
- `temperature`: 0.0 ≤ temperature ≤ 2.0
- `retrievalConfig.maxResults`: 1 ≤ maxResults ≤ 20
- `retrievalConfig.minRelevance`: 0.0 ≤ minRelevance ≤ 1.0

**State Transitions**:
- Created → Active (can query)
- Active → Archived (hidden from UI)
- Archived → Active (restore)
- Any → Deleted (soft delete, keep conversation history)

---

### 2. AgentTemplate

**Purpose**: Pre-configured blueprint for creating specialized agents with expert system prompts and optimized retrieval settings.

**Attributes**:
```typescript
interface AgentTemplate {
  // Identity
  id: string;                    // e.g., 'research-analyst'
  name: string;                  // Display name
  description: string;           // 1-2 sentence purpose

  // Categorization
  category: AgentCategory;       // Same as Agent
  tags: string[];                // Searchable keywords
  icon: string;                  // Lucide icon name

  // Pre-configured Settings
  systemPrompt: string;          // Expert-level prompt (500-700 words)
  recommendedProvider: LLMProviderType; // Suggested provider
  recommendedModel: string;      // Suggested model

  // Retrieval Defaults
  defaultRetrievalConfig: {
    maxResults: number;
    minRelevance: number;
    folderScope?: string[];      // Suggested folders
    prioritizeTags?: string[];   // Suggested tag boosts
  };

  // User Guidance
  exampleQueries: string[];      // 3-5 example questions
  useCases: string[];            // 2-3 use case descriptions
  tips?: string;                 // Optional usage tips

  // Metadata
  version: string;               // Template version (semver)
  author: string;                // 'Mnemosyne' or community contributor
  isBuiltin: boolean;            // true for shipped templates
  createdAt: number;
  updatedAt: number;
}
```

**Relationships**:
- One-to-Many with `Agent` (templates can spawn multiple agents)
- No foreign keys (templates are reference data)

**Validation Rules**:
- `id`: Lowercase kebab-case, unique
- `name`: 1-50 characters
- `description`: 10-200 characters
- `exampleQueries`: 3-5 items, 10-200 chars each
- `useCases`: 2-3 items, 20-100 chars each

**Builtin Templates** (12 total):
1. `research-analyst` - Academic research, citations, literature review
2. `strategic-consultant` - Business analysis, frameworks, decision support
3. `technical-writer` - Documentation, API guides, technical communication
4. `project-manager` - Timeline analysis, resource planning, status updates
5. `learning-facilitator` - Educational content, curriculum design
6. `creative-director` - Brainstorming, concept development, ideation
7. `knowledge-curator` - Information organization, taxonomy, content strategy
8. `code-reviewer` - Programming best practices, architecture, debugging
9. `meeting-facilitator` - Agenda planning, note synthesis, action items
10. `personal-coach` - Goal setting, habit tracking, productivity
11. `legal-researcher` - Case analysis, precedent research, legal writing
12. `medical-analyst` - Clinical notes, medical research, terminology

---

### 3. Chunk

**Purpose**: Semantically meaningful segment of vault content with rich metadata for RAG retrieval.

**Attributes**:
```typescript
interface Chunk {
  // Identity
  id: string;                    // UUID v4
  contentHash: string;           // SHA-256 hash of content (for deduplication)

  // Content
  content: string;               // Actual text content (200-2000 chars typical)
  wordCount: number;             // Number of words
  tokenCount: number;            // Approximate token count

  // Source Information
  sourceFile: {
    path: string;                // Full vault path
    name: string;                // File name
    folder: string;              // Containing folder path
    extension: string;           // Usually 'md'
  };

  // Position within Source
  position: {
    start: number;               // Character offset in file
    end: number;                 // Character offset in file
    lineStart: number;           // Line number (1-indexed)
    lineEnd: number;             // Line number (1-indexed)
  };

  // Obsidian Metadata (extracted from MetadataCache)
  metadata: {
    // Frontmatter-derived
    frontmatter: Record<string, any>; // Raw frontmatter
    tags: string[];              // All tags (frontmatter + inline)
    aliases: string[];           // Note aliases

    // Link metadata
    outgoingLinks: string[];     // Links from this chunk
    backlinks: string[];         // Files linking to source

    // File metadata
    createdAt: number;           // File creation time
    modifiedAt: number;          // File modification time
  };

  // Contextual Information
  context: {
    headingPath: string[];       // ["H1", "H2", "H3"] hierarchy
    previousHeading?: string;    // Previous H1/H2 for context
    sectionType: 'heading' | 'paragraph' | 'list' | 'table' | 'code';
  };

  // Chunk Quality
  quality: {
    score: number;               // 0.0-1.0 overall quality score
    lengthScore: number;         // 0.0-1.0 based on optimal length
    coherenceScore: number;      // 0.0-1.0 semantic coherence
    densityScore: number;        // 0.0-1.0 information density
  };

  // Embedding
  embedding: number[];           // Vector embedding (384 or 1536 dim)
  embeddingModel: string;        // Model used ('all-MiniLM-L6-v2', etc.)

  // Indexing Metadata
  indexed: boolean;              // Whether included in vector store
  indexedAt?: number;            // When indexed
  version: number;               // Incremented on content change
}
```

**Relationships**:
- Many-to-One with source file (via `sourceFile.path`)
- No direct FK (chunks are derived data)

**Validation Rules**:
- `content`: 50-5000 characters
- `quality.score`: 0.0 ≤ score ≤ 1.0
- `embedding`: length must match model dimensions
- `version`: Increments on every content change

**Lifecycle**:
1. Created during vault ingestion
2. Updated when source file modified
3. Deleted when source file deleted
4. Re-embedded when embedding model changes

---

### 4. IngestionJob

**Purpose**: Tracks vault processing progress and status for RAG indexing.

**Attributes**:
```typescript
interface IngestionJob {
  // Identity
  id: string;                    // UUID v4
  name: string;                  // User-friendly name
  type: 'full' | 'incremental' | 'folder' | 'file';

  // Configuration
  config: {
    folderPaths: string[];       // Folders to process
    excludePatterns: string[];   // Glob patterns to skip
    forceReindex: boolean;       // Ignore existing embeddings
    batchSize: number;           // Files per batch (default 10)
  };

  // Status Tracking
  status: IngestionStatus;
  progress: {
    totalFiles: number;          // Total files to process
    processedFiles: number;      // Files completed
    failedFiles: number;         // Files with errors
    totalChunks: number;         // Total chunks created
    percentComplete: number;     // 0-100
    estimatedTimeRemaining?: number; // Seconds (optional)
  };

  // Timing
  startedAt?: number;            // When job started
  completedAt?: number;          // When job finished
  duration?: number;             // Total time in milliseconds

  // Results
  results: {
    filesProcessed: string[];    // Paths of successful files
    filesFailed: Array<{         // Failed file details
      path: string;
      error: string;
      timestamp: number;
    }>;
    chunksCreated: number;       // New chunks added
    chunksUpdated: number;       // Existing chunks updated
    chunksDeleted: number;       // Chunks removed
  };

  // Metadata
  createdBy: 'user' | 'auto';    // Manual or automatic (file watcher)
  createdAt: number;
}

type IngestionStatus =
  | 'pending'      // Created but not started
  | 'running'      // Currently processing
  | 'paused'       // User paused
  | 'completed'    // Successfully finished
  | 'failed'       // Failed with errors
  | 'cancelled';   // User cancelled
```

**Relationships**:
- No foreign keys (self-contained)
- Jobs can be historical (view past ingestions)

**State Transitions**:
- Pending → Running (start processing)
- Running → Paused (user pause)
- Paused → Running (resume)
- Running → Completed (success)
- Running → Failed (critical error)
- Running → Cancelled (user cancel)

---

### 5. LLMProviderConfig

**Purpose**: Configuration for AI model access (OpenAI, Anthropic, Ollama).

**Attributes**:
```typescript
interface LLMProviderConfig {
  // Provider Identity
  provider: LLMProviderType;     // 'openai' | 'anthropic' | 'ollama'
  enabled: boolean;              // Whether provider is active

  // Authentication
  credentials: {
    apiKey?: string;             // Encrypted (OpenAI, Anthropic)
    endpoint?: string;           // Custom endpoint (Ollama)
    organization?: string;       // Organization ID (OpenAI)
  };

  // Model Configuration
  models: {
    chat: string[];              // Available chat models
    embeddings: string[];        // Available embedding models
    defaultChat: string;         // Default chat model
    defaultEmbedding: string;    // Default embedding model
  };

  // Provider-Specific Settings
  settings: {
    // OpenAI/Anthropic
    maxTokens?: number;          // Max tokens per request
    timeout?: number;            // Request timeout (ms)

    // Ollama
    host?: string;               // Ollama server (default: localhost:11434)
    keepAlive?: boolean;         // Keep model loaded
  };

  // Health Status
  status: {
    available: boolean;          // Is provider reachable?
    lastChecked: number;         // Last health check timestamp
    lastError?: string;          // Most recent error message
    modelList?: string[];        // Cached available models
    lastSynced?: number;         // When model list refreshed
  };

  // Metadata
  createdAt: number;
  updatedAt: number;
}
```

**Relationships**:
- Referenced by `Agent` via `agent.llmProvider`
- No direct FK (configuration data)

**Validation Rules**:
- `credentials.apiKey`: Encrypted with AES-256
- `settings.maxTokens`: 1 ≤ maxTokens ≤ 128000
- `settings.timeout`: 1000 ≤ timeout ≤ 300000 (1s to 5min)

**Health Check Logic**:
- OpenAI: `GET /v1/models`
- Anthropic: `GET /v1/messages` (with test payload)
- Ollama: `GET /api/tags` (list models)

---

### 6. Conversation

**Purpose**: Persistent chat session with an agent, including message history and context.

**Attributes**:
```typescript
interface Conversation {
  // Identity
  id: string;                    // UUID v4
  title: string;                 // Auto-generated or user-defined
  agentId: string;               // Associated agent

  // Messages
  messages: Message[];           // Chronological message list

  // Context
  context: {
    folderScope?: string[];      // Folders in scope for this conversation
    vaultState: {                // Vault state at conversation start
      totalNotes: number;
      indexedChunks: number;
      timestamp: number;
    };
  };

  // Metadata
  createdAt: number;
  updatedAt: number;             // Last message timestamp
  messageCount: number;
  isPinned: boolean;             // Pin to top of list
  isArchived: boolean;           // Archive old conversations
  tags: string[];                // User-defined tags for organization
}

interface Message {
  id: string;                    // UUID v4
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;

  // RAG Context (for assistant messages)
  sources?: Source[];            // Chunks used for response

  // Metadata
  model?: string;                // Model used for this message
  tokenCount?: number;           // Approximate tokens
  latency?: number;              // Response time (ms)
}

interface Source {
  chunkId: string;               // Reference to Chunk
  filePath: string;              // Source file
  relevance: number;             // Similarity score (0.0-1.0)
  excerpt: string;               // Text excerpt shown to user
  headingContext: string[];      // Heading hierarchy
}
```

**Relationships**:
- Many-to-One with `Agent` (via `agentId`)
- References `Chunk` (via `Message.sources.chunkId`)

**Validation Rules**:
- `title`: 1-200 characters
- `messages`: Alternating user/assistant roles
- `sources.relevance`: 0.0 ≤ relevance ≤ 1.0

**Auto-Title Generation**:
- Use first user message (first 50 chars)
- Fallback to timestamp: "Conversation on [date]"

---

## Entity Relationship Diagram

```
┌─────────────────┐
│  AgentTemplate  │
│  (Reference)    │
└────────┬────────┘
         │ 1:N
         ▼
    ┌─────────┐          ┌──────────────────┐
    │  Agent  │◄─────────│  Conversation    │
    │         │   1:N    │                  │
    └────┬────┘          └────────┬─────────┘
         │                        │
         │ References             │ References
         │                        │
         ▼                        ▼
┌──────────────────┐         ┌─────────┐
│ LLMProviderConfig│         │  Chunk  │
│  (Configuration) │         │         │
└──────────────────┘         └─────────┘
                                  ▲
                                  │ Derived from
                                  │
                             ┌──────────────┐
                             │ IngestionJob │
                             │              │
                             └──────────────┘
```

## Data Storage

### Obsidian Plugin Data API
- **Agents**: `data.json` → `{ agents: Agent[] }`
- **Conversations**: `data.json` → `{ conversations: Conversation[] }`
- **LLMProviderConfig**: `data.json` → `{ llmProviders: LLMProviderConfig[] }`

### File-Based Storage
- **Chunks**: `.obsidian/plugins/mnemosyne/chunks.json` (vector store index)
- **Embeddings**: `.obsidian/plugins/mnemosyne/embeddings.bin` (binary vector data)
- **Templates**: Hardcoded in `src/agents/templates.ts`

### Encryption
- **API Keys**: AES-256 encrypted, vault-scoped salt
- **Stored in**: `data.json` as encrypted strings

---

## Indexing Strategy

**Vector Store Index**:
- Dimension: 384 (Transformers.js) or 1536 (OpenAI)
- Distance Metric: Cosine similarity
- Index Type: Flat (simple, works for <100k chunks)
- Persistence: JSON serialization with binary embeddings

**Query Flow**:
1. User message → Embed with same model
2. Compute cosine similarity with all chunks
3. Top-K retrieval (K = `agent.retrievalConfig.maxResults`)
4. Filter by `minRelevance` threshold
5. Optional: Re-rank by folder scope, tag matches
6. Return sources with excerpts

---

## Migration Notes

### From Risk Management Model

**Deprecated Entities**:
- `RiskAnalysis` → Removed
- `ProcessPhase` enum → Removed
- `HandlingStrategy` enum → Removed

**Type Migrations**:
- Old `ChunkMetadata` → New `Chunk` (expanded metadata)
- Old `AgentConfig` → New `Agent` (generalized)

**Data Migration**: Not required (plugin in development, no production users)

---

## Next Steps

1. ✅ Generate API contracts based on these entities
2. ✅ Implement data access layer (DAL) for each entity
3. ✅ Add validation logic for all fields
4. ✅ Implement encryption for sensitive data
5. ✅ Create TypeScript interfaces in `src/types/index.ts`
