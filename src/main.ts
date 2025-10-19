/**
 * Risk Management RAG Assistant - Main Plugin File
 *
 * Complete implementation including Phase 5: Agent System
 */

import { Plugin, Notice, Modal, App } from 'obsidian';
import { PluginSettings, Message } from './types';
import { DEFAULT_SETTINGS, mergeSettings, validateSettings } from './settings';
import { PLUGIN_NAME } from './constants';

// Import modules
import { KeyManager } from './encryption/keyManager';
import { MnemosyneSettingTab } from './ui/settingsTab';
import { RAGRetriever } from './rag/retriever';
import { LLMManager } from './llm/llmManager';
import { InitializationManager } from './utils/initializationManager';

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
    agentManager: AgentManager;
    initManager: InitializationManager;

    /**
     * Plugin initialization - called when plugin is loaded
     */
    async onload() {
        console.log(`Loading ${PLUGIN_NAME}`);

        // Load settings
        await this.loadSettings();

        // Initialize core managers
        await this.initializeManagers();

        // Create initialization manager
        this.initManager = new InitializationManager(this);

        // Add ribbon icon with custom Mnemosyne SVG
        const ribbonIcon = this.addRibbonIcon('brain', 'Mnemosyne - AI Knowledge Assistant', () => {
            this.openAgentPalette();
        });
        
        // Set custom SVG icon (24px version for ribbon)
        ribbonIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" style="display: block; margin: auto;">
                <path d="M11.26,21.27c-.06.53-.07,1.05-.09,1.58,0,.19-.11.4,0,.61.31,0,1.56.22,1.63-.16l-.12-2.03c7.21-.36,11.9-8.19,8.83-14.76C18.28-.59,8.43-1.65,3.69,4.52c-5.08,6.5-.63,16.3,7.57,16.76ZM12.02,15.27c-.07.02-.08-.04-.11-.08-.28-.41-.62-.77-1-1.09-4.09-3.02,1.61-7.16,3.5-3.01.56,2-1.53,2.77-2.39,4.18ZM11.1,1.44c12.6-1.17,14.08,18.19,1.44,18.82v-3.07l2.61.03c.26-.09.24-.8.07-.99h-2.59c1.28-1.95,3.63-2.91,2.75-5.77,1.64.93,2.54,3.03,2.63,4.85.08.14.81.14.89-.03.08-.19.02-.28,0-.45-.14-2.95-2.23-5.3-4.99-6.18,1.57-.76,2.59-2.44,2.43-4.21.01-.77-.88-.36-1.32-.25.88,4.63-6.43,5.13-6.14.43.02-.2.18-.36-.03-.47-.18-.09-.96-.23-1.09-.1-.04.04-.09.24-.1.31-.23,1.67.8,3.47,2.25,4.22.05.04.08.07.07.14-2.55.61-4.7,3.17-4.9,5.79-.01.14-.03.67,0,.77.05.15.89.26.95-.13-.03-1.83.98-3.69,2.52-4.69-.37,1.13-.12,2.3.58,3.25.66.93,1.73,1.48,2.17,2.52h-2.54c-.25,0-.17.79-.11.96h2.75v3.07C-.01,19.84-.41,2.38,11.1,1.44Z" fill="currentColor"/>
                <path d="M11.75,10.61c-2.02.59-.41,3.49,1.11,1.98.7-.85-.01-2.17-1.11-1.98Z"/>
            </svg>
        `;

        // Add settings tab
        this.addSettingTab(new MnemosyneSettingTab(this.app, this));

        // Register commands
        this.registerCommands();

        // Phase 5: Expose public API
        exposePublicAPI(this);

        // Show welcome notice on first load
        if (!this.settings.agents || this.settings.agents.length === 0) {
            new Notice(
                `${PLUGIN_NAME} loaded!\nOpen settings to configure your first agent.`,
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
                } catch {
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
     * Generate unique ID
     */
    generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
                // @ts-expect-error - Obsidian internal API
                this.app.setting.open();
                // @ts-expect-error - Obsidian internal API
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

                const defaultAgent = this.agentManager.getDefaultAgent();
                if (!defaultAgent) {
                    new Notice('No default agent configured');
                    return;
                }

                // Show input modal
                this.showAgentQueryModal(defaultAgent.getConfig().id);
            },
        });

        // ========== Phase 3: RAG Commands ==========

        // Command: Test RAG retrieval
        this.addCommand({
            id: 'test-rag',
            name: 'Test RAG Retrieval',
            callback: async () => {
                if (!this.retriever.isReady()) {
                    new Notice('RAG system not ready. Please configure an OpenAI provider and ingest chunks.');
                    return;
                }

                new Notice('Testing RAG system...');

                try {
                    const result = await this.retriever.test();
                    if (result) {
                        new Notice('✓ RAG system working correctly!');
                    } else {
                        new Notice('✗ RAG test failed. Check console.');
                    }
                } catch (error) {
                    console.error('RAG test error:', error);
                    new Notice('✗ RAG test failed. Check console.');
                }
            },
        });

        // Command: Show RAG stats
        this.addCommand({
            id: 'rag-stats',
            name: 'Show RAG Statistics',
            callback: () => {
                const stats = this.retriever.getStats();

                if (!stats) {
                    new Notice('No RAG statistics available');
                    return;
                }

                new Notice(
                    `RAG Stats:\n` +
                    `Total Chunks: ${stats.totalChunks}\n` +
                    `Embedding Model: ${stats.embeddingModel}\n` +
                    `Dimension: ${stats.dimension}`,
                    10000
                );
            },
        });

        // ========== Phase 4: LLM Commands ==========

        // Command: Test all LLM providers
        this.addCommand({
            id: 'test-llm',
            name: 'Test All LLM Providers',
            callback: async () => {
                if (!this.llmManager || !this.llmManager.isReady()) {
                    new Notice('LLM system not ready. Set master password and configure providers.');
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

        const agents = this.agentManager.listAgents();

        if (agents.length === 0) {
            new Notice('No agents available. Create one in settings first.');
            return;
        }

        // Show agent selection modal
        const modal = new AgentSelectorModal(this.app, agents, (agentId) => {
            this.showAgentQueryModal(agentId);
        });
        modal.open();
    }

    /**
     * Show modal to query an agent
     */
    private showAgentQueryModal(agentId: string) {
        const modal = new AgentQueryModal(this.app, this, agentId);
        modal.open();
    }

    /**
     * Get LLM config by ID (helper)
     */
    private getLLMConfig(id: string) {
        return this.settings.llmConfigs.find(c => c.id === id);
    }
}

// ============================================================================
// Modal Classes
// ============================================================================

/**
 * Agent Selector Modal
 */
class AgentSelectorModal extends Modal {
    private agents: Array<{ id: string; name: string; description: string }>;
    private onSelect: (agentId: string) => void;

    constructor(
        app: App,
        agents: Array<{ id: string; name: string; description: string }>,
        onSelect: (agentId: string) => void
    ) {
        super(app);
        this.agents = agents;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: '🤖 Select Agent' });

        this.agents.forEach(agent => {
            const agentDiv = contentEl.createDiv({ cls: 'agent-selector-item' });
            agentDiv.style.padding = '15px';
            agentDiv.style.marginBottom = '10px';
            agentDiv.style.border = '1px solid var(--background-modifier-border)';
            agentDiv.style.borderRadius = '6px';
            agentDiv.style.cursor = 'pointer';

            agentDiv.addEventListener('click', () => {
                this.close();
                this.onSelect(agent.id);
            });

            agentDiv.addEventListener('mouseenter', () => {
                agentDiv.style.backgroundColor = 'var(--background-modifier-hover)';
            });

            agentDiv.addEventListener('mouseleave', () => {
                agentDiv.style.backgroundColor = '';
            });

            const name = agentDiv.createEl('h3', { text: agent.name });
            name.style.marginTop = '0';
            name.style.marginBottom = '5px';

            agentDiv.createEl('p', { text: agent.description });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Agent Query Modal
 */
class AgentQueryModal extends Modal {
    private plugin: RiskManagementPlugin;
    private agentId: string;

    constructor(app: App, plugin: RiskManagementPlugin, agentId: string) {
        super(app);
        this.plugin = plugin;
        this.agentId = agentId;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        const agent = this.plugin.agentManager.getAgent(this.agentId);
        if (!agent) {
            new Notice('Agent not found');
            this.close();
            return;
        }

        contentEl.createEl('h2', { text: `💬 Ask ${agent.getConfig().name}` });

        // Query input
        const inputDiv = contentEl.createDiv();
        inputDiv.style.marginBottom = '15px';

        const textarea = inputDiv.createEl('textarea');
        textarea.placeholder = 'Enter your question...';
        textarea.style.width = '100%';
        textarea.style.minHeight = '100px';
        textarea.style.padding = '10px';
        textarea.style.fontFamily = 'inherit';
        textarea.style.fontSize = '14px';

        // Buttons
        const buttonDiv = contentEl.createDiv();
        buttonDiv.style.display = 'flex';
        buttonDiv.style.gap = '10px';

        const submitBtn = buttonDiv.createEl('button', { text: 'Ask' });
        submitBtn.style.padding = '10px 20px';
        submitBtn.style.cursor = 'pointer';

        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        cancelBtn.style.padding = '10px 20px';
        cancelBtn.style.cursor = 'pointer';

        // Response area
        const responseDiv = contentEl.createDiv();
        responseDiv.style.marginTop = '20px';
        responseDiv.style.display = 'none';

        submitBtn.addEventListener('click', async () => {
            const query = textarea.value.trim();
            if (!query) {
                new Notice('Please enter a question');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Thinking...';

            try {
                const response = await this.plugin.agentManager.executeAgent(this.agentId, query);

                responseDiv.style.display = 'block';
                responseDiv.empty();

                responseDiv.createEl('h3', { text: '📝 Response' });
                const answerDiv = responseDiv.createDiv();
                answerDiv.style.padding = '15px';
                answerDiv.style.backgroundColor = 'var(--background-secondary)';
                answerDiv.style.borderRadius = '6px';
                answerDiv.style.whiteSpace = 'pre-wrap';
                answerDiv.textContent = response.answer;

                // Show sources if any
                if (response.sources && response.sources.length > 0) {
                    responseDiv.createEl('h4', { text: '📚 Sources' });
                    const sourcesList = responseDiv.createEl('ul');
                    response.sources.forEach(source => {
                        const li = sourcesList.createEl('li');
                        li.textContent = `${source.documentTitle} - ${source.section}`;
                    });
                }

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                new Notice(`Error: ${errorMessage}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Ask';
            }
        });

        cancelBtn.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
