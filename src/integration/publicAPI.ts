/**
 * Public API
 *
 * External interface for other plugins and scripts to interact with the RAG Agent Manager
 */

import { TFile } from 'obsidian';
import { AgentExecutor } from '../agents/agentExecutor';
import {
    AgentInfo,
    AgentResponse,
    AgentExecutionContext,
    RetrievedChunk,
    MetadataFilters,
    PublicAPI
} from '../types';
import RiskManagementPlugin from '../main';

export class RAGAgentAPI implements PublicAPI {
    private plugin: RiskManagementPlugin;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
    }

    /**
     * Get an agent by ID
     */
    getAgent(agentId: string): AgentExecutor | null {
        if (!this.plugin.agentManager) {
            console.error('Agent Manager not initialized');
            return null;
        }

        return this.plugin.agentManager.getAgent(agentId);
    }

    /**
     * List all available agents
     */
    listAgents(): AgentInfo[] {
        if (!this.plugin.agentManager) {
            console.error('Agent Manager not initialized');
            return [];
        }

        return this.plugin.agentManager.listAgents();
    }

    /**
     * Execute an agent with a query
     * Automatically injects active note context for dataviewjs forms and regular notes
     */
    async executeAgent(
        agentId: string,
        query: string,
        context?: AgentExecutionContext
    ): Promise<AgentResponse> {
        if (!this.plugin.agentManager) {
            throw new Error('Agent Manager not initialized');
        }

        // Auto-inject active note context
        const enrichedContext = await this.enrichContextWithActiveNote(context);

        return await this.plugin.agentManager.executeAgent(agentId, query, enrichedContext);
    }

    /**
     * Helper: Automatically detect and inject active note context
     * Works for both regular markdown files and dataviewjs forms
     */
    private async enrichContextWithActiveNote(
        userContext?: AgentExecutionContext
    ): Promise<AgentExecutionContext> {
        const activeFile = this.plugin.app.workspace.getActiveFile();

        // If no active file, return user context as-is
        if (!activeFile) {
            return userContext || {};
        }

        // Build active note context
        const activeNoteContext: AgentExecutionContext = {
            activeFilePath: activeFile.path
        };

        // Read file content and frontmatter
        try {
            const content = await this.plugin.app.vault.read(activeFile);
            const cache = this.plugin.app.metadataCache.getFileCache(activeFile);

            activeNoteContext.noteContext = {
                notePath: activeFile.path,
                noteContent: content,
                frontmatter: cache?.frontmatter || {}
            };

            console.log('[RAGAgentAPI] Auto-injected active note context:', {
                path: activeFile.path,
                hasFrontmatter: !!cache?.frontmatter,
                contentLength: content.length
            });
        } catch (error) {
            console.warn('[RAGAgentAPI] Failed to read active note content:', error);
            // Continue without content - at least we have the path
        }

        // Merge with user-provided context (user context takes precedence)
        if (!userContext) {
            return activeNoteContext;
        }

        return {
            ...activeNoteContext,
            ...userContext,
            // Preserve user's noteContext if provided, otherwise use detected
            noteContext: userContext.noteContext || activeNoteContext.noteContext,
            // Preserve user's activeFilePath if provided, otherwise use detected
            activeFilePath: userContext.activeFilePath || activeNoteContext.activeFilePath
        };
    }

    /**
     * Direct RAG query (without agent)
     *
     * ✅ PATCHED: Added scoreThreshold parameter to accept custom threshold
     */
    async query(
        text: string,
        filters?: MetadataFilters,
        topK: number = 5,
        scoreThreshold: number = 0.7  // ✅ NEW: Added parameter with default value
    ): Promise<RetrievedChunk[]> {
        if (!this.plugin.retriever) {
            throw new Error('RAG Retriever not initialized');
        }

        // ✅ FIXED: Now passes scoreThreshold to retriever
        return await this.plugin.retriever.retrieve(text, topK, filters, scoreThreshold);
    }

    /**
     * Get plugin version
     */
    getVersion(): string {
        return this.plugin.manifest.version;
    }

    /**
     * Check if the system is ready (all components)
     */
    isReady(): boolean {
        return (
            this.plugin.retriever?.isReady() &&
            this.plugin.llmManager?.isReady() &&
            this.plugin.agentManager?.isReady()
        ) || false;
    }

    /**
     * Check if agents are available (more lenient than isReady)
     * Use this for forms that only need agent execution
     */
    hasAgents(): boolean {
        return (
            this.plugin.agentManager?.isReady() &&
            this.plugin.agentManager.listAgents().length > 0
        ) || false;
    }

    /**
     * Get detailed readiness status for debugging
     */
    getReadinessStatus(): {
        retriever: boolean;
        llmManager: boolean;
        agentManager: boolean;
        hasAgents: boolean;
        agentCount: number;
        allReady: boolean;
    } {
        const retrieverReady = this.plugin.retriever?.isReady() || false;
        const llmReady = this.plugin.llmManager?.isReady() || false;
        const agentMgrReady = this.plugin.agentManager?.isReady() || false;
        const agentCount = this.plugin.agentManager?.listAgents().length || 0;

        return {
            retriever: retrieverReady,
            llmManager: llmReady,
            agentManager: agentMgrReady,
            hasAgents: agentMgrReady && agentCount > 0,
            agentCount,
            allReady: retrieverReady && llmReady && agentMgrReady
        };
    }

    /**
     * Get system stats
     */
    getStats(): {
        rag: any;
        llm: any;
        agents: any;
        ready: boolean;
    } {
        return {
            rag: this.plugin.retriever?.getStats() || null,
            llm: this.plugin.llmManager?.getStats() || null,
            agents: this.plugin.agentManager?.getStats() || null,
            ready: this.isReady()
        };
    }

    /**
     * Execute master agent (or fallback to default agent for backwards compatibility)
     * ✨ ENHANCED: Now routes through master orchestrator agent
     * Automatically injects active note context
     */
    async ask(query: string, context?: AgentExecutionContext): Promise<AgentResponse> {
        if (!this.plugin.agentManager) {
            throw new Error('Agent Manager not initialized');
        }

        // ✨ NEW: Try to use master agent first
        let agent = this.plugin.agentManager.getMasterAgent();

        // Fallback to default agent if master doesn't exist (backwards compatibility)
        if (!agent) {
            console.warn('Master agent not found, falling back to default agent');
            agent = this.plugin.agentManager.getDefaultAgent();
        }

        if (!agent) {
            throw new Error('No master or default agent available');
        }

        // Auto-inject active note context
        const enrichedContext = await this.enrichContextWithActiveNote(context);

        return await agent.execute(query, enrichedContext);
    }

    /**
     * Execute an agent with a structured payload
     * Compatible with ClaudeAgent-style API for dataviewjs forms
     * Automatically injects active note context
     *
     * @param agentId - The ID of the agent to execute
     * @param payload - Structured data object to pass to the agent
     * @returns The agent's response (text or structured data)
     */
    async run(agentId: string, payload: any): Promise<string | any> {
        if (!this.plugin.agentManager) {
            throw new Error('Agent Manager not initialized');
        }

        // Convert payload to a query string for agents that expect text
        // Agents can access the original payload via context if needed
        const query = typeof payload === 'string'
            ? payload
            : JSON.stringify(payload, null, 2);

        const userContext: AgentExecutionContext = {
            structuredInput: payload  // Pass original payload in context
        };

        // Use executeAgent which auto-injects active note context
        const response = await this.executeAgent(agentId, query, userContext);

        // Return just the response text for compatibility with dataviewjs forms
        return response.answer;
    }
}

/**
 * Export public API to global scope
 * This allows other plugins and scripts to access: window.RAGAgentManager
 * Also exposes window.claudeAgent for backward compatibility with dataviewjs forms
 */
export function exposePublicAPI(plugin: RiskManagementPlugin): void {
    const api = new RAGAgentAPI(plugin);

    // Expose to window object
    (window as any).RAGAgentManager = api;

    // Backward compatibility alias for dataviewjs forms
    (window as any).claudeAgent = api;

    console.log('✓ RAG Agent Manager API exposed to window.RAGAgentManager');
    console.log('✓ Compatibility alias exposed to window.claudeAgent');
}
