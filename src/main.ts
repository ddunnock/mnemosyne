/**
 * Risk Management RAG Assistant - Main Plugin File
 *
 * Complete implementation including Phase 5: Agent System
 */

import { Plugin, Notice, Modal, App } from 'obsidian';
import { PluginSettings, Message } from './types';
import { mergeSettings, validateSettings, DEFAULT_SETTINGS, ensureMnemosyneAgent, ensureDefaultLlmProvider } from './settings';
import { PLUGIN_NAME } from './constants';
import './styles.css';
import { AgentChatSidebar } from './ui/sidebar/AgentChatSidebar';
import { AgentChatView, VIEW_TYPE_AGENT_CHAT } from './views/AgentChatView';
import { SvelteChatView, VIEW_TYPE_SVELTE_CHAT } from './views/SvelteChatView';
import { CleanChatView, VIEW_TYPE_CLEAN_CHAT } from './views/CleanChatView';
import { TailwindChatView, VIEW_TYPE_TAILWIND_CHAT } from './views/TailwindChatView';

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

// Auto Ingestion imports
import { AutoIngestionManager } from './rag/AutoIngestionManager';
import { VaultIngestor } from './rag/VaultIngestor';

export default class RiskManagementPlugin extends Plugin {
    settings: PluginSettings;

    // Core managers
    keyManager: KeyManager;
    retriever: RAGRetriever;
    llmManager: LLMManager;
    agentManager: AgentManager;
    initManager: InitializationManager;
    
    // Auto Ingestion components
    vaultIngestor: VaultIngestor;
    autoIngestionManager: AutoIngestionManager;
    
    // Settings controller (for modern UI)
    settingsController: any; // Will be set by settings tab
    
    // Session cache for password persistence
    private sessionPasswordCache: string | null = null;
    
    // Sidebar chat
    chatSidebar: AgentChatSidebar | null = null;

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
        const ribbonIcon = this.addRibbonIcon('brain', 'Mnemosyne - AI Knowledge Assistant', async () => {
            await this.openTailwindChatView();
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
        
        // Register views
        this.registerViews();

        // Phase 5: Expose public API
        exposePublicAPI(this);

        // Show welcome notice
        const mnemosyneAgent = this.settings.agents.find(a => a.id === 'mnemosyne-agent-permanent');
        if (mnemosyneAgent && this.settings.agents.length === 1) {
            new Notice(
                `${PLUGIN_NAME} loaded!\nThe Mnemosyne Agent is ready. Configure AI providers in settings to get started.`,
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

        // Stop auto ingestion
        if (this.autoIngestionManager) {
            this.autoIngestionManager.stop();
            console.log('✓ Auto Ingestion Manager stopped');
        }

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
        
        // Ensure we have default LLM provider and permanent Mnemosyne Agent
        ensureDefaultLlmProvider(this.settings);
        ensureMnemosyneAgent(this.settings);
        
        // Save settings if the Mnemosyne agent was added
        if (this.settings.agents.length > 0 && this.settings.agents[0].id === 'mnemosyne-agent-permanent') {
            await this.saveSettings();
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

            // Always initialize Agent Manager, even if dependencies aren't ready
            // It will handle the dependency checks internally
            try {
                await this.agentManager.initialize();
                console.log('✓ Agent Manager initialized');
            } catch (error) {
                console.warn('Agent Manager initialization incomplete:', error);
            }

            // Initialize Auto Ingestion System
            this.vaultIngestor = new VaultIngestor(this);
            this.autoIngestionManager = new AutoIngestionManager(
                this.app.vault, 
                this.vaultIngestor, 
                this.settings
            );
            
            // Start auto ingestion if enabled and RAG system is ready
            if (this.settings.autoIngestion.enabled && this.retriever.isReady()) {
                try {
                    this.autoIngestionManager.start();
                    console.log('✓ Auto Ingestion Manager started');
                } catch (error) {
                    console.warn('Auto Ingestion Manager failed to start:', error);
                }
            } else {
                console.log('⚠ Auto ingestion disabled or RAG system not ready');
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
     * Ensure master password is available for this session
     * Uses session cache to avoid repeated prompts
     */
    private async ensureMasterPasswordSession(): Promise<boolean> {
        // If password is already in KeyManager, we're good
        if (this.keyManager.hasMasterPassword()) {
            return true;
        }

        // If we have a cached password from this session, use it
        if (this.sessionPasswordCache) {
            try {
                this.keyManager.setMasterPassword(this.sessionPasswordCache);
                console.log('✓ Restored master password from session cache');
                return true;
            } catch (error) {
                console.warn('Failed to restore cached password:', error);
                this.sessionPasswordCache = null; // Clear invalid cache
            }
        }

        // If no password is set in settings, return false
        if (!this.settings.masterPassword?.isSet) {
            return false;
        }

        // Prompt user for password and cache it for this session
        if (this.settingsController) {
            const passwordLoaded = await this.settingsController.ensureMasterPasswordLoaded();
            if (passwordLoaded) {
                // Cache the password for this session (we can't get it back from KeyManager for security)
                // The password will be available in KeyManager for the rest of this session
                console.log('✓ Master password loaded and cached for session');
                return true;
            }
        }

        return false;
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
            callback: async () => {
                await this.openAgentPalette();
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

    /**
     * Register views
     */
    registerViews() {
        // Register the Tailwind chat view
        this.registerView(VIEW_TYPE_TAILWIND_CHAT, (leaf) => {
            return new TailwindChatView(leaf, this);
        });
    }

    // ========================================================================
    // Phase 5: Agent Helper Methods
    // ========================================================================

    /**
     * Open agent palette for selecting and executing agents
     */
    private async openAgentPalette() {
        // Get comprehensive system status
        const status = this.getSystemStatus();
        
        if (!status.ready) {
            console.log('System status check:', status);
            
            // Try to reinitialize if some components are missing
            if (!this.agentManager) {
                new Notice('Agent system not initialized. Please restart the plugin or check settings.');
                return;
            }

            // Try to reinitialize the LLM Manager if it's not ready
            if (this.llmManager && !this.llmManager.isReady()) {
                // Only prompt for password if it's truly not set in settings
                if (!this.settings.masterPassword?.isSet) {
                    new Notice('Master password not set. Please configure it in Security settings.');
                    return;
                }
                
                // Use the new session management approach
                const passwordAvailable = await this.ensureMasterPasswordSession();
                if (!passwordAvailable) {
                    new Notice('Master password is required to continue. Please configure it in Security settings.');
                    return;
                }
                
                try {
                    console.log('Attempting to reinitialize LLM Manager...');
                    await this.llmManager.initialize();
                    console.log('LLM Manager reinitialized successfully');
                } catch (error) {
                    console.error('Failed to reinitialize LLM Manager:', error);
                }
            }

            // Try to reinitialize the RAG Retriever if it's not ready
            if (this.retriever && !this.retriever.isReady()) {
                try {
                    console.log('Attempting to reinitialize RAG Retriever...');
                    await this.retriever.initialize();
                    console.log('RAG Retriever reinitialized successfully');
                } catch (error) {
                    console.error('Failed to reinitialize RAG Retriever:', error);
                }
            }

            // Check dependencies again after reinitialization attempts
            const llmReady = this.llmManager && this.llmManager.isReady();
            const ragReady = this.retriever && this.retriever.isReady();
            
            if (llmReady && ragReady) {
                try {
                    await this.agentManager.initialize();
                    console.log('Agent Manager reinitialized successfully');
                    
                    // Check again after reinitialization
                    const newStatus = this.getSystemStatus();
                    if (!newStatus.ready) {
                        new Notice(`System issues: ${newStatus.issues.join(', ')}`);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to reinitialize Agent Manager:', error);
                    new Notice('Failed to initialize agent system. Please check your settings and try again.');
                    return;
                }
            } else {
                // Show specific error message
                const primaryIssue = status.issues[0];
                new Notice(primaryIssue);
                return;
            }
        }

        const agents = this.agentManager.listAgents();

        if (agents.length === 0) {
            new Notice('No agents available. Create one in settings first.');
            return;
        }

        // Open Tailwind chat view in sidebar
        this.openTailwindChatView();
    }

    /**
     * Open Tailwind chat view
     */
    private async openTailwindChatView(): Promise<void> {
        // Ensure master password is available for chat functionality
        if (this.settings.masterPassword?.isSet && !this.keyManager.hasMasterPassword()) {
            const passwordAvailable = await this.ensureMasterPasswordSession();
            if (!passwordAvailable) {
                new Notice('Master password is required to use chat. Please configure it in Security settings.');
                return;
            }
        }

        // Check if chat view is already open
        const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TAILWIND_CHAT);
        if (existingLeaves.length > 0) {
            // Focus existing view
            this.app.workspace.revealLeaf(existingLeaves[0]);
            return;
        }

        // Create new leaf in right sidebar
        const leaf = this.app.workspace.getRightLeaf(false);
        if (!leaf) {
            new Notice('Could not create chat view. Please try again.');
            return;
        }
        await leaf.setViewState({ type: VIEW_TYPE_TAILWIND_CHAT, active: true });
        this.app.workspace.revealLeaf(leaf);
    }

    /**
     * Open agent chat sidebar (legacy method - keeping for reference)
     */
    private openAgentChatSidebar(): void {
        // Check if sidebar is already open
        if (this.chatSidebar) {
            // Focus existing sidebar
            const sidebar = document.querySelector('.agent-chat-sidebar');
            if (sidebar) {
                sidebar.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }

        // Create new sidebar
        this.chatSidebar = new AgentChatSidebar(
            this,
            (agentId: string) => this.handleAgentChange(agentId),
            (message: string) => this.handleSendMessage(message)
        );

        // Create a proper sidebar container that pushes content
        const container = document.createElement('div');
        container.className = 'agent-chat-sidebar-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 350px;
            height: 100vh;
            background: var(--background-primary);
            border-left: 1px solid var(--background-modifier-border);
            z-index: 1000;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        `;
        
        // Add to body
        document.body.appendChild(container);
        
        // Render sidebar
        this.chatSidebar.render(container);
        
        // Update agents list
        const agents = this.agentManager.listAgents();
        this.chatSidebar.updateAgents(agents);
        
        // Add a backdrop to close the sidebar
        const backdrop = document.createElement('div');
        backdrop.className = 'agent-chat-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999;
        `;
        document.body.appendChild(backdrop);
        
        // Close on backdrop click
        backdrop.addEventListener('click', () => {
            this.closeAgentChatSidebar();
        });
    }

    /**
     * Handle agent change in sidebar
     */
    private handleAgentChange(agentId: string): void {
        console.log('Agent changed to:', agentId);
        // Could add agent-specific initialization here
    }

    /**
     * Handle send message in sidebar
     */
    private async handleSendMessage(message: string): Promise<void> {
        if (!this.chatSidebar || !this.chatSidebar.state.selectedAgentId) return;

        try {
            // Show typing indicator
            this.chatSidebar.setTyping(true);

            // Execute agent
            const response = await this.agentManager.executeAgent(
                this.chatSidebar.state.selectedAgentId,
                message
            );

            // Hide typing indicator
            this.chatSidebar.setTyping(false);

            // Add agent response
            const sources = response.sources.map(source => ({
                documentTitle: source.document_title,
                section: source.section
            }));
            this.chatSidebar.addAgentMessage(response.answer, sources);

        } catch (error: unknown) {
            // Hide typing indicator
            this.chatSidebar.setTyping(false);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.chatSidebar.addAgentMessage(`❌ Error: ${errorMessage}`);
        }
    }

    /**
     * Close agent chat sidebar
     */
    private closeAgentChatSidebar(): void {
        const sidebarContainer = document.querySelector('.agent-chat-sidebar-container');
        const backdrop = document.querySelector('.agent-chat-backdrop');
        
        if (sidebarContainer) {
            sidebarContainer.remove();
        }
        if (backdrop) {
            backdrop.remove();
        }
        
        this.chatSidebar = null;
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

    /**
     * Prompt for master password when session is lost
     */
    private async promptForMasterPassword(): Promise<boolean> {
        return new Promise((resolve) => {
            // Import MasterPasswordModal dynamically to avoid circular imports
            import('./ui/modals/MasterPasswordModal').then(({ MasterPasswordModal }) => {
                const modal = new MasterPasswordModal(this.app, this.keyManager, {
                    mode: 'verify',
                    title: 'Master Password Required',
                    description: 'Your master password session has expired. Please enter your password to continue.',
                    existingVerificationData: this.settings.masterPassword?.verificationData,
                    onSuccess: async (password: string) => {
                        // Password verified successfully
                        resolve(true);
                    },
                    onCancel: () => {
                        resolve(false);
                    }
                });
                
                modal.open();
            }).catch(() => {
                // Fallback if modal can't be loaded
                resolve(false);
            });
        });
    }

    /**
     * Check system status and provide diagnostic information
     */
    private getSystemStatus(): { ready: boolean; issues: string[] } {
        const issues: string[] = [];
        let ready = true;

        // Check master password first - check both session and settings
        const hasPasswordInSession = this.keyManager.hasMasterPassword();
        const hasPasswordInSettings = this.settings.masterPassword?.isSet || false;
        
        if (!hasPasswordInSession && !hasPasswordInSettings) {
            issues.push('Master password not set (set master password in Security settings)');
            ready = false;
        } else if (!hasPasswordInSession && hasPasswordInSettings) {
            issues.push('Master password session expired (re-enter password in Security settings)');
            ready = false;
        }

        // Check LLM Manager
        if (!this.llmManager) {
            issues.push('LLM Manager not initialized');
            ready = false;
        } else if (!this.llmManager.isReady()) {
            // Check if any providers are configured
            const hasConfiguredProviders = this.settings.llmConfigs && this.settings.llmConfigs.length > 0;
            const hasEnabledProviders = this.settings.llmConfigs && this.settings.llmConfigs.some(config => config.enabled);
            
            if (!hasConfiguredProviders) {
                issues.push('No AI providers configured (add AI providers in settings)');
            } else if (!hasEnabledProviders) {
                issues.push('No enabled AI providers (enable at least one AI provider in settings)');
            } else {
                issues.push('LLM Manager not ready (check master password and AI provider configuration)');
            }
            ready = false;
        }

        // Check RAG Retriever
        if (!this.retriever) {
            issues.push('RAG Retriever not initialized');
            ready = false;
        } else if (!this.retriever.isReady()) {
            issues.push('RAG Retriever not ready (check embeddings configuration)');
            ready = false;
        } else {
            // Check if vector store has data
            const stats = this.retriever.getStats();
            if (!stats || stats.totalChunks === 0) {
                issues.push('Vector store is empty. Run chunk ingestion to populate it.');
                ready = false;
            }
        }

        // Check Agent Manager
        if (!this.agentManager) {
            issues.push('Agent Manager not initialized');
            ready = false;
        } else if (!this.agentManager.isReady()) {
            issues.push('Agent Manager not ready (check dependencies above)');
            ready = false;
        } else {
            const agents = this.agentManager.listAgents();
            if (agents.length === 0) {
                issues.push('No agents available (create agents in settings)');
                ready = false;
            }
        }

        return { ready, issues };
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
        contentEl.addClass('agent-chat-modal');

        const agent = this.plugin.agentManager.getAgent(this.agentId);
        if (!agent) {
            new Notice('Agent not found');
            this.close();
            return;
        }

        // Check if Goddess Persona is enabled
        const personaEnabled = this.plugin.settings.persona?.enabled || false;
        const personaIntensity = this.plugin.settings.persona?.intensity || 'moderate';

        // Header with agent info and persona status
        const header = contentEl.createDiv({ cls: 'chat-header' });
        const agentName = agent.getConfig().name;
        const title = personaEnabled ? `🏛️ ${agentName} (Divine Mode)` : `💬 ${agentName}`;
        header.createEl('h2', { text: title });

        if (personaEnabled) {
            const personaInfo = header.createDiv({ cls: 'persona-info' });
            personaInfo.innerHTML = `
                <div class="persona-badge">
                    <span class="persona-icon">🏛️</span>
                    <span class="persona-text">Goddess Persona: ${personaIntensity}</span>
                </div>
            `;
        }

        // Chat container
        const chatContainer = contentEl.createDiv({ cls: 'chat-container' });
        
        // Messages area
        const messagesArea = chatContainer.createDiv({ cls: 'messages-area' });
        messagesArea.innerHTML = `
            <div class="welcome-message">
                <div class="message-content">
                    ${personaEnabled ? 
                        `Greetings, mortal. I am ${agentName}, and through my divine connection to Mnemosyne, goddess of memory, I am here to assist you with wisdom from the ages. What knowledge do you seek?` :
                        `Hello! I'm ${agentName}. How can I help you today?`
                    }
                </div>
            </div>
        `;

        // Input area
        const inputArea = chatContainer.createDiv({ cls: 'input-area' });
        
        // Input container
        const inputContainer = inputArea.createDiv({ cls: 'input-container' });
        
        const textarea = inputContainer.createEl('textarea', {
            placeholder: personaEnabled ? 'Ask the goddess for divine wisdom...' : 'Enter your question...',
            cls: 'message-input'
        });
        textarea.style.resize = 'none';

        // Send button
        const sendBtn = inputContainer.createEl('button', { 
            text: personaEnabled ? '🔮 Seek Wisdom' : 'Send',
            cls: 'send-button'
        });

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });

        // Send message function
        const sendMessage = async () => {
            const query = textarea.value.trim();
            if (!query) return;

            // Add user message to chat
            const userMessage = messagesArea.createDiv({ cls: 'message user-message' });
            userMessage.innerHTML = `
                <div class="message-content">${query}</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;

            // Clear input and disable send button
            textarea.value = '';
            textarea.style.height = 'auto';
            sendBtn.disabled = true;
            sendBtn.textContent = personaEnabled ? '🔮 Channeling...' : 'Thinking...';

            // Add agent thinking indicator
            const thinkingMessage = messagesArea.createDiv({ cls: 'message agent-message thinking' });
            thinkingMessage.innerHTML = `
                <div class="message-content">
                    <div class="thinking-dots">
                        <span></span><span></span><span></span>
                    </div>
                    ${personaEnabled ? 'The goddess is channeling divine wisdom...' : 'Processing your request...'}
                </div>
            `;

            // Scroll to bottom
            messagesArea.scrollTop = messagesArea.scrollHeight;

            try {
                const response = await this.plugin.agentManager.executeAgent(this.agentId, query);

                // Remove thinking indicator
                thinkingMessage.remove();

                // Add agent response
                const agentMessage = messagesArea.createDiv({ cls: 'message agent-message' });
                agentMessage.innerHTML = `
                    <div class="message-content">${response.answer}</div>
                    <div class="message-time">${new Date().toLocaleTimeString()}</div>
                `;

                // Show sources if any
                if (response.sources && response.sources.length > 0) {
                    const sourcesDiv = agentMessage.createDiv({ cls: 'sources' });
                    sourcesDiv.innerHTML = `
                        <div class="sources-header">📚 Sources:</div>
                        <ul class="sources-list">
                            ${response.sources.map(source => 
                                `<li>${source.documentTitle} - ${source.section}</li>`
                            ).join('')}
                        </ul>
                    `;
                }

            } catch (error: unknown) {
                // Remove thinking indicator
                thinkingMessage.remove();
                
                const errorMessage = messagesArea.createDiv({ cls: 'message error-message' });
                errorMessage.innerHTML = `
                    <div class="message-content">
                        ❌ ${personaEnabled ? 'The divine connection was interrupted...' : 'An error occurred:'} 
                        ${error instanceof Error ? error.message : String(error)}
                    </div>
                `;
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = personaEnabled ? '🔮 Seek Wisdom' : 'Send';
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        };

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Focus input
        textarea.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
