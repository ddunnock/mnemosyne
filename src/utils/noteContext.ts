/**
 * Note Context Utilities
 *
 * Helper functions for getting the current note context
 */

import { App, TFile } from 'obsidian';
import { AgentExecutionContext } from '../types';

/**
 * Get the current active note context
 * Returns null if no note is active
 */
export async function getCurrentNoteContext(app: App): Promise<AgentExecutionContext['noteContext'] | null> {
    const activeFile = app.workspace.getActiveFile();

    if (!activeFile) {
        return null;
    }

    try {
        // Read note content
        const noteContent = await app.vault.read(activeFile);

        // Get frontmatter
        const cache = app.metadataCache.getFileCache(activeFile);
        const frontmatter = cache?.frontmatter;

        return {
            notePath: activeFile.path,
            noteContent: noteContent,
            frontmatter: frontmatter as Record<string, any> | undefined
        };
    } catch (error) {
        console.error('Failed to get current note context:', error);
        return null;
    }
}

/**
 * Get basic info about the active note without reading content
 * Useful for lightweight checks
 */
export function getActiveNoteInfo(app: App): {
    path: string;
    filename: string;
    folder: string;
} | null {
    const activeFile = app.workspace.getActiveFile();

    if (!activeFile) {
        return null;
    }

    return {
        path: activeFile.path,
        filename: activeFile.name,
        folder: activeFile.parent?.path || ''
    };
}

/**
 * Check if a note is currently active
 */
export function hasActiveNote(app: App): boolean {
    return app.workspace.getActiveFile() !== null;
}

/**
 * Get active note with optional content inclusion
 */
export async function getActiveNote(
    app: App,
    includeContent: boolean = true
): Promise<{
    path: string;
    filename: string;
    folder: string;
    content?: string;
    frontmatter?: Record<string, any>;
    tags?: string[];
    created: number;
    modified: number;
    size: number;
} | null> {
    const activeFile = app.workspace.getActiveFile();

    if (!activeFile) {
        return null;
    }

    try {
        const cache = app.metadataCache.getFileCache(activeFile);
        const result: any = {
            path: activeFile.path,
            filename: activeFile.name,
            folder: activeFile.parent?.path || '',
            created: activeFile.stat.ctime,
            modified: activeFile.stat.mtime,
            size: activeFile.stat.size
        };

        if (cache) {
            result.frontmatter = cache.frontmatter;
            result.tags = cache.tags?.map(t => t.tag) || [];
        }

        if (includeContent) {
            result.content = await app.vault.read(activeFile);
        }

        return result;
    } catch (error) {
        console.error('Failed to get active note:', error);
        return null;
    }
}

/**
 * Build agent execution context with current note
 * Optionally include conversation history
 */
export async function buildExecutionContextWithCurrentNote(
    app: App,
    query: string,
    conversationHistory?: any[]
): Promise<AgentExecutionContext> {
    const noteContext = await getCurrentNoteContext(app);

    const context: AgentExecutionContext = {
        query: query
    };

    if (conversationHistory && conversationHistory.length > 0) {
        context.conversationHistory = conversationHistory;
    }

    if (noteContext) {
        context.noteContext = noteContext;
    }

    return context;
}
