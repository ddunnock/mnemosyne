/**
 * Public API
 *
 * External interface for other plugins and scripts to interact with the RAG Agent Manager
 */

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
     */
    async executeAgent(
        agentId: string,
        query: string,
        context?: AgentExecutionContext
    ): Promise<AgentResponse> {
        if (!this.plugin.agentManager) {
            throw new Error('Agent Manager not initialized');
        }

        return await this.plugin.agentManager.executeAgent(agentId, query, context);
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
     * Check if the system is ready
     */
    isReady(): boolean {
        return (
            this.plugin.retriever?.isReady() &&
            this.plugin.llmManager?.isReady() &&
            this.plugin.agentManager?.isReady()
        ) || false;
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
     * Execute default agent
     */
    async ask(query: string, context?: AgentExecutionContext): Promise<AgentResponse> {
        if (!this.plugin.agentManager) {
            throw new Error('Agent Manager not initialized');
        }

        const defaultAgent = this.plugin.agentManager.getDefaultAgent();
        if (!defaultAgent) {
            throw new Error('No default agent configured');
        }

        return await defaultAgent.execute(query, context);
    }
}

/**
 * Export public API to global scope
 * This allows other plugins and scripts to access: window.RAGAgentManager
 */
export function exposePublicAPI(plugin: RiskManagementPlugin): void {
    const api = new RAGAgentAPI(plugin);

    // Expose to window object
    (window as any).RAGAgentManager = api;

    console.log('✓ RAG Agent Manager API exposed to window.RAGAgentManager');
}
