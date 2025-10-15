/**
 * Initialization Manager
 *
 * Handles coordinated initialization of all plugin systems
 */

import { Notice } from 'obsidian';
import RiskManagementPlugin from '../main';

export interface InitializationStatus {
    keyManager: boolean;
    retriever: boolean;
    llmManager: boolean;
    agentManager: boolean;
    overall: boolean;
}

export interface InitializationResult {
    success: boolean;
    status: InitializationStatus;
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
     * Get current initialization status
     */
    getStatus(): InitializationStatus {
        return {
            keyManager: !!this.plugin.keyManager,
            retriever: this.plugin.retriever?.isReady() || false,
            llmManager: this.plugin.llmManager?.isReady() || false,
            agentManager: this.plugin.agentManager?.isReady() || false,
            overall: this.isFullyInitialized()
        };
    }

    /**
     * Check if all systems are initialized
     */
    isFullyInitialized(): boolean {
        return (
            !!this.plugin.keyManager &&
            this.plugin.retriever?.isReady() === true &&
            this.plugin.llmManager?.isReady() === true &&
            this.plugin.agentManager?.isReady() === true
        );
    }

    /**
     * Check if currently initializing
     */
    isInitializing(): boolean {
        return this.initializing;
    }

    /**
     * Initialize all systems with proper waiting and error handling
     */
    async initializeAll(force: boolean = false): Promise<InitializationResult> {
        if (this.initializing) {
            return {
                success: false,
                status: this.getStatus(),
                errors: ['Initialization already in progress'],
                warnings: []
            };
        }

        this.initializing = true;
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            new Notice('🔄 Initializing plugin systems...');

            // Phase 1: Key Manager (always available)
            if (!this.plugin.keyManager) {
                errors.push('KeyManager not found - plugin may need reload');
            }

            // Phase 2: RAG Retriever
            if (!this.plugin.retriever) {
                errors.push('RAGRetriever not found');
            } else {
                try {
                    if (!this.plugin.retriever.isReady() || force) {
                        await this.plugin.retriever.initialize();
                        console.log('✓ RAG Retriever initialized');
                    } else {
                        console.log('✓ RAG Retriever already ready');
                    }
                } catch (error: any) {
                    errors.push(`RAG initialization failed: ${error.message}`);
                    console.error('RAG initialization error:', error);
                }
            }

            // Phase 3: LLM Manager
            if (!this.plugin.llmManager) {
                errors.push('LLM Manager not found');
            } else {
                if (!this.plugin.keyManager?.hasMasterPassword()) {
                    warnings.push('Master password not set - LLM providers cannot be initialized');
                } else {
                    try {
                        if (!this.plugin.llmManager.isReady() || force) {
                            await this.plugin.llmManager.initialize();
                            console.log('✓ LLM Manager initialized');
                        } else {
                            console.log('✓ LLM Manager already ready');
                        }
                    } catch (error: any) {
                        errors.push(`LLM initialization failed: ${error.message}`);
                        console.error('LLM initialization error:', error);
                    }
                }
            }

            // Phase 4: Agent Manager
            if (!this.plugin.agentManager) {
                errors.push('Agent Manager not found');
            } else {
                // Check prerequisites for agent manager
                if (!this.plugin.retriever?.isReady()) {
                    warnings.push('RAG system not ready - Agent Manager cannot initialize');
                } else if (!this.plugin.llmManager?.isReady()) {
                    warnings.push('LLM system not ready - Agent Manager cannot initialize');
                } else {
                    try {
                        if (!this.plugin.agentManager.isReady() || force) {
                            await this.plugin.agentManager.initialize();
                            console.log('✓ Agent Manager initialized');
                        } else {
                            console.log('✓ Agent Manager already ready');
                        }
                    } catch (error: any) {
                        errors.push(`Agent Manager initialization failed: ${error.message}`);
                        console.error('Agent Manager initialization error:', error);
                    }
                }
            }

            const status = this.getStatus();

            if (errors.length === 0 && warnings.length === 0) {
                new Notice('✅ All systems initialized successfully!');
                return {
                    success: true,
                    status,
                    errors: [],
                    warnings: []
                };
            } else if (errors.length === 0) {
                new Notice(`⚠️ Systems initialized with ${warnings.length} warning(s)`, 5000);
                return {
                    success: true,
                    status,
                    errors: [],
                    warnings
                };
            } else {
                new Notice(`❌ Initialization failed with ${errors.length} error(s)`, 8000);
                return {
                    success: false,
                    status,
                    errors,
                    warnings
                };
            }

        } finally {
            this.initializing = false;
        }
    }

    /**
     * Initialize only missing components
     */
    async initializeMissing(): Promise<InitializationResult> {
        const status = this.getStatus();
        const errors: string[] = [];
        const warnings: string[] = [];

        if (status.overall) {
            new Notice('✓ All systems already initialized');
            return {
                success: true,
                status,
                errors: [],
                warnings: []
            };
        }

        new Notice('🔄 Initializing missing components...');

        // Only initialize what's missing
        try {
            if (!status.retriever && this.plugin.retriever) {
                await this.plugin.retriever.initialize();
            }

            if (!status.llmManager && this.plugin.llmManager) {
                if (this.plugin.keyManager?.hasMasterPassword()) {
                    await this.plugin.llmManager.initialize();
                } else {
                    warnings.push('Cannot initialize LLM - master password not set');
                }
            }

            if (!status.agentManager && this.plugin.agentManager) {
                if (this.plugin.retriever?.isReady() && this.plugin.llmManager?.isReady()) {
                    await this.plugin.agentManager.initialize();
                } else {
                    warnings.push('Cannot initialize Agent Manager - dependencies not ready');
                }
            }

            const newStatus = this.getStatus();

            if (newStatus.overall) {
                new Notice('✅ Missing components initialized!');
                return { success: true, status: newStatus, errors: [], warnings };
            } else {
                return { success: false, status: newStatus, errors, warnings };
            }

        } catch (error: any) {
            errors.push(error.message);
            return {
                success: false,
                status: this.getStatus(),
                errors,
                warnings
            };
        }
    }

    /**
     * Wait for system to be ready (with timeout)
     */
    async waitForReady(timeoutMs: number = 10000): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            if (this.isFullyInitialized()) {
                return true;
            }

            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return false;
    }

    /**
     * Get initialization requirements
     */
    getRequirements(): {
        requirement: string;
        met: boolean;
        message: string;
    }[] {
        return [
            {
                requirement: 'Master Password',
                met: this.plugin.keyManager?.hasMasterPassword() || false,
                message: this.plugin.keyManager?.hasMasterPassword()
                    ? 'Master password is set'
                    : 'Set master password in settings'
            },
            {
                requirement: 'OpenAI API Key',
                met: this.plugin.settings.llmConfigs.some(c => c.provider === 'openai'),
                message: this.plugin.settings.llmConfigs.some(c => c.provider === 'openai')
                    ? 'OpenAI provider configured'
                    : 'Configure OpenAI provider for embeddings'
            },
            {
                requirement: 'LLM Provider',
                met: this.plugin.settings.llmConfigs.some(c => c.enabled),
                message: this.plugin.settings.llmConfigs.some(c => c.enabled)
                    ? `${this.plugin.settings.llmConfigs.filter(c => c.enabled).length} provider(s) configured`
                    : 'Configure at least one LLM provider'
            },
            {
                requirement: 'RAG Chunks',
                met: (this.plugin.retriever?.getStats()?.totalChunks || 0) > 0,
                message: (this.plugin.retriever?.getStats()?.totalChunks || 0) > 0
                    ? `${this.plugin.retriever?.getStats()?.totalChunks} chunks indexed`
                    : 'Ingest chunks in RAG Configuration section'
            },
            {
                requirement: 'Agent Configuration',
                met: this.plugin.settings.agents.length > 0,
                message: this.plugin.settings.agents.length > 0
                    ? `${this.plugin.settings.agents.length} agent(s) configured`
                    : 'Create at least one agent'
            }
        ];
    }

    /**
     * Check if prerequisites are met
     */
    hasPrerequisites(): boolean {
        return this.getRequirements().every(req => req.met);
    }

    /**
     * Get missing prerequisites
     */
    getMissingPrerequisites(): string[] {
        return this.getRequirements()
            .filter(req => !req.met)
            .map(req => req.requirement);
    }
}