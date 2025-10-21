/**
 * Tool Types and Interfaces
 *
 * Defines the structure for agent tools (function calling)
 */

import { TFile, CachedMetadata } from 'obsidian';

/**
 * Tool parameter schema (for array items and nested properties)
 * Lighter version without 'name' and 'required' since those don't apply to array items
 */
export interface ToolParameterSchema {
    description: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    enum?: string[]; // For restricted values
    default?: unknown;
    properties?: Record<string, ToolParameterSchema>; // For nested objects
    items?: ToolParameterSchema; // For array items
}

/**
 * Tool parameter definition (for function parameters)
 */
export interface ToolParameter extends ToolParameterSchema {
    name: string;
    required: boolean;
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
