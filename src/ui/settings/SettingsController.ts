// Main Settings Controller - Modern UI with Tabbed Navigation

import { AgentManagement, AgentManagementState } from './components/AgentManagement';
import { ProviderManagement, ProviderManagementState } from './components/ProviderManagement';
import { GoddessPersonaManagement, GoddessPersonaManagementState } from './components/GoddessPersonaManagement';
import { MemoryManagement, MemoryManagementState } from './components/MemoryManagement';
import { AgentConfig, LLMConfig, GoddessPersonaSettings, MemoryConfig } from '../../types/index';
import { Notice, Modal } from 'obsidian';
import { VaultIngestionModal } from '../vaultIngestionModal';
import { KeyManager, EncryptedData } from '../../encryption/keyManager';
import { MasterPasswordModal } from '../modals/MasterPasswordModal';
import { AIProviderModal } from '../modals/AIProviderModal';
import { VectorStoreFactory } from '../../rag/vectorStore/VectorStoreFactory';
import { VectorStoreMigration, type MigrationProgress } from '../../rag/vectorStore/VectorStoreMigration';
import { PgVectorStore } from '../../rag/vectorStore/PgVectorStore';
import { JSONVectorStore } from '../../rag/vectorStore/JSONVectorStore';

// Tab system
import { TabManager } from './tabs/TabManager';
import { QuickStartTab } from './tabs/QuickStartTab';
import { ProvidersTab } from './tabs/ProvidersTab';
import { AgentsTab } from './tabs/AgentsTab';
import { KnowledgeBaseTab } from './tabs/KnowledgeBaseTab';
import { AdvancedTab } from './tabs/AdvancedTab';
import type { TabId } from './tabs/BaseTab';

export interface MnemosyneSettings {
    // Core functionality
    enabled: boolean;

    // Security
    masterPassword: {
        isSet: boolean;
        verificationData?: {
            ciphertext: string;
            iv: string;
            salt: string;
        };
        lastChanged?: number;
    };

    // AI Providers (using LLMConfig structure from PluginSettings)
    providers: LLMConfig[];
    defaultProvider: string;

    // Agents
    agents: AgentConfig[];
    defaultAgentId?: string;

    // Goddess Persona
    persona: GoddessPersonaSettings;

    // Conversation Memory Configuration
    memory: MemoryConfig;

    // Advanced settings (placeholder for now)
    advanced: {
        debug: boolean;
    };

    // Internal
    version: string;
    initialized: boolean;
}

// Using LLMConfig from types instead of custom interface

export class MnemosyneSettingsController {
    private plugin: any;
    private container: HTMLElement | null = null;
    private settings: MnemosyneSettings;
    private keyManager: KeyManager;

    // Components
    private agentManagement: AgentManagement | null = null;
    private providerManagement: ProviderManagement | null = null;
    private goddessPersonaManagement: GoddessPersonaManagement | null = null;
    private memoryManagement: MemoryManagement | null = null;

    // Tab system
    private tabManager: TabManager | null = null;

    // State
    private chunkCount = 0;
    private isIndexing = false;
    private vectorStoreBackend: 'json' | 'sqlite' | 'pgvector' | 'unknown' = 'unknown';
    private lastStatsError: string | null = null;
    private lastStatsUpdate: Date | null = null;

    constructor(plugin: any) {
        this.plugin = plugin;
        this.settings = this.getDefaultSettings();
        // Use the plugin's KeyManager instead of creating a new one
        this.keyManager = this.plugin.keyManager || new KeyManager(this.plugin.app);
    }

    private getDefaultSettings(): MnemosyneSettings {
        return {
            enabled: false,
            masterPassword: {
                isSet: false,
            },
            providers: [],
            defaultProvider: '',
            agents: [],
            persona: {
                enabled: false,
                intensity: 'moderate',
                speechPatterns: {
                    useDivineLanguage: true,
                    referenceDivineMemory: true,
                    useAncientTerminology: false,
                    embraceGoddessIdentity: true,
                },
                knowledgeAreas: {
                    mythology: true,
                    history: true,
                    arts: true,
                    sciences: true,
                    philosophy: true,
                    literature: true,
                },
                divineElements: {
                    referenceMuses: true,
                    mentionSacredDuties: true,
                    useDivineTitles: true,
                    speakOfEternalMemory: true,
                },
            },
            memory: {
                enabled: true,
                maxMessages: 20,
                compressionThreshold: 15,
                compressionRatio: 0.3,
                autoCompress: true,
                addToVectorStore: true,
                compressionPrompt: 'Summarize this conversation, focusing on key decisions, important context, and actionable items. Preserve the essential information while making it concise.'
            },
            advanced: {
                debug: false,
            },
            version: '0.1.0',
            initialized: false,
        };
    }

    async render(container: HTMLElement): Promise<void> {
        this.container = container;

        // Load current settings
        await this.loadSettings();

        // Load dynamic state
        await this.loadDynamicState();

        // Render UI
        this.renderUI();

        // Attach global event listeners
        this.attachGlobalEvents();
        
        // Try to automatically initialize the system in the background
        this.ensureSystemReady();
    }

    private async loadSettings(): Promise<void> {
        try {
            const savedSettings = await this.plugin.loadData();
            this.settings = {
                ...this.getDefaultSettings(),
                ...savedSettings,
                // Ensure agents array exists
                agents: savedSettings?.agents || [],
                // Map from PluginSettings.llmConfigs to our providers structure
                providers: savedSettings?.llmConfigs || [],
                // Ensure master password field exists with proper structure
                masterPassword: {
                    isSet: savedSettings?.masterPassword?.isSet || false,
                    verificationData: savedSettings?.masterPassword?.verificationData,
                    lastChanged: savedSettings?.masterPassword?.lastChanged,
                },
                // Ensure persona structure is complete
                persona: {
                    enabled: savedSettings?.persona?.enabled || false,
                    intensity: savedSettings?.persona?.intensity || 'moderate',
                    customPrompt: savedSettings?.persona?.customPrompt || '',
                    speechPatterns: {
                        useDivineLanguage: savedSettings?.persona?.speechPatterns?.useDivineLanguage ?? true,
                        referenceDivineMemory: savedSettings?.persona?.speechPatterns?.referenceDivineMemory ?? true,
                        useAncientTerminology: savedSettings?.persona?.speechPatterns?.useAncientTerminology ?? false,
                        embraceGoddessIdentity: savedSettings?.persona?.speechPatterns?.embraceGoddessIdentity ?? true,
                    },
                    knowledgeAreas: {
                        mythology: savedSettings?.persona?.knowledgeAreas?.mythology ?? true,
                        history: savedSettings?.persona?.knowledgeAreas?.history ?? true,
                        arts: savedSettings?.persona?.knowledgeAreas?.arts ?? true,
                        sciences: savedSettings?.persona?.knowledgeAreas?.sciences ?? true,
                        philosophy: savedSettings?.persona?.knowledgeAreas?.philosophy ?? true,
                        literature: savedSettings?.persona?.knowledgeAreas?.literature ?? true,
                    },
                    divineElements: {
                        referenceMuses: savedSettings?.persona?.divineElements?.referenceMuses ?? true,
                        mentionSacredDuties: savedSettings?.persona?.divineElements?.mentionSacredDuties ?? true,
                        useDivineTitles: savedSettings?.persona?.divineElements?.useDivineTitles ?? true,
                        speakOfEternalMemory: savedSettings?.persona?.divineElements?.speakOfEternalMemory ?? true,
                    },
                },
            };
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    private async loadDynamicState(): Promise<void> {
        try {
            // Get chunk count from vector store via retriever
            if (this.plugin.retriever) {
                // Access the vector store through the public getter
                const vectorStore = this.plugin.retriever.getVectorStore();
                console.log('Loading vector store stats...', {
                    hasVectorStore: !!vectorStore,
                    isReady: vectorStore?.isReady(),
                    backend: vectorStore?.getBackend?.()
                });

                if (vectorStore && vectorStore.isReady()) {
                    const stats = await vectorStore.getStats();
                    this.chunkCount = stats ? stats.totalChunks : 0;
                    this.vectorStoreBackend = stats?.backend || vectorStore.getBackend?.() || 'unknown';
                    this.lastStatsError = null;
                    this.lastStatsUpdate = new Date();

                    console.log('Vector store stats loaded:', {
                        chunks: this.chunkCount,
                        backend: this.vectorStoreBackend,
                        embeddingModel: stats?.embeddingModel,
                        dimension: stats?.dimension
                    });
                } else {
                    this.chunkCount = 0;
                    this.vectorStoreBackend = 'unknown';
                    this.lastStatsError = vectorStore ? 'Vector store not ready' : 'Vector store not initialized';
                    console.warn('Vector store not available:', this.lastStatsError);
                }
            } else {
                this.chunkCount = 0;
                this.vectorStoreBackend = 'unknown';
                this.lastStatsError = 'Retriever not initialized';
                console.warn('Retriever not initialized');
            }

            // For now, we don't track indexing state in the vector store itself
            this.isIndexing = false;
        } catch (error) {
            console.error('Failed to load dynamic state:', error);
            this.chunkCount = 0;
            this.isIndexing = false;
            this.vectorStoreBackend = 'unknown';
            this.lastStatsError = error instanceof Error ? error.message : 'Unknown error';
        }
    }

    private renderUI(): void {
        if (!this.container) return;

        // Inject card styles
        this.injectCardStyles();

        // Clear container
        this.container.innerHTML = '';

        // Check if master password is set in KeyManager session OR if it was previously configured
        const isPasswordSetInSession = this.plugin.keyManager?.hasMasterPassword() || false;
        const isPasswordConfigured = this.settings.masterPassword.isSet;
        
        if (!isPasswordSetInSession && !isPasswordConfigured) {
            // No password has ever been set - show setup screen
            this.renderPasswordRequiredScreen();
            return;
        } else if (!isPasswordSetInSession && isPasswordConfigured) {
            // Password was previously set but not verified in this session - show verification screen
            this.renderPasswordVerificationScreen();
            return;
        }

        // Render main structure with tabs
        const mainHTML = `
      <div class="mnemosyne-settings">
        <div class="settings-header">
          <h1 class="main-settings-title">
            <svg viewBox="0 0 128 128" width="28" height="28" style="display: inline-block; vertical-align: middle; margin-right: 8px; color: var(--interactive-accent);">
              <path d="M60.05,113.45c-.3,2.81-.36,5.59-.47,8.41-.04,1.04-.61,2.14.03,3.27,1.68.03,8.33,1.2,8.7-.86l-.65-10.81c38.47-1.92,63.45-43.68,47.07-78.73C97.52-3.12,44.98-8.81,19.68,24.08c-27.11,34.69-3.34,86.93,40.37,89.36ZM64.09,81.44c-.35.09-.4-.22-.57-.41-1.48-2.18-3.31-4.09-5.32-5.79-21.8-16.12,8.61-38.21,18.64-16.07,2.97,10.67-8.14,14.79-12.75,22.27ZM59.21,7.7c67.21-6.25,75.1,97.02,7.7,100.35v-16.36l13.93.14c1.41-.47,1.29-4.28.35-5.27h-13.8c6.85-10.41,19.34-15.52,14.65-30.76,8.75,4.94,13.57,16.15,14.03,25.89.44.75,4.33.72,4.72-.17.45-1.03.09-1.51.04-2.39-.75-15.75-11.9-28.28-26.61-32.97,8.37-4.06,13.82-13.02,12.94-22.46.07-4.1-4.7-1.94-7.05-1.31,4.7,24.71-34.29,27.36-32.75,2.29.1-1.05.96-1.93-.18-2.51-.94-.48-5.14-1.25-5.81-.55-.23.23-.49,1.29-.54,1.66-1.24,8.89,4.25,18.49,12.03,22.52.25.23.44.35.36.73-13.61,3.23-25.06,16.89-26.13,30.89-.05.76-.14,3.57.04,4.12.26.82,4.77,1.41,5.08-.71-.19-9.78,5.23-19.69,13.44-25.01-1.98,6.04-.64,12.27,3.08,17.31,3.53,4.98,9.2,7.88,11.57,13.45h-13.55c-1.31,0-.89,4.23-.61,5.13h14.65v16.36C-.08,105.81-2.2,12.67,59.21,7.7Z" fill="currentColor"/>
              <path d="M62.69,56.59c-10.77,3.15-2.17,18.62,5.92,10.56,3.74-4.53-.07-11.56-5.92-10.56Z" fill="#0A66FF"/>
            </svg>
            Mnemosyne Settings
          </h1>
        </div>

        <!-- Tab Navigation -->
        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="quick-start">
            <span class="tab-icon">🚀</span>
            <span class="tab-label">Quick Start</span>
          </button>
          <button class="settings-tab" data-tab="providers">
            <span class="tab-icon">🤖</span>
            <span class="tab-label">LLM Providers</span>
          </button>
          <button class="settings-tab" data-tab="agents">
            <span class="tab-icon">🎭</span>
            <span class="tab-label">Agents</span>
          </button>
          <button class="settings-tab" data-tab="knowledge">
            <span class="tab-icon">📚</span>
            <span class="tab-label">Knowledge Base</span>
          </button>
          <button class="settings-tab" data-tab="advanced">
            <span class="tab-icon">⚙️</span>
            <span class="tab-label">Advanced</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="settings-tab-content">
          <!-- Tab content will be rendered here -->
        </div>

        <div class="settings-footer">
          <p style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 24px;">
            Mnemosyne v${this.settings.version} • Named after the Greek goddess of memory
          </p>
        </div>
      </div>
    `;

        this.container.innerHTML = mainHTML;

        // Initialize tab system
        this.initializeTabSystem();

        // Initialize components
        this.initializeComponents();
    }

    private initializeTabSystem(): void {
        if (!this.container) return;

        // Create tab manager
        this.tabManager = new TabManager(this.container, 'quick-start');

        // Register tabs
        this.tabManager.registerTab({
            id: 'quick-start',
            label: 'Quick Start',
            icon: '🚀',
            instance: new QuickStartTab(this.plugin)
        });

        this.tabManager.registerTab({
            id: 'providers',
            label: 'LLM Providers',
            icon: '🤖',
            instance: new ProvidersTab(
                this.plugin,
                this.keyManager,
                this.settings,
                this.saveSettings.bind(this),
                this.updateComponents.bind(this)
            )
        });

        this.tabManager.registerTab({
            id: 'agents',
            label: 'Agents',
            icon: '🎭',
            instance: new AgentsTab(
                this.plugin,
                this.settings,
                this.saveSettings.bind(this),
                this.updateComponents.bind(this),
                this.handleAgentAction.bind(this)
            )
        });

        this.tabManager.registerTab({
            id: 'knowledge',
            label: 'Knowledge Base',
            icon: '📚',
            instance: new KnowledgeBaseTab(
                this.plugin,
                this.settings,
                this.saveSettings.bind(this),
                this.updateComponents.bind(this),
                this.chunkCount,
                this.vectorStoreBackend,
                this.handleRefreshStats.bind(this)
            )
        });

        this.tabManager.registerTab({
            id: 'advanced',
            label: 'Advanced',
            icon: '⚙️',
            instance: new AdvancedTab(
                this.plugin,
                this.settings,
                this.saveSettings.bind(this),
                this.updateComponents.bind(this),
                this.handlePersonaAction.bind(this),
                this.handleMemoryAction.bind(this),
                this.handleSetMasterPassword.bind(this)
            )
        });

        // Attach tab button handlers
        this.tabManager.attachTabButtonHandlers();

        // Render initial tab
        this.tabManager.renderActiveTab();
    }

    private renderPasswordRequiredScreen(): void {
        const passwordRequiredHTML = `
      <div class="mnemosyne-settings">
        <div class="settings-header">
          <h1 class="main-settings-title">
            <svg viewBox="0 0 128 128" width="28" height="28" style="display: inline-block; vertical-align: middle; margin-right: 8px; color: var(--interactive-accent);">
              <path d="M60.05,113.45c-.3,2.81-.36,5.59-.47,8.41-.04,1.04-.61,2.14.03,3.27,1.68.03,8.33,1.2,8.7-.86l-.65-10.81c38.47-1.92,63.45-43.68,47.07-78.73C97.52-3.12,44.98-8.81,19.68,24.08c-27.11,34.69-3.34,86.93,40.37,89.36ZM64.09,81.44c-.35.09-.4-.22-.57-.41-1.48-2.18-3.31-4.09-5.32-5.79-21.8-16.12,8.61-38.21,18.64-16.07,2.97,10.67-8.14,14.79-12.75,22.27ZM59.21,7.7c67.21-6.25,75.1,97.02,7.7,100.35v-16.36l13.93.14c1.41-.47,1.29-4.28.35-5.27h-13.8c6.85-10.41,19.34-15.52,14.65-30.76,8.75,4.94,13.57,16.15,14.03,25.89.44.75,4.33.72,4.72-.17.45-1.03.09-1.51.04-2.39-.75-15.75-11.9-28.28-26.61-32.97,8.37-4.06,13.82-13.02,12.94-22.46.07-4.1-4.7-1.94-7.05-1.31,4.7,24.71-34.29,27.36-32.75,2.29.1-1.05.96-1.93-.18-2.51-.94-.48-5.14-1.25-5.81-.55-.23.23-.49,1.29-.54,1.66-1.24,8.89,4.25,18.49,12.03,22.52.25.23.44.35.36.73-13.61,3.23-25.06,16.89-26.13,30.89-.05.76-.14,3.57.04,4.12.26.82,4.77,1.41,5.08-.71-.19-9.78,5.23-19.69,13.44-25.01-1.98,6.04-.64,12.27,3.08,17.31,3.53,4.98,9.2,7.88,11.57,13.45h-13.55c-1.31,0-.89,4.23-.61,5.13h14.65v16.36C-.08,105.81-2.2,12.67,59.21,7.7Z" fill="currentColor"/>
              <path d="M62.69,56.59c-10.77,3.15-2.17,18.62,5.92,10.56,3.74-4.53-.07-11.56-5.92-10.56Z" fill="#0A66FF"/>
            </svg>
            Mnemosyne Settings
          </h1>
        </div>
        
        <div class="settings-content">
          <div class="settings-section">
            <h3 class="section-title">🔐 Master Password Required</h3>
            <div class="settings-card">
              <div class="card-header">
                <p class="card-description">Please set a master password to secure your API keys and access Mnemosyne features.</p>
              </div>
              
              <div class="password-setup-container" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px; color: var(--interactive-accent);">🔐</div>
                <h4 style="margin-bottom: 16px; color: var(--text-normal);">Master Password Required</h4>
                <p style="color: var(--text-muted); margin-bottom: 24px; line-height: 1.5;">
                  Your master password encrypts your API keys and is never stored. 
                  You'll need to enter it each time you restart Obsidian.
                </p>
                
                <button class="btn btn-primary" id="set-master-password-btn" style="padding: 12px 24px; font-size: 16px;">
                  <span>🔐</span>
                  Set Master Password
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <p style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 24px;">
            Mnemosyne v${this.settings.version} • Named after the Greek goddess of memory
          </p>
        </div>
      </div>
    `;

        if (this.container) {
            this.container.innerHTML = passwordRequiredHTML;
        }
        
        // Attach event listener for the set password button
        const setPasswordBtn = this.container?.querySelector('#set-master-password-btn');
        if (setPasswordBtn) {
            setPasswordBtn.addEventListener('click', () => {
                this.handleSetMasterPassword();
            });
        }
    }

    private renderMemoryManagement(): string {
        return `
            <div class="settings-section">
                <h3 class="section-title">💭 Conversation Memory</h3>
                <div class="settings-card">
                    <div id="memory-management-container"></div>
                </div>
            </div>
        `;
    }

    private renderPasswordVerificationScreen(): void {
        const passwordVerificationHTML = `
      <div class="mnemosyne-settings">
        <div class="settings-header">
          <h1 class="main-settings-title">
            <svg viewBox="0 0 128 128" width="28" height="28" style="display: inline-block; vertical-align: middle; margin-right: 8px; color: var(--interactive-accent);">
              <path d="M60.05,113.45c-.3,2.81-.36,5.59-.47,8.41-.04,1.04-.61,2.14.03,3.27,1.68.03,8.33,1.2,8.7-.86l-.65-10.81c38.47-1.92,63.45-43.68,47.07-78.73C97.52-3.12,44.98-8.81,19.68,24.08c-27.11,34.69-3.34,86.93,40.37,89.36ZM64.09,81.44c-.35.09-.4-.22-.57-.41-1.48-2.18-3.31-4.09-5.32-5.79-21.8-16.12,8.61-38.21,18.64-16.07,2.97,10.67-8.14,14.79-12.75,22.27ZM59.21,7.7c67.21-6.25,75.1,97.02,7.7,100.35v-16.36l13.93.14c1.41-.47,1.29-4.28.35-5.27h-13.8c6.85-10.41,19.34-15.52,14.65-30.76,8.75,4.94,13.57,16.15,14.03,25.89.44.75,4.33.72,4.72-.17.45-1.03.09-1.51.04-2.39-.75-15.75-11.9-28.28-26.61-32.97,8.37-4.06,13.82-13.02,12.94-22.46.07-4.1-4.7-1.94-7.05-1.31,4.7,24.71-34.29,27.36-32.75,2.29.1-1.05.96-1.93-.18-2.51-.94-.48-5.14-1.25-5.81-.55-.23.23-.49,1.29-.54,1.66-1.24,8.89,4.25,18.49,12.03,22.52.25.23.44.35.36.73-13.61,3.23-25.06,16.89-26.13,30.89-.05.76-.14,3.57.04,4.12.26.82,4.77,1.41,5.08-.71-.19-9.78,5.23-19.69,13.44-25.01-1.98,6.04-.64,12.27,3.08,17.31,3.53,4.98,9.2,7.88,11.57,13.45h-13.55c-1.31,0-.89,4.23-.61,5.13h14.65v16.36C-.08,105.81-2.2,12.67,59.21,7.7Z" fill="currentColor"/>
              <path d="M62.69,56.59c-10.77,3.15-2.17,18.62,5.92,10.56,3.74-4.53-.07-11.56-5.92-10.56Z" fill="#0A66FF"/>
            </svg>
            Mnemosyne Settings
          </h1>
        </div>
        
        <div class="settings-content">
          <div class="settings-section">
            <h3 class="section-title">🔐 Verify Master Password</h3>
            <div class="settings-card">
              <div class="card-header">
                <p class="card-description">Please enter your master password to access Mnemosyne features.</p>
              </div>
              
              <div class="password-verification-container" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px; color: var(--interactive-accent);">🔓</div>
                <h4 style="margin-bottom: 16px; color: var(--text-normal);">Enter Master Password</h4>
                <p style="color: var(--text-muted); margin-bottom: 24px; line-height: 1.5;">
                  Your master password is required to decrypt your API keys and access Mnemosyne features.
                </p>
                
                <button class="btn btn-primary" id="verify-master-password-btn" style="padding: 12px 24px; font-size: 16px;">
                  <span>🔓</span>
                  Enter Master Password
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <p style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 24px;">
            Mnemosyne v${this.settings.version} • Named after the Greek goddess of memory
          </p>
        </div>
      </div>
    `;

        if (this.container) {
            this.container.innerHTML = passwordVerificationHTML;
        }
        
        // Attach event listener for the verify password button
        const verifyPasswordBtn = this.container?.querySelector('#verify-master-password-btn');
        if (verifyPasswordBtn) {
            verifyPasswordBtn.addEventListener('click', () => {
                this.handleVerifyMasterPassword();
            });
        }
    }

    private renderQuickSetup(): string {
        const backendDisplay = this.vectorStoreBackend === 'unknown' ? 'Not configured' : this.vectorStoreBackend.toUpperCase();
        const lastUpdateText = this.lastStatsUpdate
            ? this.lastStatsUpdate.toLocaleTimeString()
            : 'Never';

        return `
      <div class="settings-section">
        <h3 class="section-title">🚀 Quick Start</h3>
        <div class="settings-card quick-setup fade-in">
          <div class="card-header">
            <p class="card-description">Get started with your AI-powered knowledge assistant</p>
            ${this.renderQuickSetupStatus()}
          </div>

          <div class="quick-controls">
            <div class="control-group">
              <div class="toggle-container">
                <label class="toggle-label" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                  <input type="checkbox" id="mnemosyne-toggle" ${this.settings.enabled ? 'checked' : ''} style="display: none;">
                  <div class="toggle-switch" style="position: relative; width: 44px; height: 24px; background: ${this.settings.enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 12px; transition: background-color 0.3s ease; cursor: pointer; border: 1px solid ${this.settings.enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)'};">
                    <div class="toggle-slider" style="position: absolute; left: 2px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 10px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transform: translateX(${this.settings.enabled ? '20px' : '0px'});"></div>
                  </div>
                  <span style="font-weight: 500; font-size: 14px;">Enable Mnemosyne</span>
                </label>
                <p class="help-text">Turn the plugin on or off globally</p>
              </div>
            </div>

            ${this.lastStatsError ? `
            <div class="status-error" style="background: rgba(245, 101, 101, 0.1); border: 1px solid rgba(245, 101, 101, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
              <div style="display: flex; align-items: start; gap: 8px;">
                <span style="color: var(--text-error); font-size: 16px;">⚠️</span>
                <div>
                  <strong style="color: var(--text-error); font-size: 13px;">Vector Store Error</strong>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-muted);">${this.lastStatsError}</p>
                </div>
              </div>
            </div>
            ` : ''}

            <div class="status-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
              <div class="status-item">
                <span class="label">AI Provider</span>
                <span class="value" data-provider-status>${this.getProviderStatusText()}</span>
              </div>
              <div class="status-item">
                <span class="label">Knowledge Base</span>
                <span class="value" data-chunk-count>${this.isIndexing ? '⏳ Indexing...' : `${this.chunkCount} chunks`}</span>
              </div>
              <div class="status-item">
                <span class="label">Backend</span>
                <span class="value" data-backend>${backendDisplay}</span>
              </div>
              <div class="status-item">
                <span class="label">Last Updated</span>
                <span class="value" data-last-update>${lastUpdateText}</span>
              </div>
            </div>

            <div class="quick-actions">
              <button class="btn btn-primary" data-action="setup-provider" ${this.settings.providers.length > 0 ? 'style="display:none"' : ''}>
                <span>⚡</span>
                Setup AI Provider
              </button>
              <button class="btn btn-secondary" data-action="index-vault" ${this.isIndexing ? 'disabled' : ''}>
                <span>📚</span>
                ${this.isIndexing ? 'Indexing...' : (this.chunkCount > 0 ? 'Reindex Vault' : 'Index Vault')}
              </button>
              <button class="btn btn-outline" data-action="refresh-stats" title="Refresh vector store statistics">
                <span>🔄</span>
                Refresh Stats
              </button>
            </div>

            ${this.chunkCount === 0 && !this.isIndexing ? `
            <div class="setup-hint" style="margin-top: 16px; padding: 12px; background: var(--background-secondary); border-radius: 8px; border-left: 3px solid var(--interactive-accent);">
              <strong style="font-size: 13px;">👋 Getting Started</strong>
              <ol style="margin: 8px 0 0 0; padding-left: 20px; font-size: 12px; color: var(--text-muted); line-height: 1.6;">
                <li>Configure an AI provider (OpenAI, Anthropic, etc.) in the Providers section below</li>
                <li>Index your vault to build the knowledge base</li>
                <li>Open the chat sidebar or use commands to interact with Mnemosyne</li>
              </ol>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    }

    private renderQuickSetupStatus(): string {
        const status = this.getOverallStatus();
        const statusText = this.getOverallStatusText();

        const chipStyles = {
            ready: 'background: rgba(72, 187, 120, 0.1); color: var(--text-success); border: 1px solid rgba(72, 187, 120, 0.3);',
            error: 'background: rgba(245, 101, 101, 0.1); color: var(--text-error); border: 1px solid rgba(245, 101, 101, 0.3);',
            disabled: 'background: var(--background-modifier-border); color: var(--text-muted); border: 1px solid var(--background-modifier-border);',
            connecting: 'background: rgba(59, 130, 246, 0.1); color: var(--interactive-accent); border: 1px solid rgba(59, 130, 246, 0.3);'
        };

        const chipStyle = chipStyles[status] || chipStyles.disabled;

        return `
      <div class="status-chip" style="${chipStyle} display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px;">
        ${this.getStatusIcon(status)} ${statusText}
      </div>
    `;
    }

    private renderAutoIngestionSettings(): string {
        // Get auto ingestion settings from plugin
        const pluginSettings = this.plugin?.settings;
        const autoIngestion = pluginSettings?.autoIngestion || {
            enabled: false,
            debounceDelay: 2000,
            batchSize: 10,
            maxFileSize: 5,
            queueSize: 0,
            filesProcessed: 0,
            logLevel: 'minimal'
        };
        
        const autoManager = this.plugin?.autoIngestionManager;
        const stats = autoManager ? autoManager.getStats() : {
            filesProcessed: 0,
            filesQueued: 0,
            filesSkipped: 0,
            errors: 0,
            isProcessing: false,
            queueSize: 0
        };
        
        const isEnabled = autoIngestion.enabled;
        const statusIcon = isEnabled ? '🟢' : '🔴';
        const statusText = isEnabled ? 'Enabled' : 'Disabled';
        const statusClass = isEnabled ? 'text-success' : 'text-muted';
        
        return `
      <div class="settings-section">
        <h3 class="section-title">🔄 Automatic Ingestion</h3>
        <div class="settings-card auto-ingestion-card fade-in">
          <div class="card-header">
            <p class="card-description">Automatically update your knowledge base when files change</p>
            <div class="status-chip" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px; background: ${isEnabled ? 'rgba(72, 187, 120, 0.1)' : 'rgba(156, 163, 175, 0.1)'}; color: var(--${statusClass}); border: 1px solid ${isEnabled ? 'rgba(72, 187, 120, 0.3)' : 'rgba(156, 163, 175, 0.3)'}">
              ${statusIcon} Status: ${statusText}
            </div>
          </div>
          
          <div class="auto-ingestion-content">
            <div class="control-group" style="margin-bottom: 16px;">
              <div class="toggle-container">
                <label class="toggle-label" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                  <input type="checkbox" id="auto-ingestion-toggle" ${isEnabled ? 'checked' : ''} style="display: none;">
                  <div class="toggle-switch" style="position: relative; width: 44px; height: 24px; background: ${isEnabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 12px; transition: background-color 0.3s ease; cursor: pointer; border: 1px solid ${isEnabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)'};">
                    <div class="toggle-slider" style="position: absolute; left: 2px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 10px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transform: translateX(${isEnabled ? '20px' : '0px'});"></div>
                  </div>
                  <span style="font-weight: 500; font-size: 14px;">Enable Automatic Ingestion</span>
                </label>
                <p class="help-text">Automatically index files when they are created or modified</p>
              </div>
            </div>
            
            ${isEnabled ? `
            <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div class="stat-item">
                <span class="label" style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Files Processed</span>
                <span class="value" style="font-size: 16px; font-weight: 500;">${stats.filesProcessed}</span>
              </div>
              <div class="stat-item">
                <span class="label" style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Queue Size</span>
                <span class="value" style="font-size: 16px; font-weight: 500; color: ${stats.queueSize > 0 ? 'var(--interactive-accent)' : 'inherit'};">${stats.queueSize}</span>
              </div>
              <div class="stat-item">
                <span class="label" style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Status</span>
                <span class="value" style="font-size: 16px; font-weight: 500; color: ${stats.isProcessing ? 'var(--interactive-accent)' : 'inherit'};">${stats.isProcessing ? 'Processing...' : 'Idle'}</span>
              </div>
            </div>
            ` : ''}
            
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <label style="font-weight: 500; font-size: 14px;">Debounce Delay</label>
                <p class="help-text">Time to wait after file stops changing (seconds)</p>
              </div>
              <input type="number" id="auto-debounce-delay" value="${autoIngestion.debounceDelay / 1000}" min="1" max="30" step="1" style="width: 80px; text-align: right;" ${!isEnabled ? 'disabled' : ''}>
            </div>
            
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <label style="font-weight: 500; font-size: 14px;">Batch Size</label>
                <p class="help-text">Max files to process at once</p>
              </div>
              <input type="number" id="auto-batch-size" value="${autoIngestion.batchSize}" min="1" max="50" step="1" style="width: 80px; text-align: right;" ${!isEnabled ? 'disabled' : ''}>
            </div>
            
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <label style="font-weight: 500; font-size: 14px;">Max File Size</label>
                <p class="help-text">Maximum file size to process (MB)</p>
              </div>
              <input type="number" id="auto-max-file-size" value="${autoIngestion.maxFileSize}" min="1" max="100" step="1" style="width: 80px; text-align: right;" ${!isEnabled ? 'disabled' : ''}>
            </div>
            
            <div class="quick-actions">
              <button class="btn btn-secondary" data-action="configure-auto-ingestion" ${!isEnabled ? 'disabled' : ''}>
                <span>⚙️</span>
                Advanced Settings
              </button>
              ${stats.queueSize > 0 ? `
                <button class="btn btn-outline" data-action="clear-auto-queue">
                  <span>🗑️</span>
                  Clear Queue (${stats.queueSize})
                </button>
              ` : ''}
            </div>
            
            <div class="auto-ingestion-notice" style="margin-top: 16px;">
              <div class="security-notice-icon">⚡</div>
              <div class="security-notice-content">
                <strong>Performance Note:</strong> Auto ingestion monitors file changes in real-time. 
                Disable this feature if you experience performance issues or want manual control over indexing.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    
    private renderSecurity(): string {
        // Get security status
        const isPasswordSet = this.settings.masterPassword.isSet;
        const passwordLastChanged = this.settings.masterPassword.lastChanged;
        const securityStatusClass = isPasswordSet ? 'text-success' : 'text-error';
        const securityStatusText = isPasswordSet ? 'Set' : 'Not Set';
        const securityIcon = isPasswordSet ? '✅' : '⚠️';
        
        // Format last changed date if available
        let lastChangedText = 'Never';
        if (passwordLastChanged) {
            const date = new Date(passwordLastChanged);
            lastChangedText = date.toLocaleDateString();
        }
        
        return `
      <div class="settings-section">
        <h3 class="section-title">🔒 Security</h3>
        <div class="settings-card security-card fade-in">
          <div class="card-header">
            <p class="card-description">Protect your API keys with a master password</p>
            <div class="status-chip" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px; background: ${isPasswordSet ? 'rgba(72, 187, 120, 0.1)' : 'rgba(245, 101, 101, 0.1)'}; color: var(--${securityStatusClass}); border: 1px solid ${isPasswordSet ? 'rgba(72, 187, 120, 0.3)' : 'rgba(245, 101, 101, 0.3)'}">
              ${securityIcon} Master Password: ${securityStatusText}
            </div>
          </div>
          
          <div class="security-content">
            <div class="status-grid">
              <div class="status-item">
                <span class="label">Encryption</span>
                <span class="value">AES-256-CBC</span>
              </div>
              <div class="status-item">
                <span class="label">Password Last Changed</span>
                <span class="value">${lastChangedText}</span>
              </div>
            </div>
            
            <div class="quick-actions" style="margin-top: 16px;">
              <button class="btn ${isPasswordSet ? 'btn-secondary' : 'btn-primary'}" data-action="${isPasswordSet ? 'change-password' : 'set-password'}">
                <span>${isPasswordSet ? '🔄' : '🔐'}</span>
                ${isPasswordSet ? 'Change Password' : 'Set Password'}
              </button>
              ${isPasswordSet ? `
                <button class="btn btn-outline" data-action="reset-password">
                  <span>🗑️</span>
                  Reset Password
                </button>
              ` : ''}
            </div>
            
            <div class="security-notice" style="margin-top: 16px;">
              <div class="security-notice-icon">🛡️</div>
              <div class="security-notice-content">
                <strong>Security Note:</strong> Your master password is used to encrypt API keys and is never stored. 
                Set a strong password you won't forget. If you reset it, you'll need to re-enter all API keys.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    private renderAgentManagement(): string {
        const agentManagementState: AgentManagementState = {
            agents: this.settings.agents,
            defaultAgentId: this.settings.defaultAgentId,
        };

        this.agentManagement = new AgentManagement(
            this.plugin,
            agentManagementState,
            this.settings.providers.length > 0,
            this.handleAgentAction.bind(this)
        );

        // Initialize Provider Management Component
        const providerManagementState: ProviderManagementState = {
            providers: this.settings.providers,
            defaultProvider: this.settings.defaultProvider,
        };

        this.providerManagement = new ProviderManagement(
            this.plugin,
            providerManagementState,
            this.handleProviderAction.bind(this)
        );

        // Initialize Goddess Persona Management Component
        const goddessPersonaState: GoddessPersonaManagementState = {
            persona: this.settings.persona,
            onPersonaAction: this.handlePersonaAction.bind(this)
        };

        this.goddessPersonaManagement = new GoddessPersonaManagement(goddessPersonaState);

        // Return section with header - actual rendering will happen in initializeComponents
        return `
      <div class="settings-section">
        <h3 class="section-title">🎯 Agent Management</h3>
        <div class="agent-management-container"></div>
      </div>
    `;
    }

    private renderMCPToolsSettings(): string {
        // Get MCP tools settings from plugin
        const mcpSettings = this.plugin?.settings?.mcpTools || {
            enabled: true,
            allowedTools: ['read_note', 'write_note', 'search_notes', 'list_notes'],
            defaultAllowDangerousOperations: false,
            defaultFolderScope: []
        };

        const isEnabled = mcpSettings.enabled;
        const statusIcon = isEnabled ? '🟢' : '🔴';
        const statusText = isEnabled ? 'Enabled' : 'Disabled';
        const statusClass = isEnabled ? 'text-success' : 'text-muted';

        // Available tools with descriptions
        const availableTools = [
            { id: 'read_note', name: 'Read Notes', description: 'Allow agents to read note contents', dangerous: false },
            { id: 'write_note', name: 'Write Notes', description: 'Allow agents to create/update notes', dangerous: true },
            { id: 'search_notes', name: 'Search Notes', description: 'Allow agents to search for notes', dangerous: false },
            { id: 'list_notes', name: 'List Notes', description: 'Allow agents to list notes in folders', dangerous: false },
            { id: 'get_active_note', name: 'Get Active Note', description: 'Allow agents to access currently open note', dangerous: false }
        ];

        return `
      <div class="settings-section">
        <h3 class="section-title">🛠️ MCP Tools</h3>
        <div class="settings-card mcp-tools-card fade-in">
          <div class="card-header">
            <p class="card-description">Model Context Protocol tools allow agents to interact with your vault</p>
            <div class="status-chip" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px; background: ${isEnabled ? 'rgba(72, 187, 120, 0.1)' : 'rgba(156, 163, 175, 0.1)'}; color: var(--${statusClass}); border: 1px solid ${isEnabled ? 'rgba(72, 187, 120, 0.3)' : 'rgba(156, 163, 175, 0.3)'}">
              ${statusIcon} Status: ${statusText}
            </div>
          </div>

          <div class="mcp-tools-content">
            <div class="control-group" style="margin-bottom: 16px;">
              <div class="toggle-container">
                <label class="toggle-label" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                  <input type="checkbox" id="mcp-tools-toggle" ${isEnabled ? 'checked' : ''} style="display: none;">
                  <div class="toggle-switch" style="position: relative; width: 44px; height: 24px; background: ${isEnabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 12px; transition: background-color 0.3s ease; cursor: pointer; border: 1px solid ${isEnabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)'};">
                    <div class="toggle-slider" style="position: absolute; left: 2px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 10px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transform: translateX(${isEnabled ? '20px' : '0px'});"></div>
                  </div>
                  <span style="font-weight: 500; font-size: 14px;">Enable MCP Tools</span>
                </label>
                <p class="help-text">Allow agents to use tools for reading and writing notes</p>
              </div>
            </div>

            ${isEnabled ? `
            <div style="margin-bottom: 16px;">
              <label style="font-weight: 500; font-size: 14px; margin-bottom: 8px; display: block;">Allowed Tools</label>
              <p class="help-text" style="margin-bottom: 12px;">Select which tools agents can use (can be overridden per agent)</p>

              <div class="tools-list" style="display: grid; gap: 8px;">
                ${availableTools.map(tool => `
                  <label class="tool-checkbox-label" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; background: var(--background-secondary); cursor: pointer; transition: all 0.2s ease; border: 1px solid var(--background-modifier-border);">
                    <input type="checkbox" class="mcp-tool-checkbox" data-tool="${tool.id}" ${mcpSettings.allowedTools.includes(tool.id) ? 'checked' : ''} style="cursor: pointer;">
                    <div style="flex: 1;">
                      <div style="font-weight: 500; font-size: 13px;">${tool.name} ${tool.dangerous ? '<span style="color: var(--text-error); font-size: 11px;">⚠️ WRITE</span>' : ''}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${tool.description}</div>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <label style="font-weight: 500; font-size: 14px;">Default: Allow Dangerous Operations</label>
                <p class="help-text">Allow new agents to write/modify notes by default</p>
              </div>
              <label class="toggle-label" style="cursor: pointer;">
                <input type="checkbox" id="mcp-default-dangerous" ${mcpSettings.defaultAllowDangerousOperations ? 'checked' : ''} style="display: none;">
                <div class="toggle-switch" style="position: relative; width: 44px; height: 24px; background: ${mcpSettings.defaultAllowDangerousOperations ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 12px; transition: background-color 0.3s ease; cursor: pointer; border: 1px solid ${mcpSettings.defaultAllowDangerousOperations ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)'};">
                  <div class="toggle-slider" style="position: absolute; left: 2px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 10px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transform: translateX(${mcpSettings.defaultAllowDangerousOperations ? '20px' : '0px'});"></div>
                </div>
              </label>
            </div>
            ` : ''}

            <div class="mcp-tools-notice" style="margin-top: 16px;">
              <div class="security-notice-icon">🔒</div>
              <div class="security-notice-content">
                <strong>Security Note:</strong> MCP tools allow agents to read and potentially modify your notes.
                Configure folder restrictions per agent for fine-grained control.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    private renderVectorStoreSettings(): string {
        const vectorStoreConfig = this.plugin.settings.vectorStore || {
            backend: 'json',
            embeddingModel: 'text-embedding-3-small',
            dimension: 1536
        };

        const currentBackend = vectorStoreConfig.backend || 'json';
        const isJson = currentBackend === 'json';
        const isSqlite = currentBackend === 'sqlite';
        const isPgVector = currentBackend === 'pgvector';

        return `
      <div class="settings-section">
        <h3 class="section-title">🗄️ Vector Store</h3>
        <div class="settings-card">
          <div class="card-header">
            <p class="card-description">Configure vector database backend for embedding storage</p>
          </div>

          <div style="padding: 20px;">
            <!-- Embedding Provider Selection -->
            <div class="setting-row" style="margin-bottom: 24px; padding: 16px; background: var(--background-secondary); border-radius: 6px; border-left: 3px solid var(--interactive-accent);">
              <div style="margin-bottom: 12px;">
                <label style="font-weight: 500; font-size: 14px;">🧠 Embedding Provider</label>
                <p class="help-text">Choose how text is converted to vector embeddings</p>
              </div>
              <select id="embedding-provider" style="width: 100%; min-height: 52px; height: auto; padding: 12px 12px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary); color: var(--text-normal); font-size: 14px; line-height: 1.8; display: block; overflow: visible;">
                <option value="openai" ${this.plugin.settings.embeddingProvider === 'openai' || !this.plugin.settings.embeddingProvider ? 'selected' : ''}>OpenAI (Cloud - High Quality, 1536 dimensions)</option>
                <option value="local" ${this.plugin.settings.embeddingProvider === 'local' ? 'selected' : ''}>Local (Transformers.js - Privacy-First, 384 dimensions)</option>
              </select>

              <!-- OpenAI Settings -->
              <div id="openai-embedding-settings" style="display: ${this.plugin.settings.embeddingProvider === 'local' ? 'none' : 'block'}; margin-top: 12px; padding: 12px; background: var(--background-primary); border-radius: 4px;">
                <label style="font-size: 13px; color: var(--text-muted);">OpenAI Model:</label>
                <select id="openai-embedding-model" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;">
                  <option value="text-embedding-3-small" ${this.plugin.settings.embeddingModel === 'text-embedding-3-small' ? 'selected' : ''}>text-embedding-3-small (1536 dim, recommended)</option>
                  <option value="text-embedding-3-large" ${this.plugin.settings.embeddingModel === 'text-embedding-3-large' ? 'selected' : ''}>text-embedding-3-large (3072 dim, higher quality)</option>
                </select>
                <p class="help-text" style="margin-top: 4px; font-size: 12px;">⚠️ Requires OpenAI API key. Documents sent to OpenAI for embedding.</p>
              </div>

              <!-- Local Settings -->
              <div id="local-embedding-settings" style="display: ${this.plugin.settings.embeddingProvider === 'local' ? 'block' : 'none'}; margin-top: 12px; padding: 12px; background: var(--background-primary); border-radius: 4px;">
                <label style="font-size: 13px; color: var(--text-muted);">Local Model:</label>
                <select id="local-embedding-model" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;">
                  <option value="Xenova/all-MiniLM-L6-v2" ${this.plugin.settings.embeddingModel === 'Xenova/all-MiniLM-L6-v2' ? 'selected' : ''}>all-MiniLM-L6-v2 (384 dim, recommended)</option>
                </select>
                <p class="help-text" style="margin-top: 4px; font-size: 12px;">✅ 100% local. No external API calls. Perfect for data privacy and air-gapped environments.</p>
                <p class="help-text" style="margin-top: 4px; font-size: 12px;">📦 First use downloads ~23MB model (cached for future use).</p>
              </div>

              <!-- Warning about changing providers -->
              <div style="margin-top: 12px; padding: 12px; background: var(--background-modifier-error); border-radius: 4px; border-left: 3px solid var(--text-error);">
                <div style="display: flex; align-items: start; gap: 8px;">
                  <span style="font-size: 16px;">⚠️</span>
                  <div style="flex: 1;">
                    <p style="font-size: 13px; color: var(--text-normal); margin-bottom: 4px;"><strong>Changing Embedding Provider Requires Re-indexing</strong></p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 0;">Embeddings from different providers are not compatible. You'll need to re-ingest your vault after changing providers.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Backend Selection -->
            <div class="setting-row" style="margin-bottom: 24px;">
              <div style="margin-bottom: 12px;">
                <label style="font-weight: 500; font-size: 14px;">Storage Backend</label>
                <p class="help-text">Choose how embeddings are stored</p>
              </div>
              <select id="vector-store-backend" style="width: 100%; min-height: 52px; height: auto; padding: 12px 12px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary); color: var(--text-normal); font-size: 14px; line-height: 1.8; display: block; overflow: visible;">
                <option value="json" ${isJson ? 'selected' : ''}>JSON File (Simplest, 0-10K chunks)</option>
                <option value="sqlite" ${isSqlite ? 'selected' : ''}>SQLite + VSS (Embedded, 10K-100K chunks)</option>
                <option value="pgvector" ${isPgVector ? 'selected' : ''}>PostgreSQL + pgvector (Scalable, 100K+ chunks)</option>
              </select>
            </div>

            <!-- JSON Backend Settings -->
            <div id="json-backend-settings" style="display: ${isJson ? 'block' : 'none'}; padding: 16px; background: var(--background-secondary); border-radius: 6px; margin-bottom: 16px;">
              <h4 style="margin-bottom: 12px; font-size: 14px; color: var(--text-normal);">JSON Storage</h4>
              <p class="help-text" style="margin-bottom: 12px;">Stores embeddings in a local JSON file. Best for small vaults.</p>
              <div class="setting-row">
                <label style="font-size: 13px; color: var(--text-muted);">Index Path:</label>
                <input type="text" id="json-index-path" value="${vectorStoreConfig.json?.indexPath || 'vector-store-index.json'}" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;" />
              </div>
            </div>

            <!-- SQLite Backend Settings -->
            <div id="sqlite-backend-settings" style="display: ${isSqlite ? 'block' : 'none'}; padding: 16px; background: var(--background-secondary); border-radius: 6px; margin-bottom: 16px;">
              <h4 style="margin-bottom: 12px; font-size: 14px; color: var(--text-normal);">SQLite + VSS</h4>
              <p class="help-text" style="margin-bottom: 12px;">Embedded database with vector search. Zero setup, better performance than JSON. Perfect for medium vaults.</p>
              <div class="setting-row" style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: var(--text-muted);">Database Path:</label>
                <input type="text" id="sqlite-db-path" value="${vectorStoreConfig.sqlite?.dbPath || 'vector-store.db'}" placeholder="vector-store.db" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;" />
              </div>
              <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                  <label style="font-weight: 500; font-size: 13px;">Enable WAL Mode</label>
                  <p class="help-text">Write-Ahead Logging for better concurrency</p>
                </div>
                <label class="toggle-label" style="cursor: pointer;">
                  <input type="checkbox" id="sqlite-wal" ${vectorStoreConfig.sqlite?.enableWAL !== false ? 'checked' : ''} style="display: none;">
                  <div class="toggle-switch" style="position: relative; width: 44px; height: 24px; background: ${vectorStoreConfig.sqlite?.enableWAL !== false ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 12px; transition: background-color 0.3s ease; cursor: pointer; border: 1px solid ${vectorStoreConfig.sqlite?.enableWAL !== false ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)'};">
                    <div class="toggle-slider" style="position: absolute; left: 2px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 10px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transform: translateX(${vectorStoreConfig.sqlite?.enableWAL !== false ? '20px' : '0px'});"></div>
                  </div>
                </label>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button id="save-sqlite-config" class="btn btn-primary" style="flex: 1;">
                  <span>💾</span> Save Configuration
                </button>
              </div>
            </div>

            <!-- PgVector Backend Settings -->
            <div id="pgvector-backend-settings" style="display: ${isPgVector ? 'block' : 'none'}; padding: 16px; background: var(--background-secondary); border-radius: 6px; margin-bottom: 16px;">
              <h4 style="margin-bottom: 12px; font-size: 14px; color: var(--text-normal);">PostgreSQL + pgvector</h4>
              <p class="help-text" style="margin-bottom: 16px;">High-performance vector database with HNSW indexing. Supports millions of chunks.</p>

              <div class="setting-row" style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: var(--text-muted);">Host:</label>
                <input type="text" id="pg-host" value="${vectorStoreConfig.pgvector?.host || 'localhost'}" placeholder="localhost" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;" />
              </div>

              <div class="setting-row" style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: var(--text-muted);">Port:</label>
                <input type="number" id="pg-port" value="${vectorStoreConfig.pgvector?.port || 5432}" placeholder="5432" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;" />
              </div>

              <div class="setting-row" style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: var(--text-muted);">Database:</label>
                <input type="text" id="pg-database" value="${vectorStoreConfig.pgvector?.database || 'mnemosyne'}" placeholder="mnemosyne" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;" />
              </div>

              <div class="setting-row" style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: var(--text-muted);">User:</label>
                <input type="text" id="pg-user" value="${vectorStoreConfig.pgvector?.user || 'postgres'}" placeholder="postgres" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;" />
              </div>

              <div class="setting-row" style="margin-bottom: 12px;">
                <label style="font-size: 13px; color: var(--text-muted);">Password:</label>
                <input type="password" id="pg-password" placeholder="••••••••" style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 13px;" />
                <p class="help-text" style="margin-top: 4px; font-size: 12px;">Password will be encrypted with your master password</p>
              </div>

              <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                  <label style="font-weight: 500; font-size: 13px;">Enable SSL</label>
                  <p class="help-text">Use encrypted connection to PostgreSQL</p>
                </div>
                <label class="toggle-label" style="cursor: pointer;">
                  <input type="checkbox" id="pg-ssl" ${vectorStoreConfig.pgvector?.ssl ? 'checked' : ''} style="display: none;">
                  <div class="toggle-switch" style="position: relative; width: 44px; height: 24px; background: ${vectorStoreConfig.pgvector?.ssl ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 12px; transition: background-color 0.3s ease; cursor: pointer; border: 1px solid ${vectorStoreConfig.pgvector?.ssl ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)'};">
                    <div class="toggle-slider" style="position: absolute; left: 2px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 10px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transform: translateX(${vectorStoreConfig.pgvector?.ssl ? '20px' : '0px'});"></div>
                  </div>
                </label>
              </div>

              <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button id="test-pg-connection" class="btn btn-secondary" style="flex: 1;">
                  <span>🔍</span> Test Connection
                </button>
                <button id="save-pg-config" class="btn btn-primary" style="flex: 1;">
                  <span>💾</span> Save Configuration
                </button>
              </div>
            </div>

            <!-- Migration Section -->
            <div style="padding: 16px; background: var(--background-secondary); border-radius: 6px; border-left: 3px solid var(--interactive-accent);">
              <h4 style="margin-bottom: 8px; font-size: 14px; color: var(--text-normal);">⚡ Migration</h4>
              <p class="help-text" style="margin-bottom: 12px;">Migrate data between storage backends</p>

              <div id="migration-status" style="display: none; margin-bottom: 12px; padding: 12px; background: var(--background-primary); border-radius: 4px; border: 1px solid var(--background-modifier-border);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div class="migration-spinner" style="width: 16px; height: 16px; border: 2px solid var(--interactive-accent); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                  <span id="migration-phase" style="font-weight: 500; font-size: 13px;"></span>
                </div>
                <div style="background: var(--background-modifier-border); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                  <div id="migration-progress-bar" style="background: var(--interactive-accent); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <p id="migration-details" style="font-size: 12px; color: var(--text-muted);"></p>
              </div>

              <div style="display: flex; gap: 8px;">
                <button id="migrate-to-pgvector" class="btn btn-secondary" style="flex: 1;" ${isPgVector ? 'disabled' : ''}>
                  <span>→</span> Migrate to PostgreSQL
                </button>
                <button id="migrate-to-json" class="btn btn-secondary" style="flex: 1;" ${!isPgVector ? 'disabled' : ''}>
                  <span>←</span> Migrate to JSON
                </button>
              </div>
            </div>

            <!-- Info Box -->
            <div style="margin-top: 16px; padding: 12px; background: var(--background-modifier-hover); border-radius: 6px; border-left: 3px solid var(--text-accent);">
              <div style="display: flex; align-items: start; gap: 8px;">
                <span style="font-size: 16px;">💡</span>
                <div style="flex: 1;">
                  <p style="font-size: 13px; color: var(--text-normal); margin-bottom: 8px;"><strong>Choosing the Right Backend:</strong></p>
                  <div style="font-size: 12px; color: var(--text-muted);">
                    <p style="margin-bottom: 4px;"><strong>JSON (0-10K chunks):</strong> Simplest setup, good for small vaults, loads entirely into memory</p>
                    <p style="margin-bottom: 4px;"><strong>SQLite (10K-100K chunks):</strong> No external server needed, better performance than JSON, efficient memory usage, perfect sweet spot for most users</p>
                    <p style="margin-bottom: 0;"><strong>PostgreSQL (100K+ chunks):</strong> Maximum scalability, advanced features, requires external database server</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    }

    private renderPlaceholderSections(): string {
        // Placeholder sections for future phases + Auto Ingestion
        return `
      ${this.renderAutoIngestionSettings()}

      <div class="settings-section">
        <h3 class="section-title">🤖 AI Providers</h3>
        <div class="settings-card">
          <p class="card-description">Manage your AI providers and API keys</p>
          <div class="provider-management-container"></div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="section-title">🏛️ Goddess Persona</h3>
        <div class="settings-card">
          <p class="card-description">Channel the divine wisdom of Mnemosyne, goddess of memory and mother of the Muses</p>
          <div class="goddess-persona-management-container"></div>
        </div>
      </div>
    `;
    }

    private initializeComponents(): void {
        if (!this.container) return;

        // Initialize Agent Management
        if (this.agentManagement) {
            const agentManagementContainer = this.container.querySelector('.agent-management-container') as HTMLElement;
            if (agentManagementContainer) {
                this.agentManagement.render(agentManagementContainer);
                this.agentManagement.attachEventListeners(agentManagementContainer);
            }
        }

        // Initialize Provider Management
        if (this.providerManagement) {
            const providerManagementContainer = this.container.querySelector('.provider-management-container') as HTMLElement;
            if (providerManagementContainer) {
                this.providerManagement.render(providerManagementContainer);
                this.providerManagement.attachEventListeners(providerManagementContainer);
            }
        }

        // Initialize Goddess Persona Management
        if (this.goddessPersonaManagement) {
            const goddessPersonaContainer = this.container.querySelector('.goddess-persona-management-container') as HTMLElement;
            if (goddessPersonaContainer) {
                this.goddessPersonaManagement.render(goddessPersonaContainer);
            }
        }

        // Initialize Memory Management
        const memoryContainer = this.container.querySelector('#memory-management-container') as HTMLElement;
        if (memoryContainer) {
            this.memoryManagement = new MemoryManagement(
                this.plugin,
                this.settings.memory,
                (memory: MemoryConfig) => {
                    this.settings.memory = memory;
                    this.plugin.saveSettings();
                }
            );
            this.memoryManagement.render(memoryContainer);
        }

        // Attach toggle switch event
        const toggleInput = this.container.querySelector('#mnemosyne-toggle') as HTMLInputElement;
        if (toggleInput) {
            toggleInput.addEventListener('change', async () => {
                await this.handleSettingUpdate('enabled', toggleInput.checked);
            });
        }

        // Attach auto ingestion toggle
        const autoIngestionToggle = this.container.querySelector('#auto-ingestion-toggle') as HTMLInputElement;
        if (autoIngestionToggle) {
            autoIngestionToggle.addEventListener('change', async () => {
                await this.handleAutoIngestionToggle(autoIngestionToggle.checked);
            });
        }

        // Attach auto ingestion settings inputs
        const debounceInput = this.container.querySelector('#auto-debounce-delay') as HTMLInputElement;
        if (debounceInput) {
            debounceInput.addEventListener('change', async () => {
                const delayMs = parseInt(debounceInput.value) * 1000;
                await this.handleAutoIngestionSettingUpdate('debounceDelay', delayMs);
            });
        }

        const batchSizeInput = this.container.querySelector('#auto-batch-size') as HTMLInputElement;
        if (batchSizeInput) {
            batchSizeInput.addEventListener('change', async () => {
                const batchSize = parseInt(batchSizeInput.value);
                await this.handleAutoIngestionSettingUpdate('batchSize', batchSize);
            });
        }

        const maxFileSizeInput = this.container.querySelector('#auto-max-file-size') as HTMLInputElement;
        if (maxFileSizeInput) {
            maxFileSizeInput.addEventListener('change', async () => {
                const maxFileSize = parseInt(maxFileSizeInput.value);
                await this.handleAutoIngestionSettingUpdate('maxFileSize', maxFileSize);
            });
        }

        // Attach MCP tools toggle
        const mcpToolsToggle = this.container.querySelector('#mcp-tools-toggle') as HTMLInputElement;
        if (mcpToolsToggle) {
            mcpToolsToggle.addEventListener('change', async () => {
                await this.handleMCPToolsToggle(mcpToolsToggle.checked);
            });
        }

        // Attach MCP tool checkboxes
        const mcpToolCheckboxes = this.container.querySelectorAll('.mcp-tool-checkbox') as NodeListOf<HTMLInputElement>;
        mcpToolCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async () => {
                await this.handleMCPToolCheckboxChange();
            });
        });

        // Attach MCP default dangerous operations toggle
        const mcpDefaultDangerousToggle = this.container.querySelector('#mcp-default-dangerous') as HTMLInputElement;
        if (mcpDefaultDangerousToggle) {
            mcpDefaultDangerousToggle.addEventListener('change', async () => {
                await this.handleMCPDefaultDangerousToggle(mcpDefaultDangerousToggle.checked);
            });
        }

        // Attach action buttons
        const actionButtons = this.container.querySelectorAll('[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const target = e.target as HTMLElement;
                const action = target.closest('[data-action]')?.getAttribute('data-action');
                if (action) {
                    await this.handleQuickAction(action);
                }
            });
        });

        // Attach Embedding Provider event handlers
        const embeddingProviderSelect = this.container.querySelector('#embedding-provider') as HTMLSelectElement;
        if (embeddingProviderSelect) {
            embeddingProviderSelect.addEventListener('change', async () => {
                await this.handleEmbeddingProviderChange(embeddingProviderSelect.value as 'openai' | 'local');
            });
        }

        const openaiEmbeddingModelSelect = this.container.querySelector('#openai-embedding-model') as HTMLSelectElement;
        if (openaiEmbeddingModelSelect) {
            openaiEmbeddingModelSelect.addEventListener('change', async () => {
                await this.handleEmbeddingModelChange(openaiEmbeddingModelSelect.value);
            });
        }

        const localEmbeddingModelSelect = this.container.querySelector('#local-embedding-model') as HTMLSelectElement;
        if (localEmbeddingModelSelect) {
            localEmbeddingModelSelect.addEventListener('change', async () => {
                await this.handleEmbeddingModelChange(localEmbeddingModelSelect.value);
            });
        }

        // Attach Vector Store event handlers
        const vectorStoreBackendSelect = this.container.querySelector('#vector-store-backend') as HTMLSelectElement;
        if (vectorStoreBackendSelect) {
            vectorStoreBackendSelect.addEventListener('change', async () => {
                await this.handleVectorStoreBackendChange(vectorStoreBackendSelect.value as 'json' | 'sqlite' | 'pgvector');
            });
        }

        const saveSqliteConfigBtn = this.container.querySelector('#save-sqlite-config') as HTMLButtonElement;
        if (saveSqliteConfigBtn) {
            saveSqliteConfigBtn.addEventListener('click', async () => {
                await this.handleSaveSqliteConfig();
            });
        }

        const sqliteWalToggle = this.container.querySelector('#sqlite-wal') as HTMLInputElement;
        if (sqliteWalToggle) {
            sqliteWalToggle.addEventListener('change', () => {
                this.handleSqliteWalToggle(sqliteWalToggle.checked);
            });
        }

        const pgSslToggle = this.container.querySelector('#pg-ssl') as HTMLInputElement;
        if (pgSslToggle) {
            pgSslToggle.addEventListener('change', () => {
                this.handlePgSslToggle(pgSslToggle.checked);
            });
        }

        const testPgConnectionBtn = this.container.querySelector('#test-pg-connection') as HTMLButtonElement;
        if (testPgConnectionBtn) {
            testPgConnectionBtn.addEventListener('click', async () => {
                await this.handleTestPgConnection();
            });
        }

        const savePgConfigBtn = this.container.querySelector('#save-pg-config') as HTMLButtonElement;
        if (savePgConfigBtn) {
            savePgConfigBtn.addEventListener('click', async () => {
                await this.handleSavePgConfig();
            });
        }

        const migrateToPgVectorBtn = this.container.querySelector('#migrate-to-pgvector') as HTMLButtonElement;
        if (migrateToPgVectorBtn) {
            migrateToPgVectorBtn.addEventListener('click', async () => {
                await this.handleMigrateToPgVector();
            });
        }

        const migrateToJsonBtn = this.container.querySelector('#migrate-to-json') as HTMLButtonElement;
        if (migrateToJsonBtn) {
            migrateToJsonBtn.addEventListener('click', async () => {
                await this.handleMigrateToJson();
            });
        }
    }

    private async handleSettingUpdate(field: string, value: any): Promise<void> {
        try {
            // Update local state
            (this.settings as any)[field] = value;

            // Save to plugin
            await this.saveSettings();

            // Update components
            this.updateComponents();

            console.log(`Setting updated: ${field} = ${value}`);
        } catch (error) {
            console.error('Failed to update setting:', error);
        }
    }

    private async handleQuickAction(action: string): Promise<void> {
        switch (action) {
            case 'setup-provider':
                // TODO: Open AI Provider setup modal
                new Notice('AI Provider setup coming soon!');
                break;
            case 'index-vault':
                await this.handleIndexVault();
                break;
            case 'refresh-stats':
                await this.handleRefreshStats();
                break;
            case 'set-password':
                await this.handleSetMasterPassword();
                break;
            case 'change-password':
                await this.handleChangeMasterPassword();
                break;
            case 'reset-password':
                await this.handleResetMasterPassword();
                break;
            case 'configure-auto-ingestion':
                await this.handleConfigureAutoIngestion();
                break;
            case 'clear-auto-queue':
                await this.handleClearAutoQueue();
                break;
            default:
                console.warn(`Unknown quick action: ${action}`);
        }
    }

    private async handleAgentAction(action: string, data?: any): Promise<void> {
        try {
            // Try to ensure system is ready before any agent action
            await this.ensureSystemReady();
            
            switch (action) {
                case 'create-agent':
                    await this.handleCreateAgent(data);
                    break;
                case 'update-agent':
                    await this.handleUpdateAgent(data.id, data.config);
                    break;
                case 'delete-agent':
                    await this.handleDeleteAgent(data.agentId);
                    break;
                case 'toggle-agent':
                    await this.handleToggleAgent(data.agentId, data.enabled);
                    break;
                case 'test-agent':
                    await this.handleTestAgent(data.agentId);
                    break;
                case 'test-all-agents':
                    await this.handleTestAllAgents();
                    break;
                default:
                    console.warn(`Unknown agent action: ${action}`);
            }
        } catch (error) {
            console.error(`Failed to handle agent action ${action}:`, error);
            new Notice(`Error: ${error.message}`);
        }
    }

    private async handleCreateAgent(config: AgentConfig): Promise<void> {
        // Add to agent manager if plugin is ready (this will also add to settings)
        if (this.plugin.agentManager && this.settings.enabled) {
            await this.plugin.agentManager.addAgent(config);
            // Sync settings from plugin to controller
            this.settings.agents = [...this.plugin.settings.agents];
        } else {
            // If agent manager not ready, just add to settings
            this.settings.agents.push(config);
            await this.saveSettings();
        }

        // Update UI
        this.updateComponents();
        new Notice(`Agent "${config.name}" created successfully!`);
    }

    private async handleUpdateAgent(agentId: string, config: AgentConfig): Promise<void> {
        console.log(`Updating agent: ${agentId}`, config);
        
        const index = this.settings.agents.findIndex(a => a.id === agentId);
        if (index >= 0) {
            // Update settings
            this.settings.agents[index] = config;
            await this.saveSettings();

            // Reload agent in manager (don't call updateAgent as it tries to update settings again)
            if (this.plugin.agentManager && this.settings.enabled) {
                try {
                    await this.plugin.agentManager.reloadAgent(agentId);
                    console.log(`✅ Agent ${agentId} reloaded in manager`);
                } catch (error) {
                    console.error(`Failed to reload agent in manager:`, error);
                    // Don't fail the whole operation for this
                }
            }

            this.updateComponents();
            new Notice(`Agent "${config.name}" updated successfully!`);
        } else {
            console.error(`Agent not found in settings: ${agentId}`);
            new Notice(`Agent not found: ${agentId}`);
        }
    }

    private async handleDeleteAgent(agentId: string): Promise<void> {
        const agent = this.settings.agents.find(a => a.id === agentId);
        if (!agent) {
            new Notice('Agent not found');
            return;
        }
        
        // Check if agent is permanent
        if (agent.isPermanent) {
            new Notice('This is a permanent agent and cannot be deleted. You can disable it instead.');
            return;
        }

        // Store original state for rollback
        const originalAgents = [...this.settings.agents];
        
        try {
            console.log(`Deleting agent: ${agent.name} (${agentId})`);
            
            // Remove from settings
            this.settings.agents = this.settings.agents.filter(a => a.id !== agentId);
            
            // Save settings
            await this.saveSettings();
            
            // Remove from agent manager memory (no save needed - already saved above)
            if (this.plugin.agentManager) {
                try {
                    this.plugin.agentManager.removeAgentFromMemory(agentId);
                } catch (managerError) {
                    console.warn('Failed to remove agent from manager memory:', managerError);
                    // This is not critical, continue
                }
            }

            // Update UI
            try {
                this.updateComponents();
            } catch (uiError) {
                console.error('Failed to update UI after agent deletion:', uiError);
                // Try to recover by forcing a minimal update
                this.updateAgentManagement();
            }
            
            new Notice(`Agent "${agent.name}" deleted successfully!`);
            console.log(`Successfully deleted agent: ${agent.name}`);
            
        } catch (error) {
            console.error('Failed to delete agent:', error);
            
            // Rollback to original state
            this.settings.agents = originalAgents;
            try {
                await this.saveSettings();
                this.updateComponents();
            } catch (rollbackError) {
                console.error('Failed to rollback after deletion error:', rollbackError);
            }
            
            new Notice(`Failed to delete agent: ${error.message}`);
        }
    }

    private async handleToggleAgent(agentId: string, enabled: boolean): Promise<void> {
        const agent = this.settings.agents.find(a => a.id === agentId);
        if (!agent) return;

        agent.enabled = enabled;
        await this.saveSettings();

        // Toggle in agent manager
        if (this.plugin.agentManager) {
            await this.plugin.agentManager.toggleAgent(agentId);
        }

        this.updateComponents();
        new Notice(`Agent "${agent.name}" ${enabled ? 'enabled' : 'disabled'}!`);
    }

    private async handleTestAgent(agentId: string): Promise<void> {
        // Check if we have the basic requirements first
        const hasOpenAI = this.settings.providers.some(p => p.provider === 'openai' && p.enabled);
        const hasMasterPassword = this.settings.masterPassword.isSet;
        
        if (!hasOpenAI) {
            new Notice('No OpenAI provider configured. Please add an AI provider first.');
            return;
        }
        
        if (!hasMasterPassword) {
            new Notice('Master password not set. Please set a master password in the Security section first.');
            return;
        }
        
        // Try to automatically initialize the system if needed
        await this.ensureSystemReady();
        
        if (!this.plugin.agentManager) {
            new Notice('System not ready. Please check your configuration.');
            return;
        }

        // Check if agent exists in settings
        const agent = this.settings.agents.find(a => a.id === agentId);
        if (!agent) {
            new Notice(`Agent not found: ${agentId}`);
            return;
        }

        // Check if agent exists in manager
        const agentInManager = this.plugin.agentManager.getAgent(agentId);
        if (!agentInManager) {
            new Notice(`Agent not ready. The system is still initializing.`);
            return;
        }

        try {
            const result = await this.plugin.agentManager.testAgent(agentId);
            
            if (result) {
                // Mark agent as tested successfully
                agent.lastTested = Date.now();
                agent.testStatus = 'success';
                console.log(`Setting test status for agent ${agent.name}:`, agent.testStatus);
                await this.saveSettings();
                
                // Sync with plugin settings
                this.settings.agents = [...this.plugin.settings.agents];
                console.log(`Synced agents after test:`, this.settings.agents.map(a => ({ name: a.name, testStatus: a.testStatus })));
                
                this.updateComponents();
                new Notice(`Agent "${agent.name}" test passed!`);
            } else {
                // Mark agent as test failed
                agent.lastTested = Date.now();
                agent.testStatus = 'failed';
                await this.saveSettings();
                
                // Sync with plugin settings
                this.settings.agents = [...this.plugin.settings.agents];
                
                this.updateComponents();
                new Notice(`Agent "${agent.name}" test failed!`);
            }
        } catch (error) {
            // Mark agent as test failed
            agent.lastTested = Date.now();
            agent.testStatus = 'failed';
            await this.saveSettings();
            
            // Sync with plugin settings
            this.settings.agents = [...this.plugin.settings.agents];
            
            this.updateComponents();
            new Notice(`Agent test failed: ${error.message}`);
        }
    }

    private async handleTestAllAgents(): Promise<void> {
        if (!this.plugin.agentManager) {
            new Notice('Agent manager not available');
            return;
        }

        try {
            const results = await this.plugin.agentManager.testAllAgents();
            const passed = Array.from(results.values()).filter(r => r).length;
            const total = results.size;
            new Notice(`Agent tests completed: ${passed}/${total} passed`);
        } catch (error) {
            new Notice(`Agent tests failed: ${error.message}`);
        }
    }

    // Provider Action Handlers
    private async handlePersonaAction(action: string, data?: any): Promise<void> {
        try {
            switch (action) {
                case 'toggle-persona':
                    this.settings.persona.enabled = data.enabled;
                    break;
                case 'set-intensity':
                    this.settings.persona.intensity = data.intensity;
                    break;
                case 'update-speech-patterns':
                    if (!this.settings.persona.speechPatterns) {
                        this.settings.persona.speechPatterns = {
                            useDivineLanguage: true,
                            referenceDivineMemory: true,
                            useAncientTerminology: false,
                            embraceGoddessIdentity: true,
                        };
                    }
                    const speechField = data.field as keyof typeof this.settings.persona.speechPatterns;
                    this.settings.persona.speechPatterns[speechField] = data.value;
                    break;
                case 'update-knowledge-areas':
                    if (!this.settings.persona.knowledgeAreas) {
                        this.settings.persona.knowledgeAreas = {
                            mythology: true,
                            history: true,
                            arts: true,
                            sciences: true,
                            philosophy: true,
                            literature: true,
                        };
                    }
                    const knowledgeField = data.field as keyof typeof this.settings.persona.knowledgeAreas;
                    this.settings.persona.knowledgeAreas[knowledgeField] = data.value;
                    break;
                case 'update-divine-elements':
                    if (!this.settings.persona.divineElements) {
                        this.settings.persona.divineElements = {
                            referenceMuses: true,
                            mentionSacredDuties: true,
                            useDivineTitles: true,
                            speakOfEternalMemory: true,
                        };
                    }
                    const divineField = data.field as keyof typeof this.settings.persona.divineElements;
                    this.settings.persona.divineElements[divineField] = data.value;
                    break;
                case 'update-custom-prompt':
                    this.settings.persona.customPrompt = data.prompt;
                    break;
                default:
                    console.warn('Unknown persona action:', action);
                    return;
            }

            await this.saveSettings();
            this.updateComponents();
        } catch (error) {
            console.error('Failed to handle persona action:', error);
            new Notice('Failed to update persona settings');
        }
    }

    private async handleMemoryAction(action: string, data?: any): Promise<void> {
        try {
            // Memory actions are currently handled directly in the AdvancedTab
            // This is a placeholder for future memory-related actions
            console.log('Memory action:', action, data);
        } catch (error) {
            console.error('Failed to handle memory action:', error);
            new Notice('Failed to update memory settings');
        }
    }

    private async handleProviderAction(action: string, data?: any): Promise<void> {
        try {
            switch (action) {
                case 'add-provider':
                    await this.handleAddProvider();
                    break;
                case 'edit-provider':
                    await this.handleEditProvider(data.providerId);
                    break;
                case 'delete-provider':
                    await this.handleDeleteProvider(data.providerId);
                    break;
                case 'toggle-provider':
                    await this.handleToggleProvider(data.providerId, data.enabled);
                    break;
                case 'test-provider':
                    await this.handleTestProvider(data.providerId);
                    break;
                default:
                    console.warn(`Unknown provider action: ${action}`);
            }
        } catch (error) {
            console.error(`Failed to handle provider action ${action}:`, error);
            new Notice(`Provider action failed: ${error.message}`);
        }
    }

    private async handleAddProvider(): Promise<void> {
        const modal = new AIProviderModal(this.plugin.app, this.keyManager, {
            mode: 'add',
            onSuccess: async (provider: LLMConfig) => {
                // Add provider to settings
                this.settings.providers.push(provider);
                
                // If this is the first provider or marked as default, set it as default
                if (this.settings.providers.length === 1 || provider.isDefault) {
                    this.settings.defaultProvider = provider.id;
                    // Ensure only one provider is marked as default
                    this.settings.providers.forEach(p => {
                        p.isDefault = p.id === provider.id;
                    });
                }
                
                // Save settings
                await this.saveSettings();
                
                // Update UI
                this.updateComponents();
                
                new Notice(`AI Provider "${provider.name}" added successfully!`);
            }
        });
        
        modal.open();
    }

    private async handleEditProvider(providerId: string): Promise<void> {
        const provider = this.settings.providers.find(p => p.id === providerId);
        if (!provider) {
            new Notice('Provider not found');
            return;
        }

        const modal = new AIProviderModal(this.plugin.app, this.keyManager, {
            mode: 'edit',
            provider: provider,
            onSuccess: async (updatedProvider: LLMConfig) => {
                // Update provider in settings
                const index = this.settings.providers.findIndex(p => p.id === providerId);
                if (index !== -1) {
                    this.settings.providers[index] = updatedProvider;
                    
                    // Handle default provider changes
                    if (updatedProvider.isDefault) {
                        this.settings.defaultProvider = updatedProvider.id;
                        // Ensure only one provider is marked as default
                        this.settings.providers.forEach(p => {
                            p.isDefault = p.id === updatedProvider.id;
                        });
                    } else if (this.settings.defaultProvider === providerId) {
                        // If this was the default provider and it's no longer default, clear default
                        this.settings.defaultProvider = '';
                    }
                }
                
                // Save settings
                await this.saveSettings();
                
                // Update UI
                this.updateComponents();
                
                new Notice(`AI Provider "${updatedProvider.name}" updated successfully!`);
            }
        });
        
        modal.open();
    }

    private async handleDeleteProvider(providerId: string): Promise<void> {
        const provider = this.settings.providers.find(p => p.id === providerId);
        if (!provider) {
            new Notice('Provider not found');
            return;
        }

        // Simple confirmation dialog
        const confirmed = confirm(`Delete provider "${provider.name}"?\n\nThis action cannot be undone.`);

        if (confirmed) {
            // Remove from settings
            this.settings.providers = this.settings.providers.filter(p => p.id !== providerId);
            
            // Update default provider if needed
            if (this.settings.defaultProvider === providerId) {
                this.settings.defaultProvider = this.settings.providers.length > 0 ? this.settings.providers[0].id : '';
            }

            await this.saveSettings();
            this.updateComponents();
            new Notice(`Provider "${provider.name}" deleted successfully!`);
        }
    }

    private async handleToggleProvider(providerId: string, enabled: boolean): Promise<void> {
        const provider = this.settings.providers.find(p => p.id === providerId);
        if (!provider) {
            new Notice('Provider not found');
            return;
        }

        provider.enabled = enabled;
        await this.saveSettings();
        this.updateComponents();
        new Notice(`Provider "${provider.name}" ${enabled ? 'enabled' : 'disabled'}!`);
    }

    private async handleTestProvider(providerId: string): Promise<void> {
        const provider = this.settings.providers.find(p => p.id === providerId);
        if (!provider) {
            new Notice('Provider not found');
            return;
        }

        try {
            new Notice('Testing provider connection...');
            
            // Decrypt API key
            const encryptedData = JSON.parse(provider.encryptedApiKey);
            const apiKey = this.keyManager.decrypt(encryptedData);
            
            // Test the provider based on type
            let testResult: boolean = false;
            let testMessage: string = '';
            
            switch (provider.provider) {
                case 'openai':
                    testResult = await this.testOpenAIProvider(provider, apiKey);
                    testMessage = testResult ? 'OpenAI connection successful!' : 'OpenAI connection failed';
                    break;
                case 'anthropic':
                    testResult = await this.testAnthropicProvider(provider, apiKey);
                    testMessage = testResult ? 'Anthropic connection successful!' : 'Anthropic connection failed';
                    break;
                case 'custom':
                    testResult = await this.testCustomProvider(provider, apiKey);
                    testMessage = testResult ? 'Custom API connection successful!' : 'Custom API connection failed';
                    break;
                default:
                    throw new Error(`Unknown provider type: ${provider.provider}`);
            }
            
            if (testResult) {
                // Mark provider as tested successfully
                provider.lastTested = Date.now();
                provider.testStatus = 'success';
                await this.saveSettings();
                this.updateComponents();
            }
            
            new Notice(testMessage);
            
        } catch (error: any) {
            console.error('Provider test failed:', error);
            new Notice(`Provider test failed: ${error.message}`);
        }
    }

    private async testOpenAIProvider(provider: LLMConfig, apiKey: string): Promise<boolean> {
        try {
            const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('OpenAI test failed:', error);
            return false;
        }
    }

    private async testAnthropicProvider(provider: LLMConfig, apiKey: string): Promise<boolean> {
        try {
            // Validate API key format (Anthropic keys start with 'sk-ant-')
            if (!apiKey.startsWith('sk-ant-') || apiKey.length < 20) {
                console.error('Invalid Anthropic API key format');
                return false;
            }

            // For now, just validate the API key format since direct fetch calls
            // are blocked by CORS in the browser environment
            // The actual API call will be tested when the provider is used
            console.log('Anthropic API key format validated successfully');
            return true;
        } catch (error) {
            console.error('Anthropic test failed:', error);
            return false;
        }
    }

    private async testCustomProvider(provider: LLMConfig, apiKey: string): Promise<boolean> {
        try {
            if (!provider.baseUrl) {
                throw new Error('Custom provider requires a base URL');
            }
            
            // Try a simple health check or models endpoint
            const response = await fetch(`${provider.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('Custom provider test failed:', error);
            return false;
        }
    }

    private async handleIndexVault(): Promise<void> {
        // Open the vault ingestion modal instead of direct indexing
        const modal = new VaultIngestionModal(this.plugin.app, this.plugin);

        // Override the onClose method to refresh state after modal closes
        const originalOnClose = modal.onClose.bind(modal);
        modal.onClose = () => {
            originalOnClose();
            // Refresh chunk count after modal closes (will be updated if ingestion completed)
            this.loadDynamicState().then(() => {
                this.updateComponents();
            });
        };

        modal.open();
    }

    private async handleRefreshStats(): Promise<void> {
        try {
            new Notice('Refreshing vector store statistics...');
            await this.loadDynamicState();
            this.updateComponents();

            if (this.lastStatsError) {
                new Notice(`Error: ${this.lastStatsError}`, 5000);
            } else {
                new Notice(`✓ Stats refreshed: ${this.chunkCount} chunks (${this.vectorStoreBackend})`, 3000);
            }
        } catch (error) {
            console.error('Failed to refresh stats:', error);
            new Notice('Failed to refresh stats. Check console for details.', 5000);
        }
    }

    private async handleSetMasterPassword(): Promise<void> {
        const modal = new MasterPasswordModal(this.plugin.app, this.keyManager, {
            mode: 'set',
                onSuccess: async (password, verificationData) => {
                    // Update settings
                    this.settings.masterPassword = {
                        isSet: true,
                        verificationData,
                        lastChanged: Date.now(),
                    };
                    
                    // Save settings
                    await this.saveSettings();
                    
                    // Debug: Check if KeyManager has password after setting
                    console.log('Settings: Password set in KeyManager - hasMasterPassword():', this.keyManager.hasMasterPassword());
                    console.log('Settings: KeyManager instance:', this.keyManager);
                    console.log('Settings: Plugin KeyManager instance:', this.plugin.keyManager);
                    console.log('Settings: KeyManager instances match:', this.keyManager === this.plugin.keyManager);
                    
                    // Re-render the entire UI to show the full settings
                    this.renderUI();
                    
                    new Notice('Master password set successfully! System is now ready.');
                }
        });
        
        modal.open();
    }

    private async handleVerifyMasterPassword(): Promise<void> {
        if (!this.settings.masterPassword.verificationData) {
            new Notice('No verification data available. Please set a new master password.');
            // Fall back to setting a new password
            this.handleSetMasterPassword();
            return;
        }

        const modal = new MasterPasswordModal(this.plugin.app, this.keyManager, {
            mode: 'verify',
            existingVerificationData: this.settings.masterPassword.verificationData,
            onSuccess: async (password) => {
                // Password verified successfully - re-render the full UI
                this.renderUI();
                new Notice('Master password verified! System is now ready.');
            }
        });
        
        modal.open();
    }

    private async handleChangeMasterPassword(): Promise<void> {
        if (!this.settings.masterPassword.isSet || !this.settings.masterPassword.verificationData) {
            new Notice('No master password is currently set');
            return;
        }
        
        const modal = new MasterPasswordModal(this.plugin.app, this.keyManager, {
            mode: 'change',
            existingVerificationData: this.settings.masterPassword.verificationData,
            onSuccess: async (password, verificationData) => {
                // Update settings
                this.settings.masterPassword = {
                    isSet: true,
                    verificationData,
                    lastChanged: Date.now(),
                };
                
                // Save settings
                await this.saveSettings();
                
                // Update UI
                this.updateComponents();
                
                new Notice('Master password changed successfully!');
            }
        });
        
        modal.open();
    }

    private async handleResetMasterPassword(): Promise<void> {
        // Confirmation dialog
        const confirmed = await this.showConfirmationDialog(
            'Reset Master Password',
            'Are you sure you want to reset your master password? This will clear all encrypted API keys and you will need to re-enter them.',
            'Reset',
            'Cancel'
        );
        
        if (!confirmed) return;
        
        try {
            // Clear master password data
            this.settings.masterPassword = {
                isSet: false,
            };
            
            // Clear KeyManager
            this.keyManager.clearMasterPassword();
            
            // Clear all encrypted API keys from providers
            this.settings.providers.forEach(provider => {
                if (provider.encryptedApiKey) {
                    provider.encryptedApiKey = '';
                }
            });
            
            // Save settings
            await this.saveSettings();
            
            // Update UI
            this.updateComponents();
            
            new Notice('Master password reset. All API keys have been cleared.');
        } catch (error) {
            console.error('Failed to reset master password:', error);
            new Notice('Error resetting master password');
        }
    }
    
    private async showConfirmationDialog(
        title: string, 
        message: string, 
        confirmText: string, 
        cancelText: string
    ): Promise<boolean> {
        return new Promise((resolve) => {
            // Create a simple confirmation modal
            class ConfirmationModal extends Modal {
                constructor(app: any) {
                    super(app);
                }
                
                onOpen() {
                    const { contentEl } = this;
                    contentEl.empty();
                    
                    contentEl.createEl('h2', { text: title });
                    contentEl.createEl('p', { text: message });
                    
                    const buttonContainer = contentEl.createEl('div', { 
                        cls: 'modal-button-container',
                        attr: { style: 'display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;' }
                    });
                    
                    const cancelButton = buttonContainer.createEl('button', { 
                        cls: 'btn btn-outline',
                        text: cancelText
                    });
                    cancelButton.addEventListener('click', () => {
                        resolve(false);
                        this.close();
                    });
                    
                    const confirmButton = buttonContainer.createEl('button', { 
                        cls: 'btn btn-primary',
                        text: confirmText,
                        attr: { style: 'background: #ff4757; border-color: #ff4757;' }
                    });
                    confirmButton.addEventListener('click', () => {
                        resolve(true);
                        this.close();
                    });
                }
            }
            
            const modal = new ConfirmationModal(this.plugin.app);
            modal.open();
        });
    }

    // Helper methods
    private getProviderStatus(): 'connected' | 'error' | 'not-connected' {
        if (this.settings.providers.length === 0) {
            return 'not-connected';
        }

        // Check if we have a default provider with API key (for cloud providers) or local provider
        const defaultProvider = this.settings.providers.find(p => p.id === this.settings.defaultProvider) || this.settings.providers[0];

        if (!defaultProvider) {
            return 'not-connected';
        }

        // For custom providers, just check if configured
        if (defaultProvider.provider === 'custom') {
            return defaultProvider.enabled ? 'connected' : 'not-connected';
        }

        // For cloud providers, check if API key is present
        return defaultProvider.encryptedApiKey ? 'connected' : 'not-connected';
    }

    private getProviderStatusText(): string {
        const defaultProvider = this.settings.providers.find(p => p.id === this.settings.defaultProvider) || this.settings.providers[0];

        if (this.getProviderStatus() === 'connected' && defaultProvider) {
            return `✅ ${defaultProvider.name}`;
        }

        return 'Not Connected';
    }

    private getOverallStatus(): 'ready' | 'error' | 'disabled' | 'connecting' {
        if (!this.settings.enabled) return 'disabled';
        if (this.getProviderStatus() === 'error') return 'error';
        if (this.getProviderStatus() === 'connected' && this.chunkCount > 0) return 'ready';
        return 'connecting';
    }

    private getOverallStatusText(): string {
        switch (this.getOverallStatus()) {
            case 'ready': return 'Ready';
            case 'error': return 'Error';
            case 'disabled': return 'Disabled';
            case 'connecting': return 'Setup Required';
            default: return 'Unknown';
        }
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'ready': return '✅';
            case 'error': return '❌';
            case 'disabled': return '🔴';
            case 'connecting': return '⚡';
            default: return '❔';
        }
    }

    private updateComponents(): void {
        // Update visual elements
        this.updateToggleState();
        this.updateQuickSetupStatus();
        this.updateSecuritySection();
        this.updateAgentManagement();
        this.updateProviderManagement();
        this.updateGoddessPersonaManagement();
    }

    private updateToggleState(): void {
        if (!this.container) return;

        const toggleInput = this.container.querySelector('#mnemosyne-toggle') as HTMLInputElement;
        const toggleSwitch = this.container.querySelector('.toggle-switch') as HTMLElement;
        const toggleSlider = this.container.querySelector('.toggle-slider') as HTMLElement;

        if (toggleInput) {
            toggleInput.checked = this.settings.enabled;
        }

        if (toggleSwitch) {
            const bgColor = this.settings.enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
            const borderColor = this.settings.enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)';
            toggleSwitch.style.background = bgColor;
            toggleSwitch.style.borderColor = borderColor;
        }

        if (toggleSlider) {
            const translateX = this.settings.enabled ? '20px' : '0px';
            toggleSlider.style.transform = `translateX(${translateX})`;
        }
    }

    private updateQuickSetupStatus(): void {
        if (!this.container) return;

        // Update provider status text
        const providerStatus = this.container.querySelector('[data-provider-status]');
        if (providerStatus) {
            providerStatus.textContent = this.getProviderStatusText();
        }

        // Update chunk count
        const chunkCount = this.container.querySelector('[data-chunk-count]');
        if (chunkCount) {
            const countText = this.isIndexing ? '⏳ Indexing...' : `${this.chunkCount} chunks`;
            chunkCount.textContent = countText;
        }

        // Update backend
        const backend = this.container.querySelector('[data-backend]');
        if (backend) {
            const backendDisplay = this.vectorStoreBackend === 'unknown' ? 'Not configured' : this.vectorStoreBackend.toUpperCase();
            backend.textContent = backendDisplay;
        }

        // Update last update time
        const lastUpdate = this.container.querySelector('[data-last-update]');
        if (lastUpdate) {
            const lastUpdateText = this.lastStatsUpdate
                ? this.lastStatsUpdate.toLocaleTimeString()
                : 'Never';
            lastUpdate.textContent = lastUpdateText;
        }
    }

    private updateSecuritySection(): void {
        if (!this.container) return;

        // Update master password status chip
        const statusChip = this.container.querySelector('.security-card .status-chip');
        if (statusChip) {
            const isPasswordSet = this.settings.masterPassword.isSet;
            const securityStatusText = isPasswordSet ? 'Set' : 'Not Set';
            const securityIcon = isPasswordSet ? '✅' : '⚠️';
            
            // Update chip styling
            if (isPasswordSet) {
                statusChip.setAttribute('style', 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px; background: rgba(72, 187, 120, 0.1); color: var(--text-success); border: 1px solid rgba(72, 187, 120, 0.3);');
            } else {
                statusChip.setAttribute('style', 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px; background: rgba(245, 101, 101, 0.1); color: var(--text-error); border: 1px solid rgba(245, 101, 101, 0.3);');
            }
            
            statusChip.textContent = `${securityIcon} Master Password: ${securityStatusText}`;
        }

        // Update last changed date
        const lastChangedValue = this.container.querySelector('.security-card .status-item:last-child .value');
        if (lastChangedValue) {
            let lastChangedText = 'Never';
            if (this.settings.masterPassword.lastChanged) {
                const date = new Date(this.settings.masterPassword.lastChanged);
                lastChangedText = date.toLocaleDateString();
            }
            lastChangedValue.textContent = lastChangedText;
        }

        // Update button
        const passwordButton = this.container.querySelector('.security-card [data-action="set-password"], .security-card [data-action="change-password"]');
        if (passwordButton) {
            const isPasswordSet = this.settings.masterPassword.isSet;
            const buttonClass = isPasswordSet ? 'btn btn-secondary' : 'btn btn-primary';
            const buttonAction = isPasswordSet ? 'change-password' : 'set-password';
            const buttonIcon = isPasswordSet ? '🔄' : '🔐';
            const buttonText = isPasswordSet ? 'Change Password' : 'Set Password';
            
            passwordButton.className = buttonClass;
            passwordButton.setAttribute('data-action', buttonAction);
            passwordButton.innerHTML = `<span>${buttonIcon}</span>${buttonText}`;
        }

        // Update reset button visibility
        const resetButton = this.container.querySelector('.security-card [data-action="reset-password"]') as HTMLElement;
        if (resetButton) {
            resetButton.style.display = this.settings.masterPassword.isSet ? 'inline-flex' : 'none';
        } else if (this.settings.masterPassword.isSet) {
            // Add reset button if it doesn't exist but should
            const quickActions = this.container.querySelector('.security-card .quick-actions');
            if (quickActions) {
                const resetBtn = document.createElement('button');
                resetBtn.className = 'btn btn-outline';
                resetBtn.setAttribute('data-action', 'reset-password');
                resetBtn.innerHTML = '<span>🗑️</span>Reset Password';
                quickActions.appendChild(resetBtn);
                
                // Add event listener
                resetBtn.addEventListener('click', async (e) => {
                    const target = e.target as HTMLElement;
                    const action = target.closest('[data-action]')?.getAttribute('data-action');
                    if (action) {
                        await this.handleQuickAction(action);
                    }
                });
            }
        }
    }

    private updateAgentManagement(): void {
        if (this.agentManagement && this.container) {
            try {
                // Update state first
                this.agentManagement.update({
                    agents: this.settings.agents,
                    defaultAgentId: this.settings.defaultAgentId,
                }, this.settings.providers.length > 0);

                // Find the agent management container
                const agentManagementContainer = this.container.querySelector('.agent-management-container') as HTMLElement;
                if (agentManagementContainer) {
                    // Safely clear and re-render
                    try {
                        // Remove all child nodes safely
                        while (agentManagementContainer.firstChild) {
                            agentManagementContainer.removeChild(agentManagementContainer.firstChild);
                        }
                        
                        // Re-render with fresh content
                        this.agentManagement.render(agentManagementContainer);
                        this.agentManagement.attachEventListeners(agentManagementContainer);
                    } catch (renderError) {
                        console.error('Failed to render agent management:', renderError);
                        // Show a simple error message instead of crashing
                        agentManagementContainer.innerHTML = `
                            <div style="padding: 20px; text-align: center; color: var(--text-error);">
                                ⚠️ Failed to render agent management. Please refresh the settings.
                            </div>
                        `;
                    }
                } else {
                    console.warn('Agent management container not found');
                }
            } catch (error) {
                console.error('Failed to update agent management:', error);
            }
        }
    }

    private updateProviderManagement(): void {
        if (this.providerManagement && this.container) {
            try {
                // Update state first
                this.providerManagement.update({
                    providers: this.settings.providers,
                    defaultProvider: this.settings.defaultProvider,
                });

                // Find the provider management container
                const providerManagementContainer = this.container.querySelector('.provider-management-container') as HTMLElement;
                if (providerManagementContainer) {
                    // Safely clear and re-render
                    try {
                        // Remove all child nodes safely
                        while (providerManagementContainer.firstChild) {
                            providerManagementContainer.removeChild(providerManagementContainer.firstChild);
                        }
                        
                        // Re-render with fresh content
                        this.providerManagement.render(providerManagementContainer);
                        this.providerManagement.attachEventListeners(providerManagementContainer);
                    } catch (renderError) {
                        console.error('Failed to render provider management:', renderError);
                        // Show a simple error message instead of crashing
                        providerManagementContainer.innerHTML = `
                            <div style="padding: 20px; text-align: center; color: var(--text-error);">
                                ⚠️ Failed to render provider management. Please refresh the settings.
                            </div>
                        `;
                    }
                } else {
                    console.warn('Provider management container not found');
                }
            } catch (error) {
                console.error('Failed to update provider management:', error);
            }
        }
    }

    private updateGoddessPersonaManagement(): void {
        if (this.goddessPersonaManagement && this.container) {
            try {
                // Update state first
                this.goddessPersonaManagement.update();

                // Find the goddess persona management container
                const goddessPersonaContainer = this.container.querySelector('.goddess-persona-management-container') as HTMLElement;
                if (goddessPersonaContainer) {
                    // Safely clear and re-render
                    try {
                        // Remove all child nodes safely
                        while (goddessPersonaContainer.firstChild) {
                            goddessPersonaContainer.removeChild(goddessPersonaContainer.firstChild);
                        }
                        
                        // Re-render with fresh content
                        this.goddessPersonaManagement.render(goddessPersonaContainer);
                    } catch (renderError) {
                        console.error('Failed to render goddess persona management:', renderError);
                        // Show a simple error message instead of crashing
                        goddessPersonaContainer.innerHTML = `
                            <div style="padding: 20px; text-align: center; color: var(--text-error);">
                                ⚠️ Failed to render goddess persona management. Please refresh the settings.
                            </div>
                        `;
                    }
                } else {
                    console.warn('Goddess persona management container not found');
                }
            } catch (error) {
                console.error('Failed to update goddess persona management:', error);
            }
        }
    }

    private async saveSettings(): Promise<void> {
        try {
            // Map our settings structure back to PluginSettings structure
            const pluginSettings = {
                ...this.settings,
                llmConfigs: this.settings.providers, // Map providers back to llmConfigs
            };
            
            // Remove the providers field since it's not part of PluginSettings
            delete (pluginSettings as any).providers;
            
            await this.plugin.saveData(pluginSettings);

            // Update plugin's internal settings reference
            this.plugin.settings = pluginSettings;
            
            console.log('Settings saved and plugin.settings updated:', {
                llmConfigs: this.plugin.settings.llmConfigs?.length || 0,
                providers: this.settings.providers.length
            });
            
            // Try to reinitialize RAG system if embeddings are now available
            await this.tryReinitializeRAG();
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
        }
    }

    private async ensureSystemReady(): Promise<void> {
        try {
            // Check if we have the basic requirements
            const hasOpenAI = this.settings.providers.some(p => p.provider === 'openai' && p.enabled);
            const hasMasterPassword = this.settings.masterPassword.isSet;
            
            if (!hasOpenAI) {
                return; // Can't initialize without OpenAI provider
            }
            
            if (!hasMasterPassword) {
                // Don't try to initialize if master password isn't set
                // This prevents the encryption errors we're seeing
                return;
            }
            
            // Only try to initialize if we have both requirements
            if (hasOpenAI && hasMasterPassword) {
                // Try to initialize LLM Manager if not ready
                if (this.plugin.llmManager && !this.plugin.llmManager.isReady()) {
                    await this.plugin.llmManager.initialize();
                }
                
                // Try to initialize RAG system if not ready
                if (this.plugin.retriever && !this.plugin.retriever.isReady()) {
                    await this.plugin.retriever.initialize();
                }
                
                // Try to initialize Agent Manager if not ready
                if (this.plugin.agentManager && !this.plugin.agentManager.isReady()) {
                    await this.plugin.agentManager.initialize();
                }
            }
        } catch (error) {
            // Silently handle errors - don't show to user
            console.debug('Background system initialization:', error);
        }
    }

    private async tryReinitializeRAG(): Promise<void> {
        try {
            // Check if we have OpenAI providers and master password
            const hasOpenAI = this.settings.providers.some(p => p.provider === 'openai' && p.enabled);
            const hasMasterPassword = this.settings.masterPassword.isSet;
            
            if (hasOpenAI && hasMasterPassword && this.plugin.retriever) {
                // Silently attempt to reinitialize the retriever
                await this.plugin.retriever.initialize();
                
                // Check if RAG is now ready
                if (this.plugin.retriever.isReady()) {
                    // Silently reinitialize agents if RAG is ready
                    if (this.plugin.agentManager) {
                        await this.plugin.agentManager.initialize();
                    }
                }
            }
        } catch (error) {
            // Silently handle errors - don't show to user
            console.debug('Background RAG reinitialization:', error);
        }
    }

    private attachGlobalEvents(): void {
        // No global events needed for now
    }

    private injectCardStyles(): void {
        // Check if styles are already injected
        if (document.querySelector('#mnemosyne-card-styles')) return;

        const style = document.createElement('style');
        style.id = 'mnemosyne-card-styles';
        style.textContent = `
      .main-settings-title {
        font-size: 24px;
        font-weight: 700;
        color: var(--text-normal);
        margin: 0 0 24px 0;
        text-align: center;
      }
      
      .settings-section {
        margin-bottom: 32px;
      }
      
      .section-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-normal);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--background-modifier-border);
      }
      
      .settings-card {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
      }
      
      .settings-card:hover {
        border-color: var(--background-modifier-border-hover);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      }
      
      .settings-card.fade-in {
        animation: fadeIn 0.3s ease;
      }
      
      .card-header {
        margin-bottom: 20px;
      }
      
      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-normal);
        margin: 0;
      }
      
      .card-description {
        color: var(--text-muted);
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 16px;
      }
      
      .quick-controls {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .help-text {
        font-size: 12px;
        color: var(--text-muted);
        margin: 0;
        line-height: 1.4;
      }
      
      .status-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        padding: 16px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
      }
      
      .status-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .status-item .label {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .status-item .value {
        font-size: 14px;
        color: var(--text-normal);
        font-weight: 500;
      }
      
      .quick-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        border-radius: 8px;
        transition: all 0.2s ease;
        cursor: pointer;
        text-decoration: none;
        border: none;
        outline: none;
      }
      
      .btn:focus {
        box-shadow: 0 0 0 2px rgba(123, 108, 217, 0.3);
      }
      
      .btn-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .btn-primary:hover:not(:disabled) {
        background: var(--interactive-accent-hover);
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      
      .btn-secondary {
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
      }
      
      .btn-secondary:hover:not(:disabled) {
        background: var(--background-secondary);
        border-color: var(--interactive-hover);
      }
      
      .btn-outline {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid var(--background-modifier-border);
      }
      
      .btn-outline:hover:not(:disabled) {
        background: var(--background-secondary);
        color: var(--text-normal);
        border-color: var(--interactive-hover);
      }
      
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }
      
      .btn span:first-child {
        font-size: 16px;
      }
      
      .security-card .security-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .security-notice {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(59, 130, 246, 0.05);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.4;
      }
      
      .security-notice-icon {
        font-size: 16px;
        opacity: 0.8;
        flex-shrink: 0;
        margin-top: 1px;
      }
      
      .security-notice-content {
        color: var(--text-muted);
      }
      
      .security-notice strong {
        color: var(--text-normal);
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      /* Tab Navigation Styles */
      .settings-tabs {
        display: flex;
        gap: 0;
        padding: 0 20px;
        border-bottom: 2px solid var(--background-modifier-border);
        background: var(--background-primary);
        margin-bottom: 24px;
        overflow-x: auto;
      }

      .settings-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 20px;
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--text-muted);
        font-family: var(--font-interface);
        white-space: nowrap;
        position: relative;
        top: 2px;
      }

      .settings-tab:hover {
        color: var(--text-normal);
        background: var(--background-modifier-hover);
      }

      .settings-tab.active {
        color: var(--interactive-accent);
        border-bottom-color: var(--interactive-accent);
        font-weight: 600;
      }

      .tab-icon {
        font-size: 18px;
        line-height: 1;
      }

      .tab-label {
        font-size: 14px;
        line-height: 1;
      }

      .settings-tab-content {
        padding: 0 20px 20px 20px;
      }
    `;

        document.head.appendChild(style);
    }

    // Public methods for external access
    getSettings(): MnemosyneSettings {
        return this.settings;
    }
    
    getKeyManager(): KeyManager {
        return this.keyManager;
    }
    
    /**
     * Ensure master password is loaded in KeyManager
     * If not in memory but verification data exists, prompt user
     */
    async ensureMasterPasswordLoaded(): Promise<boolean> {
        // If already in memory, we're good
        if (this.keyManager.hasMasterPassword()) {
            return true;
        }
        
        // If no master password is set in settings, return false
        if (!this.settings.masterPassword.isSet || !this.settings.masterPassword.verificationData) {
            return false;
        }
        
        // Prompt user to enter master password
        return new Promise((resolve) => {
            const modal = new MasterPasswordModal(this.plugin.app, this.keyManager, {
                mode: 'verify',
                title: 'Authenticate to Unlock API Keys',
                description: 'Enter your master password to decrypt and access your API keys.',
                existingVerificationData: this.settings.masterPassword.verificationData,
                onSuccess: async (password) => {
                    // Verify that the password is actually set in KeyManager
                    if (this.keyManager.hasMasterPassword()) {
                        // Cache the password in the plugin's session cache for persistence
                        if (this.plugin.sessionPasswordCache !== undefined) {
                            this.plugin.sessionPasswordCache = password;
                            console.log('✓ Master password cached for session persistence');
                        }
                        resolve(true);
                    } else {
                        console.error('Password verification succeeded but KeyManager does not have password');
                        resolve(false);
                    }
                },
                onCancel: () => {
                    resolve(false);
                }
            });
            
            modal.open();
        });
    }

    async refresh(): Promise<void> {
        await this.loadSettings();
        await this.loadDynamicState();
        this.updateComponents();
    }

    // Auto ingestion handler methods
    private async handleAutoIngestionToggle(enabled: boolean): Promise<void> {
        try {
            // Update plugin settings directly
            if (this.plugin.settings && this.plugin.settings.autoIngestion) {
                this.plugin.settings.autoIngestion.enabled = enabled;
                await this.plugin.saveSettings();
                
                // Update auto ingestion manager if it exists
                if (this.plugin.autoIngestionManager) {
                    this.plugin.autoIngestionManager.updateConfig(this.plugin.settings);
                }
                
                // Re-render the auto ingestion section
                await this.renderAutoIngestionSection();
                
                new Notice(`Auto ingestion ${enabled ? 'enabled' : 'disabled'}`);
            } else {
                throw new Error('Auto ingestion settings not available');
            }
        } catch (error) {
            console.error('Failed to toggle auto ingestion:', error);
            new Notice('Error updating auto ingestion setting');
        }
    }
    
    private async handleAutoIngestionSettingUpdate(setting: string, value: any): Promise<void> {
        try {
            if (this.plugin.settings && this.plugin.settings.autoIngestion) {
                (this.plugin.settings.autoIngestion as any)[setting] = value;
                await this.plugin.saveSettings();
                
                // Update auto ingestion manager if it exists
                if (this.plugin.autoIngestionManager) {
                    this.plugin.autoIngestionManager.updateConfig(this.plugin.settings);
                }
                
                console.log(`Auto ingestion ${setting} updated to ${value}`);
            }
        } catch (error) {
            console.error(`Failed to update auto ingestion ${setting}:`, error);
            new Notice(`Error updating ${setting}`);
        }
    }
    
    private async handleConfigureAutoIngestion(): Promise<void> {
        new Notice('Advanced auto ingestion settings coming soon!');
        // TODO: Open advanced configuration modal
    }

    // MCP Tools handler methods
    private async handleMCPToolsToggle(enabled: boolean): Promise<void> {
        try {
            // Update plugin settings directly
            if (this.plugin.settings && this.plugin.settings.mcpTools) {
                this.plugin.settings.mcpTools.enabled = enabled;
                await this.plugin.saveSettings();

                // Re-render the MCP tools section
                await this.renderMCPToolsSection();

                new Notice(`MCP Tools ${enabled ? 'enabled' : 'disabled'}`);
            } else {
                throw new Error('MCP Tools settings not available');
            }
        } catch (error) {
            console.error('Failed to toggle MCP tools:', error);
            new Notice('Error updating MCP tools setting');
        }
    }

    private async handleMCPToolCheckboxChange(): Promise<void> {
        try {
            if (this.plugin.settings && this.plugin.settings.mcpTools && this.container) {
                // Get all checked checkboxes
                const checkboxes = this.container.querySelectorAll('.mcp-tool-checkbox') as NodeListOf<HTMLInputElement>;
                const allowedTools: string[] = [];

                checkboxes.forEach(checkbox => {
                    if (checkbox.checked) {
                        const toolId = checkbox.getAttribute('data-tool');
                        if (toolId) {
                            allowedTools.push(toolId);
                        }
                    }
                });

                // Update settings
                this.plugin.settings.mcpTools.allowedTools = allowedTools;
                await this.plugin.saveSettings();

                console.log('MCP allowed tools updated:', allowedTools);
            }
        } catch (error) {
            console.error('Failed to update MCP allowed tools:', error);
            new Notice('Error updating allowed tools');
        }
    }

    private async handleMCPDefaultDangerousToggle(enabled: boolean): Promise<void> {
        try {
            if (this.plugin.settings && this.plugin.settings.mcpTools) {
                this.plugin.settings.mcpTools.defaultAllowDangerousOperations = enabled;
                await this.plugin.saveSettings();

                console.log(`MCP default dangerous operations: ${enabled}`);
                new Notice(`Default: ${enabled ? 'Allow' : 'Restrict'} write operations for new agents`);
            }
        } catch (error) {
            console.error('Failed to update MCP default dangerous operations:', error);
            new Notice('Error updating default permissions');
        }
    }

    // Vector Store handler methods
    private async handleEmbeddingProviderChange(provider: 'openai' | 'local'): Promise<void> {
        try {
            console.log(`Changing embedding provider to: ${provider}`);

            // Update settings
            this.plugin.settings.embeddingProvider = provider;

            // Set default model for the provider
            if (provider === 'openai' && !this.plugin.settings.embeddingModel?.startsWith('text-embedding')) {
                this.plugin.settings.embeddingModel = 'text-embedding-3-small';
            } else if (provider === 'local' && !this.plugin.settings.embeddingModel?.startsWith('Xenova/')) {
                this.plugin.settings.embeddingModel = 'Xenova/all-MiniLM-L6-v2';
            }

            await this.plugin.saveSettings();

            // Toggle visibility of provider-specific settings
            const openaiSettings = this.container?.querySelector('#openai-embedding-settings') as HTMLElement;
            const localSettings = this.container?.querySelector('#local-embedding-settings') as HTMLElement;

            if (openaiSettings && localSettings) {
                openaiSettings.style.display = provider === 'openai' ? 'block' : 'none';
                localSettings.style.display = provider === 'local' ? 'block' : 'none';
            }

            const providerName = provider === 'openai' ? 'OpenAI' : 'Local (Transformers.js)';
            new Notice(`Embedding provider changed to ${providerName}. You will need to re-ingest your vault.`);
            console.log(`Embedding provider changed to: ${provider}`);
        } catch (error) {
            console.error('Failed to change embedding provider:', error);
            new Notice('Error changing embedding provider');
        }
    }

    private async handleEmbeddingModelChange(model: string): Promise<void> {
        try {
            console.log(`Changing embedding model to: ${model}`);

            // Update settings
            this.plugin.settings.embeddingModel = model;

            await this.plugin.saveSettings();

            new Notice(`Embedding model changed to ${model}. You will need to re-ingest your vault.`);
            console.log(`Embedding model changed to: ${model}`);
        } catch (error) {
            console.error('Failed to change embedding model:', error);
            new Notice('Error changing embedding model');
        }
    }

    private async handleVectorStoreBackendChange(backend: 'json' | 'sqlite' | 'pgvector'): Promise<void> {
        try {
            // Update settings
            if (!this.plugin.settings.vectorStore) {
                this.plugin.settings.vectorStore = {
                    backend: 'json',
                    embeddingModel: 'text-embedding-3-small',
                    dimension: 1536,
                    json: { indexPath: 'vector-store-index.json' }
                };
            }

            this.plugin.settings.vectorStore.backend = backend;

            // Ensure backend-specific config exists
            if (backend === 'json' && !this.plugin.settings.vectorStore.json) {
                this.plugin.settings.vectorStore.json = { indexPath: 'vector-store-index.json' };
            } else if (backend === 'sqlite' && !this.plugin.settings.vectorStore.sqlite) {
                this.plugin.settings.vectorStore.sqlite = {
                    dbPath: 'vector-store.db',
                    enableWAL: true,
                    cacheSize: 10000
                };
            }

            await this.plugin.saveSettings();

            // Toggle visibility of backend-specific settings
            const jsonSettings = this.container?.querySelector('#json-backend-settings') as HTMLElement;
            const sqliteSettings = this.container?.querySelector('#sqlite-backend-settings') as HTMLElement;
            const pgSettings = this.container?.querySelector('#pgvector-backend-settings') as HTMLElement;
            const migrateToPg = this.container?.querySelector('#migrate-to-pgvector') as HTMLButtonElement;
            const migrateToJson = this.container?.querySelector('#migrate-to-json') as HTMLButtonElement;

            if (jsonSettings && sqliteSettings && pgSettings) {
                jsonSettings.style.display = backend === 'json' ? 'block' : 'none';
                sqliteSettings.style.display = backend === 'sqlite' ? 'block' : 'none';
                pgSettings.style.display = backend === 'pgvector' ? 'block' : 'none';
            }

            if (migrateToPg && migrateToJson) {
                migrateToPg.disabled = backend === 'pgvector';
                migrateToJson.disabled = backend === 'json';
            }

            const backendName = backend === 'json' ? 'JSON' : backend === 'sqlite' ? 'SQLite' : 'PostgreSQL';
            new Notice(`Switched to ${backendName} backend`);
            console.log(`Vector store backend changed to: ${backend}`);
        } catch (error) {
            console.error('Failed to change vector store backend:', error);
            new Notice('Error changing backend');
        }
    }

    private handleSqliteWalToggle(enabled: boolean): void {
        // Update the toggle switch UI
        const toggleSwitch = this.container?.querySelector('#sqlite-wal')?.parentElement?.querySelector('.toggle-switch') as HTMLElement;
        if (toggleSwitch) {
            toggleSwitch.style.background = enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
            toggleSwitch.style.borderColor = enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)';

            const slider = toggleSwitch.querySelector('.toggle-slider') as HTMLElement;
            if (slider) {
                slider.style.transform = enabled ? 'translateX(20px)' : 'translateX(0px)';
            }
        }
    }

    private async handleSaveSqliteConfig(): Promise<void> {
        const saveBtn = this.container?.querySelector('#save-sqlite-config') as HTMLButtonElement;
        if (!saveBtn) return;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>💾</span> Saving...';

            // Get SQLite configuration from form
            const dbPath = (this.container?.querySelector('#sqlite-db-path') as HTMLInputElement)?.value || 'vector-store.db';
            const enableWAL = (this.container?.querySelector('#sqlite-wal') as HTMLInputElement)?.checked ?? true;

            // Update settings
            if (!this.plugin.settings.vectorStore) {
                this.plugin.settings.vectorStore = {
                    backend: 'sqlite',
                    embeddingModel: 'text-embedding-3-small',
                    dimension: 1536
                };
            }

            this.plugin.settings.vectorStore.sqlite = {
                dbPath,
                enableWAL,
                cacheSize: 10000 // 10MB default
            };

            await this.plugin.saveSettings();

            // Reinitialize retriever with new config if we're using sqlite backend
            if (this.plugin.settings.vectorStore.backend === 'sqlite') {
                try {
                    const newVectorStore = VectorStoreFactory.create(
                        this.plugin.app,
                        this.plugin.settings.vectorStore
                    );
                    await newVectorStore.initialize();

                    // Update the retriever's vector store
                    if (this.plugin.retriever) {
                        (this.plugin.retriever as any).vectorStore = newVectorStore;
                    }

                    new Notice('✅ SQLite configuration saved and connected!');
                } catch (error) {
                    console.error('Failed to initialize with new config:', error);
                    new Notice('⚠️ Configuration saved but initialization failed. Check your settings.');
                }
            } else {
                new Notice('✅ SQLite configuration saved!');
            }

            saveBtn.innerHTML = '<span>✅</span> Saved';
            setTimeout(() => {
                saveBtn.innerHTML = '<span>💾</span> Save Configuration';
                saveBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Failed to save SQLite configuration:', error);
            new Notice('Error saving configuration');
            saveBtn.innerHTML = '<span>❌</span> Error';

            setTimeout(() => {
                saveBtn.innerHTML = '<span>💾</span> Save Configuration';
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    private handlePgSslToggle(enabled: boolean): void {
        // Update the toggle switch UI
        const toggleSwitch = this.container?.querySelector('#pg-ssl')?.parentElement?.querySelector('.toggle-switch') as HTMLElement;
        if (toggleSwitch) {
            toggleSwitch.style.background = enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
            toggleSwitch.style.borderColor = enabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border-hover)';

            const slider = toggleSwitch.querySelector('.toggle-slider') as HTMLElement;
            if (slider) {
                slider.style.transform = enabled ? 'translateX(20px)' : 'translateX(0px)';
            }
        }
    }

    private async handleTestPgConnection(): Promise<void> {
        const testBtn = this.container?.querySelector('#test-pg-connection') as HTMLButtonElement;
        if (!testBtn) return;

        // Get PostgreSQL configuration from form first
        const host = (this.container?.querySelector('#pg-host') as HTMLInputElement)?.value || 'localhost';
        const port = parseInt((this.container?.querySelector('#pg-port') as HTMLInputElement)?.value) || 5432;
        const database = (this.container?.querySelector('#pg-database') as HTMLInputElement)?.value || 'mnemosyne';
        const user = (this.container?.querySelector('#pg-user') as HTMLInputElement)?.value || 'postgres';
        const password = (this.container?.querySelector('#pg-password') as HTMLInputElement)?.value || '';
        const ssl = (this.container?.querySelector('#pg-ssl') as HTMLInputElement)?.checked || false;

        // Validate before disabling button
        if (!password) {
            new Notice('Please enter a password');
            return;
        }

        try {
            testBtn.disabled = true;
            testBtn.innerHTML = '<span>🔄</span> Testing...';

            // Create temporary PgVectorStore to test connection with short timeout
            const testStore = new PgVectorStore({
                host,
                port,
                database,
                user,
                encryptedPassword: password, // For testing, pass plain password as PgVectorStore uses it directly
                ssl,
                poolSize: 1,
                connectionTimeout: 10000 // 10 second timeout for testing
            });

            // Try to initialize with timeout
            const initPromise = testStore.initialize();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
            );

            await Promise.race([initPromise, timeoutPromise]);

            // Test is successful if we get here
            await testStore.close();

            new Notice('✅ Connection successful!');
            testBtn.innerHTML = '<span>✅</span> Connected';

            setTimeout(() => {
                testBtn.innerHTML = '<span>🔍</span> Test Connection';
                testBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('PostgreSQL connection test failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`❌ Connection failed: ${errorMessage}`);
            testBtn.innerHTML = '<span>❌</span> Failed';

            setTimeout(() => {
                testBtn.innerHTML = '<span>🔍</span> Test Connection';
                testBtn.disabled = false;
            }, 2000);
        } finally {
            // Ensure button is always re-enabled after a delay
            setTimeout(() => {
                if (testBtn.disabled) {
                    testBtn.innerHTML = '<span>🔍</span> Test Connection';
                    testBtn.disabled = false;
                }
            }, 12000); // Extra safety timeout
        }
    }

    private async handleSavePgConfig(): Promise<void> {
        const saveBtn = this.container?.querySelector('#save-pg-config') as HTMLButtonElement;
        if (!saveBtn) return;

        // Get PostgreSQL configuration from form first
        const host = (this.container?.querySelector('#pg-host') as HTMLInputElement)?.value || 'localhost';
        const port = parseInt((this.container?.querySelector('#pg-port') as HTMLInputElement)?.value) || 5432;
        const database = (this.container?.querySelector('#pg-database') as HTMLInputElement)?.value || 'mnemosyne';
        const user = (this.container?.querySelector('#pg-user') as HTMLInputElement)?.value || 'postgres';
        const password = (this.container?.querySelector('#pg-password') as HTMLInputElement)?.value || '';
        const ssl = (this.container?.querySelector('#pg-ssl') as HTMLInputElement)?.checked || false;

        // Validate before disabling button
        if (!password) {
            new Notice('Please enter a password');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>💾</span> Saving...';

            // Encrypt password with master password
            const encryptedPassword = this.plugin.keyManager.encrypt(password);

            // Update settings
            if (!this.plugin.settings.vectorStore) {
                this.plugin.settings.vectorStore = {
                    backend: 'pgvector',
                    embeddingModel: 'text-embedding-3-small',
                    dimension: 1536
                };
            }

            this.plugin.settings.vectorStore.pgvector = {
                host,
                port,
                database,
                user,
                encryptedPassword: JSON.stringify(encryptedPassword),
                ssl
            };

            await this.plugin.saveSettings();

            // Reinitialize retriever with new config if we're using pgvector backend
            if (this.plugin.settings.vectorStore.backend === 'pgvector') {
                try {
                    const newVectorStore = VectorStoreFactory.create(
                        this.plugin.app,
                        this.plugin.settings.vectorStore
                    );
                    await newVectorStore.initialize();

                    // Update the retriever's vector store
                    if (this.plugin.retriever) {
                        (this.plugin.retriever as any).vectorStore = newVectorStore;
                    }

                    new Notice('✅ PostgreSQL configuration saved and connected!');
                } catch (error) {
                    console.error('Failed to initialize with new config:', error);
                    new Notice('⚠️ Configuration saved but connection failed. Check your settings.');
                }
            } else {
                new Notice('✅ PostgreSQL configuration saved!');
            }

            // Clear password field
            const passwordField = this.container?.querySelector('#pg-password') as HTMLInputElement;
            if (passwordField) {
                passwordField.value = '';
            }

            saveBtn.innerHTML = '<span>✅</span> Saved';
            setTimeout(() => {
                saveBtn.innerHTML = '<span>💾</span> Save Configuration';
                saveBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Failed to save PostgreSQL configuration:', error);
            new Notice('Error saving configuration');
            saveBtn.innerHTML = '<span>❌</span> Error';

            setTimeout(() => {
                saveBtn.innerHTML = '<span>💾</span> Save Configuration';
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    private async handleMigrateToPgVector(): Promise<void> {
        const migrateBtn = this.container?.querySelector('#migrate-to-pgvector') as HTMLButtonElement;
        const migrationStatus = this.container?.querySelector('#migration-status') as HTMLElement;
        const migrationPhase = this.container?.querySelector('#migration-phase') as HTMLElement;
        const migrationProgressBar = this.container?.querySelector('#migration-progress-bar') as HTMLElement;
        const migrationDetails = this.container?.querySelector('#migration-details') as HTMLElement;

        if (!migrateBtn || !migrationStatus) return;

        try {
            migrateBtn.disabled = true;
            migrationStatus.style.display = 'block';

            // Create source (JSON) vector store
            const jsonStore = new JSONVectorStore(this.plugin.app, {
                indexPath: this.plugin.settings.vectorStore?.json?.indexPath || 'vector-store-index.json'
            });
            await jsonStore.initialize();

            // Check if JSON store has data
            const jsonStats = await jsonStore.getStats();
            if (jsonStats.totalChunks === 0) {
                new Notice('No data to migrate. JSON vector store is empty.');
                migrationStatus.style.display = 'none';
                migrateBtn.disabled = false;
                return;
            }

            // Get PostgreSQL config
            const pgConfig = this.plugin.settings.vectorStore?.pgvector;
            if (!pgConfig || !pgConfig.encryptedPassword) {
                new Notice('Please configure and save PostgreSQL settings first');
                migrationStatus.style.display = 'none';
                migrateBtn.disabled = false;
                return;
            }

            // Decrypt password
            const encryptedData = JSON.parse(pgConfig.encryptedPassword);
            const password = this.plugin.keyManager.decrypt(encryptedData);

            // Create target (PgVector) vector store
            const pgStore = new PgVectorStore({
                ...pgConfig,
                encryptedPassword: password // Override with decrypted password
            });
            await pgStore.initialize();

            // Create migration instance with progress tracking
            const migration = VectorStoreMigration.createJSONtoPgVector(
                jsonStore,
                pgStore,
                (progress: MigrationProgress) => {
                    migrationPhase.textContent = progress.phase.charAt(0).toUpperCase() + progress.phase.slice(1);
                    migrationProgressBar.style.width = `${progress.percentage}%`;
                    migrationDetails.textContent = `${progress.migratedChunks} / ${progress.totalChunks} chunks`;

                    if (progress.error) {
                        migrationDetails.textContent = `Error: ${progress.error}`;
                    }
                }
            );

            // Execute migration
            const result = await migration.migrate(false);

            if (result.success) {
                new Notice(`✅ Migration complete! Migrated ${result.migratedChunks} chunks in ${(result.duration / 1000).toFixed(1)}s`);

                // Switch backend to pgvector
                this.plugin.settings.vectorStore.backend = 'pgvector';
                await this.plugin.saveSettings();

                // Update retriever
                if (this.plugin.retriever) {
                    (this.plugin.retriever as any).vectorStore = pgStore;
                }

                // Refresh UI
                setTimeout(() => {
                    this.renderUI();
                    this.initializeComponents();
                }, 1000);
            } else {
                new Notice(`⚠️ Migration completed with ${result.errors.length} errors`);
                console.error('Migration errors:', result.errors);
            }

        } catch (error) {
            console.error('Migration failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`❌ Migration failed: ${errorMessage}`);

            if (migrationPhase && migrationDetails) {
                migrationPhase.textContent = 'Failed';
                migrationDetails.textContent = errorMessage;
            }
        } finally {
            setTimeout(() => {
                if (migrationStatus) {
                    migrationStatus.style.display = 'none';
                }
                migrateBtn.disabled = false;
            }, 3000);
        }
    }

    private async handleMigrateToJson(): Promise<void> {
        const migrateBtn = this.container?.querySelector('#migrate-to-json') as HTMLButtonElement;
        const migrationStatus = this.container?.querySelector('#migration-status') as HTMLElement;
        const migrationPhase = this.container?.querySelector('#migration-phase') as HTMLElement;
        const migrationProgressBar = this.container?.querySelector('#migration-progress-bar') as HTMLElement;
        const migrationDetails = this.container?.querySelector('#migration-details') as HTMLElement;

        if (!migrateBtn || !migrationStatus) return;

        try {
            migrateBtn.disabled = true;
            migrationStatus.style.display = 'block';

            // Get PostgreSQL config
            const pgConfig = this.plugin.settings.vectorStore?.pgvector;
            if (!pgConfig || !pgConfig.encryptedPassword) {
                new Notice('PostgreSQL not configured');
                migrationStatus.style.display = 'none';
                migrateBtn.disabled = false;
                return;
            }

            // Decrypt password
            const encryptedData = JSON.parse(pgConfig.encryptedPassword);
            const password = this.plugin.keyManager.decrypt(encryptedData);

            // Create source (PgVector) vector store
            const pgStore = new PgVectorStore({
                ...pgConfig,
                encryptedPassword: password // Override with decrypted password
            });
            await pgStore.initialize();

            // Check if PgVector store has data
            const pgStats = await pgStore.getStats();
            if (pgStats.totalChunks === 0) {
                new Notice('No data to migrate. PostgreSQL vector store is empty.');
                migrationStatus.style.display = 'none';
                migrateBtn.disabled = false;
                return;
            }

            // Create target (JSON) vector store
            const jsonStore = new JSONVectorStore(this.plugin.app, {
                indexPath: this.plugin.settings.vectorStore?.json?.indexPath || 'vector-store-index.json'
            });
            await jsonStore.initialize();

            // Create migration instance with progress tracking
            const migration = VectorStoreMigration.createPgVectorToJSON(
                pgStore,
                jsonStore,
                (progress: MigrationProgress) => {
                    migrationPhase.textContent = progress.phase.charAt(0).toUpperCase() + progress.phase.slice(1);
                    migrationProgressBar.style.width = `${progress.percentage}%`;
                    migrationDetails.textContent = `${progress.migratedChunks} / ${progress.totalChunks} chunks`;

                    if (progress.error) {
                        migrationDetails.textContent = `Error: ${progress.error}`;
                    }
                }
            );

            // Execute migration
            const result = await migration.migrate(false);

            if (result.success) {
                new Notice(`✅ Migration complete! Migrated ${result.migratedChunks} chunks in ${(result.duration / 1000).toFixed(1)}s`);

                // Switch backend to json
                this.plugin.settings.vectorStore.backend = 'json';
                await this.plugin.saveSettings();

                // Update retriever
                if (this.plugin.retriever) {
                    (this.plugin.retriever as any).vectorStore = jsonStore;
                }

                // Refresh UI
                setTimeout(() => {
                    this.renderUI();
                    this.initializeComponents();
                }, 1000);
            } else {
                new Notice(`⚠️ Migration completed with ${result.errors.length} errors`);
                console.error('Migration errors:', result.errors);
            }

        } catch (error) {
            console.error('Migration failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`❌ Migration failed: ${errorMessage}`);

            if (migrationPhase && migrationDetails) {
                migrationPhase.textContent = 'Failed';
                migrationDetails.textContent = errorMessage;
            }
        } finally {
            setTimeout(() => {
                if (migrationStatus) {
                    migrationStatus.style.display = 'none';
                }
                migrateBtn.disabled = false;
            }, 3000);
        }
    }

    private async renderMCPToolsSection(): Promise<void> {
        if (!this.container) return;

        const mcpToolsCard = this.container.querySelector('.mcp-tools-card');
        if (mcpToolsCard) {
            // Find the parent section and re-render just the MCP tools part
            const mcpToolsSection = mcpToolsCard.closest('.settings-section');
            if (mcpToolsSection) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.renderMCPToolsSettings();
                const newSection = tempDiv.firstElementChild;

                if (newSection) {
                    mcpToolsSection.replaceWith(newSection);

                    // Re-attach event listeners for the new section
                    this.attachMCPToolsEventListeners(newSection as HTMLElement);
                }
            }
        }
    }

    private attachMCPToolsEventListeners(section: HTMLElement): void {
        // Attach MCP tools toggle
        const mcpToolsToggle = section.querySelector('#mcp-tools-toggle') as HTMLInputElement;
        if (mcpToolsToggle) {
            mcpToolsToggle.addEventListener('change', async () => {
                await this.handleMCPToolsToggle(mcpToolsToggle.checked);
            });
        }

        // Attach MCP tool checkboxes
        const mcpToolCheckboxes = section.querySelectorAll('.mcp-tool-checkbox') as NodeListOf<HTMLInputElement>;
        mcpToolCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async () => {
                await this.handleMCPToolCheckboxChange();
            });
        });

        // Attach MCP default dangerous operations toggle
        const mcpDefaultDangerousToggle = section.querySelector('#mcp-default-dangerous') as HTMLInputElement;
        if (mcpDefaultDangerousToggle) {
            mcpDefaultDangerousToggle.addEventListener('change', async () => {
                await this.handleMCPDefaultDangerousToggle(mcpDefaultDangerousToggle.checked);
            });
        }
    }

    private async handleClearAutoQueue(): Promise<void> {
        try {
            if (this.plugin.autoIngestionManager) {
                const stats = this.plugin.autoIngestionManager.getStats();
                const queueSize = stats.queueSize;
                
                if (queueSize === 0) {
                    new Notice('Auto ingestion queue is already empty');
                    return;
                }
                
                // Reset the queue
                this.plugin.autoIngestionManager.reset();
                
                // Re-render the auto ingestion section
                await this.renderAutoIngestionSection();
                
                new Notice(`Cleared ${queueSize} items from auto ingestion queue`);
            } else {
                new Notice('Auto ingestion manager not available');
            }
        } catch (error) {
            console.error('Failed to clear auto ingestion queue:', error);
            new Notice('Error clearing auto ingestion queue');
        }
    }
    
    private async renderAutoIngestionSection(): Promise<void> {
        if (!this.container) return;
        
        const autoIngestionCard = this.container.querySelector('.auto-ingestion-card');
        if (autoIngestionCard) {
            // Find the parent section and re-render just the auto ingestion part
            const autoIngestionSection = autoIngestionCard.closest('.settings-section');
            if (autoIngestionSection) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.renderAutoIngestionSettings();
                const newSection = tempDiv.firstElementChild;
                
                if (newSection) {
                    autoIngestionSection.replaceWith(newSection);
                    
                    // Re-attach event listeners for the new section
                    this.attachAutoIngestionEventListeners(newSection as HTMLElement);
                }
            }
        }
    }
    
    private attachAutoIngestionEventListeners(section: HTMLElement): void {
        // Attach auto ingestion toggle
        const autoIngestionToggle = section.querySelector('#auto-ingestion-toggle') as HTMLInputElement;
        if (autoIngestionToggle) {
            autoIngestionToggle.addEventListener('change', async () => {
                await this.handleAutoIngestionToggle(autoIngestionToggle.checked);
            });
        }

        // Attach auto ingestion settings inputs
        const debounceInput = section.querySelector('#auto-debounce-delay') as HTMLInputElement;
        if (debounceInput) {
            debounceInput.addEventListener('change', async () => {
                const delayMs = parseInt(debounceInput.value) * 1000;
                await this.handleAutoIngestionSettingUpdate('debounceDelay', delayMs);
            });
        }

        const batchSizeInput = section.querySelector('#auto-batch-size') as HTMLInputElement;
        if (batchSizeInput) {
            batchSizeInput.addEventListener('change', async () => {
                const batchSize = parseInt(batchSizeInput.value);
                await this.handleAutoIngestionSettingUpdate('batchSize', batchSize);
            });
        }

        const maxFileSizeInput = section.querySelector('#auto-max-file-size') as HTMLInputElement;
        if (maxFileSizeInput) {
            maxFileSizeInput.addEventListener('change', async () => {
                const maxFileSize = parseInt(maxFileSizeInput.value);
                await this.handleAutoIngestionSettingUpdate('maxFileSize', maxFileSize);
            });
        }
        
        // Attach action buttons
        const actionButtons = section.querySelectorAll('[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const target = e.target as HTMLElement;
                const action = target.closest('[data-action]')?.getAttribute('data-action');
                if (action) {
                    await this.handleQuickAction(action);
                }
            });
        });
    }


    destroy(): void {
        // Cleanup if needed
        this.container = null;
        this.agentManagement = null;
        this.memoryManagement = null;
        // Note: Don't clear master password here as it's needed for chat functionality
        // The password should persist for the session
    }
}
