/**
 * Type definitions for the Risk Management RAG plugin
 * Updated for Phase 5: Agent System
 */

import { LLMProvider, SearchStrategy } from '../constants';

// ============================================================================
// Settings Types
// ============================================================================

export interface LLMConfig {
    id: string;
    name: string;
    provider: LLMProvider;
    encryptedApiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
    baseUrl?: string;
    isDefault?: boolean;
    lastTested?: number;
    testStatus?: 'success' | 'failed' | 'never';
    createdAt: number;
    updatedAt: number;
}

// Alias for backward compatibility
export type AIProviderConfig = LLMConfig;

export interface RetrievalSettings {
    topK: number;
    scoreThreshold: number;
    searchStrategy: SearchStrategy;
}

// Conversation Memory Configuration
export interface MemoryConfig {
    enabled: boolean;
    maxMessages: number;
    compressionThreshold: number;
    compressionRatio: number;
    autoCompress: boolean;
    addToVectorStore: boolean;
    compressionPrompt: string;
}

// ✨ NEW: MCP Tools Configuration
export interface MCPToolsConfig {
    enabled: boolean; // Master switch for MCP functionality
    allowedTools: string[]; // Which tools are enabled globally (e.g., ['read_note', 'write_note', 'search_notes', 'list_notes'])
    defaultAllowDangerousOperations: boolean; // Default for new agents
    defaultFolderScope: string[]; // Default folder restrictions for new agents
}

// ✨ NEW: Vector Store Configuration Types
export interface VectorStoreConfig {
    backend: 'json' | 'pgvector';
    embeddingModel: string;
    dimension: number;
    json?: {
        indexPath: string;
    };
    pgvector?: {
        host: string;
        port: number;
        database: string;
        user: string;
        encryptedPassword: string;
        ssl: boolean;
        poolSize?: number;
        connectionTimeout?: number;
    };
}

// Goddess Persona Configuration
export interface GoddessPersonaSettings {
    enabled: boolean;
    intensity: 'subtle' | 'moderate' | 'strong';
    customPrompt?: string;
    speechPatterns: {
        useDivineLanguage: boolean;
        referenceDivineMemory: boolean;
        useAncientTerminology: boolean;
        embraceGoddessIdentity: boolean;
    };
    knowledgeAreas: {
        mythology: boolean;
        history: boolean;
        arts: boolean;
        sciences: boolean;
        philosophy: boolean;
        literature: boolean;
    };
    divineElements: {
        referenceMuses: boolean;
        mentionSacredDuties: boolean;
        useDivineTitles: boolean;
        speakOfEternalMemory: boolean;
    };
}

// Phase 5: Agent Configuration
export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    llmId: string;
    systemPrompt: string;
    retrievalSettings: RetrievalSettings;
    metadataFilters?: MetadataFilters;
    enabled: boolean;
    isPermanent?: boolean; // If true, agent cannot be deleted (only disabled)
    lastTested?: number;
    testStatus?: 'success' | 'failed' | 'never';
    createdAt: number;
    updatedAt: number;

    // ✨ MCP Tool Support
    enableTools?: boolean; // Enable MCP-style tool calling
    allowDangerousOperations?: boolean; // Allow write operations (create/update/delete notes)
    folderScope?: string[]; // Restrict tool operations to specific folders

    // ✨ Agent Orchestration Metadata
    isMaster?: boolean; // If true, this is the master orchestrator agent
    isSpecialized?: boolean; // If true, agent is meant to be called by master
    capabilities?: string[]; // Tags describing what this agent does (e.g., ['risk-discovery', 'mitigation'])
    category?: string; // Category for organization (e.g., 'risk-management', 'general', 'research')
    visibility?: 'public' | 'specialist'; // 'public' = directly callable, 'specialist' = only via master
}

export interface AutoIngestionConfig {
    enabled: boolean;
    debounceDelay: number; // milliseconds to wait after file change before processing
    batchSize: number; // max files to process in one batch
    maxFileSize: number; // max file size in MB to process
    processingInterval: number; // milliseconds between batch processing
    retryAttempts: number; // number of retry attempts for failed files
    excludePatterns: string[]; // glob patterns for files to exclude
    includeFileTypes: string[]; // file extensions to include (empty = all markdown)
    maxQueueSize: number; // maximum number of files in queue
    logLevel: 'silent' | 'minimal' | 'verbose'; // logging level for auto ingestion
    enabledFolders: string[]; // specific folders to watch (empty = all)
    ignoreHiddenFiles: boolean; // ignore files starting with .
}

export interface PluginSettings {
    // Security
    isEncryptionEnabled: boolean;
    lastPasswordChangeDate?: number;
    masterPassword?: {
        isSet: boolean;
        verificationData?: {
            ciphertext: string;
            iv: string;
            salt: string;
        };
        lastChanged?: number;
    };

    // LLM Configurations
    llmConfigs: LLMConfig[];

    // Phase 5: Agent Configurations
    agents: AgentConfig[];

    // Phase 5: Default Agent (for backward compatibility)
    defaultAgentId?: string;

    // ✨ Master Agent (orchestrator)
    masterAgentId?: string;

    // Goddess Persona Configuration
    persona: GoddessPersonaSettings;

    // RAG Configuration
    vectorDbPath: string;
    embeddingProvider: string; // 'openai' or 'local'
    embeddingModel: string;
    chunkSize: number;
    chunkOverlap: number;

    // Auto Ingestion Configuration
    autoIngestion: AutoIngestionConfig;

    // Conversation Memory Configuration
    memory: MemoryConfig;

    // ✨ NEW: MCP Tools Configuration
    mcpTools: MCPToolsConfig;

    // ✨ NEW: Vector Store Configuration
    vectorStore: VectorStoreConfig;

    // Feature flags
    enableLogging: boolean;
    enableCaching: boolean;
}

// ============================================================================
// RAG Types
// ============================================================================

export interface ChunkMetadata {
    document_id: string;
    document_title: string;
    section: string;
    section_title?: string;
    content_type: string;
    keywords: string[];
    process_phase?: string[];
    handling_strategy?: string;
    roles_applicable?: string[];
    related_documents?: string[];
    related_sections?: string[];
    page_reference: string;
    [key: string]: any; // Allow additional metadata fields
}

export interface RAGChunk {
    chunk_id: string;
    content: string;
    metadata: ChunkMetadata;
}

export interface RetrievedChunk extends RAGChunk {
    score: number;
    embedding?: number[];
}

export interface MetadataFilters {
    content_type?: string[];
    process_phase?: string[];
    handling_strategy?: string[];
    roles_applicable?: string[];
    document_id?: string[];
    section?: string[];
    [key: string]: string[] | undefined;
}

export interface VectorStoreEntry {
    id: string;
    embedding: number[];
    metadata: ChunkMetadata;
    content: string;
}

// ============================================================================
// LLM Types
// ============================================================================

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'function'; // ✨ NEW: Added 'function' role for tool results
    content: string;
    functionCall?: { // ✨ NEW: For tool calling
        name: string;
        arguments: Record<string, unknown>;
    };
    name?: string; // ✨ NEW: Function name for function role messages
}

export interface ChatOptions {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    stream?: boolean;
}

export interface ChatResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model?: string;
    finishReason?: string;
    functionCall?: { // ✨ NEW: For function calling
        name: string;
        arguments: Record<string, unknown>;
    };
}

export interface StreamChunk {
    content: string;
    done: boolean;
}

// ============================================================================
// Phase 5: Agent Types
// ============================================================================

export interface AgentExecutionContext {
    query?: string; // Optional for backward compatibility
    conversationHistory?: Message[];
    additionalContext?: Record<string, any>;
    noteContext?: {
        notePath: string;
        noteContent: string;
        frontmatter?: Record<string, any>;
    };
    activeFilePath?: string; // Auto-injected path to active note
    structuredInput?: any; // For structured payloads from forms
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
    toolResults?: ToolResult[]; // ✨ NEW: Tool execution results (if tools were used)
}

// ✨ NEW: Tool Result type (re-exported for convenience)
export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    metadata?: {
        executionTime: number;
        filesAffected?: string[];
        operationType: 'read' | 'write' | 'delete';
    };
}

export interface AgentTemplate {
    name: string;
    description: string;
    systemPrompt: string;
    retrievalSettings: RetrievalSettings;
    metadataFilters?: MetadataFilters;
    icon?: string;
}

export interface AgentInfo {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

// ============================================================================
// Phase 5: Public API Types
// ============================================================================

export interface PublicAPI {
    // Agent operations
    getAgent: (agentId: string) => AgentExecutor | null;
    listAgents: () => AgentInfo[];
    executeAgent: (
        agentId: string,
        query: string,
        context?: AgentExecutionContext
    ) => Promise<AgentResponse>;

    // Direct RAG operations
    query: (
        text: string,
        filters?: MetadataFilters,
        topK?: number
    ) => Promise<RetrievedChunk[]>;

    // Utility
    getVersion: () => string;
    isReady: () => boolean;
    getStats: () => SystemStats;

    // Default agent
    ask: (query: string, context?: AgentExecutionContext) => Promise<AgentResponse>;
}

export interface AgentExecutor {
    execute: (query: string, context?: AgentExecutionContext) => Promise<AgentResponse>;
    // REMOVED: config: AgentConfig; - this property is private in the implementation
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

export interface SystemStats {
    rag: any;
    llm: any;
    agents: any;
    ready: boolean;
}

// ============================================================================
// Encryption Types
// ============================================================================

export interface EncryptionResult {
    encrypted: string;
    salt: string;
    iv: string;
}

export interface DecryptionOptions {
    encrypted: string;
    salt: string;
    iv: string;
    password: string;
}

// ============================================================================
// UI Types
// ============================================================================

export interface ModalResult<T> {
    confirmed: boolean;
    data?: T;
}

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'password';
    value: any;
    options?: { label: string; value: string }[];
    placeholder?: string;
    required?: boolean;
    description?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class PluginError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'PluginError';
    }
}

export class EncryptionError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'ENCRYPTION_ERROR', details);
        this.name = 'EncryptionError';
    }
}

export class LLMError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'LLM_ERROR', details);
        this.name = 'LLMError';
    }
}

export class RAGError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'RAG_ERROR', details);
        this.name = 'RAGError';
    }
}

export class AgentError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'AGENT_ERROR', details);
        this.name = 'AgentError';
    }
}
