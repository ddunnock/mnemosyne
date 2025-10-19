// Main Settings Controller - Modern UI with Agent Management

import { AgentManagement, AgentManagementState } from './components/AgentManagement';
import { AgentConfig } from '../../types/index';
import { Notice } from 'obsidian';

export interface MnemosyneSettings {
    // Core functionality
    enabled: boolean;

    // AI Providers
    providers: AIProviderConfig[];
    defaultProvider: string;

    // Agents
    agents: AgentConfig[];
    defaultAgentId?: string;

    // Goddess Persona (placeholder for now)
    persona: {
        enabled: boolean;
        strength: 1 | 2 | 3;
    };

    // Advanced settings (placeholder for now)
    advanced: {
        debug: boolean;
    };

    // Internal
    version: string;
    initialized: boolean;
}

export interface AIProviderConfig {
    type: 'openai' | 'anthropic' | 'local';
    name: string;
    apiKey?: string;
    baseUrl?: string;
    model: string;
    isDefault: boolean;
}

export class MnemosyneSettingsController {
    private plugin: any;
    private container: HTMLElement | null = null;
    private settings: MnemosyneSettings;

    // Components
    private agentManagement: AgentManagement | null = null;

    // State
    private chunkCount = 0;
    private isIndexing = false;

    constructor(plugin: any) {
        this.plugin = plugin;
        this.settings = this.getDefaultSettings();
    }

    private getDefaultSettings(): MnemosyneSettings {
        return {
            enabled: false,
            providers: [],
            defaultProvider: '',
            agents: [],
            persona: {
                enabled: false,
                strength: 2,
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
    }

    private async loadSettings(): Promise<void> {
        try {
            const savedSettings = await this.plugin.loadData();
            this.settings = {
                ...this.getDefaultSettings(),
                ...savedSettings,
                // Ensure agents array exists
                agents: savedSettings?.agents || [],
                providers: savedSettings?.providers || [],
            };
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    private async loadDynamicState(): Promise<void> {
        try {
            // Get chunk count from vector store
            if (this.plugin.vectorStore) {
                this.chunkCount = await this.plugin.vectorStore.getChunkCount();
            }

            // Check if indexing is in progress
            this.isIndexing = this.plugin.vectorStore?.isIndexing() || false;
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

        // Return section with header - actual rendering will happen in initializeComponents
        return `
      <div class="settings-section">
        <h3 class="section-title">🎯 Agent Management</h3>
        <div class="agent-management-container"></div>
      </div>
    `;
    }

    private renderPlaceholderSections(): string {
        // Placeholder sections for future phases
        return `
      <div class="settings-section">
        <h3 class="section-title">🤖 AI Providers</h3>
        <div class="settings-card">
          <p class="card-description">Advanced provider management and configuration</p>
          <div style="padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--background-modifier-border); border-radius: 6px;">
            <div style="font-size: 24px; margin-bottom: 8px;">⚙️</div>
            <div>Advanced provider configuration interface coming soon</div>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h3 class="section-title">🧠 Goddess Persona</h3>
        <div class="settings-card">
          <p class="card-description">AI personality configuration coming in Phase 3</p>
          <div style="padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--background-modifier-border); border-radius: 6px;">
            <div style="font-size: 24px; margin-bottom: 8px;">🌟</div>
            <div>Persona controls will be available soon</div>
          </div>
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

        // Attach toggle switch event
        const toggleInput = this.container.querySelector('#mnemosyne-toggle') as HTMLInputElement;
        if (toggleInput) {
            toggleInput.addEventListener('change', async () => {
                await this.handleSettingUpdate('enabled', toggleInput.checked);
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
            default:
                console.warn(`Unknown quick action: ${action}`);
        }
    }

    private async handleAgentAction(action: string, data?: any): Promise<void> {
        try {
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
        // Add to settings
        this.settings.agents.push(config);
        await this.saveSettings();

        // Add to agent manager if plugin is ready
        if (this.plugin.agentManager && this.settings.enabled) {
            await this.plugin.agentManager.addAgent(config);
        }

        // Update UI
        this.updateComponents();
        new Notice(`Agent "${config.name}" created successfully!`);
    }

    private async handleUpdateAgent(agentId: string, config: AgentConfig): Promise<void> {
        const index = this.settings.agents.findIndex(a => a.id === agentId);
        if (index >= 0) {
            this.settings.agents[index] = config;
            await this.saveSettings();

            // Update in agent manager
            if (this.plugin.agentManager && this.settings.enabled) {
                await this.plugin.agentManager.updateAgent(config);
            }

            this.updateComponents();
            new Notice(`Agent "${config.name}" updated successfully!`);
        }
    }

    private async handleDeleteAgent(agentId: string): Promise<void> {
        const agent = this.settings.agents.find(a => a.id === agentId);
        if (!agent) return;

        // Remove from settings
        this.settings.agents = this.settings.agents.filter(a => a.id !== agentId);
        await this.saveSettings();

        // Remove from agent manager
        if (this.plugin.agentManager) {
            await this.plugin.agentManager.deleteAgent(agentId);
        }

        this.updateComponents();
        new Notice(`Agent "${agent.name}" deleted successfully!`);
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
        if (!this.plugin.agentManager) {
            new Notice('Agent manager not available');
            return;
        }

        try {
            const result = await this.plugin.agentManager.testAgent(agentId);
            const agent = this.settings.agents.find(a => a.id === agentId);
            new Notice(`Agent "${agent?.name}" test ${result ? 'passed' : 'failed'}!`);
        } catch (error) {
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

    private async handleIndexVault(): Promise<void> {
        if (this.plugin.vectorStore) {
            this.isIndexing = true;
            this.updateComponents();

            try {
                await this.plugin.vectorStore.ingestVault();
                this.chunkCount = await this.plugin.vectorStore.getChunkCount();
                new Notice('Vault indexed successfully!');
            } finally {
                this.isIndexing = false;
                this.updateComponents();
            }
        } else {
            throw new Error('Vector store not available');
        }
    }

    // Helper methods
    private getProviderStatus(): 'connected' | 'error' | 'not-connected' {
        if (this.settings.providers.length === 0) {
            return 'not-connected';
        }

        // Check if we have a default provider with API key (for cloud providers) or local provider
        const defaultProvider = this.settings.providers.find(p => p.isDefault) || this.settings.providers[0];

        if (!defaultProvider) {
            return 'not-connected';
        }

        // For local providers, just check if configured
        if (defaultProvider.type === 'local') {
            return defaultProvider.baseUrl ? 'connected' : 'not-connected';
        }

        // For cloud providers, check if API key is present
        return defaultProvider.apiKey ? 'connected' : 'not-connected';
    }

    private getProviderStatusText(): string {
        const defaultProvider = this.settings.providers.find(p => p.isDefault) || this.settings.providers[0];

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
        this.updateAgentManagement();
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

    private updateAgentManagement(): void {
        if (this.agentManagement && this.container) {
            this.agentManagement.update({
                agents: this.settings.agents,
                defaultAgentId: this.settings.defaultAgentId,
            }, this.settings.providers.length > 0);

            // Re-render agent management section
            const agentManagementContainer = this.container.querySelector('.agent-management-container') as HTMLElement;
            if (agentManagementContainer) {
                this.agentManagement.render(agentManagementContainer);
                this.agentManagement.attachEventListeners(agentManagementContainer);
            }
        }
    }

    private async saveSettings(): Promise<void> {
        try {
            await this.plugin.saveData(this.settings);

            // Update plugin's internal settings reference
            this.plugin.settings = this.settings;
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
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

    async refresh(): Promise<void> {
        await this.loadSettings();
        await this.loadDynamicState();
        this.updateComponents();
    }

    destroy(): void {
        // Cleanup if needed
        this.container = null;
        this.agentManagement = null;
    }
}
