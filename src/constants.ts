import { ChunkingConfig, LLMProviderConfig } from './types';

// ============================================================================
// Enums and Types
// ============================================================================

export enum LLMProvider {
    OPENAI = 'openai',
    ANTHROPIC = 'anthropic',
    OLLAMA = 'ollama',
    CUSTOM = 'custom'
}

export enum SearchStrategy {
    SEMANTIC = 'semantic',
    KEYWORD = 'keyword',
    HYBRID = 'hybrid'
}

// ============================================================================
// Plugin Information
// ============================================================================

export const PLUGIN_NAME = 'Mnemosyne';
export const PLUGIN_ID = 'mnemosyne';
export const PLUGIN_VERSION = '1.0.0';

// ============================================================================
// AI Model Configurations
// ============================================================================

export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = 'llama3.2';

export const LOCAL_AI_MODELS = {
    EMBEDDING: {
        'all-MiniLM-L6-v2': 'Xenova/all-MiniLM-L6-v2',
        'bge-small': 'Xenova/bge-small-en-v1.5',
        'nomic-embed': 'nomic-embed-text' // Ollama model
    },
    GENERATION: {
        'llama3.2': 'llama3.2',
        'llama3.1': 'llama3.1',
        'mistral': 'mistral:latest',
        'codellama': 'codellama:latest',
        'phi': 'phi:latest',
        'gemma': 'gemma:latest'
    }
} as const;

export const OPENAI_MODELS = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
] as const;

export const ANTHROPIC_MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
] as const;

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
    strategy: 'hybrid',
    targetSize: 512,
    minSize: 100,
    maxSize: 1024,
    overlap: 50,
    respectBoundaries: true,
    preserveStructure: true,
    qualityThreshold: 0.5,
    enableQualityFilter: true
};

export const DEFAULT_LLM_PROVIDERS: LLMProviderConfig[] = [
    {
        id: 'openai-gpt4o',
        name: 'OpenAI GPT-4o',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        apiKeyName: 'openai',
        isDefault: true
    },
    {
        id: 'anthropic-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 4096,
        apiKeyName: 'anthropic'
    },
    {
        id: 'ollama-llama',
        name: 'Llama 3.2 (Local)',
        provider: 'ollama',
        model: 'llama3.2',
        temperature: 0.7,
        maxTokens: 4096,
        baseUrl: DEFAULT_OLLAMA_URL
    }
];

// ============================================================================
// File and Folder Patterns
// ============================================================================

export const DEFAULT_EXCLUDE_PATTERNS = [
    '.git/**',
    '.obsidian/**',
    'node_modules/**',
    '*.tmp',
    '*.temp',
    '*.log',
    '*.cache'
];

export const SUPPORTED_FILE_EXTENSIONS = [
    '.md',
    '.txt',
    '.rtf'
];

export const MARKDOWN_EXTENSIONS = [
    '.md',
    '.markdown',
    '.mdown',
    '.mkdn',
    '.mkd'
];

// ============================================================================
// Performance Limits
// ============================================================================

export const PERFORMANCE_LIMITS = {
    MAX_CHUNK_SIZE: 2048,
    MAX_CHUNKS_PER_DOCUMENT: 100,
    MAX_DOCUMENTS_PER_BATCH: 50,
    MAX_CONCURRENT_REQUESTS: 5,
    MAX_CACHE_SIZE_MB: 100,
    MAX_MEMORY_USAGE_MB: 500,
    EMBEDDING_BATCH_SIZE: 20,
    RATE_LIMIT_REQUESTS_PER_MINUTE: 60
};

// ============================================================================
// UI Constants
// ============================================================================

export const UI_CONSTANTS = {
    CHAT_INPUT_MAX_HEIGHT: 200,
    CHAT_HISTORY_MAX_MESSAGES: 1000,
    AGENT_CARD_GRID_COLS: 3,
    MODAL_Z_INDEX: 1000,
    TOOLTIP_DELAY: 500,
    ANIMATION_DURATION: 200,
    DEBOUNCE_DELAY: 300
};

export const THEME_COLORS = {
    primary: '#8b5cf6',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
};

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
    SETTINGS: 'mnemosyne-settings',
    AGENTS: 'mnemosyne-agents',
    CONVERSATIONS: 'mnemosyne-conversations',
    CACHE: 'mnemosyne-cache',
    VECTOR_STORE: 'mnemosyne-vector-store',
    ENCRYPTION_SALT: 'mnemosyne-encryption-salt'
};

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
    VECTOR_STORE_NOT_INITIALIZED: 'Vector store has not been initialized. Please run vault indexing first.',
    INVALID_QUERY: 'Query must be a non-empty string.',
    NO_PROVIDER: 'No AI provider has been configured. Please add an API key in settings.',
    OLLAMA_CONNECTION_FAILED: 'Cannot connect to Ollama server. Please ensure Ollama is running.',
    LOCAL_MODEL_LOAD_FAILED: 'Failed to load local embedding model. Falling back to cloud embeddings.',
    AGENT_NOT_FOUND: 'The specified agent could not be found.',
    INVALID_AGENT_CONFIG: 'Agent configuration is invalid or incomplete.',
    ENCRYPTION_FAILED: 'Failed to encrypt sensitive data. Please check your master password.',
    DECRYPTION_FAILED: 'Failed to decrypt data. Please verify your master password.',
    API_KEY_INVALID: 'The provided API key appears to be invalid.',
    RATE_LIMIT_EXCEEDED: 'API rate limit exceeded. Please wait before making more requests.',
    INSUFFICIENT_MEMORY: 'Insufficient memory to complete operation. Try processing fewer documents.',
    FILE_NOT_FOUND: 'The specified file could not be found in the vault.',
    NETWORK_ERROR: 'Network error occurred. Please check your internet connection.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
    AGENT_CREATED: 'Agent created successfully!',
    AGENT_UPDATED: 'Agent updated successfully!',
    AGENT_DELETED: 'Agent deleted successfully!',
    VAULT_INDEXED: 'Vault has been successfully indexed!',
    SETTINGS_SAVED: 'Settings saved successfully!',
    API_KEY_SAVED: 'API key saved securely!',
    CACHE_CLEARED: 'Cache cleared successfully!',
    EXPORT_COMPLETED: 'Export completed successfully!',
    IMPORT_COMPLETED: 'Import completed successfully!'
};

// ============================================================================
// Validation Patterns
// ============================================================================

export const VALIDATION_PATTERNS = {
    OPENAI_API_KEY: /^sk-[a-zA-Z0-9]{48}$/,
    ANTHROPIC_API_KEY: /^sk-ant-[a-zA-Z0-9\-_]{95}$/,
    AGENT_ID: /^[a-zA-Z0-9\-_]{3,50}$/,
    FOLDER_PATH: /^[^<>:"|?*]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// ============================================================================
// Command IDs
// ============================================================================

export const COMMAND_IDS = {
    OPEN_CHAT: 'mnemosyne:open-chat',
    QUICK_QUERY: 'mnemosyne:quick-query',
    CREATE_AGENT: 'mnemosyne:create-agent',
    INDEX_VAULT: 'mnemosyne:index-vault',
    OPEN_SETTINGS: 'mnemosyne:open-settings',
    SWITCH_AGENT: 'mnemosyne:switch-agent',
    CLEAR_CHAT: 'mnemosyne:clear-chat',
    EXPORT_CONVERSATION: 'mnemosyne:export-conversation',
    SHOW_STATS: 'mnemosyne:show-stats'
};

// ============================================================================
// View Types
// ============================================================================

export const VIEW_TYPES = {
    CHAT: 'mnemosyne-chat-view',
    AGENT_HUB: 'mnemosyne-agent-hub-view',
    STATS: 'mnemosyne-stats-view'
};

// ============================================================================
// Agent Categories
// ============================================================================

export const AGENT_CATEGORIES = [
    'General',
    'Research',
    'Writing',
    'Analysis',
    'Creative',
    'Technical',
    'Education',
    'Business',
    'Personal',
    'Custom'
];

// ============================================================================
// Content Types
// ============================================================================

export const CONTENT_TYPES = [
    'concept',
    'procedure',
    'reference',
    'example',
    'definition',
    'tutorial',
    'summary',
    'analysis',
    'opinion',
    'fact'
];
