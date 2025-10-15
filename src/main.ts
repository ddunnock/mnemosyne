/**
 * Risk Management RAG Assistant - Main Plugin File
 *
 * Complete implementation including Phase 5: Agent System
 */

import { Plugin, Notice, Modal } from 'obsidian';
import { PluginSettings, AgentConfig, AgentResponse, Message } from './types';
import { DEFAULT_SETTINGS, mergeSettings, validateSettings } from './settings';
import { PLUGIN_NAME, SUCCESS } from './constants';

// Import modules
import { KeyManager } from './encryption/keyManager';
import { RiskManagementSettingTab } from './ui/settingsTab';
import { RAGRetriever } from './rag/retriever';
import { LLMManager } from './llm/llmManager';

// Phase 5: Agent System imports
import { AgentManager } from './agents/agentManager';
import { AgentBuilderModal } from './ui/agentBuilderModal';
import { exposePublicAPI } from './integration/publicAPI';

export default class RiskManagementPlugin extends Plugin {
    settings: PluginSettings;

    // Core managers
    keyManager: KeyManager;
    retriever: RAGRetriever;
    llmManager: LLMManager;
    agentManager: AgentManager; // Phase 5

    /**
     * Plugin initialization - called when plugin is loaded
     */
    async onload() {
        console.log(`Loading ${PLUGIN_NAME}`);

        // Load settings
        await this.loadSettings();

        // Initialize core managers
        await this.initializeManagers();

        // Add ribbon icon
        this.addRibbonIcon('bot', 'RAG Agent Manager', () => {
            this.openAgentPalette();
        });

        // Add settings tab
        this.addSettingTab(new RiskManagementSettingTab(this.app, this));

        // Register commands
        this.registerCommands();

        // Phase 5: Expose public API
        exposePublicAPI(this);

        // Show welcome notice on first load
        if (!this.settings.agents || this.settings.agents.length === 0) {
            new Notice(
                `${PLUGIN_NAME} loaded! Open settings to configure your first agent.`,
                5000
            );
        } else {
            new Notice(`${PLUGIN_NAME} loaded successfully!`);
        }

        console.log(`${PLUGIN_NAME} loaded successfully`);
    }

    /**
     * Plugin cleanup - called when plugin is disabled
     */
    async onunload() {
        console.log(`Unloading ${PLUGIN_NAME}`);

        // Phase 5: Cleanup agent manager
        if (this.agentManager) {
            this.agentManager.cleanup();
        }

        // Cleanup LLM system
        if (this.llmManager) {
            this.llmManager.cleanup();
        }

        // Cleanup RAG system
        if (this.retriever) {
            await this.retriever.cleanup();
        }

        // Clear master password from memory
        if (this.keyManager) {
            this.keyManager.clearMasterPassword();
        }

        console.log(`${PLUGIN_NAME} unloaded successfully`);
    }

    /**
     * Load plugin settings from disk
     */
    async loadSettings() {
        const loadedData = await this.loadData();
        this.settings = mergeSettings(loadedData || {});

        // Ensure agents array exists (Phase 5)
        if (!this.settings.agents) {
            this.settings.agents = [];
        }

        // Validate settings
        if (!validateSettings(this.settings)) {
            console.warn('Invalid settings detected, using defaults');
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Save plugin settings to disk
     */
    async saveSettings() {
        await this.saveData(this.settings);
        console.log('Settings saved');
    }

    /**
     * Initialize core managers and systems
     */
    async initializeManagers() {
        try {
            // Phase 2: Initialize encryption manager
            this.keyManager = new KeyManager(this.app);
            console.log('✓ KeyManager initialized');

            // Phase 3: Initialize RAG system
            this.retriever = new RAGRetriever(this);
            await this.retriever.initialize();
            console.log('✓ RAGRetriever initialized');

            // Phase 4: Initialize LLM system
            this.llmManager = new LLMManager(this);

            // Only initialize LLM providers if master password is set
            if (this.keyManager.hasMasterPassword()) {
                try {
                    await this.llmManager.initialize();
                    console.log('✓ LLMManager initialized');
                } catch (error) {
                    console.warn('LLM Manager initialization skipped (master password may be needed)');
                }
            } else {
                console.log('⚠ LLM Manager initialization skipped (no master password)');
            }

            // Phase 5: Initialize Agent Manager
            this.agentManager = new AgentManager(this, this.retriever, this.llmManager);

            if (this.llmManager.isReady() && this.retriever.isReady()) {
                try {
                    await this.agentManager.initialize();
                    console.log('✓ Agent Manager initialized');
                } catch (error) {
                    console.warn('Agent Manager initialization incomplete:', error);
                }
            } else {
                console.log('⚠ Skipping Agent Manager initialization - dependencies not ready');
            }

            console.log('All managers initialized');
        } catch (error) {
            console.error('Error initializing managers:', error);
            new Notice('Error initializing plugin. Check console for details.');
        }
    }

    /**
     * Register plugin commands
     */
    registerCommands() {
        // Command: Open settings
        this.addCommand({
            id: 'open-settings',
            name: 'Open Settings',
            callback: () => {
                // @ts-ignore - Obsidian internal API
                this.app.setting.open();
                // @ts-ignore - Obsidian internal API
                this.app.setting.openTabById(this.manifest.id);
            },
        });

        // ========== Phase 5: Agent Commands ==========

        // Command: Open Agent Palette
        this.addCommand({
            id: 'open-agent-palette',
            name: 'Open Agent Palette',
            callback: () => {
                this.openAgentPalette();
            },
        });

        // Command: Create New Agent
        this.addCommand({
            id: 'create-agent',
            name: 'Create New Agent',
            callback: () => {
                new AgentBuilderModal(
                    this.app,
                    this,
                    null,
                    async (config) => {
                        await this.agentManager.addAgent(config);
                        new Notice(`Agent "${config.name}" created successfully`);
                    }
                ).open();
            },
        });

        // Command: Ask Default Agent
        this.addCommand({
            id: 'ask-default-agent',
            name: 'Ask Default Agent',
            callback: async () => {
                if (!this.agentManager || !this.agentManager.isReady()) {
                    new Notice('Agent system not ready. Please configure settings first.');
                    return;
                }

                const query = await this.promptForQuery();
                if (!query) return;

                const defaultAgent = this.agentManager.getDefaultAgent();
                if (!defaultAgent) {
                    new Notice('No default agent configured. Set one in settings.');
                    return;
                }

                try {
                    new Notice('Executing agent...');
                    const response = await defaultAgent.execute(query);
                    this.displayResponse(response);
                } catch (error: any) {
                    console.error('Agent execution failed:', error);
                    new Notice(`Error: ${error.message}`);
                }
            },
        });

        // Command: Test Agent System
        this.addCommand({
            id: 'test-agent-system',
            name: 'Test Agent System',
            callback: async () => {
                if (!this.agentManager || !this.agentManager.isReady()) {
                    new Notice('Agent system not ready');
                    return;
                }

                new Notice('Testing agent system...');

                try {
                    const stats = this.agentManager.getStats();
                    new Notice(
                        `Agent System Status:\n` +
                        `Total: ${stats.totalAgents}\n` +
                        `Enabled: ${stats.enabledAgents}\n` +
                        `Initialized: ${stats.initializedAgents}`,
                        8000
                    );
                } catch (error: any) {
                    console.error('Agent system test failed:', error);
                    new Notice(`Test failed: ${error.message}`);
                }
            },
        });

        // ========== RAG Commands ==========

        // Command: Ingest RAG chunks
        this.addCommand({
            id: 'ingest-chunks',
            name: 'Ingest RAG Chunks',
            callback: async () => {
                if (!this.retriever) {
                    new Notice('RAG system not initialized');
                    return;
                }

                try {
                    await this.retriever.ingestChunks();
                } catch (error) {
                    console.error('Ingestion error:', error);
                    new Notice('Chunk ingestion failed. Check console for details.');
                }
            },
        });

        // Command: Test RAG system
        this.addCommand({
            id: 'test-rag-system',
            name: 'Test RAG System',
            callback: async () => {
                if (!this.retriever) {
                    new Notice('RAG system not initialized');
                    return;
                }

                new Notice('Testing RAG system...');
                const result = await this.retriever.test();

                if (result) {
                    const stats = this.retriever.getStats();
                    if (stats) {
                        new Notice(
                            `✓ RAG system working! ${stats.totalChunks} chunks indexed`,
                            5000
                        );
                    } else {
                        new Notice('✓ RAG system working!');
                    }
                } else {
                    new Notice('✗ RAG system test failed. Check console.');
                }
            },
        });

        // Command: Show RAG stats
        this.addCommand({
            id: 'rag-stats',
            name: 'Show RAG Statistics',
            callback: () => {
                if (!this.retriever) {
                    new Notice('RAG system not initialized');
                    return;
                }

                const stats = this.retriever.getStats();

                if (!stats) {
                    new Notice('No stats available');
                    return;
                }

                const memory = (stats.memoryUsage / 1024 / 1024).toFixed(2);

                new Notice(
                    `RAG Stats:\n` +
                    `Chunks: ${stats.totalChunks}\n` +
                    `Model: ${stats.embeddingModel}\n` +
                    `Dimensions: ${stats.dimension}\n` +
                    `Memory: ${memory} MB`,
                    10000
                );
            },
        });

        // ========== LLM Commands ==========

        // Command: Test LLM providers
        this.addCommand({
            id: 'test-llm-providers',
            name: 'Test All LLM Providers',
            callback: async () => {
                if (!this.llmManager || !this.llmManager.isReady()) {
                    new Notice('LLM system not initialized. Set master password and configure providers.');
                    return;
                }

                new Notice('Testing all LLM providers...');

                try {
                    const results = await this.llmManager.testAllProviders();
                    let message = 'LLM Test Results:\n\n';

                    for (const [id, success] of results.entries()) {
                        const config = this.getLLMConfig(id);
                        const status = success ? '✓' : '✗';
                        message += `${status} ${config?.name || id}\n`;
                    }

                    new Notice(message, 10000);
                } catch (error) {
                    console.error('LLM test error:', error);
                    new Notice('✗ LLM test failed. Check console.');
                }
            },
        });

        // Command: Show LLM stats
        this.addCommand({
            id: 'llm-stats',
            name: 'Show LLM Statistics',
            callback: () => {
                if (!this.llmManager) {
                    new Notice('LLM system not initialized');
                    return;
                }

                const stats = this.llmManager.getStats();

                new Notice(
                    `LLM Stats:\n` +
                    `Total Providers: ${stats.totalProviders}\n` +
                    `Enabled: ${stats.enabledProviders}\n` +
                    `Initialized: ${stats.initializedProviders}`,
                    10000
                );
            },
        });

        // Command: Test encryption
        this.addCommand({
            id: 'test-encryption',
            name: 'Test Encryption System',
            callback: async () => {
                if (!this.keyManager.hasMasterPassword()) {
                    new Notice('Please set master password in settings first');
                    return;
                }

                new Notice('Testing encryption...');
                const result = await this.keyManager.testEncryption();

                if (result) {
                    new Notice('✓ Encryption system working correctly!');
                } else {
                    new Notice('✗ Encryption test failed. Check console.');
                }
            },
        });
    }

    // ========================================================================
    // Phase 5: Agent Helper Methods
    // ========================================================================

    /**
     * Open agent palette for selecting and executing agents
     */
    private openAgentPalette() {
        if (!this.agentManager || !this.agentManager.isReady()) {
            new Notice('Agent system not ready. Please configure settings first.');
            return;
        }

        // Create a simple modal for agent selection
        const modal = new Modal(this.app);
        modal.titleEl.setText('Select an Agent');

        const agents = this.agentManager.listAgents();

        if (agents.length === 0) {
            const emptyDiv = modal.contentEl.createDiv({
                cls: 'empty-state'
            });
            emptyDiv.style.padding = '40px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.color = 'var(--text-muted)';

            emptyDiv.createDiv({
                text: '🤖',
                cls: 'empty-icon'
            }).style.fontSize = '48px';

            emptyDiv.createDiv({
                text: 'No agents configured',
                cls: 'empty-title'
            }).style.marginTop = '10px';

            emptyDiv.createDiv({
                text: 'Create one in settings to get started',
                cls: 'empty-description'
            });

            const btn = modal.contentEl.createEl('button', { text: 'Create Agent' });
            btn.style.marginTop = '20px';
            btn.style.padding = '8px 16px';
            btn.onclick = () => {
                modal.close();
                new AgentBuilderModal(
                    this.app,
                    this,
                    null,
                    async (config) => {
                        await this.agentManager.addAgent(config);
                        new Notice(`Agent "${config.name}" created successfully`);
                    }
                ).open();
            };

            modal.open();
            return;
        }

        // Display agent cards
        agents
            .filter(a => a.enabled)
            .forEach(agent => {
                const card = modal.contentEl.createDiv({ cls: 'agent-selection-card' });
                card.style.border = '1px solid var(--background-modifier-border)';
                card.style.borderRadius = '8px';
                card.style.padding = '15px';
                card.style.marginBottom = '10px';
                card.style.cursor = 'pointer';
                card.style.transition = 'all 0.2s ease';

                card.onmouseover = () => {
                    card.style.backgroundColor = 'var(--background-modifier-hover)';
                    card.style.transform = 'translateX(5px)';
                };

                card.onmouseout = () => {
                    card.style.backgroundColor = '';
                    card.style.transform = 'translateX(0)';
                };

                card.onclick = async () => {
                    modal.close();
                    await this.executeAgentWithPrompt(agent.id);
                };

                const nameEl = card.createEl('h3', { text: agent.name });
                nameEl.style.margin = '0 0 5px 0';
                nameEl.style.fontSize = '1.1em';

                const descEl = card.createDiv({ text: agent.description });
                descEl.style.color = 'var(--text-muted)';
                descEl.style.fontSize = '0.9em';
            });

        modal.open();
    }

    /**
     * Execute an agent after prompting for query
     */
    private async executeAgentWithPrompt(agentId: string) {
        const query = await this.promptForQuery();
        if (!query) return;

        try {
            new Notice('Executing agent...');
            const response = await this.agentManager.executeAgent(agentId, query);
            this.displayResponse(response);
        } catch (error: any) {
            console.error('Agent execution failed:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    /**
     * Prompt user for a query
     */
    private async promptForQuery(): Promise<string | null> {
        return new Promise(resolve => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('Enter Your Query');

            const textarea = modal.contentEl.createEl('textarea');
            textarea.placeholder = 'What would you like to know about risk management?';
            textarea.style.width = '100%';
            textarea.style.minHeight = '100px';
            textarea.style.marginBottom = '10px';
            textarea.style.padding = '10px';
            textarea.style.fontFamily = 'var(--font-text)';
            textarea.style.fontSize = '14px';
            textarea.style.resize = 'vertical';

            const btnContainer = modal.contentEl.createDiv();
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '10px';
            btnContainer.style.justifyContent = 'flex-end';

            const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
            cancelBtn.onclick = () => {
                modal.close();
                resolve(null);
            };

            const submitBtn = btnContainer.createEl('button', { text: 'Submit' });
            submitBtn.style.backgroundColor = 'var(--interactive-accent)';
            submitBtn.style.color = 'white';
            submitBtn.onclick = () => {
                const query = textarea.value.trim();
                modal.close();
                resolve(query || null);
            };

            // Allow Enter key to submit (with Shift+Enter for newlines)
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitBtn.click();
                }
            });

            modal.open();
            textarea.focus();
        });
    }

    /**
     * Display agent response in a modal
     */
    private displayResponse(response: AgentResponse) {
        const modal = new Modal(this.app);
        modal.titleEl.setText(`Response from ${response.agentUsed}`);

        // Make modal wider
        modal.modalEl.style.width = '80%';
        modal.modalEl.style.maxWidth = '900px';

        // Response content
        const contentDiv = modal.contentEl.createDiv();
        contentDiv.style.maxHeight = '60vh';
        contentDiv.style.overflowY = 'auto';
        contentDiv.style.padding = '10px';

        // Metadata
        const metaDiv = contentDiv.createDiv({ cls: 'response-meta' });
        metaDiv.style.fontSize = '0.85em';
        metaDiv.style.color = 'var(--text-muted)';
        metaDiv.style.marginBottom = '15px';
        metaDiv.style.paddingBottom = '10px';
        metaDiv.style.borderBottom = '1px solid var(--background-modifier-border)';

        metaDiv.innerHTML = `
            <strong>Model:</strong> ${response.llmProvider} (${response.model}) |
            <strong>Time:</strong> ${response.executionTime}ms |
            <strong>Sources:</strong> ${response.sources.length}
        `;

        if (response.usage) {
            const usageDiv = metaDiv.createDiv();
            usageDiv.style.marginTop = '5px';
            usageDiv.innerHTML = `
                <strong>Tokens:</strong> ${response.usage.totalTokens}
                (${response.usage.promptTokens} prompt + ${response.usage.completionTokens} completion)
            `;
        }

        // Answer
        const answerDiv = contentDiv.createDiv({ cls: 'response-answer' });
        answerDiv.style.whiteSpace = 'pre-wrap';
        answerDiv.style.lineHeight = '1.8';
        answerDiv.style.marginBottom = '20px';

        // Simple markdown rendering
        let formattedAnswer = response.answer
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        answerDiv.innerHTML = formattedAnswer;

        // Sources
        if (response.sources.length > 0) {
            const sourcesDiv = contentDiv.createDiv({ cls: 'response-sources' });
            sourcesDiv.style.marginTop = '20px';
            sourcesDiv.style.paddingTop = '15px';
            sourcesDiv.style.borderTop = '1px solid var(--background-modifier-border)';

            const sourcesHeader = sourcesDiv.createEl('h4', { text: '📚 Sources' });
            sourcesHeader.style.marginBottom = '10px';
            sourcesHeader.style.fontSize = '1em';

            const sourcesList = sourcesDiv.createEl('ul');
            sourcesList.style.fontSize = '0.85em';
            sourcesList.style.color = 'var(--text-muted)';
            sourcesList.style.marginLeft = '20px';

            response.sources.forEach(source => {
                const li = sourcesList.createEl('li');
                li.style.marginBottom = '8px';
                li.innerHTML = `
                    <strong>${source.document_title}</strong> -
                    Section ${source.section}${source.section_title ? ': ' + source.section_title : ''}
                    (Page ${source.page_reference})
                `;
            });
        }

        // Copy button
        const copyBtn = modal.contentEl.createEl('button', { text: 'Copy to Clipboard' });
        copyBtn.style.marginTop = '15px';
        copyBtn.style.padding = '8px 16px';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(response.answer);
            new Notice('Response copied to clipboard');
        };

        modal.open();
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * Get agent config by ID
     */
    getAgentConfig(agentId: string): AgentConfig | null {
        return this.settings.agents.find(a => a.id === agentId) || null;
    }

    /**
     * Get LLM config by ID
     */
    getLLMConfig(llmId: string) {
        return this.settings.llmConfigs.find(c => c.id === llmId);
    }

    /**
     * Generate unique ID
     */
    generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
