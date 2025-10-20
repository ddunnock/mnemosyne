/**
 * Agent Manager (Fixed with proper async handling and state checking)
 */

import { Notice } from 'obsidian';
import { AgentExecutor } from './agentExecutor';
import { RAGRetriever } from '../rag/retriever';
import { LLMManager } from '../llm/llmManager';
import {
    AgentConfig,
    AgentExecutionContext,
    AgentResponse,
    AgentInfo
} from '../types';
import RiskManagementPlugin from '../main';

export class AgentManager {
    private plugin: RiskManagementPlugin;
    private retriever: RAGRetriever;
    private llmManager: LLMManager;
    private agents: Map<string, AgentExecutor> = new Map();
    private initialized: boolean = false;

    constructor(
        plugin: RiskManagementPlugin,
        retriever: RAGRetriever,
        llmManager: LLMManager
    ) {
        this.plugin = plugin;
        this.retriever = retriever;
        this.llmManager = llmManager;
    }

    /**
     * Initialize all configured agents
     */
    async initialize(): Promise<void> {
        // Clear existing agents
        this.agents.clear();

        console.log(`Initializing ${this.plugin.settings.agents.length} agents...`);

        // Create executor for each enabled agent
        for (const config of this.plugin.settings.agents) {
            console.log(`Processing agent: ${config.name} (enabled: ${config.enabled}, permanent: ${config.isPermanent})`);
            
            if (!config.enabled) {
                console.log(`Skipping disabled agent: ${config.name}`);
                continue;
            }

            try {
                this.createAgent(config);
                console.log(`✅ Successfully initialized agent: ${config.name}`);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`❌ Failed to initialize agent ${config.name}:`, error);
                new Notice(`Failed to initialize agent ${config.name}: ${errorMessage}`);
            }
        }

        this.initialized = true;
        console.log(`Agent Manager initialization complete. ${this.agents.size} agents loaded.`);
    }

    /**
     * Create an agent executor from config
     */
    private createAgent(config: AgentConfig): void {
        try {
            console.log(`Creating agent executor for: ${config.name} (ID: ${config.id})`);
            
            // Validate dependencies
            if (!this.retriever) {
                throw new Error('RAG Retriever not available');
            }
            if (!this.llmManager) {
                throw new Error('LLM Manager not available');
            }
            
            const executor = new AgentExecutor(config, this.retriever, this.llmManager);
            this.agents.set(config.id, executor);
            
            console.log(`✅ Agent executor created and stored: ${config.name}`);
        } catch (error) {
            console.error(`❌ Failed to create agent executor for ${config.name}:`, error);
            throw error;
        }
    }

    /**
     * Add a new agent
     * ✅ FIXED: Don't test immediately, just create and notify
     */
    async addAgent(config: AgentConfig): Promise<void> {
        // Validate config
        this.validateAgentConfig(config);

        // Add to settings
        this.plugin.settings.agents.push(config);
        await this.plugin.saveSettings();

        // Create executor if enabled
        if (config.enabled) {
            this.createAgent(config);
        }

        // ✅ FIXED: Don't test immediately - let user test manually when ready
    }

    /**
     * Test an agent
     * ✅ FIXED: Check system readiness before testing
     */
    async testAgent(agentId: string): Promise<boolean> {
        const agent = this.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        // ✅ NEW: Check if RAG system is actually ready
        if (!this.retriever.isReady()) {
            throw new Error('RAG system not ready. Please ensure embeddings are configured and chunks are ingested.');
        }

        // ✅ NEW: Check if vector store has data
        const stats = this.retriever.getStats();
        if (!stats || stats.totalChunks === 0) {
            throw new Error('No chunks ingested. Please ingest chunks in RAG Configuration settings first.');
        }

        try {
            // ✅ NEW: Add small delay to ensure vector store is fully saved
            await this.delay(100);

            return await agent.test();
        } catch (error) {
            console.error(`Agent test failed for ${agentId}:`, error);
            return false;
        }
    }

    /**
     * Helper: delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test all agents
     * ✅ FIXED: Check readiness first
     */
    async testAllAgents(): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        // Check system readiness
        if (!this.retriever.isReady()) {
            for (const [id] of this.agents.entries()) {
                results.set(id, false);
            }
            return results;
        }

        for (const [id, agent] of this.agents.entries()) {
            try {
                await this.delay(100); // Small delay between tests
                const result = await agent.test();
                results.set(id, result);
            } catch (error) {
                console.error(`Test failed for agent ${id}:`, error);
                results.set(id, false);
            }
        }

        return results;
    }

    /**
     * Check if manager is ready
     * ✅ FIXED: More lenient check - only require basic initialization
     */
    isReady(): boolean {
        // Basic checks - only require initialization and at least one agent
        if (!this.initialized || this.agents.size === 0) {
            return false;
        }

        // Don't require all dependencies to be ready - let the agent execution handle that
        // This allows the Agent Manager to be "ready" even if LLM providers aren't configured yet
        return true;
    }

    // ... (rest of the methods remain the same: getAgent, getAgentByName, listAgents,
    // executeAgent, executeAgentByName, updateAgent, deleteAgent, toggleAgent,
    // reloadAgent, reloadAllAgents, validateAgentConfig, getStats, setDefaultAgent,
    // getDefaultAgent, getAllAgents, cleanup)

    getAgent(agentId: string): AgentExecutor | null {
        return this.agents.get(agentId) || null;
    }

    getAgentByName(name: string): AgentExecutor | null {
        const config = this.plugin.settings.agents.find(a => a.name === name);
        return config ? this.getAgent(config.id) : null;
    }

    getAllAgents(): Array<{ id: string; config: AgentConfig; executor: AgentExecutor }> {
        return Array.from(this.agents.entries()).map(([id, executor]) => {
            const config = this.plugin.settings.agents.find(a => a.id === id);
            if (!config) {
                throw new Error(`Agent config not found: ${id}`);
            }
            return { id, config, executor };
        });
    }

    listAgents(): AgentInfo[] {
        return this.plugin.settings.agents.map(config => ({
            id: config.id,
            name: config.name,
            description: config.description,
            enabled: config.enabled
        }));
    }

    async executeAgent(
        agentId: string,
        query: string,
        context?: AgentExecutionContext
    ): Promise<AgentResponse> {
        if (!this.initialized) {
            throw new Error('Agent Manager not initialized');
        }

        const agent = this.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        const response = await agent.execute(query, context);
        return response;
    }

    async executeAgentByName(
        name: string,
        query: string,
        context?: AgentExecutionContext
    ): Promise<AgentResponse> {
        const agent = this.getAgentByName(name);
        if (!agent) {
            throw new Error(`Agent not found: ${name}`);
        }

        return await agent.execute(query, context);
    }

    async updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<void> {
        const configIndex = this.plugin.settings.agents.findIndex(a => a.id === agentId);
        if (configIndex === -1) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        const updatedConfig = {
            ...this.plugin.settings.agents[configIndex],
            ...updates,
            updatedAt: Date.now()
        };

        this.validateAgentConfig(updatedConfig);

        this.plugin.settings.agents[configIndex] = updatedConfig;
        await this.plugin.saveSettings();

        await this.reloadAgent(agentId);
    }

    async deleteAgent(agentId: string): Promise<void> {
        this.plugin.settings.agents = this.plugin.settings.agents.filter(
            a => a.id !== agentId
        );
        await this.plugin.saveSettings();

        this.agents.delete(agentId);
    }

    /**
     * Remove agent from memory only (used when settings are already saved)
     */
    removeAgentFromMemory(agentId: string): void {
        this.agents.delete(agentId);
    }

    async toggleAgent(agentId: string, enabled: boolean): Promise<void> {
        const config = this.plugin.settings.agents.find(a => a.id === agentId);
        if (!config) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        config.enabled = enabled;
        config.updatedAt = Date.now();
        await this.plugin.saveSettings();

        if (enabled) {
            this.createAgent(config);
        } else {
            this.agents.delete(agentId);
        }
    }

    async reloadAgent(agentId: string): Promise<void> {
        const config = this.plugin.settings.agents.find(a => a.id === agentId);
        if (!config) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        this.agents.delete(agentId);

        if (config.enabled) {
            this.createAgent(config);
        }
    }

    async reloadAllAgents(): Promise<void> {
        await this.initialize();
    }

    private validateAgentConfig(config: AgentConfig): void {
        if (!config.name || config.name.trim().length === 0) {
            throw new Error('Agent name is required');
        }

        if (!config.llmId) {
            throw new Error('LLM provider is required');
        }

        if (!config.systemPrompt || config.systemPrompt.trim().length === 0) {
            throw new Error('System prompt is required');
        }

        if (!config.systemPrompt.includes('{context}')) {
            throw new Error('System prompt must include {context} placeholder');
        }

        if (config.retrievalSettings.topK < 1 || config.retrievalSettings.topK > 20) {
            throw new Error('topK must be between 1 and 20');
        }

        if (
            config.retrievalSettings.scoreThreshold < 0 ||
            config.retrievalSettings.scoreThreshold > 1
        ) {
            throw new Error('scoreThreshold must be between 0 and 1');
        }

        const llmConfig = this.plugin.settings.llmConfigs.find(c => c.id === config.llmId);
        if (!llmConfig) {
            throw new Error(`LLM provider not found: ${config.llmId}`);
        }

        if (!llmConfig.enabled) {
            throw new Error(`LLM provider is disabled: ${llmConfig.name}`);
        }
    }

    getStats(): {
        totalAgents: number;
        enabledAgents: number;
        initializedAgents: number;
        agents: Array<{
            id: string;
            name: string;
            description: string;
            enabled: boolean;
            initialized: boolean;
            llmProvider: string;
        }>;
    } {
        const stats = {
            totalAgents: this.plugin.settings.agents.length,
            enabledAgents: this.plugin.settings.agents.filter(a => a.enabled).length,
            initializedAgents: this.agents.size,
            agents: this.plugin.settings.agents.map(config => {
                const executor = this.agents.get(config.id);
                return {
                    id: config.id,
                    name: config.name,
                    description: config.description,
                    enabled: config.enabled,
                    initialized: this.agents.has(config.id),
                    llmProvider: executor?.getLLMProviderName() || 'N/A'
                };
            })
        };

        return stats;
    }

    getDefaultAgent(): AgentExecutor | null {
        if (this.plugin.settings.defaultAgentId) {
            return this.getAgent(this.plugin.settings.defaultAgentId);
        }

        const firstEnabled = this.plugin.settings.agents.find(a => a.enabled);
        return firstEnabled ? this.getAgent(firstEnabled.id) : null;
    }

    async setDefaultAgent(agentId: string): Promise<void> {
        const agent = this.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        this.plugin.settings.defaultAgentId = agentId;
        await this.plugin.saveSettings();

    }

    /**
     * Force reinitialize the permanent Mnemosyne agent
     * Useful for debugging agent issues
     */
    async reinitializePermanentAgent(): Promise<boolean> {
        const permanentAgentId = 'mnemosyne-agent-permanent';
        const permanentAgent = this.plugin.settings.agents.find(a => a.id === permanentAgentId);
        
        if (!permanentAgent) {
            console.error('❌ Permanent agent not found in settings');
            return false;
        }
        
        console.log('🔄 Reinitializing permanent agent...');
        
        try {
            // Remove from memory if exists
            this.agents.delete(permanentAgentId);
            
            // Recreate if enabled
            if (permanentAgent.enabled) {
                this.createAgent(permanentAgent);
                console.log('✅ Permanent agent reinitialized successfully');
                return true;
            } else {
                console.log('⚠️ Permanent agent is disabled, not creating executor');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to reinitialize permanent agent:', error);
            return false;
        }
    }

    cleanup(): void {
        this.agents.clear();
        this.initialized = false;
    }
}
