# Phase 0–1 Execution Guide: Mnemosyne
## Professional AI Agent Platform for Obsidian

This is the complete execution guide for transforming the RAG Agent Manager into **Mnemosyne** - a professional AI agent platform with React UI, local AI support, and enterprise-grade features.

---

## 🎯 Strategic Overview

### Transformation Goals
- **From**: Risk management MVP → **To**: Professional multi-agent platform
- **Name**: RAG Agent Manager → **Mnemosyne** (Greek goddess of memory)
- **Focus**: Domain-specific tool → Universal knowledge management platform
- **UI**: Basic Obsidian components → Modern React + Tailwind interface
- **AI**: Cloud-only → Hybrid local/cloud AI with Ollama + Transformers.js

### Key Differentiators
✅ **Multiple Specialized Agents** (vs. single general assistant)  
✅ **Enterprise Security** (AES-256 encryption with vault-scoped keys)  
✅ **Local + Cloud AI** (Ollama + OpenAI/Anthropic/Claude)  
✅ **Advanced RAG** (intelligent chunking with folder awareness)  
✅ **Professional UI** (React + Tailwind v4 with Obsidian integration)  
✅ **Zero Dependencies** (eliminate DataviewJS/CustomJS requirements)

---

# PHASE 0: Enhanced Project Foundation

## 0.1 Repository Setup & Strategic Rebranding

### Update Plugin Metadata

**manifest.json** (Complete file):
```json
{
  "id": "mnemosyne",
  "name": "Mnemosyne",
  "version": "1.0.0",
  "minAppVersion": "1.4.0",
  "description": "Professional AI agent platform for Obsidian with local and cloud AI support, advanced RAG, and specialized knowledge assistants.",
  "author": "David Dunnock",
  "authorUrl": "https://github.com/dunnock",
  "fundingUrl": "https://buymeacoffee.com/dunnock",
  "isDesktopOnly": false
}
```

**package.json** (Complete updated file):
```json
{
  "name": "mnemosyne",
  "version": "1.0.0",
  "description": "Professional AI agent platform for Obsidian with local AI, advanced RAG, and specialized knowledge assistants",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc --noEmit && node esbuild.config.mjs production",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "lint:fix": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "type-check": "tsc --noEmit",
    "prepare": "husky install",
    "version": "npm run build && git add -A src"
  },
  "keywords": [
    "obsidian",
    "plugin",
    "ai",
    "agents",
    "rag",
    "llm",
    "local-ai",
    "ollama",
    "professional",
    "knowledge-management",
    "react",
    "tailwind"
  ],
  "author": "David Dunnock",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^16.11.6",
    "@typescript-eslint/eslint-plugin": "5.29.0",
    "@typescript-eslint/parser": "5.29.0",
    "@types/jest": "^29.5.5",
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "builtin-modules": "3.3.0",
    "esbuild": "0.17.3",
    "eslint": "8.18.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "husky": "^8.0.3",
    "jest": "^29.6.4",
    "lint-staged": "^13.2.3",
    "obsidian": "latest",
    "postcss": "^8.4.31",
    "prettier": "^2.8.8",
    "tailwindcss": "^3.3.3",
    "ts-jest": "^29.1.1",
    "tslib": "2.4.0",
    "typescript": "4.7.4"
  },
  "dependencies": {
    "@xenova/transformers": "^2.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{md,css}": [
      "prettier --write"
    ]
  }
}
```

## 0.2 Professional Development Stack

### Install Dependencies
Run these commands in your terminal:

```bash
# Core React and AI dependencies
npm install react react-dom @xenova/transformers

# TypeScript types
npm install --save-dev @types/react @types/react-dom

# Tailwind CSS and PostCSS
npm install --save-dev tailwindcss postcss autoprefixer

# React ESLint plugins
npm install --save-dev eslint-plugin-react eslint-plugin-react-hooks

# Enhanced dev tools
npm install --save-dev @types/jest jest ts-jest husky lint-staged prettier

# Initialize Husky for git hooks
npx husky install
```

### Enhanced ESLint Configuration

**.eslintrc.json** (Complete file):
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "env": {
    "node": true,
    "browser": true,
    "es2021": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks"
  ],
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "settings": {
    "react": {
      "version": "18.2"
    }
  },
  "rules": {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "args": "after-used",
        "argsIgnorePattern": "^_"
      }
    ],
    "no-console": [
      "warn",
      {
        "allow": [
          "warn",
          "error"
        ]
      }
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  },
  "ignorePatterns": [
    "main.js"
  ]
}
```

### Tailwind CSS Configuration

**tailwind.config.js** (Complete file):
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Obsidian CSS variable integration
        'ob-primary': 'var(--interactive-accent)',
        'ob-primary-hover': 'var(--interactive-accent-hover)',
        'ob-background': 'var(--background-primary)',
        'ob-background-secondary': 'var(--background-secondary)',
        'ob-text': 'var(--text-normal)',
        'ob-text-muted': 'var(--text-muted)',
        'ob-text-faint': 'var(--text-faint)',
        'ob-border': 'var(--background-modifier-border)',
        'ob-border-hover': 'var(--background-modifier-border-hover)',
        'ob-success': 'var(--text-success)',
        'ob-warning': 'var(--text-warning)',
        'ob-error': 'var(--text-error)',
        'ob-accent': 'var(--interactive-accent)',
        'ob-accent-hover': 'var(--interactive-accent-hover)'
      },
      fontFamily: {
        'ob-default': 'var(--font-interface)',
        'ob-mono': 'var(--font-monospace)',
        'ob-text': 'var(--font-text)'
      },
      borderRadius: {
        'ob-s': 'var(--radius-s)',
        'ob-m': 'var(--radius-m)',
        'ob-l': 'var(--radius-l)',
        'ob-xl': 'var(--radius-xl)'
      },
      spacing: {
        'ob-xs': 'var(--size-2-1)',
        'ob-s': 'var(--size-2-2)',
        'ob-m': 'var(--size-2-3)',
        'ob-l': 'var(--size-4-1)',
        'ob-xl': 'var(--size-4-2)'
      }
    }
  },
  plugins: [],
  darkMode: ['class', '[data-theme="dark"]']
};
```

**postcss.config.js** (Complete file):
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

### Update Main CSS File

**styles/main.css** (Complete file):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Obsidian integration styles */
.mnemosyne-container {
  @apply text-ob-text bg-ob-background font-ob-default;
}

.mnemosyne-card {
  @apply bg-ob-background-secondary border border-ob-border rounded-ob-m;
}

.mnemosyne-button {
  @apply px-4 py-2 rounded-ob-s font-medium transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-ob-accent/50;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.mnemosyne-button-primary {
  @apply bg-ob-accent hover:bg-ob-accent-hover text-white shadow-sm;
}

.mnemosyne-button-secondary {
  @apply bg-ob-background-secondary hover:bg-ob-border text-ob-text border border-ob-border;
}

.mnemosyne-button-ghost {
  @apply hover:bg-ob-background-secondary text-ob-text;
}

.mnemosyne-input {
  @apply w-full px-3 py-2 bg-ob-background border border-ob-border rounded-ob-s;
  @apply text-ob-text placeholder-ob-text-muted;
  @apply focus:outline-none focus:ring-2 focus:ring-ob-accent/50 focus:border-ob-accent;
}

.mnemosyne-modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50;
}

.mnemosyne-modal-content {
  @apply bg-ob-background border border-ob-border rounded-ob-l shadow-xl;
  @apply max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto;
}

.mnemosyne-chat-container {
  @apply flex flex-col h-full bg-ob-background;
}

.mnemosyne-chat-messages {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.mnemosyne-chat-input {
  @apply p-4 border-t border-ob-border;
}

.mnemosyne-agent-card {
  @apply p-4 border border-ob-border rounded-ob-m hover:bg-ob-background-secondary;
  @apply cursor-pointer transition-colors duration-200;
}

.mnemosyne-agent-card:hover {
  @apply border-ob-accent/50;
}

.mnemosyne-loading-spinner {
  @apply inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
}

/* Custom scrollbar for dark theme compatibility */
.mnemosyne-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.mnemosyne-scrollbar::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.mnemosyne-scrollbar::-webkit-scrollbar-thumb {
  background: var(--background-modifier-border);
  border-radius: 4px;
}

.mnemosyne-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--background-modifier-border-hover);
}
```

### Jest Testing Configuration

**jest.config.js** (Complete file):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  testTimeout: 10000
};
```

**tests/setup.ts** (Complete file):
```typescript
import '@testing-library/jest-dom';

// Mock Obsidian API
global.require = jest.fn();

// Mock Obsidian classes and objects
const mockApp = {
  vault: {
    adapter: {
      fs: {
        promises: {
          readdir: jest.fn(),
          readFile: jest.fn(),
          writeFile: jest.fn()
        }
      }
    },
    getFiles: jest.fn(() => []),
    read: jest.fn(),
    modify: jest.fn()
  },
  workspace: {
    getLeftLeaf: jest.fn(),
    getRightLeaf: jest.fn(),
    on: jest.fn()
  },
  metadataCache: {
    getFileCache: jest.fn(),
    on: jest.fn()
  }
};

global.app = mockApp;

// Mock Plugin class
class MockPlugin {
  app: typeof mockApp;
  manifest: Record<string, unknown>;
  
  constructor(app: typeof mockApp, manifest: Record<string, unknown>) {
    this.app = app;
    this.manifest = manifest;
  }

  addCommand(): void {}
  addSettingTab(): void {}
  addRibbonIcon(): void {}
  loadData(): Promise<unknown> { return Promise.resolve({}); }
  saveData(): Promise<void> { return Promise.resolve(); }
}

global.Plugin = MockPlugin;

// Mock Modal class
class MockModal {
  constructor() {}
  open(): void {}
  close(): void {}
}

global.Modal = MockModal;

// Mock Notice
global.Notice = jest.fn();
```

---

# PHASE 1: Core Refactoring + Modern Foundation

## 1.1 Remove Risk Management Specifics

### Generalized Type Definitions

**src/types/index.ts** (Complete file):
```typescript
import { TFile } from 'obsidian';

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
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
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
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
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
  llmProvider: string;
  temperature: number;
  maxTokens: number;
  
  // RAG Configuration
  useRAG: boolean;
  maxRetrievedChunks: number;
  relevanceThreshold: number;
  
  // Content Filtering
  allowedFolders?: string[];
  excludedFolders?: string[];
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
  defaultConfig: Partial<AgentConfig>;
  examples: string[];
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

export interface PublicAPI {
  // Agent Operations
  getAgent(id: string): AgentConfig | null;
  listAgents(): AgentConfig[];
  createAgent(config: Partial<AgentConfig>): Promise<AgentConfig>;
  updateAgent(id: string, config: Partial<AgentConfig>): Promise<AgentConfig>;
  deleteAgent(id: string): Promise<void>;
  
  // Chat Operations
  executeAgent(agentId: string, message: string, context?: unknown): Promise<ChatResponse>;
  streamAgent(agentId: string, message: string, context?: unknown): AsyncGenerator<StreamChunk>;
  
  // RAG Operations
  queryRAG(query: string, options?: RAGQueryOptions): Promise<ChunkResult[]>;
  ingestDocument(file: TFile): Promise<VaultDocument>;
  
  // System Operations
  isReady(): boolean;
  getStats(): PluginStats;
  clearCache(): Promise<void>;
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
```

### Updated Constants

**src/constants.ts** (Complete file):
```typescript
import { ChunkingConfig, LLMProviderConfig } from './types';

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
```

## 1.2 Local AI Integration

### Ollama Provider Implementation

**src/llm/ollama.ts** (Complete file):
```typescript
import { BaseLLMProvider } from './base';
import { Message, ChatResponse, ChatOptions, StreamChunk, MnemosyneError, ErrorCodes } from '../types';
import { DEFAULT_OLLAMA_URL } from '../constants';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  timeout?: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider extends BaseLLMProvider {
  private config: OllamaConfig;
  private isConnected: boolean = false;
  private availableModels: string[] = [];

  constructor(config: OllamaConfig) {
    super();
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.checkConnection();
      await this.loadAvailableModels();
      this.isConnected = true;
      console.log(`✅ Ollama provider initialized: ${this.config.baseUrl}`);
    } catch (error) {
      console.warn('⚠️ Failed to initialize Ollama provider:', error);
      this.isConnected = false;
      throw new MnemosyneError(
        'Failed to connect to Ollama server',
        ErrorCodes.OLLAMA_CONNECTION_FAILED,
        { baseUrl: this.config.baseUrl, error: error.message }
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      throw new MnemosyneError(
        `Cannot connect to Ollama server at ${this.config.baseUrl}`,
        ErrorCodes.OLLAMA_CONNECTION_FAILED,
        { error: error.message }
      );
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.isConnected) {
      await this.initialize();
    }
    return this.availableModels;
  }

  async loadAvailableModels(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.availableModels = data.models?.map((model: OllamaModel) => 
        model.name.replace(':latest', '')
      ) || [];
      
      console.log('📋 Available Ollama models:', this.availableModels);
    } catch (error) {
      console.warn('Failed to load Ollama models:', error);
      this.availableModels = [];
    }
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName) || models.includes(`${modelName}:latest`);
  }

  async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.total && data.completed && onProgress) {
                  const progress = (data.completed / data.total) * 100;
                  onProgress(Math.round(progress));
                }
                if (data.status === 'success') {
                  await this.loadAvailableModels(); // Refresh model list
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse pull response:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw new MnemosyneError(
        `Failed to pull model ${modelName}`,
        ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
        { modelName, error: error.message }
      );
    }
  }

  async generateResponse(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    if (!this.isConnected) {
      await this.initialize();
    }

    const modelAvailable = await this.isModelAvailable(this.config.model);
    if (!modelAvailable) {
      throw new MnemosyneError(
        `Model ${this.config.model} is not available. Please pull the model first.`,
        ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
        { model: this.config.model }
      );
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: false,
          options: {
            temperature: options?.temperature ?? this.config.temperature,
            num_predict: options?.maxTokens ?? this.config.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      
      return {
        content: data.message?.content || '',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
      };
    } catch (error) {
      throw new MnemosyneError(
        `Ollama API request failed: ${error.message}`,
        ErrorCodes.OLLAMA_CONNECTION_FAILED,
        { model: this.config.model, error: error.message }
      );
    }
  }

  async *streamResponse(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
    if (!this.isConnected) {
      await this.initialize();
    }

    const modelAvailable = await this.isModelAvailable(this.config.model);
    if (!modelAvailable) {
      throw new MnemosyneError(
        `Model ${this.config.model} is not available. Please pull the model first.`,
        ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
        { model: this.config.model }
      );
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          options: {
            temperature: options?.temperature ?? this.config.temperature,
            num_predict: options?.maxTokens ?? this.config.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: OllamaResponse = JSON.parse(line);
                yield {
                  content: data.message?.content || '',
                  done: data.done || false
                };
                if (data.done) return;
              } catch (e) {
                console.warn('Failed to parse Ollama stream response:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw new MnemosyneError(
        `Ollama stream request failed: ${error.message}`,
        ErrorCodes.OLLAMA_CONNECTION_FAILED,
        { model: this.config.model, error: error.message }
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
        body: JSON.stringify({
          model: this.config.model,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error) {
      throw new MnemosyneError(
        `Ollama embedding request failed: ${error.message}`,
        ErrorCodes.OLLAMA_CONNECTION_FAILED,
        { model: this.config.model, error: error.message }
      );
    }
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
    this.isConnected = false; // Force re-initialization
  }
}
```

### Local Embeddings with Transformers.js

**src/rag/localEmbeddings.ts** (Complete file):
```typescript
import { pipeline, Pipeline } from '@xenova/transformers';
import { EmbeddingsGenerator } from './embeddings';
import { MnemosyneError, ErrorCodes } from '../types';
import { DEFAULT_LOCAL_EMBEDDING_MODEL, PERFORMANCE_LIMITS } from '../constants';

export interface LocalEmbeddingConfig {
  modelName: string;
  quantized: boolean;
  maxInputLength: number;
  batchSize: number;
  device: 'cpu' | 'gpu' | 'auto';
  cacheDir?: string;
}

export class LocalEmbeddingsGenerator extends EmbeddingsGenerator {
  private model: Pipeline | null = null;
  private config: LocalEmbeddingConfig;
  private fallback?: EmbeddingsGenerator;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    config: Partial<LocalEmbeddingConfig> = {},
    fallback?: EmbeddingsGenerator
  ) {
    super();
    this.config = {
      modelName: DEFAULT_LOCAL_EMBEDDING_MODEL,
      quantized: false,
      maxInputLength: 512,
      batchSize: PERFORMANCE_LIMITS.EMBEDDING_BATCH_SIZE,
      device: 'auto',
      ...config
    };
    this.fallback = fallback;
  }

  async initialize(apiKey?: string, options?: unknown): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize(apiKey, options);
    return this.initializationPromise;
  }

  private async _initialize(apiKey?: string, options?: unknown): Promise<void> {
    try {
      console.log(`🔄 Loading local embedding model: ${this.config.modelName}...`);
      
      // Show progress for model download
      const progressCallback = (progress: { progress: number; file: string }) => {
        if (progress.progress) {
          console.log(`📥 Downloading ${progress.file}: ${Math.round(progress.progress)}%`);
        }
      };

      this.model = await pipeline('feature-extraction', this.config.modelName, {
        quantized: this.config.quantized,
        progress_callback: progressCallback,
        cache_dir: this.config.cacheDir
      });

      console.log(`✅ Local embedding model loaded: ${this.config.modelName}`);
      this.isInitialized = true;
    } catch (error) {
      console.warn('⚠️ Failed to load local embedding model:', error);
      
      if (this.fallback) {
        console.log('🔄 Initializing fallback embedding provider...');
        try {
          await this.fallback.initialize(apiKey, options);
          console.log('✅ Fallback embedding provider initialized');
        } catch (fallbackError) {
          throw new MnemosyneError(
            'Failed to initialize both local and fallback embedding providers',
            ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
            { 
              localError: error.message, 
              fallbackError: fallbackError.message 
            }
          );
        }
      } else {
        throw new MnemosyneError(
          `Failed to initialize local embeddings: ${error.message}`,
          ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
          { modelName: this.config.modelName, error: error.message }
        );
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Validate input
    if (!text || typeof text !== 'string') {
      throw new MnemosyneError(
        'Input text must be a non-empty string',
        ErrorCodes.INVALID_QUERY
      );
    }

    // Truncate text if too long
    const truncatedText = this.truncateText(text);

    if (this.model) {
      try {
        const output = await this.model(truncatedText, {
          pooling: 'mean',
          normalize: true
        });

        // Convert to regular array
        const embedding = Array.from(output.data as Float32Array);
        
        if (embedding.length === 0) {
          throw new Error('Model returned empty embedding');
        }

        return embedding;
      } catch (error) {
        console.warn('Local embedding failed:', error);
        
        if (this.fallback) {
          console.log('🔄 Trying fallback embedding provider...');
          return await this.fallback.generateEmbedding(text);
        }
        
        throw new MnemosyneError(
          `Local embedding generation failed: ${error.message}`,
          ErrorCodes.LOCAL_MODEL_LOAD_FAILED,
          { text: truncatedText.slice(0, 100) + '...', error: error.message }
        );
      }
    }

    if (this.fallback) {
      return await this.fallback.generateEmbedding(text);
    }

    throw new MnemosyneError(
      'No embedding method available',
      ErrorCodes.LOCAL_MODEL_LOAD_FAILED
    );
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new MnemosyneError(
        'Input must be a non-empty array of strings',
        ErrorCodes.INVALID_QUERY
      );
    }

    // Process in batches for better performance
    const results: number[][] = [];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.warn(`Batch ${i / batchSize + 1} failed:`, error);
        
        // Try individual embeddings for failed batch
        for (const text of batch) {
          try {
            const embedding = await this.generateEmbedding(text);
            results.push(embedding);
          } catch (individualError) {
            console.warn('Individual embedding failed:', individualError);
            // Use zero vector as fallback
            results.push(new Array(384).fill(0)); // Common embedding dimension
          }
        }
      }
    }

    return results;
  }

  async test(): Promise<boolean> {
    try {
      const testEmbedding = await this.generateEmbedding('test embedding');
      return Array.isArray(testEmbedding) && testEmbedding.length > 0;
    } catch (error) {
      console.warn('Embedding test failed:', error);
      return false;
    }
  }

  clearCache(): void {
    // Clear any cached embeddings if implemented
    if (this.fallback) {
      this.fallback.clearCache();
    }
  }

  private truncateText(text: string): string {
    if (text.length <= this.config.maxInputLength) {
      return text;
    }

    // Truncate at word boundary when possible
    const truncated = text.slice(0, this.config.maxInputLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > this.config.maxInputLength * 0.8) {
      return truncated.slice(0, lastSpaceIndex);
    }
    
    return truncated;
  }

  getConfig(): LocalEmbeddingConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<LocalEmbeddingConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If model name changed, reinitialize
    if (config.modelName && config.modelName !== this.config.modelName) {
      this.isInitialized = false;
      this.initializationPromise = null;
      this.model = null;
    }
  }

  isReady(): boolean {
    return this.isInitialized && (this.model !== null || this.fallback !== undefined);
  }

  getModelInfo(): { name: string; isLocal: boolean; isReady: boolean } {
    return {
      name: this.config.modelName,
      isLocal: true,
      isReady: this.isReady()
    };
  }
}
```

## 1.3 React Foundation

### React Renderer Integration

**src/ui/ReactRenderer.tsx** (Complete file):
```tsx
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

export interface ReactRendererOptions {
  strictMode?: boolean;
  errorBoundary?: boolean;
}

export class ReactRenderer {
  private root: Root | null = null;
  private container: HTMLElement | null = null;
  private options: ReactRendererOptions;

  constructor(options: ReactRendererOptions = {}) {
    this.options = {
      strictMode: true,
      errorBoundary: true,
      ...options
    };
  }

  mount(container: HTMLElement, component: React.ReactElement): void {
    if (this.root && this.container !== container) {
      this.unmount();
    }

    this.container = container;

    if (!this.root) {
      // Clear container
      container.innerHTML = '';
      this.root = createRoot(container);
    }

    const wrappedComponent = this.wrapComponent(component);
    this.root.render(wrappedComponent);
  }

  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
      this.container = null;
    }
  }

  update(component: React.ReactElement): void {
    if (this.root) {
      const wrappedComponent = this.wrapComponent(component);
      this.root.render(wrappedComponent);
    } else {
      console.warn('ReactRenderer: Cannot update without mounting first');
    }
  }

  private wrapComponent(component: React.ReactElement): React.ReactElement {
    let wrappedComponent = component;

    if (this.options.errorBoundary) {
      wrappedComponent = (
        <ErrorBoundary>
          {wrappedComponent}
        </ErrorBoundary>
      );
    }

    if (this.options.strictMode) {
      wrappedComponent = (
        <React.StrictMode>
          {wrappedComponent}
        </React.StrictMode>
      );
    }

    return wrappedComponent;
  }

  isActive(): boolean {
    return this.root !== null;
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React component error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mnemosyne-container p-6 text-center">
          <div className="mnemosyne-card p-6">
            <h2 className="text-lg font-semibold text-ob-error mb-4">
              Something went wrong
            </h2>
            <p className="text-ob-text-muted mb-4">
              An unexpected error occurred in the Mnemosyne interface.
            </p>
            <details className="text-left">
              <summary className="cursor-pointer text-ob-text-muted text-sm mb-2">
                Error Details
              </summary>
              <pre className="bg-ob-background-secondary p-3 rounded text-xs overflow-x-auto">
                {this.state.error?.message}
              </pre>
            </details>
            <button
              className="mnemosyne-button mnemosyne-button-secondary mt-4"
              onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Professional React Components

**src/ui/components/Button.tsx** (Complete file):
```tsx
import React from 'react';
import { ButtonProps } from '../../types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  className = '',
  type = 'button'
}) => {
  const baseClasses = 'mnemosyne-button';
  
  const variantClasses = {
    primary: 'mnemosyne-button-primary',
    secondary: 'mnemosyne-button-secondary',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    ghost: 'mnemosyne-button-ghost'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <span className="mnemosyne-loading-spinner" aria-hidden="true" />
          {children}
        </div>
      ) : (
        children
      )}
    </button>
  );
};
```

**src/ui/components/Card.tsx** (Complete file):
```tsx
import React from 'react';
import { ComponentProps } from '../../types';

export interface CardProps extends ComponentProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  clickable = false,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const hoverClass = hover || clickable ? 'hover:bg-ob-background-secondary transition-colors duration-200' : '';
  const cursorClass = clickable ? 'cursor-pointer' : '';

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`mnemosyne-card ${paddingClasses[padding]} ${hoverClass} ${cursorClass} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};
```

**src/ui/components/Modal.tsx** (Complete file):
```tsx
import React, { useEffect, useRef } from 'react';
import { ModalProps } from '../../types';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="mnemosyne-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`mnemosyne-modal-content ${sizeClasses[size]} ${className}`}
        tabIndex={-1}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-ob-border">
            <h2 id="modal-title" className="text-xl font-semibold text-ob-text">
              {title}
            </h2>
            <button
              className="p-1 rounded hover:bg-ob-background-secondary text-ob-text-muted hover:text-ob-text"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
```

### Build Configuration Updates

**esbuild.config.mjs** (Complete file):
```javascript
import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/`;

const prod = (process.argv[2] === 'production');

const context = await esbuild.context({
  banner: {
    js: banner,
  },
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  
  // React/JSX Configuration
  jsx: 'automatic',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  
  // Define environment variables
  define: {
    'process.env.NODE_ENV': prod ? '"production"' : '"development"',
    'global': 'globalThis'
  },
  
  // Loader configuration
  loader: {
    '.css': 'text',
    '.svg': 'text'
  },
  
  // Minification for production
  minify: prod,
  keepNames: !prod,
  
  // Source maps
  sourcemap: prod ? false : 'inline'
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

---

## Verification & Testing

### Build and Test Commands
```bash
# Install all dependencies
npm install

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format

# Build for development
npm run build

# Build for production
npm run build production

# Run tests
npm run test
```

### Manual Testing Steps

1. **Install in Obsidian**:
   ```bash
   # Create symlink to test vault
   ln -s "$(pwd)" ~/.obsidian/vaults/test-vault/.obsidian/plugins/mnemosyne
   ```

2. **Test Local AI Setup**:
   ```bash
   # Start Ollama (if testing local AI)
   ollama serve
   
   # Pull a model
   ollama pull llama3.2
   ```

3. **Verify Plugin Loading**:
   - Enable the plugin in Obsidian settings
   - Check console for any errors (Cmd+Opt+I)
   - Verify new settings section appears

### Success Criteria
- ✅ Plugin loads without TypeScript errors
- ✅ React components render correctly
- ✅ Tailwind classes apply properly
- ✅ Local AI integration initializes
- ✅ Settings save and load correctly
- ✅ All tests pass

---

## What's Next

**Phase 2** will implement:
- Complete React-based chat interface
- Professional agent template system  
- Advanced RAG implementation
- Command palette integration
- Enhanced UI components

This foundation provides everything needed for a modern, professional Obsidian plugin with hybrid AI capabilities! 🚀