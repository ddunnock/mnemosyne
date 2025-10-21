/**
 * Agent Manager (Fixed with proper async handling and state checking)
 * ✨ ENHANCED: Now supports master agent orchestration
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
import {
    MASTER_AGENT_ID,
    createMasterAgentConfig,
    updateMasterAgentPrompt
} from './masterAgent';

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
     * ✨ ENHANCED: Now ensures master agent exists and sets up synchronization
     */
    async initialize(): Promise<void> {
        // Clear existing agents
        this.agents.clear();

        console.log(`Initializing ${this.plugin.settings.agents.length} agents...`);

        // ✨ STEP 1: Ensure master agent exists
        await this.ensureMasterAgentExists();

        // ✨ STEP 2: Create executor for each enabled agent
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
                new Notice(`Failed to initialized agent ${config.name}: ${errorMessage}`);
            }
        }

        // ✨ STEP 3: Set up tool executor callbacks for all agents
        this.setupToolExecutorCallbacks();

        // ✨ STEP 4: Synchronize agent tools (update tool executors with agent list)
        this.syncAgentTools();

        // ✨ STEP 5: Update master agent's system prompt with current agent list
        await this.updateMasterAgentPrompt();

        this.initialized = true;
        console.log(`🎭 Agent Manager initialization complete. ${this.agents.size} agents loaded (including master).`);
    }

    /**
     * Create an agent executor from config
     * ✨ MCP ENHANCED: Now passes App instance for tool support
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

            // ✨ NEW: Pass App instance for MCP tool support
            const executor = new AgentExecutor(
                config,
                this.retriever,
                this.llmManager,
                this.plugin.app  // Pass Obsidian App for tool functionality
            );
            this.agents.set(config.id, executor);

            console.log(`✅ Agent executor created and stored: ${config.name}`);
            if (config.enableTools) {
                console.log(`  🛠️  Tools enabled for this agent`);
            }
        } catch (error) {
            console.error(`❌ Failed to create agent executor for ${config.name}:`, error);
            throw error;
        }
    }

    /**
     * Add a new agent
     * ✅ FIXED: Don't test immediately, just create and notify
     * ✨ ENHANCED: Now syncs agent tools and updates master agent
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

        // ✨ Sync agent tools and update master
        if (config.id !== MASTER_AGENT_ID) {
            this.syncAgentTools();
            await this.updateMasterAgentPrompt();
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

        // ✅ NEW: Check if RAG system is available (optional enhancement)
        if (this.retriever.isReady()) {
            const stats = await this.retriever.getStats();
            if (stats && stats.totalChunks > 0) {
                console.log(`✓ RAG system ready with ${stats.totalChunks} chunks - agent will be enhanced with knowledge base context`);
            } else {
                console.log('⚠ RAG system configured but no chunks available - agent will work without knowledge base context');
            }
        } else {
            console.log('ℹ️ RAG system not configured - agent will work without knowledge base context');
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

        // ✨ Sync agent tools and update master if not updating master itself
        if (agentId !== MASTER_AGENT_ID) {
            this.syncAgentTools();
            await this.updateMasterAgentPrompt();
        }
    }

    async deleteAgent(agentId: string): Promise<void> {
        this.plugin.settings.agents = this.plugin.settings.agents.filter(
            a => a.id !== agentId
        );
        await this.plugin.saveSettings();

        this.agents.delete(agentId);

        // ✨ Sync agent tools and update master
        if (agentId !== MASTER_AGENT_ID) {
            this.syncAgentTools();
            await this.updateMasterAgentPrompt();
        }
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

        // ✨ Sync agent tools and update master
        if (agentId !== MASTER_AGENT_ID) {
            this.syncAgentTools();
            await this.updateMasterAgentPrompt();
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

    // ============================================================================
    // ✨ Master Agent Orchestration Methods
    // ============================================================================

    /**
     * Ensure the master agent exists, creating it if necessary
     */
    private async ensureMasterAgentExists(): Promise<void> {
        // Check if master agent already exists
        let masterAgent = this.plugin.settings.agents.find(a => a.id === MASTER_AGENT_ID);

        if (!masterAgent) {
            console.log('🎭 Master agent not found, creating...');

            // Get default LLM (or first available)
            const defaultLLM =
                this.plugin.settings.llmConfigs.find(l => l.isDefault && l.enabled) ||
                this.plugin.settings.llmConfigs.find(l => l.enabled);

            if (!defaultLLM) {
                console.error('❌ Cannot create master agent: No LLM configured');
                new Notice('Please configure an LLM provider before using agents');
                return;
            }

            // Create master agent
            masterAgent = createMasterAgentConfig(defaultLLM.id);
            this.plugin.settings.agents.unshift(masterAgent); // Add at beginning
            this.plugin.settings.masterAgentId = MASTER_AGENT_ID;
            await this.plugin.saveSettings();

            console.log('✅ Master agent created successfully');
        } else {
            console.log('✓ Master agent exists');
        }
    }

    /**
     * Set up tool executor callbacks for all agents
     * This allows the master agent to call other agents via tools
     */
    private setupToolExecutorCallbacks(): void {
        console.log('🔗 Setting up tool executor callbacks...');

        for (const [id, executor] of this.agents.entries()) {
            // Get the tool executor from the AgentExecutor
            const toolExecutor = (executor as any).toolExecutor;

            if (toolExecutor) {
                // Set the agent executor callback
                toolExecutor.setAgentExecutor(
                    async (agentId: string, query: string, context?: Record<string, any>) => {
                        return this.executeAgent(agentId, query, context);
                    },
                    () => {
                        return this.listAgentInfoForTools();
                    }
                );
            }
        }

        console.log('✅ Tool executor callbacks configured');
    }

    /**
     * Synchronize agent tools across all tool executors
     */
    private syncAgentTools(): void {
        const agentList = this.listAgentInfoForTools();

        // Exclude master agent from the callable agent list
        const callableAgents = agentList.filter(a => a.id !== MASTER_AGENT_ID);

        console.log(`🔄 Syncing agent tools: ${callableAgents.length} callable agents`);

        for (const [id, executor] of this.agents.entries()) {
            const toolExecutor = (executor as any).toolExecutor;

            if (toolExecutor) {
                toolExecutor.updateAgentTools(callableAgents);
            }
        }
    }

    /**
     * Update the master agent's system prompt with current agent list
     */
    private async updateMasterAgentPrompt(): Promise<void> {
        const masterAgentConfig = this.plugin.settings.agents.find(a => a.id === MASTER_AGENT_ID);

        if (!masterAgentConfig) {
            console.warn('⚠️ Master agent not found, cannot update prompt');
            return;
        }

        // Get all agents except master
        const otherAgents = this.plugin.settings.agents
            .filter(a => a.id !== MASTER_AGENT_ID && a.enabled)
            .map(a => ({
                id: a.id,
                name: a.name,
                description: a.description,
                capabilities: a.capabilities,
                category: a.category
            }));

        // Update the master agent's prompt
        const updatedMaster = updateMasterAgentPrompt(masterAgentConfig, otherAgents);

        // Update in settings
        const index = this.plugin.settings.agents.findIndex(a => a.id === MASTER_AGENT_ID);
        if (index !== -1) {
            this.plugin.settings.agents[index] = updatedMaster;
            await this.plugin.saveSettings();
        }

        // Reload the master agent executor if it exists
        if (this.agents.has(MASTER_AGENT_ID)) {
            this.agents.delete(MASTER_AGENT_ID);
            this.createAgent(updatedMaster);
            console.log('✅ Master agent prompt updated and executor reloaded');
        }
    }

    /**
     * Get agent info formatted for tools
     */
    private listAgentInfoForTools(): Array<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        capabilities?: string[];
        category?: string;
    }> {
        return this.plugin.settings.agents.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            enabled: a.enabled,
            capabilities: a.capabilities,
            category: a.category
        }));
    }

    /**
     * Get the master agent
     */
    getMasterAgent(): AgentExecutor | null {
        return this.getAgent(MASTER_AGENT_ID);
    }
}
