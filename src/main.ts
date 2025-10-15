/**
 * Risk Management RAG Assistant - Main Plugin File
 *
 * Updated with Initialization Manager for better UI control
 */

import { Plugin, Notice, Modal } from 'obsidian';
import { PluginSettings, AgentConfig, AgentResponse } from './types';
import { DEFAULT_SETTINGS, mergeSettings, validateSettings } from './settings';
import { PLUGIN_NAME } from './constants';

// Import modules
import { KeyManager } from './encryption/keyManager';
import { RiskManagementSettingTab } from './ui/settingsTab';
import { RAGRetriever } from './rag/retriever';
import { LLMManager } from './llm/llmManager';
import { AgentManager } from './agents/agentManager';
import { AgentBuilderModal } from './ui/agentBuilderModal';
import { exposePublicAPI } from './integration/publicAPI';
import { InitializationManager } from './utils/initializationManager'; // NEW

export default class RiskManagementPlugin extends Plugin {
    settings: PluginSettings;

    // Core managers
    keyManager: KeyManager;
    retriever: RAGRetriever;
    llmManager: LLMManager;
    agentManager: AgentManager;
    initManager: InitializationManager; // NEW

    /**
     * Plugin initialization - called when plugin is loaded
     */
    async onload() {
        console.log(`Loading ${PLUGIN_NAME}`);

        // Load settings
        await this.loadSettings();

        // Initialize core managers (without full initialization)
        await this.createManagers();

        // Create initialization manager
        this.initManager = new InitializationManager(this);

        // Add ribbon icon
        this.addRibbonIcon('bot', 'RAG Agent Manager', () => {
            this.openAgentPalette();
        });

        // Add settings tab
        this.addSettingTab(new RiskManagementSettingTab(this.app, this));

        // Register commands
        this.registerCommands();

        // Expose public API
        exposePublicAPI(this);

        console.log(`${PLUGIN_NAME} loaded successfully`);
        new Notice(`${PLUGIN_NAME} loaded! Check settings for initialization status.`, 4000);
    }

    /**
     * Plugin cleanup - called when plugin is disabled
     */
    async onunload() {
        console.log(`Unloading ${PLUGIN_NAME}`);

        // Cleanup managers
        if (this.agentManager) {
            this.agentManager.cleanup();
        }

        if (this.llmManager) {
            this.llmManager.cleanup();
        }

        if (this.retriever) {
            await this.retriever.cleanup();
        }

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

        // Ensure agents array exists
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
     * Create managers without full initialization
     * Actual initialization happens via InitializationManager
     */
    async createManagers() {
        try {
            // Create KeyManager (always available)
            this.keyManager = new KeyManager(this.app);
            console.log('✓ KeyManager created');

            // Create RAGRetriever (not initialized yet)
            this.retriever = new RAGRetriever(this);
            console.log('✓ RAGRetriever created');

            // Create LLMManager (not initialized yet)
            this.llmManager = new LLMManager(this);
            console.log('✓ LLMManager created');

            // Create AgentManager (not initialized yet)
            this.agentManager = new AgentManager(this, this.retriever, this.llmManager);
            console.log('✓ AgentManager created');

            console.log('All managers created (use initialization buttons in settings to initialize)');
        } catch (error) {
            console.error('Error creating managers:', error);
            new Notice('Error creating plugin components. Check console for details.');
        }
    }

    /**
     * Ensure system is initialized before operation
     */
    private async ensureInitialized(): Promise<boolean> {
        if (this.initManager.isFullyInitialized()) {
            return true;
        }

        // Ask user if they want to initialize
        return new Promise(resolve => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('⚠️ System Not Initialized');

            const content = modal.contentEl.createDiv();
            content.style.padding = '20px';
            content.createDiv({
                text: 'The plugin systems need to be initialized before this operation.',
                cls: 'message'
            }).style.marginBottom = '15px';

            const missing = this.initManager.getMissingPrerequisites();
            if (missing.length > 0) {
                content.createDiv({
                    text: 'Missing requirements:',
                    cls: 'message'
                }).style.fontWeight = '500';

                const list = content.createEl('ul');
                list.style.marginLeft = '20px';
                missing.forEach(req => {
                    list.createEl('li', { text: req });
                });

                content.createDiv({
                    text: 'Please complete setup in Settings first.',
                    cls: 'message'
                }).style.marginTop = '15px';
            } else {
                content.createDiv({
                    text: 'Would you like to initialize now?',
                    cls: 'message'
                });
            }

            const btnContainer = modal.contentEl.createDiv();
            btnContainer.style.marginTop = '20px';
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '10px';
            btnContainer.style.justifyContent = 'flex-end';

            if (missing.length === 0) {
                const initBtn = btnContainer.createEl('button', { text: 'Initialize Now' });
                initBtn.style.backgroundColor = 'var(--interactive-accent)';
                initBtn.style.color = 'white';
                initBtn.onclick = async () => {
                    modal.close();
                    new Notice('Initializing systems...');

                    const result = await this.initManager.initializeAll();
                    resolve(result.success);
                };
            }

            const settingsBtn = btnContainer.createEl('button', { text: 'Open Settings' });
            settingsBtn.onclick = () => {
                modal.close();
                // @ts-ignore
                this.app.setting.open();
                // @ts-ignore
                this.app.setting.openTabById(this.manifest.id);
                resolve(false);
            };

            const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
            cancelBtn.onclick = () => {
                modal.close();
                resolve(false);
            };

            modal.open();
        });
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
                // @ts-ignore
                this.app.setting.open();
                // @ts-ignore
                this.app.setting.openTabById(this.manifest.id);
            },
        });

        // ========== Agent Commands ==========

        // Command: Open Agent Palette
        this.addCommand({
            id: 'open-agent-palette',
            name: 'Open Agent Palette',
            callback: async () => {
                if (await this.ensureInitialized()) {
                    this.openAgentPalette();
                }
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
                if (!await this.ensureInitialized()) return;

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
                if (!await this.ensureInitialized()) return;

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
                if (!this.retriever?.isReady()) {
                    new Notice('RAG system not ready. Initialize it in settings first.');
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

        // ========== LLM Commands ==========

        // Command: Test LLM providers
        this.addCommand({
            id: 'test-llm-providers',
            name: 'Test All LLM Providers',
            callback: async () => {
                if (!this.llmManager?.isReady()) {
                    new Notice('LLM system not ready. Initialize it in settings first.');
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

        // Command: Initialize All Systems
        this.addCommand({
            id: 'initialize-all-systems',
            name: 'Initialize All Systems',
            callback: async () => {
                new Notice('🔄 Initializing all systems...');
                const result = await this.initManager.initializeAll();

                if (result.success) {
                    new Notice('✅ All systems initialized!');
                } else {
                    new Notice(`❌ Initialization failed: ${result.errors.join(', ')}`);
                }
            },
        });
    }

    // ========================================================================
    // Agent Helper Methods
    // ========================================================================

    /**
     * Open agent palette for selecting and executing agents
     */
    private async openAgentPalette() {
        if (!this.agentManager || !this.agentManager.isReady()) {
            new Notice('Agent system not ready. Please initialize in settings first.');
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText('Select an Agent');

        const agents = this.agentManager.listAgents();

        if (agents.length === 0) {
            const emptyDiv = modal.contentEl.createDiv({ cls: 'empty-state' });
            emptyDiv.style.padding = '40px';
            emptyDiv.style.textAlign = 'center';

            emptyDiv.createDiv({ text: '🤖' }).style.fontSize = '48px';
            emptyDiv.createDiv({ text: 'No agents configured' }).style.marginTop = '10px';
            emptyDiv.createDiv({ text: 'Create one in settings to get started' });

            const btn = modal.contentEl.createEl('button', { text: 'Create Agent' });
            btn.style.marginTop = '20px';
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
                };

                card.onmouseout = () => {
                    card.style.backgroundColor = '';
                };

                card.onclick = async () => {
                    modal.close();
                    await this.executeAgentWithPrompt(agent.id);
                };

                card.createEl('h3', { text: agent.name }).style.margin = '0 0 5px 0';
                card.createDiv({ text: agent.description }).style.color = 'var(--text-muted)';
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
        modal.modalEl.style.width = '80%';
        modal.modalEl.style.maxWidth = '900px';

        const contentDiv = modal.contentEl.createDiv();
        contentDiv.style.maxHeight = '60vh';
        contentDiv.style.overflowY = 'auto';
        contentDiv.style.padding = '10px';

        // Metadata
        const metaDiv = contentDiv.createDiv();
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
        const answerDiv = contentDiv.createDiv();
        answerDiv.style.whiteSpace = 'pre-wrap';
        answerDiv.style.lineHeight = '1.8';
        answerDiv.style.marginBottom = '20px';

        let formattedAnswer = response.answer
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        answerDiv.innerHTML = formattedAnswer;

        // Sources
        if (response.sources.length > 0) {
            const sourcesDiv = contentDiv.createDiv();
            sourcesDiv.style.marginTop = '20px';
            sourcesDiv.style.paddingTop = '15px';
            sourcesDiv.style.borderTop = '1px solid var(--background-modifier-border)';

            sourcesDiv.createEl('h4', { text: '📚 Sources' }).style.marginBottom = '10px';

            const sourcesList = sourcesDiv.createEl('ul');
            sourcesList.style.fontSize = '0.85em';
            sourcesList.style.color = 'var(--text-muted)';

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
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(response.answer);
            new Notice('Response copied to clipboard');
        };

        modal.open();
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    getAgentConfig(agentId: string): AgentConfig | null {
        return this.settings.agents.find(a => a.id === agentId) || null;
    }

    getLLMConfig(llmId: string) {
        return this.settings.llmConfigs.find(c => c.id === llmId);
    }

    generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
