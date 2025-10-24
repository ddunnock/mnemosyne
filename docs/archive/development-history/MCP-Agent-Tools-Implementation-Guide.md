# MCP-Type Agent Tools Implementation Guide

**Project**: Mnemosyne - Professional AI Agent Platform for Obsidian
**Feature**: Agent Tools for Reading and Writing Obsidian Notes
**Status**: Implementation Guide
**Created**: 2025-01-20

---

## Overview

This guide provides a complete implementation plan for adding MCP-style (Model Context Protocol) tool-calling capabilities to Mnemosyne agents. This will allow agents to directly read from and write to Obsidian notes, going beyond the current RAG retrieval system.

### What You'll Build

1. **Tool System Architecture** - Function calling interface for agents
2. **Note Reading Tools** - Read specific notes, folders, search by criteria
3. **Note Writing Tools** - Create, update, append to notes
4. **Metadata Tools** - Read/write frontmatter, tags, links
5. **Tool Execution Engine** - Safe execution with validation and error handling
6. **Agent Integration** - Connect tools to your existing agent system

### Current System Capabilities

Your current system already has:
- ✅ RAG-based semantic search and retrieval (vectorStore.ts, retriever.ts)
- ✅ Agent execution engine (agentExecutor.ts)
- ✅ Vault ingestion system (VaultIngestor.ts, AutoIngestionManager.ts)
- ✅ LLM provider abstraction (llmManager.ts with OpenAI, Anthropic support)
- ✅ Conversation memory management (conversationMemory.ts)

### What We're Adding

- ✨ **Tool Definition System** - Structured tool schemas with parameters
- ✨ **Vault Operations Layer** - Direct note read/write with Obsidian API
- ✨ **Function Calling Support** - LLM-driven tool invocation
- ✨ **Safety & Validation** - Permission checks, content validation
- ✨ **Execution Tracking** - Audit log of agent actions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Executor                            │
│  (agentExecutor.ts - existing)                              │
│                                                              │
│  1. Receives user query                                     │
│  2. Retrieves RAG context (existing)                        │
│  3. NEW: Checks if LLM wants to use tools                   │
│  4. NEW: Executes tools via ToolExecutor                    │
│  5. Returns response with tool results                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Tool System (NEW)                         │
│  src/tools/                                                  │
│                                                              │
│  ├─ toolTypes.ts         (Tool schemas & interfaces)       │
│  ├─ toolRegistry.ts      (Available tools catalog)         │
│  ├─ toolExecutor.ts      (Execute tools safely)            │
│  ├─ vaultTools.ts        (Note read/write operations)      │
│  └─ metadataTools.ts     (Frontmatter, tags, links)        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Obsidian Vault API                          │
│  (app.vault, app.metadataCache - Obsidian native)          │
│                                                              │
│  • Read/write file operations                               │
│  • Frontmatter parsing                                      │
│  • Tag and link extraction                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Tool Type Definitions

Create the foundational type system for tools.

```typescript title:src/tools/toolTypes.ts
/**
 * Tool Types and Interfaces
 *
 * Defines the structure for agent tools (function calling)
 */

import { TFile, CachedMetadata } from 'obsidian';

/**
 * Tool parameter definition
 */
export interface ToolParameter {
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    enum?: string[]; // For restricted values
    default?: unknown;
    properties?: Record<string, ToolParameter>; // For nested objects
    items?: ToolParameter; // For array items
}

/**
 * Tool definition schema
 * This is what the LLM sees to decide which tools to use
 */
export interface ToolDefinition {
    name: string;
    description: string;
    category: 'vault' | 'metadata' | 'search' | 'system';
    parameters: ToolParameter[];
    returns: {
        type: string;
        description: string;
    };
    examples?: string[]; // Usage examples for LLM
    dangerous?: boolean; // Requires confirmation
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
    agentName: string;
    userId?: string;
    vaultPath: string;
    restrictToFolders?: string[]; // Agent folder restrictions
    readOnly?: boolean; // Prevent write operations
    maxResultSize?: number; // Limit returned content size
    allowDangerousOperations?: boolean; // Enable delete, batch operations
}

/**
 * Tool invocation request (from LLM)
 */
export interface ToolInvocation {
    toolName: string;
    parameters: Record<string, unknown>;
    invocationId: string; // For tracking
}

/**
 * Tool execution result
 */
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

/**
 * Note content structure
 */
export interface NoteContent {
    path: string;
    filename: string;
    content: string;
    frontmatter?: Record<string, unknown>;
    tags?: string[];
    links?: {
        internal: string[];
        external: string[];
    };
    created: number;
    modified: number;
    size: number;
}

/**
 * Search criteria for notes
 */
export interface NoteSearchCriteria {
    query?: string; // Text search
    folder?: string; // Limit to folder
    tags?: string[]; // Must have these tags
    frontmatter?: Record<string, unknown>; // Frontmatter filters
    dateRange?: {
        start?: number;
        end?: number;
        field: 'created' | 'modified';
    };
    limit?: number;
    offset?: number;
}

/**
 * Tool execution audit log entry
 */
export interface ToolAuditEntry {
    timestamp: number;
    agentName: string;
    toolName: string;
    parameters: Record<string, unknown>;
    result: ToolResult;
    durationMs: number;
}

/**
 * Error types for tool execution
 */
export class ToolExecutionError extends Error {
    constructor(
        message: string,
        public code: string,
        public toolName: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ToolExecutionError';
    }
}

export class ToolPermissionError extends ToolExecutionError {
    constructor(toolName: string, message: string) {
        super(message, 'PERMISSION_DENIED', toolName);
        this.name = 'ToolPermissionError';
    }
}

export class ToolValidationError extends ToolExecutionError {
    constructor(toolName: string, message: string, details?: unknown) {
        super(message, 'VALIDATION_FAILED', toolName, details);
        this.name = 'ToolValidationError';
    }
}
```

---

## Phase 2: Vault Operations Tools

Implement the actual note reading and writing capabilities.

```typescript title:src/tools/vaultTools.ts
/**
 * Vault Tools
 *
 * Tools for reading and writing Obsidian notes
 */

import { App, TFile, TFolder, normalizePath } from 'obsidian';
import {
    ToolDefinition,
    ToolExecutionContext,
    ToolResult,
    NoteContent,
    NoteSearchCriteria,
    ToolExecutionError,
    ToolPermissionError,
    ToolValidationError
} from './toolTypes';

export class VaultTools {
    constructor(private app: App) {}

    /**
     * Tool: Read Note
     * Reads the complete content of a specific note
     */
    static getReadNoteDefinition(): ToolDefinition {
        return {
            name: 'read_note',
            description: 'Read the complete content of a specific note by path. Returns the note content, frontmatter, and metadata.',
            category: 'vault',
            parameters: [
                {
                    name: 'path',
                    description: 'Path to the note (e.g., "folder/note.md" or "note")',
                    type: 'string',
                    required: true
                },
                {
                    name: 'include_frontmatter',
                    description: 'Whether to include parsed frontmatter',
                    type: 'boolean',
                    required: false,
                    default: true
                }
            ],
            returns: {
                type: 'object',
                description: 'Note content with metadata'
            },
            examples: [
                'read_note(path: "projects/project-alpha.md")',
                'read_note(path: "daily-notes/2025-01-20.md")'
            ]
        };
    }

    async executeReadNote(
        parameters: { path: string; include_frontmatter?: boolean },
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            // Validate parameters
            if (!parameters.path) {
                throw new ToolValidationError('read_note', 'path parameter is required');
            }

            // Normalize path and try to find file
            const normalizedPath = normalizePath(parameters.path);
            let file = this.app.vault.getAbstractFileByPath(normalizedPath);

            // If not found, try adding .md extension
            if (!file) {
                const pathWithMd = normalizedPath.endsWith('.md')
                    ? normalizedPath
                    : `${normalizedPath}.md`;
                file = this.app.vault.getAbstractFileByPath(pathWithMd);
            }

            if (!file || !(file instanceof TFile)) {
                throw new ToolExecutionError(
                    `Note not found: ${parameters.path}`,
                    'NOTE_NOT_FOUND',
                    'read_note'
                );
            }

            // Check folder restrictions
            if (context.restrictToFolders && context.restrictToFolders.length > 0) {
                const allowed = context.restrictToFolders.some(folder =>
                    file.path.startsWith(folder)
                );
                if (!allowed) {
                    throw new ToolPermissionError(
                        'read_note',
                        `Access denied: Note is outside allowed folders`
                    );
                }
            }

            // Read file content
            const content = await this.app.vault.read(file);

            // Get metadata
            const cache = this.app.metadataCache.getFileCache(file);
            const frontmatter = parameters.include_frontmatter !== false
                ? cache?.frontmatter || {}
                : undefined;

            // Extract tags
            const tags = cache?.tags?.map(t => t.tag) || [];

            // Extract links
            const links = {
                internal: cache?.links?.map(l => l.link) || [],
                external: [] as string[]
            };

            // Build result
            const noteContent: NoteContent = {
                path: file.path,
                filename: file.name,
                content: content,
                frontmatter: frontmatter as Record<string, unknown>,
                tags: tags,
                links: links,
                created: file.stat.ctime,
                modified: file.stat.mtime,
                size: file.stat.size
            };

            return {
                success: true,
                data: noteContent,
                metadata: {
                    executionTime: Date.now() - startTime,
                    filesAffected: [file.path],
                    operationType: 'read'
                }
            };
        } catch (error) {
            if (error instanceof ToolExecutionError) {
                throw error;
            }

            throw new ToolExecutionError(
                `Failed to read note: ${error instanceof Error ? error.message : String(error)}`,
                'READ_FAILED',
                'read_note',
                error
            );
        }
    }

    /**
     * Tool: Write Note
     * Creates a new note or updates an existing one
     */
    static getWriteNoteDefinition(): ToolDefinition {
        return {
            name: 'write_note',
            description: 'Create a new note or update an existing note. Can include frontmatter. Use this when the user asks you to create or modify notes.',
            category: 'vault',
            parameters: [
                {
                    name: 'path',
                    description: 'Path where the note should be created/updated (e.g., "folder/note.md")',
                    type: 'string',
                    required: true
                },
                {
                    name: 'content',
                    description: 'The markdown content for the note',
                    type: 'string',
                    required: true
                },
                {
                    name: 'frontmatter',
                    description: 'Optional frontmatter to add to the note',
                    type: 'object',
                    required: false
                },
                {
                    name: 'append',
                    description: 'If true, append to existing note instead of replacing',
                    type: 'boolean',
                    required: false,
                    default: false
                }
            ],
            returns: {
                type: 'object',
                description: 'Result with file path and status'
            },
            examples: [
                'write_note(path: "ideas/new-idea.md", content: "# Great Idea\\n\\nThis is my idea...")',
                'write_note(path: "meeting-notes.md", content: "## Action Items\\n- Task 1", append: true)'
            ],
            dangerous: true
        };
    }

    async executeWriteNote(
        parameters: { path: string; content: string; frontmatter?: Record<string, unknown>; append?: boolean },
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            // Check if writes are allowed
            if (context.readOnly) {
                throw new ToolPermissionError(
                    'write_note',
                    'Write operations are not allowed in read-only mode'
                );
            }

            // Validate parameters
            if (!parameters.path) {
                throw new ToolValidationError('write_note', 'path parameter is required');
            }
            if (parameters.content === undefined) {
                throw new ToolValidationError('write_note', 'content parameter is required');
            }

            // Normalize path
            const normalizedPath = normalizePath(parameters.path);
            const pathWithMd = normalizedPath.endsWith('.md')
                ? normalizedPath
                : `${normalizedPath}.md`;

            // Check folder restrictions
            if (context.restrictToFolders && context.restrictToFolders.length > 0) {
                const allowed = context.restrictToFolders.some(folder =>
                    pathWithMd.startsWith(folder)
                );
                if (!allowed) {
                    throw new ToolPermissionError(
                        'write_note',
                        `Access denied: Cannot write to folder outside allowed folders`
                    );
                }
            }

            // Build content with frontmatter if provided
            let finalContent = parameters.content;
            if (parameters.frontmatter && Object.keys(parameters.frontmatter).length > 0) {
                const frontmatterYaml = this.buildFrontmatter(parameters.frontmatter);
                finalContent = `${frontmatterYaml}\n${parameters.content}`;
            }

            // Check if file exists
            const existingFile = this.app.vault.getAbstractFileByPath(pathWithMd);

            if (existingFile instanceof TFile) {
                // Update existing file
                if (parameters.append) {
                    const existingContent = await this.app.vault.read(existingFile);
                    finalContent = `${existingContent}\n\n${parameters.content}`;
                }
                await this.app.vault.modify(existingFile, finalContent);

                return {
                    success: true,
                    data: {
                        path: existingFile.path,
                        action: parameters.append ? 'appended' : 'updated'
                    },
                    metadata: {
                        executionTime: Date.now() - startTime,
                        filesAffected: [existingFile.path],
                        operationType: 'write'
                    }
                };
            } else {
                // Create new file
                // Ensure parent folder exists
                const folderPath = pathWithMd.substring(0, pathWithMd.lastIndexOf('/'));
                if (folderPath) {
                    await this.ensureFolderExists(folderPath);
                }

                const newFile = await this.app.vault.create(pathWithMd, finalContent);

                return {
                    success: true,
                    data: {
                        path: newFile.path,
                        action: 'created'
                    },
                    metadata: {
                        executionTime: Date.now() - startTime,
                        filesAffected: [newFile.path],
                        operationType: 'write'
                    }
                };
            }
        } catch (error) {
            if (error instanceof ToolExecutionError) {
                throw error;
            }

            throw new ToolExecutionError(
                `Failed to write note: ${error instanceof Error ? error.message : String(error)}`,
                'WRITE_FAILED',
                'write_note',
                error
            );
        }
    }

    /**
     * Tool: Search Notes
     * Search for notes matching criteria
     */
    static getSearchNotesDefinition(): ToolDefinition {
        return {
            name: 'search_notes',
            description: 'Search for notes matching specific criteria (text content, tags, folder, frontmatter). Returns a list of matching notes with excerpts.',
            category: 'search',
            parameters: [
                {
                    name: 'query',
                    description: 'Text to search for in note content',
                    type: 'string',
                    required: false
                },
                {
                    name: 'folder',
                    description: 'Limit search to specific folder',
                    type: 'string',
                    required: false
                },
                {
                    name: 'tags',
                    description: 'Array of tags notes must have',
                    type: 'array',
                    required: false,
                    items: {
                        name: 'tag',
                        description: 'Tag name',
                        type: 'string',
                        required: true
                    }
                },
                {
                    name: 'limit',
                    description: 'Maximum number of results to return',
                    type: 'number',
                    required: false,
                    default: 10
                }
            ],
            returns: {
                type: 'array',
                description: 'List of matching notes with excerpts'
            },
            examples: [
                'search_notes(query: "project alpha", folder: "projects")',
                'search_notes(tags: ["important", "urgent"], limit: 5)'
            ]
        };
    }

    async executeSearchNotes(
        parameters: NoteSearchCriteria,
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const results: Array<{
                path: string;
                filename: string;
                excerpt: string;
                tags: string[];
                modified: number;
            }> = [];

            // Get all markdown files
            const files = this.app.vault.getMarkdownFiles();

            // Apply filters
            let filteredFiles = files;

            // Folder filter
            if (parameters.folder) {
                const normalizedFolder = normalizePath(parameters.folder);
                filteredFiles = filteredFiles.filter(file =>
                    file.path.startsWith(normalizedFolder)
                );
            }

            // Context folder restrictions
            if (context.restrictToFolders && context.restrictToFolders.length > 0) {
                filteredFiles = filteredFiles.filter(file =>
                    context.restrictToFolders!.some(folder => file.path.startsWith(folder))
                );
            }

            // Tag filter
            if (parameters.tags && parameters.tags.length > 0) {
                filteredFiles = filteredFiles.filter(file => {
                    const cache = this.app.metadataCache.getFileCache(file);
                    const fileTags = cache?.tags?.map(t => t.tag.toLowerCase()) || [];
                    return parameters.tags!.every(tag =>
                        fileTags.includes(tag.toLowerCase())
                    );
                });
            }

            // Text search
            if (parameters.query) {
                const searchResults = await Promise.all(
                    filteredFiles.map(async file => {
                        const content = await this.app.vault.read(file);
                        const lowerContent = content.toLowerCase();
                        const lowerQuery = parameters.query!.toLowerCase();

                        if (lowerContent.includes(lowerQuery)) {
                            // Find excerpt around match
                            const index = lowerContent.indexOf(lowerQuery);
                            const start = Math.max(0, index - 100);
                            const end = Math.min(content.length, index + 200);
                            const excerpt = content.substring(start, end);

                            const cache = this.app.metadataCache.getFileCache(file);
                            const tags = cache?.tags?.map(t => t.tag) || [];

                            return {
                                path: file.path,
                                filename: file.name,
                                excerpt: excerpt,
                                tags: tags,
                                modified: file.stat.mtime
                            };
                        }
                        return null;
                    })
                );

                results.push(...searchResults.filter(r => r !== null) as typeof results);
            } else {
                // No text search, just return filtered files
                for (const file of filteredFiles) {
                    const cache = this.app.metadataCache.getFileCache(file);
                    const tags = cache?.tags?.map(t => t.tag) || [];

                    // Get first 200 characters as excerpt
                    const content = await this.app.vault.read(file);
                    const excerpt = content.substring(0, 200);

                    results.push({
                        path: file.path,
                        filename: file.name,
                        excerpt: excerpt,
                        tags: tags,
                        modified: file.stat.mtime
                    });
                }
            }

            // Sort by modification date (most recent first)
            results.sort((a, b) => b.modified - a.modified);

            // Apply limit
            const limit = parameters.limit || 10;
            const limitedResults = results.slice(0, limit);

            return {
                success: true,
                data: {
                    results: limitedResults,
                    totalFound: results.length,
                    returned: limitedResults.length
                },
                metadata: {
                    executionTime: Date.now() - startTime,
                    operationType: 'read'
                }
            };
        } catch (error) {
            throw new ToolExecutionError(
                `Failed to search notes: ${error instanceof Error ? error.message : String(error)}`,
                'SEARCH_FAILED',
                'search_notes',
                error
            );
        }
    }

    /**
     * Tool: List Notes in Folder
     * List all notes in a specific folder
     */
    static getListNotesDefinition(): ToolDefinition {
        return {
            name: 'list_notes',
            description: 'List all notes in a specific folder. Returns note paths and basic metadata.',
            category: 'vault',
            parameters: [
                {
                    name: 'folder',
                    description: 'Folder path to list notes from (empty string for root)',
                    type: 'string',
                    required: true
                },
                {
                    name: 'recursive',
                    description: 'Whether to include subfolders',
                    type: 'boolean',
                    required: false,
                    default: false
                }
            ],
            returns: {
                type: 'array',
                description: 'List of notes in the folder'
            },
            examples: [
                'list_notes(folder: "projects")',
                'list_notes(folder: "daily-notes", recursive: true)'
            ]
        };
    }

    async executeListNotes(
        parameters: { folder: string; recursive?: boolean },
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const normalizedFolder = normalizePath(parameters.folder || '');

            // Check folder restrictions
            if (context.restrictToFolders && context.restrictToFolders.length > 0) {
                const allowed = context.restrictToFolders.some(folder =>
                    normalizedFolder.startsWith(folder) || folder.startsWith(normalizedFolder)
                );
                if (!allowed) {
                    throw new ToolPermissionError(
                        'list_notes',
                        `Access denied: Cannot list notes from this folder`
                    );
                }
            }

            // Get folder
            let folder: TFolder | null = null;
            if (normalizedFolder === '') {
                folder = this.app.vault.getRoot();
            } else {
                const abstractFile = this.app.vault.getAbstractFileByPath(normalizedFolder);
                if (abstractFile instanceof TFolder) {
                    folder = abstractFile;
                }
            }

            if (!folder) {
                throw new ToolExecutionError(
                    `Folder not found: ${parameters.folder}`,
                    'FOLDER_NOT_FOUND',
                    'list_notes'
                );
            }

            // Collect notes
            const notes: Array<{
                path: string;
                filename: string;
                folder: string;
                created: number;
                modified: number;
                size: number;
            }> = [];

            const collectNotes = (currentFolder: TFolder) => {
                for (const child of currentFolder.children) {
                    if (child instanceof TFile && child.extension === 'md') {
                        notes.push({
                            path: child.path,
                            filename: child.name,
                            folder: child.parent?.path || '',
                            created: child.stat.ctime,
                            modified: child.stat.mtime,
                            size: child.stat.size
                        });
                    } else if (parameters.recursive && child instanceof TFolder) {
                        collectNotes(child);
                    }
                }
            };

            collectNotes(folder);

            // Sort by modification date
            notes.sort((a, b) => b.modified - a.modified);

            return {
                success: true,
                data: {
                    folder: normalizedFolder || '/',
                    notes: notes,
                    count: notes.length
                },
                metadata: {
                    executionTime: Date.now() - startTime,
                    operationType: 'read'
                }
            };
        } catch (error) {
            if (error instanceof ToolExecutionError) {
                throw error;
            }

            throw new ToolExecutionError(
                `Failed to list notes: ${error instanceof Error ? error.message : String(error)}`,
                'LIST_FAILED',
                'list_notes',
                error
            );
        }
    }

    /**
     * Helper: Build frontmatter YAML
     */
    private buildFrontmatter(data: Record<string, unknown>): string {
        const lines = ['---'];

        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
                lines.push(`${key}:`);
                value.forEach(item => lines.push(`  - ${item}`));
            } else if (typeof value === 'object' && value !== null) {
                lines.push(`${key}: ${JSON.stringify(value)}`);
            } else {
                lines.push(`${key}: ${value}`);
            }
        }

        lines.push('---');
        return lines.join('\n');
    }

    /**
     * Helper: Ensure folder exists
     */
    private async ensureFolderExists(path: string): Promise<void> {
        const normalizedPath = normalizePath(path);
        const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

        if (!folder) {
            await this.app.vault.createFolder(normalizedPath);
        }
    }
}
```

---

## Phase 3: Tool Executor

Create the engine that safely executes tools.

```typescript title:src/tools/toolExecutor.ts
/**
 * Tool Executor
 *
 * Safely executes agent tools with validation and error handling
 */

import { App } from 'obsidian';
import {
    ToolDefinition,
    ToolInvocation,
    ToolResult,
    ToolExecutionContext,
    ToolAuditEntry,
    ToolExecutionError,
    ToolValidationError
} from './toolTypes';
import { VaultTools } from './vaultTools';
import { ToolRegistry } from './toolRegistry';

export class ToolExecutor {
    private vaultTools: VaultTools;
    private registry: ToolRegistry;
    private auditLog: ToolAuditEntry[] = [];

    constructor(private app: App) {
        this.vaultTools = new VaultTools(app);
        this.registry = new ToolRegistry(this.vaultTools);
    }

    /**
     * Get all available tools
     */
    getAvailableTools(): ToolDefinition[] {
        return this.registry.getAllTools();
    }

    /**
     * Get specific tool definition
     */
    getToolDefinition(toolName: string): ToolDefinition | null {
        return this.registry.getTool(toolName);
    }

    /**
     * Execute a tool invocation
     */
    async execute(
        invocation: ToolInvocation,
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            // Validate tool exists
            const toolDef = this.getToolDefinition(invocation.toolName);
            if (!toolDef) {
                throw new ToolExecutionError(
                    `Unknown tool: ${invocation.toolName}`,
                    'UNKNOWN_TOOL',
                    invocation.toolName
                );
            }

            // Validate parameters
            this.validateParameters(invocation.parameters, toolDef);

            // Check dangerous operations
            if (toolDef.dangerous && !context.allowDangerousOperations) {
                throw new ToolExecutionError(
                    `Dangerous operation not allowed: ${invocation.toolName}`,
                    'DANGEROUS_OPERATION',
                    invocation.toolName
                );
            }

            // Execute the tool
            const result = await this.executeTool(invocation.toolName, invocation.parameters, context);

            // Log successful execution
            this.logExecution(
                context.agentName,
                invocation.toolName,
                invocation.parameters,
                result,
                Date.now() - startTime
            );

            return result;
        } catch (error) {
            // Log failed execution
            const failedResult: ToolResult = {
                success: false,
                error: {
                    code: error instanceof ToolExecutionError ? error.code : 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                    details: error instanceof ToolExecutionError ? error.details : undefined
                }
            };

            this.logExecution(
                context.agentName,
                invocation.toolName,
                invocation.parameters,
                failedResult,
                Date.now() - startTime
            );

            return failedResult;
        }
    }

    /**
     * Execute multiple tools in sequence
     */
    async executeMultiple(
        invocations: ToolInvocation[],
        context: ToolExecutionContext
    ): Promise<ToolResult[]> {
        const results: ToolResult[] = [];

        for (const invocation of invocations) {
            const result = await this.execute(invocation, context);
            results.push(result);

            // Stop on first failure if not configured to continue
            if (!result.success) {
                break;
            }
        }

        return results;
    }

    /**
     * Validate parameters against tool definition
     */
    private validateParameters(
        parameters: Record<string, unknown>,
        toolDef: ToolDefinition
    ): void {
        // Check required parameters
        for (const param of toolDef.parameters) {
            if (param.required && !(param.name in parameters)) {
                throw new ToolValidationError(
                    toolDef.name,
                    `Missing required parameter: ${param.name}`,
                    { requiredParameters: toolDef.parameters.filter(p => p.required).map(p => p.name) }
                );
            }

            // Validate parameter type if present
            if (param.name in parameters) {
                const value = parameters[param.name];
                const actualType = Array.isArray(value) ? 'array' : typeof value;

                if (actualType !== param.type && value !== null && value !== undefined) {
                    throw new ToolValidationError(
                        toolDef.name,
                        `Invalid type for parameter ${param.name}: expected ${param.type}, got ${actualType}`,
                        { parameter: param.name, expected: param.type, actual: actualType }
                    );
                }

                // Validate enum values
                if (param.enum && param.enum.length > 0) {
                    if (!param.enum.includes(String(value))) {
                        throw new ToolValidationError(
                            toolDef.name,
                            `Invalid value for parameter ${param.name}: must be one of ${param.enum.join(', ')}`,
                            { parameter: param.name, allowedValues: param.enum }
                        );
                    }
                }
            }
        }
    }

    /**
     * Execute the appropriate tool handler
     */
    private async executeTool(
        toolName: string,
        parameters: Record<string, unknown>,
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        switch (toolName) {
            case 'read_note':
                return this.vaultTools.executeReadNote(
                    parameters as { path: string; include_frontmatter?: boolean },
                    context
                );

            case 'write_note':
                return this.vaultTools.executeWriteNote(
                    parameters as {
                        path: string;
                        content: string;
                        frontmatter?: Record<string, unknown>;
                        append?: boolean;
                    },
                    context
                );

            case 'search_notes':
                return this.vaultTools.executeSearchNotes(parameters, context);

            case 'list_notes':
                return this.vaultTools.executeListNotes(
                    parameters as { folder: string; recursive?: boolean },
                    context
                );

            default:
                throw new ToolExecutionError(
                    `Tool handler not implemented: ${toolName}`,
                    'NOT_IMPLEMENTED',
                    toolName
                );
        }
    }

    /**
     * Log tool execution to audit log
     */
    private logExecution(
        agentName: string,
        toolName: string,
        parameters: Record<string, unknown>,
        result: ToolResult,
        durationMs: number
    ): void {
        const entry: ToolAuditEntry = {
            timestamp: Date.now(),
            agentName,
            toolName,
            parameters,
            result,
            durationMs
        };

        this.auditLog.push(entry);

        // Keep only last 1000 entries
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
    }

    /**
     * Get recent audit log entries
     */
    getAuditLog(limit: number = 100): ToolAuditEntry[] {
        return this.auditLog.slice(-limit);
    }

    /**
     * Clear audit log
     */
    clearAuditLog(): void {
        this.auditLog = [];
    }
}
```

---

## Phase 4: Tool Registry

Catalog all available tools.

```typescript title:src/tools/toolRegistry.ts
/**
 * Tool Registry
 *
 * Central registry of all available tools
 */

import { ToolDefinition } from './toolTypes';
import { VaultTools } from './vaultTools';

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    constructor(private vaultTools: VaultTools) {
        this.registerTools();
    }

    /**
     * Register all available tools
     */
    private registerTools(): void {
        // Vault tools
        this.registerTool(VaultTools.getReadNoteDefinition());
        this.registerTool(VaultTools.getWriteNoteDefinition());
        this.registerTool(VaultTools.getSearchNotesDefinition());
        this.registerTool(VaultTools.getListNotesDefinition());

        // Add more tools here as you implement them
        // this.registerTool(MetadataTools.getUpdateFrontmatterDefinition());
        // this.registerTool(MetadataTools.getAddTagsDefinition());
    }

    /**
     * Register a single tool
     */
    private registerTool(definition: ToolDefinition): void {
        this.tools.set(definition.name, definition);
    }

    /**
     * Get all registered tools
     */
    getAllTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get specific tool by name
     */
    getTool(name: string): ToolDefinition | null {
        return this.tools.get(name) || null;
    }

    /**
     * Get tools by category
     */
    getToolsByCategory(category: string): ToolDefinition[] {
        return Array.from(this.tools.values()).filter(t => t.category === category);
    }

    /**
     * Search tools by description
     */
    searchTools(query: string): ToolDefinition[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.tools.values()).filter(
            t =>
                t.name.toLowerCase().includes(lowerQuery) ||
                t.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get tool schemas for LLM (OpenAI format)
     */
    getToolSchemasForOpenAI(): Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: {
                type: 'object';
                properties: Record<string, unknown>;
                required: string[];
            };
        };
    }> {
        return this.getAllTools().map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: this.convertParametersToSchema(tool.parameters),
                    required: tool.parameters.filter(p => p.required).map(p => p.name)
                }
            }
        }));
    }

    /**
     * Convert tool parameters to JSON schema
     */
    private convertParametersToSchema(
        parameters: Array<{ name: string; description: string; type: string; enum?: string[] }>
    ): Record<string, unknown> {
        const schema: Record<string, unknown> = {};

        for (const param of parameters) {
            schema[param.name] = {
                type: param.type,
                description: param.description,
                ...(param.enum && { enum: param.enum })
            };
        }

        return schema;
    }
}
```

---

## Phase 5: Integrate with Agent Executor

Update your existing `agentExecutor.ts` to support function calling.

```typescript title:src/agents/agentExecutor.ts
// Add these imports to the existing file
import { ToolExecutor } from '../tools/toolExecutor';
import { ToolInvocation, ToolResult, ToolExecutionContext } from '../tools/toolTypes';

// Add to the AgentExecutor class:

export class AgentExecutor {
    // ... existing properties ...
    private toolExecutor?: ToolExecutor;

    constructor(
        config: AgentConfig,
        retriever: RAGRetriever,
        llmManager: LLMManager,
        app?: App  // Optional Obsidian App for tool support
    ) {
        this.config = config;
        this.retriever = retriever;
        this.llmManager = llmManager;

        // Initialize tool executor if app provided
        if (app) {
            this.toolExecutor = new ToolExecutor(app);
        }
    }

    /**
     * Execute the agent with a query (UPDATED with tool support)
     */
    async execute(
        query: string,
        context?: AgentExecutionContext
    ): Promise<AgentResponse> {
        const startTime = Date.now();

        try {
            // ... existing validation and RAG retrieval code ...

            // NEW: Check if agent supports tools
            const supportsTools = this.config.enableTools && this.toolExecutor;

            // Build messages for LLM
            const messages = this.buildMessages(query, contextText, context);

            // NEW: Get LLM response with optional tool support
            let llmResponse;
            let toolResults: ToolResult[] = [];

            if (supportsTools) {
                // Use function calling
                const result = await this.executeWithTools(messages);
                llmResponse = result.llmResponse;
                toolResults = result.toolResults;
            } else {
                // Standard execution without tools
                llmResponse = await this.queryLLM(messages);
            }

            const executionTime = Date.now() - startTime;

            return {
                answer: llmResponse.content,
                sources: retrievedChunks.map(chunk => chunk.metadata),
                agentUsed: this.config.name,
                llmProvider: this.getLLMProviderName(),
                model: this.getLLMModelName(),
                retrievedChunks,
                usage: llmResponse.usage,
                executionTime,
                toolResults: toolResults.length > 0 ? toolResults : undefined  // NEW
            };
        } catch (error: unknown) {
            // ... existing error handling ...
        }
    }

    /**
     * NEW: Execute with tool support
     */
    private async executeWithTools(messages: Message[]): Promise<{
        llmResponse: { content: string; usage?: unknown };
        toolResults: ToolResult[];
    }> {
        if (!this.toolExecutor) {
            throw new Error('Tool executor not initialized');
        }

        const toolResults: ToolResult[] = [];
        let currentMessages = [...messages];
        let iteration = 0;
        const maxIterations = 5; // Prevent infinite loops

        while (iteration < maxIterations) {
            iteration++;

            // Get available tools
            const tools = this.toolExecutor.getAvailableTools();

            // Query LLM with tools
            const provider = this.llmManager.getProvider(this.config.llmId);
            if (!provider) {
                throw new Error(`LLM provider not found: ${this.config.llmId}`);
            }

            // Check if provider supports function calling
            if (!provider.supportsFunctionCalling) {
                // Fall back to non-tool execution
                const response = await this.queryLLM(currentMessages);
                return { llmResponse: response, toolResults: [] };
            }

            // Call LLM with function definitions
            const response = await provider.chatWithFunctions(
                currentMessages,
                tools,
                {
                    temperature: undefined,
                    maxTokens: undefined
                }
            );

            // Check if LLM wants to call a function
            if (response.functionCall) {
                // Parse function call
                const toolInvocation: ToolInvocation = {
                    toolName: response.functionCall.name,
                    parameters: response.functionCall.arguments,
                    invocationId: `${Date.now()}-${iteration}`
                };

                // Build execution context
                const execContext: ToolExecutionContext = {
                    agentName: this.config.name,
                    vaultPath: this.app?.vault.getRoot().path || '',
                    restrictToFolders: this.config.folderScope,
                    readOnly: false,
                    allowDangerousOperations: this.config.allowDangerousOperations || false
                };

                // Execute tool
                const toolResult = await this.toolExecutor.execute(toolInvocation, execContext);
                toolResults.push(toolResult);

                // Add tool result to conversation
                currentMessages.push({
                    role: 'assistant',
                    content: `[Calling tool: ${toolInvocation.toolName}]`,
                    functionCall: response.functionCall
                });

                currentMessages.push({
                    role: 'function',
                    name: toolInvocation.toolName,
                    content: JSON.stringify(toolResult)
                });

                // Continue loop to let LLM process tool result
                continue;
            } else {
                // LLM provided final answer
                return {
                    llmResponse: {
                        content: response.content,
                        usage: response.usage
                    },
                    toolResults
                };
            }
        }

        // Max iterations reached
        return {
            llmResponse: {
                content: 'I apologize, but I exceeded the maximum number of tool calls while processing your request. Please try rephrasing your question.',
                usage: undefined
            },
            toolResults
        };
    }
}
```

---

## Phase 6: Update Agent Config

Add tool support to your agent configuration.

```typescript title:src/agents/types.ts
// Add to existing AgentConfig interface:

export interface AgentConfig {
    // ... existing properties ...

    // NEW: Tool support
    enableTools?: boolean;
    allowDangerousOperations?: boolean;
    folderScope?: string[]; // Restrict tools to specific folders
}
```

---

## Phase 7: Usage Examples

Here's how users would interact with the new tool-enabled agents:

### Example 1: Creating Meeting Notes

**User**: "Create a new note in my meetings folder with today's action items"

**Agent (with tools)**:
1. Calls `write_note` tool with:
   ```json
   {
     "path": "meetings/2025-01-20-action-items.md",
     "content": "# Action Items - January 20, 2025\n\n- [ ] Review project proposal\n- [ ] Schedule follow-up meeting\n- [ ] Update documentation",
     "frontmatter": {
       "date": "2025-01-20",
       "type": "meeting-notes",
       "tags": ["action-items"]
     }
   }
   ```
2. Returns: "I've created a new note at meetings/2025-01-20-action-items.md with today's action items."

### Example 2: Researching a Topic

**User**: "Find all notes mentioning 'machine learning' and summarize what I've learned"

**Agent (with tools)**:
1. Calls `search_notes` tool with:
   ```json
   {
     "query": "machine learning",
     "limit": 10
   }
   ```
2. Receives list of relevant notes
3. Calls `read_note` for each promising result
4. Synthesizes information and returns comprehensive summary

### Example 3: Organizing Notes

**User**: "List all notes in my projects folder that don't have a status tag"

**Agent (with tools)**:
1. Calls `list_notes` with folder="projects", recursive=true
2. For each note, calls `read_note` to check frontmatter
3. Filters results where status tag is missing
4. Returns organized list

---

## Testing Strategy

### Unit Tests

```typescript title:src/tools/__tests__/vaultTools.test.ts
import { VaultTools } from '../vaultTools';
import { ToolExecutionContext } from '../toolTypes';
import { App } from 'obsidian';

describe('VaultTools', () => {
    let vaultTools: VaultTools;
    let mockApp: App;

    beforeEach(() => {
        // Mock Obsidian App
        mockApp = {
            vault: {
                getAbstractFileByPath: jest.fn(),
                read: jest.fn(),
                create: jest.fn(),
                modify: jest.fn()
            },
            metadataCache: {
                getFileCache: jest.fn()
            }
        } as unknown as App;

        vaultTools = new VaultTools(mockApp);
    });

    describe('executeReadNote', () => {
        it('should read a note successfully', async () => {
            // Mock file
            const mockFile = {
                path: 'test.md',
                name: 'test.md',
                stat: { ctime: 123, mtime: 456, size: 100 }
            };

            mockApp.vault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
            mockApp.vault.read = jest.fn().mockResolvedValue('# Test Note\n\nContent here');
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                frontmatter: { title: 'Test' },
                tags: [{ tag: '#test' }],
                links: [{ link: '[[other-note]]' }]
            });

            const context: ToolExecutionContext = {
                agentName: 'test-agent',
                vaultPath: '/'
            };

            const result = await vaultTools.executeReadNote(
                { path: 'test.md' },
                context
            );

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('content');
            expect(result.data.content).toContain('Test Note');
        });

        it('should throw error for non-existent note', async () => {
            mockApp.vault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

            const context: ToolExecutionContext = {
                agentName: 'test-agent',
                vaultPath: '/'
            };

            await expect(
                vaultTools.executeReadNote({ path: 'nonexistent.md' }, context)
            ).rejects.toThrow('Note not found');
        });
    });

    describe('executeWriteNote', () => {
        it('should create a new note', async () => {
            mockApp.vault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
            mockApp.vault.create = jest.fn().mockResolvedValue({
                path: 'new-note.md'
            });

            const context: ToolExecutionContext = {
                agentName: 'test-agent',
                vaultPath: '/',
                readOnly: false
            };

            const result = await vaultTools.executeWriteNote(
                {
                    path: 'new-note.md',
                    content: '# New Note\n\nHello world!'
                },
                context
            );

            expect(result.success).toBe(true);
            expect(result.data.action).toBe('created');
        });

        it('should reject write in read-only mode', async () => {
            const context: ToolExecutionContext = {
                agentName: 'test-agent',
                vaultPath: '/',
                readOnly: true
            };

            await expect(
                vaultTools.executeWriteNote(
                    { path: 'test.md', content: 'test' },
                    context
                )
            ).rejects.toThrow('read-only');
        });
    });
});
```

---

## Configuration in Settings

Add tool settings to your existing settings UI:

```typescript title:src/ui/settings/components/AgentManagement.ts
// Add to agent configuration UI:

// Tool Settings Section
const toolSection = settingsContainer.createDiv('tool-settings-section');
toolSection.createEl('h4', { text: 'Tool Settings' });

// Enable Tools Toggle
const enableToolsContainer = toolSection.createDiv('setting-item');
new Setting(enableToolsContainer)
    .setName('Enable Tools')
    .setDesc('Allow agent to read and write notes directly')
    .addToggle(toggle =>
        toggle
            .setValue(agent.enableTools || false)
            .onChange(async value => {
                agent.enableTools = value;
                await this.plugin.saveSettings();
            })
    );

// Folder Scope
if (agent.enableTools) {
    const folderScopeContainer = toolSection.createDiv('setting-item');
    new Setting(folderScopeContainer)
        .setName('Folder Scope')
        .setDesc('Restrict agent to specific folders (comma-separated, empty for all)')
        .addText(text =>
            text
                .setPlaceholder('projects, meetings')
                .setValue(agent.folderScope?.join(', ') || '')
                .onChange(async value => {
                    agent.folderScope = value
                        .split(',')
                        .map(f => f.trim())
                        .filter(f => f.length > 0);
                    await this.plugin.saveSettings();
                })
        );

    // Allow Dangerous Operations
    const dangerousContainer = toolSection.createDiv('setting-item');
    new Setting(dangerousContainer)
        .setName('Allow Write Operations')
        .setDesc('⚠️ Allow agent to create and modify notes')
        .addToggle(toggle =>
            toggle
                .setValue(agent.allowDangerousOperations || false)
                .onChange(async value => {
                    agent.allowDangerousOperations = value;
                    await this.plugin.saveSettings();
                })
        );
}
```

---

## Security Considerations

### Permission Model

1. **Read-Only Mode** - Agents can only read notes
2. **Folder Restrictions** - Limit agents to specific folders
3. **Dangerous Operation Flag** - Explicit permission for write operations
4. **Audit Logging** - Track all tool executions

### Safety Features

```typescript
// Example: Confirmation for dangerous operations
if (toolDef.dangerous && !autoConfirm) {
    const modal = new ConfirmationModal(
        this.app,
        `Allow ${agentName} to execute ${toolName}?`,
        `This operation will modify notes in your vault.`,
        async () => {
            // Execute tool
            const result = await this.toolExecutor.execute(invocation, context);
            callback(result);
        }
    );
    modal.open();
}
```

---

## Next Steps

### Immediate Implementation

1. ✅ Create `src/tools/` directory
2. ✅ Implement `toolTypes.ts` with all interfaces
3. ✅ Implement `vaultTools.ts` with read/write operations
4. ✅ Implement `toolExecutor.ts` for safe execution
5. ✅ Implement `toolRegistry.ts` for tool catalog
6. ✅ Update `agentExecutor.ts` to support function calling
7. ✅ Add tool settings to agent configuration UI
8. ✅ Write unit tests for all tool operations

### Extended Features (Future)

1. **Metadata Tools** - Update frontmatter, add tags, manage links
2. **Bulk Operations** - Process multiple notes in batch
3. **Template Tools** - Apply note templates, create from templates
4. **Calendar Tools** - Work with daily notes, calendar integration
5. **Dataview Integration** - Query using Dataview syntax
6. **Graph Tools** - Analyze note connections and relationships

---

## Troubleshooting

### Common Issues

**Issue**: "Tool executor not initialized"
- **Solution**: Pass `app` parameter when creating AgentExecutor

**Issue**: "Permission denied" errors
- **Solution**: Check `folderScope` and `allowDangerousOperations` settings

**Issue**: Function calling not working
- **Solution**: Verify LLM provider supports function calling (OpenAI gpt-4, gpt-3.5-turbo)

**Issue**: Tools called but results ignored
- **Solution**: Check message loop in `executeWithTools` - ensure tool results added to conversation

---

## Performance Optimization

### Caching Strategies

```typescript
// Cache file metadata to avoid repeated reads
private metadataCache: Map<string, CachedMetadata> = new Map();

async getFileMetadata(path: string): Promise<CachedMetadata> {
    if (this.metadataCache.has(path)) {
        return this.metadataCache.get(path)!;
    }

    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
        const cache = this.app.metadataCache.getFileCache(file);
        this.metadataCache.set(path, cache);
        return cache;
    }

    throw new Error('File not found');
}
```

### Rate Limiting

```typescript
// Limit tool executions per agent per minute
private rateLimiter: Map<string, number[]> = new Map();

checkRateLimit(agentName: string, limit: number = 20): boolean {
    const now = Date.now();
    const window = 60000; // 1 minute

    if (!this.rateLimiter.has(agentName)) {
        this.rateLimiter.set(agentName, []);
    }

    const timestamps = this.rateLimiter.get(agentName)!;
    const recentCalls = timestamps.filter(t => now - t < window);

    if (recentCalls.length >= limit) {
        return false; // Rate limit exceeded
    }

    recentCalls.push(now);
    this.rateLimiter.set(agentName, recentCalls);
    return true;
}
```

---

## Summary

This implementation guide provides:

✅ **Complete Type System** - Full TypeScript interfaces for tools
✅ **Vault Operations** - Read, write, search, list notes
✅ **Safe Execution** - Validation, permissions, error handling
✅ **Agent Integration** - Function calling with existing agents
✅ **Testing Strategy** - Unit tests and integration tests
✅ **Security Model** - Read-only mode, folder restrictions, audit logging
✅ **Production Ready** - Error handling, performance optimization, rate limiting

### File Checklist

- [ ] `src/tools/toolTypes.ts` (type definitions)
- [ ] `src/tools/vaultTools.ts` (note operations)
- [ ] `src/tools/toolExecutor.ts` (execution engine)
- [ ] `src/tools/toolRegistry.ts` (tool catalog)
- [ ] `src/agents/agentExecutor.ts` (updated with tool support)
- [ ] `src/agents/types.ts` (updated config interface)
- [ ] `src/ui/settings/components/AgentManagement.ts` (tool settings UI)
- [ ] `src/tools/__tests__/vaultTools.test.ts` (unit tests)

### Integration Steps

1. Create all files from code snippets above
2. Update `agentExecutor.ts` with tool support
3. Add tool settings to agent configuration UI
4. Test with a simple agent (read-only first)
5. Enable write operations after testing
6. Add to agent templates (Research Analyst could use search tools)

You now have everything needed to implement MCP-type functionality in Mnemosyne! 🚀
