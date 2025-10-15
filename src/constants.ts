/**
 * Plugin-wide constants
 */

export const PLUGIN_ID = 'rag-agent-manager';
export const PLUGIN_NAME = 'RAG Agent Manager';

// API Configuration
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
export const DEFAULT_OPENAI_MODEL = 'gpt-4-turbo-preview';

// RAG Configuration
// Note: Embedding model will be configured in Phase 3
// Options: 'Xenova/all-MiniLM-L6-v2' (local) or 'openai' (API-based)
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_TOP_K = 5;
export const DEFAULT_SCORE_THRESHOLD = 0.7;
export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 50;

// LLM Configuration
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;

// File paths
export const VECTOR_STORE_DIR = 'vector-store';
export const EMBEDDINGS_CACHE_DIR = 'embeddings-cache';
export const RAG_CHUNKS_DIR = 'data/rag_chunks';

// Error messages
export const ERRORS = {
    NO_API_KEY: 'API key not configured for this provider',
    DECRYPTION_FAILED: 'Failed to decrypt API key. Check your master password.',
    AGENT_NOT_FOUND: 'Agent not found',
    LLM_NOT_FOUND: 'LLM configuration not found',
    INVALID_QUERY: 'Invalid query',
    VECTOR_STORE_NOT_INITIALIZED: 'Vector store not initialized',
};

// Success messages
export const SUCCESS = {
    API_KEY_SAVED: 'API key saved and encrypted successfully',
    AGENT_CREATED: 'Agent created successfully',
    AGENT_UPDATED: 'Agent updated successfully',
    AGENT_DELETED: 'Agent deleted successfully',
    CHUNKS_INGESTED: 'RAG chunks ingested successfully',
};

// UI Constants
export const MODAL_WIDTH = '800px';
export const MODAL_HEIGHT = '600px';

// Supported LLM providers
export enum LLMProvider {
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
    CUSTOM = 'custom'
}

// Search strategies
export enum SearchStrategy {
    SEMANTIC = 'semantic',
    HYBRID = 'hybrid',
    KEYWORD = 'keyword'
}

// Content types from your RAG chunks
export enum ContentType {
    CONCEPT = 'concept',
    PROCEDURE = 'procedure',
    REFERENCE = 'reference',
    TEMPLATE = 'template'
}

// Process phases from your Risk Management Handbook
export enum ProcessPhase {
    PLANNING = 'planning',
    ASSESSMENT = 'assessment',
    IDENTIFICATION = 'identification',
    ANALYSIS = 'analysis',
    HANDLING = 'handling',
    MONITORING = 'monitoring',
    DOCUMENTATION = 'documentation'
}

// Handling strategies from your handbook
export enum HandlingStrategy {
    AVOIDANCE = 'avoidance',
    ACCEPTANCE = 'acceptance',
    TRANSFER = 'transfer',
    CONTROL = 'control',
    WATCH = 'watch'
}
