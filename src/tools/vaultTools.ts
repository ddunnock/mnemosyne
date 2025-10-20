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
                    description: 'Array of tags notes must have (e.g., ["urgent", "important"])',
                    type: 'array',
                    required: false,
                    items: {
                        type: 'string',
                        description: 'Tag name'
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
     * Tool: Get Active Note
     * Returns information about the currently active/open note
     */
    static getActiveNoteDefinition(): ToolDefinition {
        return {
            name: 'get_active_note',
            description: 'Get information about the currently active/open note in Obsidian. Returns the note path, content, frontmatter, and metadata.',
            category: 'vault',
            parameters: [
                {
                    name: 'include_content',
                    description: 'Whether to include the full note content',
                    type: 'boolean',
                    required: false,
                    default: true
                }
            ],
            returns: {
                type: 'object',
                description: 'Active note information or null if no note is active'
            },
            examples: [
                'get_active_note()',
                'get_active_note(include_content: false)'
            ]
        };
    }

    async executeGetActiveNote(
        parameters: { include_content?: boolean },
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            // Get the active file
            const activeFile = this.app.workspace.getActiveFile();

            if (!activeFile) {
                return {
                    success: true,
                    data: {
                        active: false,
                        message: 'No note is currently active'
                    },
                    metadata: {
                        executionTime: Date.now() - startTime,
                        operationType: 'read'
                    }
                };
            }

            // Check folder restrictions
            if (context.restrictToFolders && context.restrictToFolders.length > 0) {
                const allowed = context.restrictToFolders.some(folder =>
                    activeFile.path.startsWith(folder)
                );
                if (!allowed) {
                    throw new ToolPermissionError(
                        'get_active_note',
                        `Access denied: Active note is outside allowed folders`
                    );
                }
            }

            // Get metadata
            const cache = this.app.metadataCache.getFileCache(activeFile);
            const frontmatter = cache?.frontmatter || {};
            const tags = cache?.tags?.map(t => t.tag) || [];
            const links = {
                internal: cache?.links?.map(l => l.link) || [],
                external: [] as string[]
            };

            // Build result
            const result: any = {
                active: true,
                path: activeFile.path,
                filename: activeFile.name,
                folder: activeFile.parent?.path || '',
                frontmatter: frontmatter,
                tags: tags,
                links: links,
                created: activeFile.stat.ctime,
                modified: activeFile.stat.mtime,
                size: activeFile.stat.size
            };

            // Include content if requested
            if (parameters.include_content !== false) {
                const content = await this.app.vault.read(activeFile);
                result.content = content;
            }

            return {
                success: true,
                data: result,
                metadata: {
                    executionTime: Date.now() - startTime,
                    filesAffected: [activeFile.path],
                    operationType: 'read'
                }
            };
        } catch (error) {
            if (error instanceof ToolExecutionError) {
                throw error;
            }

            throw new ToolExecutionError(
                `Failed to get active note: ${error instanceof Error ? error.message : String(error)}`,
                'GET_ACTIVE_FAILED',
                'get_active_note',
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
