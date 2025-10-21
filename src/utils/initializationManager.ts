/**
 * Smart Initialization Manager - FIXED (RAG Embeddings Issue)
 *
 * Provides intelligent initialization and re-initialization of all plugin systems
 * Can detect actual state and fix issues without requiring plugin reload
 */

import { Notice } from 'obsidian';
import RiskManagementPlugin from '../main';

export interface InitializationStatus {
    // Individual component states
    keyManager: boolean;
    retriever: boolean;
    llmManager: boolean;
    agentManager: boolean;

    // Detailed info
    chunksIngested: boolean;
    chunkCount: number;
    agentsConfigured: boolean;
    agentCount: number;
    agentsInitialized: number;
    llmProvidersConfigured: boolean;
    providerCount: number;
    llmProvidersInitialized: number;

    // Overall status
    overall: boolean;
}

export interface InitializationRequirement {
    requirement: string;
    met: boolean;
    message: string;
}

export interface InitializationResult {
    success: boolean;
    errors: string[];
    warnings: string[];
}

export class InitializationManager {
    private plugin: RiskManagementPlugin;
    private initializing: boolean = false;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
    }

    /**
     * Get comprehensive initialization status
     */
    async getStatus(): Promise<InitializationStatus> {
        const retrieverStats = await this.plugin.retriever?.getStats();
        const llmStats = this.plugin.llmManager?.getStats();
        const agentStats = this.plugin.agentManager?.getStats();

        // Check actual initialization state of each manager
        const keyManager = !!this.plugin.keyManager && this.plugin.keyManager.hasMasterPassword();
        const retriever = this.plugin.retriever?.isReady() || false;
        const llmManager = this.plugin.llmManager?.isReady() || false;
        const agentManager = this.plugin.agentManager?.isReady() || false;

        const chunksIngested = (retrieverStats?.totalChunks || 0) > 0;
        const agentsConfigured = (this.plugin.settings.agents?.length || 0) > 0;
        const llmProvidersConfigured = (this.plugin.settings.llmConfigs?.length || 0) > 0;

        const agentsInitialized = agentStats?.initializedAgents || 0;
        const llmProvidersInitialized = llmStats?.initializedProviders || 0;

        // Overall ready = all managers ready
        const overall = keyManager && retriever && llmManager && agentManager;

        return {
            keyManager,
            retriever,
            llmManager,
            agentManager,
            chunksIngested,
            chunkCount: retrieverStats?.totalChunks || 0,
            agentsConfigured,
            agentCount: agentStats?.totalAgents || 0,
            agentsInitialized,
            llmProvidersConfigured,
            providerCount: llmStats?.totalProviders || 0,
            llmProvidersInitialized,
            overall
        };
    }

    /**
     * Get detailed requirements checklist
     */
    async getRequirements(): Promise<InitializationRequirement[]> {
        const status = await this.getStatus();
        const requirements: InitializationRequirement[] = [];

        // Master password
        requirements.push({
            requirement: 'Set master password',
            met: this.plugin.keyManager?.hasMasterPassword() || false,
            message: status.keyManager ? 'Password set' : 'Required for encryption'
        });

        // LLM Providers
        requirements.push({
            requirement: 'Configure LLM providers',
            met: status.llmProvidersConfigured,
            message: status.llmProvidersConfigured
                ? `${status.llmProvidersInitialized}/${status.providerCount} initialized`
                : 'Add at least one provider'
        });

        // RAG Chunks
        requirements.push({
            requirement: 'Ingest RAG chunks',
            met: status.chunksIngested,
            message: status.chunksIngested
                ? `${status.chunkCount} chunks loaded`
                : 'Run chunk ingestion'
        });

        // Agents
        requirements.push({
            requirement: 'Create AI agents',
            met: status.agentsConfigured,
            message: status.agentsConfigured
                ? `${status.agentsInitialized}/${status.agentCount} initialized`
                : 'Create at least one agent'
        });

        return requirements;
    }

    /**
     * Check if master password is available, prompt user if needed
     */
    private async checkMasterPasswordAvailability(): Promise<boolean> {
        // If already in memory, we're good
        if (this.plugin.keyManager?.hasMasterPassword()) {
            return true;
        }
        
        // Use modern settings controller if available
        if (this.plugin.settingsController) {
            try {
                return await this.plugin.settingsController.ensureMasterPasswordLoaded();
            } catch (error) {
                console.error('Error loading master password:', error);
                return false;
            }
        }
        
        // Fallback: check if master password exists in settings
        // This might be using the old settings structure, so we check both
        const hasOldPassword = this.plugin.keyManager?.hasMasterPassword();
        if (hasOldPassword) {
            return true;
        }
        
        return false;
    }

    /**
     * Initialize or re-initialize all systems
     */
    async initializeAll(force: boolean = false): Promise<InitializationResult> {
        if (this.initializing) {
            return {
                success: false,
                errors: ['Initialization already in progress'],
                warnings: []
            };
        }

        this.initializing = true;
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            new Notice(force ? '🔄 Re-initializing all systems...' : '⚡ Initializing systems...');

            // 1. Key Manager (always ready)
            if (!this.plugin.keyManager) {
                errors.push('KeyManager not found');
                return { success: false, errors, warnings };
            }

            // Check master password using modern settings system
            const needsMasterPassword = await this.checkMasterPasswordAvailability();
            if (!needsMasterPassword) {
                errors.push('Master password not available');
                return { success: false, errors, warnings };
            }

            // 2. Initialize LLM Manager FIRST (needed for RAG embeddings)
            try {
                if (this.plugin.settings.llmConfigs.length === 0) {
                    warnings.push('No LLM providers configured');
                } else {
                    await this.plugin.llmManager.initialize();

                    const llmStats = this.plugin.llmManager.getStats();
                    if (llmStats.initializedProviders === 0) {
                        errors.push('No LLM providers initialized successfully');
                    } else if (llmStats.initializedProviders < llmStats.enabledProviders) {
                        warnings.push(`Only ${llmStats.initializedProviders}/${llmStats.enabledProviders} providers initialized`);
                    }
                    console.log('✓ LLM Manager initialized');
                }
            } catch (error: any) {
                errors.push(`LLM initialization failed: ${error.message}`);
            }

            // 3. Initialize RAG Retriever (now that LLM is ready, embeddings can initialize)
            try {
                // Force re-initialization to pick up OpenAI provider for embeddings
                await this.plugin.retriever.initialize();

                // Check if embeddings are ready now
                if (!this.plugin.retriever.isReady()) {
                    // Check if we have OpenAI provider
                    const hasOpenAI = this.plugin.settings.llmConfigs.some(c => c.provider === 'openai' && c.enabled);
                    if (!hasOpenAI) {
                        warnings.push('RAG needs OpenAI provider for embeddings');
                    } else {
                        const status = await this.getStatus();
                        if (!status.chunksIngested) {
                            warnings.push('RAG needs chunks ingested');
                        } else {
                            warnings.push('RAG embeddings initialization issue - check console');
                        }
                    }
                }

                console.log('✓ RAG Retriever initialized');
            } catch (error: any) {
                errors.push(`RAG initialization failed: ${error.message}`);
            }

            // 4. Initialize Agent Manager
            try {
                if (this.plugin.settings.agents.length === 0) {
                    warnings.push('No agents configured');
                } else {
                    // Always try to initialize agents if they're configured
                    await this.plugin.agentManager.initialize();

                    const agentStats = this.plugin.agentManager.getStats();
                    if (agentStats.initializedAgents === 0) {
                        if (!this.plugin.llmManager.isReady()) {
                            warnings.push('Agents need LLM providers initialized first');
                        } else if (!this.plugin.retriever.isReady()) {
                            warnings.push('Agents need RAG system ready first');
                        } else {
                            errors.push('No agents initialized successfully');
                        }
                    } else if (agentStats.initializedAgents < agentStats.enabledAgents) {
                        warnings.push(`Only ${agentStats.initializedAgents}/${agentStats.enabledAgents} agents initialized`);
                    }
                    console.log('✓ Agent Manager initialized');
                }
            } catch (error: any) {
                errors.push(`Agent initialization failed: ${error.message}`);
            }

            const success = errors.length === 0;

            if (success) {
                new Notice('✅ All systems initialized!');
            } else {
                new Notice(`⚠️ Initialization completed with ${errors.length} error(s)`);
            }

            return { success, errors, warnings };

        } finally {
            this.initializing = false;
        }
    }

    /**
     * Initialize only what's missing
     */
    async initializeMissing(): Promise<InitializationResult> {
        if (this.initializing) {
            return {
                success: false,
                errors: ['Initialization already in progress'],
                warnings: []
            };
        }

        this.initializing = true;
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const status = await this.getStatus();
            new Notice('🔍 Checking what needs initialization...');

            let didSomething = false;

            // Re-initialize LLM Manager if providers are configured but not all initialized
            if (status.llmProvidersConfigured && status.llmProvidersInitialized < status.providerCount) {
                try {
                    await this.plugin.llmManager.initialize();
                    console.log('✓ LLM Manager re-initialized');
                    didSomething = true;

                    // Also re-initialize RAG to pick up embeddings
                    await this.plugin.retriever.initialize();
                    console.log('✓ RAG Retriever re-initialized for embeddings');
                } catch (error: any) {
                    errors.push(`LLM initialization failed: ${error.message}`);
                }
            }

            // If RAG is not ready but we have OpenAI, re-initialize it
            if (!status.retriever && status.llmManager) {
                const hasOpenAI = this.plugin.settings.llmConfigs.some(c => c.provider === 'openai' && c.enabled);
                if (hasOpenAI) {
                    try {
                        await this.plugin.retriever.initialize();
                        console.log('✓ RAG Retriever re-initialized for embeddings');
                        didSomething = true;
                    } catch (error: any) {
                        errors.push(`RAG initialization failed: ${error.message}`);
                    }
                }
            }

            // Re-initialize Agent Manager if agents are configured but not all initialized
            if (status.agentsConfigured && status.agentsInitialized < status.agentCount) {
                try {
                    await this.plugin.agentManager.initialize();
                    console.log('✓ Agent Manager re-initialized');
                    didSomething = true;

                    // Check if it worked
                    const newAgentStats = this.plugin.agentManager.getStats();
                    if (newAgentStats.initializedAgents === 0) {
                        if (!this.plugin.llmManager.isReady()) {
                            warnings.push('Agents need LLM providers ready - configure and initialize LLM first');
                        } else if (!this.plugin.retriever.isReady()) {
                            warnings.push('Agents need RAG system ready - add OpenAI provider and ingest chunks');
                        }
                    }
                } catch (error: any) {
                    errors.push(`Agent initialization failed: ${error.message}`);
                }
            }

            if (!didSomething) {
                warnings.push('Nothing to initialize - all configured components are already initialized');
            }

            const success = errors.length === 0;

            if (success && didSomething) {
                new Notice('✅ Missing components initialized!');
            } else if (!success) {
                new Notice(`⚠️ Some components failed to initialize`);
            } else {
                new Notice('ℹ️ Nothing needed initialization');
            }

            return { success, errors, warnings };

        } finally {
            this.initializing = false;
        }
    }

    /**
     * Re-initialize LLM providers
     */
    async reinitializeLLM(): Promise<InitializationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            new Notice('🔄 Re-initializing LLM providers...');
            await this.plugin.llmManager.initialize();

            // Also re-initialize RAG embeddings now that LLM is ready
            await this.plugin.retriever.initialize();
            console.log('✓ RAG embeddings re-initialized');

            const stats = this.plugin.llmManager.getStats();
            if (stats.initializedProviders > 0) {
                new Notice(`✅ ${stats.initializedProviders} LLM provider(s) initialized`);

                // Also try to initialize agents now that LLM is ready
                if (this.plugin.settings.agents.length > 0 && this.plugin.retriever.isReady()) {
                    await this.plugin.agentManager.initialize();
                    const agentStats = this.plugin.agentManager.getStats();
                    if (agentStats.initializedAgents > 0) {
                        new Notice(`✅ Also initialized ${agentStats.initializedAgents} agent(s)`);
                    }
                }

                return { success: true, errors, warnings };
            } else {
                errors.push('No providers initialized');
                new Notice('⚠️ No LLM providers initialized');
                return { success: false, errors, warnings };
            }
        } catch (error: any) {
            errors.push(error.message);
            new Notice(`❌ LLM initialization failed: ${error.message}`);
            return { success: false, errors, warnings };
        }
    }

    /**
     * Re-initialize agents
     */
    async reinitializeAgents(): Promise<InitializationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Check dependencies first
            if (!this.plugin.llmManager.isReady()) {
                errors.push('LLM system not ready - configure and initialize LLM providers first');
                new Notice('❌ Cannot initialize agents - LLM not ready');
                return { success: false, errors, warnings };
            }

            if (!this.plugin.retriever.isReady()) {
                // Try to initialize retriever first
                await this.plugin.retriever.initialize();

                if (!this.plugin.retriever.isReady()) {
                    errors.push('RAG system not ready - add OpenAI provider and ingest chunks');
                    new Notice('❌ Cannot initialize agents - RAG not ready');
                    return { success: false, errors, warnings };
                }
            }

            new Notice('🔄 Re-initializing agents...');
            await this.plugin.agentManager.initialize();

            const stats = this.plugin.agentManager.getStats();
            if (stats.initializedAgents > 0) {
                new Notice(`✅ ${stats.initializedAgents} agent(s) initialized`);
                return { success: true, errors, warnings };
            } else {
                errors.push('No agents initialized');
                new Notice('⚠️ No agents initialized');
                return { success: false, errors, warnings };
            }
        } catch (error: any) {
            errors.push(error.message);
            new Notice(`❌ Agent initialization failed: ${error.message}`);
            return { success: false, errors, warnings };
        }
    }

    /**
     * Smart chunk ingestion - only if needed
     */
    async ingestChunksIfNeeded(): Promise<boolean> {
        const status = await this.getStatus();

        if (status.chunksIngested) {
            console.log(`Chunks already ingested (${status.chunkCount} chunks)`);
            new Notice(`✓ Chunks already loaded (${status.chunkCount} chunks)`);
            return false;
        }

        console.log('No chunks found, ingesting...');
        new Notice('📚 Ingesting RAG chunks...');

        try {
            await this.plugin.retriever.ingestChunks();
            const newStatus = await this.getStatus();
            new Notice(`✓ Ingested ${newStatus.chunkCount} chunks`);
            return true;
        } catch (error: any) {
            new Notice(`✗ Ingestion failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if system is ready
     */
    async isReady(): Promise<boolean> {
        const status = await this.getStatus();
        return status.overall;
    }

    /**
     * Check if initialization is in progress
     */
    isInitializing(): boolean {
        return this.initializing;
    }

    /**
     * Get friendly status message
     */
    async getStatusMessage(): Promise<string> {
        const status = await this.getStatus();

        if (status.overall) {
            return '✓ System ready';
        }

        const requirements = await this.getRequirements();
        const unmet = requirements.filter(r => !r.met);

        if (unmet.length > 0) {
            return `⚠ Setup required: ${unmet.map(r => r.requirement).join(', ')}`;
        }

        return '⚠ Some components need re-initialization';
    }

    /**
     * Diagnose issues and provide solutions
     */
    async diagnose(): Promise<string[]> {
        const status = await this.getStatus();
        const issues: string[] = [];

        // Check for configured but not initialized
        if (status.llmProvidersConfigured && status.llmProvidersInitialized < status.providerCount) {
            issues.push(`${status.providerCount - status.llmProvidersInitialized} LLM provider(s) not initialized - click "Re-initialize LLM"`);
        }

        if (status.agentsConfigured && status.agentsInitialized < status.agentCount) {
            const reason = !status.llmManager ? ' (LLM not ready)' : !status.retriever ? ' (RAG not ready)' : '';
            issues.push(`${status.agentCount - status.agentsInitialized} agent(s) not initialized${reason} - click "Re-initialize Agents"`);
        }

        // Check for missing configuration
        if (!status.llmProvidersConfigured) {
            issues.push('No LLM providers configured - add one in LLM Providers section');
        }

        if (!status.chunksIngested) {
            issues.push('No chunks ingested - click "Ingest Chunks" in RAG Configuration');
        }

        if (!status.agentsConfigured) {
            issues.push('No agents configured - create one in AI Agents section');
        }

        // Check RAG system specifically
        if (status.llmManager && !status.retriever) {
            const hasOpenAI = this.plugin.settings.llmConfigs.some(c => c.provider === 'openai' && c.enabled);
            if (!hasOpenAI) {
                issues.push('RAG system needs an OpenAI provider for embeddings - click "Re-initialize LLM"');
            } else {
                issues.push('RAG embeddings not initialized - click "Initialize Missing"');
            }
        }

        return issues;
    }
}
