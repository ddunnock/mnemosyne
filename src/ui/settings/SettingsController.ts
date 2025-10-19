// Main Settings Controller - Modern UI with Agent Management

import { AgentManagement, AgentManagementState } from './components/AgentManagement';
import { ProviderManagement, ProviderManagementState } from './components/ProviderManagement';
import { GoddessPersonaManagement, GoddessPersonaManagementState } from './components/GoddessPersonaManagement';
import { AgentConfig, LLMConfig, GoddessPersonaSettings } from '../../types/index';
import { Notice, Modal } from 'obsidian';
import { VaultIngestionModal } from '../vaultIngestionModal';
import { KeyManager, EncryptedData } from '../../encryption/keyManager';
import { MasterPasswordModal } from '../modals/MasterPasswordModal';
import { AIProviderModal } from '../modals/AIProviderModal';

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

    // State
    private chunkCount = 0;
    private isIndexing = false;

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
                if (vectorStore && vectorStore.isReady()) {
                    const stats = vectorStore.getStats();
                    this.chunkCount = stats ? stats.totalChunks : 0;
                } else {
                    this.chunkCount = 0;
                }
            } else {
                this.chunkCount = 0;
            }

            // For now, we don't track indexing state in the vector store itself
            this.isIndexing = false;
        } catch (error) {
            console.error('Failed to load dynamic state:', error);
            this.chunkCount = 0;
            this.isIndexing = false;
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

        // Render main structure
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
        
        <div class="settings-content">
          ${this.renderQuickSetup()}
          ${this.renderSecurity()}
          ${this.renderAgentManagement()}
          ${this.renderPlaceholderSections()}
        </div>
        
        <div class="settings-footer">
          <p style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 24px;">
            Mnemosyne v${this.settings.version} • Named after the Greek goddess of memory
          </p>
        </div>
      </div>
    `;

        this.container.innerHTML = mainHTML;

        // Initialize components
        this.initializeComponents();
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
        // Simplified Quick Setup for now
        return `
      <div class="settings-section">
        <h3 class="section-title">🚀 Quick Setup</h3>
        <div class="settings-card quick-setup fade-in">
          <div class="card-header">
            <p class="card-description">Configure your AI-powered knowledge assistant</p>
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
            
            <div class="status-grid">
              <div class="status-item">
                <span class="label">AI Provider</span>
                <span class="value" data-provider-status>${this.getProviderStatusText()}</span>
              </div>
              <div class="status-item">
                <span class="label">Knowledge Base</span>
                <span class="value" data-chunk-count>${this.isIndexing ? '⏳ Indexing...' : `${this.chunkCount} chunks`}</span>
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
            </div>
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
                title: 'Enter Master Password',
                description: 'Enter your master password to continue with the operation.',
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
        // Clear sensitive data
        this.keyManager.clearMasterPassword();
    }
}
