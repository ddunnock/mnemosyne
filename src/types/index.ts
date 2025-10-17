import { TFile } from 'obsidian';
import React from "react";

// ============================================================================
// Core Plugin Types
// ============================================================================

export interface PluginSettings {
    // Security
    masterPassword?: string;
    encryptedApiKeys?: string;
    encryptionSalt?: string;

    // AI Providers
    llmProviders: LLMProviderConfig[];
    defaultLLMProvider?: string;

    // Local AI Settings
    useLocalAI: boolean;
    ollamaBaseUrl: string;
    ollamaModel: string;
    localEmbeddingModel: string;

    // RAG Configuration
    vectorStorePath: string;
    embeddingModel: string;
    chunkSize: number;
    chunkOverlap: number;

    // Enhanced Chunking
    chunkingConfig: ChunkingConfig;

    // Vault Integration
    autoIngestFolders: string[];
    excludePatterns: string[];
    ingestOnModify: boolean;
    lastProcessedTimestamp?: number;

    // Agent System
    agents: AgentConfig[];
    defaultAgent?: string;
    defaultAgentId?: string;
    
    // LLM System (compatibility)
    llmConfigs: LLMProviderConfig[];
    
    // Security (compatibility)
    isEncryptionEnabled: boolean;
    
    // Additional settings
    vectorDbPath: string;
    enableLogging: boolean;
    enableCaching: boolean;

    // UI Preferences
    chatHistoryRetention: number;
    showSourceCitations: boolean;
    enableStreaming: boolean;

    // Performance
    maxConcurrentRequests: number;
    cacheEmbeddings: boolean;
    maxCacheSize: number;
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export interface LLMProviderConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'ollama';
    model: string;
    temperature: number;
    maxTokens: number;
    apiKeyName?: string;
    baseUrl?: string;
    isDefault?: boolean;
    enabled?: boolean;  // Added for compatibility
    encryptedApiKey?: string; // For compatibility with LLMConfig
    createdAt?: number; // For compatibility with LLMConfig
    updatedAt?: number; // For compatibility with LLMConfig
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
    metadata?: Record<string, unknown>;
}

export interface ChatResponse {
    content: string;
    model?: string; // The model used to generate the response
    finishReason?: string; // Why the response finished (e.g., 'stop', 'length')
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    sources?: ChunkResult[];
    metadata?: Record<string, unknown>;
}

export interface StreamChunk {
    content: string;
    done: boolean;
    metadata?: Record<string, unknown>;
};

// LLMConfig alias for compatibility
export interface LLMConfig {
    id: string;
    name: string;
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
    encryptedApiKey?: string;
}

export interface ChatOptions {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    systemPrompt?: string;
    stopSequences?: string[];
}

// ============================================================================
// RAG System Types
// ============================================================================

export interface ChunkMetadata {
    // Core identification
    document_id: string;          // file.path
    document_title: string;       // file.basename
    chunk_id: string;            // unique chunk identifier
    chunk_index: number;         // position within document

    // Content structure
    section?: string;            // heading path (e.g., "Introduction > Overview")
    section_title?: string;      // current section title
    content_type?: string;       // concept | procedure | reference | example
    content_length: number;      // character count
    token_count: number;         // estimated token count

    // Obsidian-specific metadata
    tags?: string[];             // file tags
    aliases?: string[];          // file aliases
    links?: string[];            // outgoing links
    backlinks?: string[];        // incoming links

    // File system context
    folder_path: string;         // full folder path
    parent_folder: string;       // immediate parent folder
    folder_hierarchy: string[];  // full folder hierarchy
    file_extension: string;      // file type
    created_date: string;        // file creation date
    modified_date: string;       // last modification date

    // Content analysis
    keywords?: string[];         // extracted keywords
    entities?: string[];         // named entities
    topics?: string[];           // identified topics
    summary?: string;            // brief content summary

    // Quality metrics
    information_density?: number;    // 0-1 score
    coherence_score?: number;        // 0-1 score
    content_classification?: string; // auto-categorized type
    primary_intent?: string;         // main purpose of content

    // Processing metadata
    processed_date: string;      // when chunk was created
    embedding_model: string;     // model used for embedding
    chunk_strategy: string;      // chunking method used

    // Custom fields
    [key: string]: unknown;
}

export interface ChunkingConfig {
    strategy: 'hybrid' | 'heading' | 'semantic' | 'sliding_window';
    targetSize: number;
    minSize: number;
    maxSize: number;
    overlap: number;
    respectBoundaries: boolean;
    preserveStructure: boolean;
    qualityThreshold: number;
    enableQualityFilter: boolean;
}

export interface ChunkResult {
    content: string;
    metadata: ChunkMetadata;
    score: number;
    embedding?: number[];
}

export interface VaultDocument {
    file: TFile;
    content: string;
    metadata: ChunkMetadata;
    chunks: ChunkResult[];
}

// ============================================================================
// Agent System Types
// ============================================================================

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    llmId: string;  // Changed from llmProvider
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
    retrievalSettings: {
        topK: number;
        scoreThreshold: number;
        searchStrategy?: string; // Optional search strategy
    };
    metadataFilters?: Record<string, unknown>;
    temperature?: number;
    maxTokens?: number;
    allowedTags?: string[];
    contentTypes?: string[];

    // Behavior
    conversationMemory: boolean;
    maxMemoryLength: number;
    showSources: boolean;
    enableStreaming: boolean;

    // Metadata
    category: string;
    tags: string[];
    icon?: string;
    color?: string;
    isBuiltIn: boolean;
    createdDate: string;
    lastUsed?: string;
}

export interface AgentTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    color: string;
    systemPrompt: string;
    retrievalSettings: {
        topK: number;
        scoreThreshold: number;
        searchStrategy?: string; // Optional search strategy
    };
    defaultConfig: Partial<AgentConfig>;
    examples: string[];
    metadataFilters?: Record<string, unknown>; // Optional metadata filters
}

export interface ConversationHistory {
    agentId: string;
    messages: Message[];
    timestamp: number;
    title?: string;
    summary?: string;
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface ComponentProps {
    className?: string;
    children?: React.ReactNode;
}

export interface ButtonProps extends ComponentProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    type?: 'button' | 'submit' | 'reset';
}

export interface ModalProps extends ComponentProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ChatMessage extends Message {
    id: string;
    agentName?: string;
    sources?: ChunkResult[];
    isStreaming?: boolean;
}

// ============================================================================
// Event System Types
// ============================================================================

export interface PluginEvents {
    'agent-created': AgentConfig;
    'agent-updated': AgentConfig;
    'agent-deleted': string;
    'chat-message': ChatMessage;
    'rag-query': { query: string; results: ChunkResult[] };
    'vault-indexed': { documentsProcessed: number; chunksCreated: number };
    'settings-changed': Partial<PluginSettings>;
}

// ============================================================================
// API Types
// ============================================================================

// Import AgentExecutor interface for PublicAPI
export interface AgentExecutor {
    execute: (query: string, context?: AgentExecutionContext) => Promise<AgentResponse>;
    getConfig: () => AgentConfig;
    getInfo: () => AgentExecutorInfo;
}

export interface AgentExecutorInfo {
    name: string;
    description: string;
    llmProvider: string;
    llmModel: string;
    retrievalSettings: {
        topK: number;
        scoreThreshold: number;
    };
    enabled: boolean;
}

export interface PublicAPI {
    // Agent Operations  
    getAgent(agentId: string): AgentExecutor | null;
    listAgents(): AgentInfo[];
    executeAgent(agentId: string, query: string, context?: AgentExecutionContext): Promise<AgentResponse>;

    // RAG Operations
    query(text: string, filters?: MetadataFilters, topK?: number): Promise<RetrievedChunk[]>;

    // System Operations
    isReady(): boolean;
    getStats(): { rag: unknown; llm: unknown; agents: unknown; ready: boolean };
    getVersion(): string;
    ask(query: string, context?: AgentExecutionContext): Promise<AgentResponse>;
}

export interface RAGQueryOptions {
    maxResults?: number;
    threshold?: number;
    folders?: string[];
    tags?: string[];
    contentTypes?: string[];
}

export interface PluginStats {
    totalDocuments: number;
    totalChunks: number;
    totalAgents: number;
    lastIndexed?: string;
    cacheSize: number;
    memoryUsage: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class MnemosyneError extends Error {
    code: string;
    context?: Record<string, unknown>;

    constructor(message: string, code: string, context?: Record<string, unknown>) {
        super(message);
        this.name = 'MnemosyneError';
        this.code = code;
        this.context = context;
    }
}

export enum ErrorCodes {
    VECTOR_STORE_NOT_INITIALIZED = 'VECTOR_STORE_NOT_INITIALIZED',
    INVALID_QUERY = 'INVALID_QUERY',
    NO_PROVIDER = 'NO_PROVIDER',
    OLLAMA_CONNECTION_FAILED = 'OLLAMA_CONNECTION_FAILED',
    LOCAL_MODEL_LOAD_FAILED = 'LOCAL_MODEL_LOAD_FAILED',
    AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
    INVALID_AGENT_CONFIG = 'INVALID_AGENT_CONFIG',
    ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
    DECRYPTION_FAILED = 'DECRYPTION_FAILED',
    API_KEY_INVALID = 'API_KEY_INVALID',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// ============================================================================
// Additional Types for Agent System
// ============================================================================

export interface AgentExecutionContext {
    query: string;
    conversationHistory?: Message[];
    additionalContext?: Record<string, unknown>;
    noteContext?: {
        notePath: string;
        noteContent: string;
        frontmatter?: Record<string, unknown>;
    };
}

export interface AgentResponse {
    answer: string;
    sources: ChunkMetadata[];
    agentUsed: string;
    llmProvider: string;
    model: string;
    retrievedChunks: RetrievedChunk[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    executionTime: number;
}

export interface RetrievedChunk {
    chunk_id: string;
    content: string;
    metadata: ChunkMetadata;
    score: number;
    embedding?: number[];
}

export interface AgentInfo {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

export interface MetadataFilters {
    content_type?: string[];
    folder_path?: string[];
    tags?: string[];
    [key: string]: string[] | string | number | boolean | undefined;  // More specific types
}

// ============================================================================
// Error Classes
// ============================================================================

export class RAGError extends Error {
    constructor(message: string, public context?: Record<string, unknown>) {
        super(message);
        this.name = 'RAGError';
    }
}

export class LLMError extends Error {
    constructor(message: string, public context?: Record<string, unknown>) {
        super(message);
        this.name = 'LLMError';
    }
}

export class EncryptionError extends Error {
    constructor(message: string, public context?: Record<string, unknown>) {
        super(message);
        this.name = 'EncryptionError';
    }
}

// ============================================================================
// RAG Types (aliases for compatibility)
// ============================================================================

export interface RAGChunk {
    chunk_id: string;
    content: string;
    metadata: ChunkMetadata;
}
