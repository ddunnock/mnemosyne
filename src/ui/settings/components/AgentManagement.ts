// Agent Management UI Component - Modern vanilla TypeScript implementation

import { AgentConfig } from '../../../types/index';
import { App, Notice } from 'obsidian';

export interface AgentManagementState {
    agents: AgentConfig[];
    isEnabled: boolean;
}

export class AgentManagement {
    private state: AgentManagementState;
    private onSettingUpdate: (field: string, value: any) => Promise<void>;
    private onAgentAction: (action: string, data?: any) => Promise<void>;
    private plugin: any;
    private app: App;
    private container: HTMLElement | null = null;
    private hasProviders: boolean;

    constructor(
        initialState: AgentManagementState,
        onSettingUpdate: (field: string, value: any) => Promise<void>,
        onAgentAction: (action: string, data?: any) => Promise<void>,
        plugin: any,
        app: App,
        hasProviders: boolean
    ) {
        this.state = initialState;
        this.onSettingUpdate = onSettingUpdate;
        this.onAgentAction = onAgentAction;
        this.plugin = plugin;
        this.app = app;
        this.hasProviders = hasProviders;
    }

    render(): string {
        const { agents, isEnabled } = this.state;

        // Agent list
        const agentList = agents.length > 0
            ? agents.map(agent => this.renderAgentCard(agent)).join('')
            : this.renderEmptyState();

        return `
      <div class="agent-management settings-card">
        <div class="card-header">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <p class="card-description">Manage your AI assistants and specialized agents</p>
              ${this.renderStatusChip()}
            </div>
          </div>
          
          <!-- Agent Actions -->
          <div class="agent-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
            <button 
              class="btn btn-primary" 
              data-agent-action="create" 
              ${!this.hasProviders ? 'disabled title="Configure an AI provider first"' : ''}
            >
              <span>✨</span>
              Create Agent
            </button>
            <button 
              class="btn btn-secondary" 
              data-agent-action="import-templates" 
              ${!this.hasProviders ? 'disabled title="Configure an AI provider first"' : ''}
            >
              <span>📚</span>
              Import Templates
            </button>
            <button 
              class="btn btn-outline" 
              data-agent-action="test-all" 
              ${agents.length === 0 || !isEnabled ? 'disabled title="Enable Mnemosyne and create agents first"' : ''}
            >
              <span>🧪</span>
              Test All
            </button>
          </div>
        </div>
        
        <!-- Agent List -->
        <div class="agent-list" style="display: flex; flex-direction: column; gap: 12px;">
          ${agentList}
        </div>
      </div>
    `;
    }

    private renderStatusChip(): string {
        const { agents, isEnabled } = this.state;

        let status = 'disabled';
        let statusText = 'Disabled';
        let statusIcon = '⏸️';

        if (isEnabled) {
            if (agents.length === 0) {
                status = 'warning';
                statusText = 'No agents';
                statusIcon = '⚠️';
            } else {
                const enabledCount = agents.filter(a => a.enabled).length;
                status = 'ready';
                statusText = `${enabledCount} of ${agents.length} active`;
                statusIcon = '✅';
            }
        }

        const chipStyles = {
            ready: 'background: rgba(72, 187, 120, 0.1); color: var(--text-success); border: 1px solid rgba(72, 187, 120, 0.3);',
            warning: 'background: rgba(251, 191, 36, 0.1); color: var(--text-warning); border: 1px solid rgba(251, 191, 36, 0.3);',
            disabled: 'background: var(--background-modifier-border); color: var(--text-muted); border: 1px solid var(--background-modifier-border);',
        };

        const chipStyle = chipStyles[status as keyof typeof chipStyles] || chipStyles.disabled;

        return `
      <div class="status-chip" style="${chipStyle} display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px;">
        ${statusIcon} ${statusText}
      </div>
    `;
    }

    private renderEmptyState(): string {
        if (!this.hasProviders) {
            return `
        <div class="empty-state" style="padding: 40px 24px; text-align: center; border: 1px dashed var(--background-modifier-border); border-radius: 8px; background: var(--background-secondary);">
          <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
          <h4 style="font-size: 16px; font-weight: 600; color: var(--text-normal); margin-bottom: 8px;">
            No AI Provider Configured
          </h4>
          <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">
            Configure an AI provider before creating agents. Set up OpenAI, Anthropic, or a local model to get started.
          </p>
          <button class="btn btn-primary" data-action="setup-provider">
            <span>⚡</span>
            Setup AI Provider
          </button>
        </div>
      `;
        }

        return `
      <div class="empty-state" style="padding: 40px 24px; text-align: center; border: 1px dashed var(--background-modifier-border); border-radius: 8px; background: var(--background-secondary);">
        <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
        <h4 style="font-size: 16px; font-weight: 600; color: var(--text-normal); margin-bottom: 8px;">
          No Agents Yet
        </h4>
        <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">
          Create your first AI agent to assist with specific tasks, or import pre-built templates to get started quickly.
        </p>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button class="btn btn-primary" data-agent-action="create">
            <span>✨</span>
            Create Agent
          </button>
          <button class="btn btn-secondary" data-agent-action="import-templates">
            <span>📚</span>
            Import Templates
          </button>
        </div>
      </div>
    `;
    }

    private renderAgentCard(agent: AgentConfig): string {
        const enabledClass = agent.enabled ? 'agent-enabled' : 'agent-disabled';
        const statusDot = agent.enabled
            ? '<span style="display: inline-block; width: 8px; height: 8px; background: var(--text-success); border-radius: 50%; margin-right: 6px;"></span>'
            : '<span style="display: inline-block; width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; margin-right: 6px;"></span>';

        const descriptionPreview = agent.systemPrompt.length > 150
            ? agent.systemPrompt.substring(0, 150) + '...'
            : agent.systemPrompt;

        const modelDisplay = this.getModelDisplayName(agent) || 'Default';

        return `
      <div class="agent-card ${enabledClass}" style="padding: 16px; border: 1px solid var(--background-modifier-border); border-radius: 8px; background: var(--background-primary); transition: all 0.2s ease;">
        <div class="agent-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            ${statusDot}
            <h4 style="font-size: 15px; font-weight: 600; color: var(--text-normal); margin: 0;">
              ${agent.name}
            </h4>
          </div>
          
          <div class="agent-actions" style="display: flex; gap: 6px;">
            <button 
              class="btn btn-outline" 
              style="padding: 4px 8px; font-size: 12px;" 
              data-agent-action="toggle" 
              data-agent-id="${agent.id}"
              title="${agent.enabled ? 'Disable' : 'Enable'} agent"
            >
              ${agent.enabled ? '⏸️' : '▶️'}
            </button>
            <button 
              class="btn btn-outline" 
              style="padding: 4px 8px; font-size: 12px;" 
              data-agent-action="test" 
              data-agent-id="${agent.id}"
              title="Test agent"
              ${!agent.enabled ? 'disabled' : ''}
            >
              🧪
            </button>
            <button 
              class="btn btn-outline" 
              style="padding: 4px 8px; font-size: 12px;" 
              data-agent-action="edit" 
              data-agent-id="${agent.id}"
              title="Edit agent"
            >
              ✏️
            </button>
            <button 
              class="btn btn-outline" 
              style="padding: 4px 8px; font-size: 12px; color: var(--text-error);" 
              data-agent-action="delete" 
              data-agent-id="${agent.id}"
              title="Delete agent"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div class="agent-details">
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.4; margin-bottom: 8px;">
            ${descriptionPreview}
          </p>
          
          <div class="agent-meta" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
            <div>
              <span style="color: var(--text-muted); font-weight: 500;">Model:</span>
              <span style="color: var(--text-normal); margin-left: 6px;">${modelDisplay}</span>
            </div>
            <div>
              <span style="color: var(--text-muted); font-weight: 500;">Retrieval:</span>
              <span style="color: var(--text-normal); margin-left: 6px;">Top ${agent.retrievalSettings.topK}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    private getModelDisplayName(agent: AgentConfig): string {
        // Get the LLM configuration from the plugin settings to resolve the model name
        // Since AgentConfig uses llmId, we need to look up the corresponding LLM config
        try {
            const settings = this.plugin.settings;
            if (settings && settings.llmConfigs) {
                const llmConfig = settings.llmConfigs.find((config: any) => config.id === agent.llmId);
                if (llmConfig) {
                    return llmConfig.model || llmConfig.name || 'Unknown Model';
                }
            }
            return agent.llmId || 'Unknown Model';
        } catch (error) {
            console.warn('Failed to resolve model name:', error);
            return 'Unknown Model';
        }
    }

    attachEvents(container: HTMLElement): void {
        this.container = container;

        // Agent action buttons
        const agentActionButtons = container.querySelectorAll('[data-agent-action]');
        agentActionButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const target = e.target as HTMLElement;
                const actionButton = target.closest('[data-agent-action]') as HTMLElement;
                const action = actionButton?.getAttribute('data-agent-action');
                const agentId = actionButton?.getAttribute('data-agent-id');

                if (action) {
                    await this.handleAgentAction(action, agentId || undefined);
                }
            });
        });

        // Setup provider button (in empty state)
        const setupProviderButton = container.querySelector('[data-action="setup-provider"]');
        if (setupProviderButton) {
            setupProviderButton.addEventListener('click', () => {
                // This should trigger the main settings controller's setup provider action
                new Notice('AI Provider setup coming soon!');
            });
        }
    }

    private async handleAgentAction(action: string, agentId?: string): Promise<void> {
        try {
            switch (action) {
                case 'create':
                    await this.handleCreateAgent();
                    break;
                case 'import-templates':
                    await this.handleImportTemplates();
                    break;
                case 'test-all':
                    await this.onAgentAction('test-all-agents');
                    break;
                case 'toggle':
                    if (agentId) await this.handleToggleAgent(agentId);
                    break;
                case 'test':
                    if (agentId) await this.onAgentAction('test-agent', { agentId });
                    break;
                case 'edit':
                    if (agentId) await this.handleEditAgent(agentId);
                    break;
                case 'delete':
                    if (agentId) await this.handleDeleteAgent(agentId);
                    break;
                default:
                    console.warn(`Unknown agent action: ${action}`);
            }
        } catch (error: any) {
            console.error('Agent action failed:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    private async handleCreateAgent(): Promise<void> {
        // Open agent builder modal (placeholder)
        new Notice('Agent creation modal coming soon!');

        // TODO: Open AgentBuilderModal
        // const modal = new AgentBuilderModal(this.app, this.plugin, null, async (config: AgentConfig) => {
        //   await this.onAgentAction('create-agent', config);
        // });
        // modal.open();
    }

    private async handleImportTemplates(): Promise<void> {
        // Open template browser (placeholder)
        new Notice('Template browser coming soon!');
    }

    private async handleToggleAgent(agentId: string): Promise<void> {
        const agent = this.state.agents.find(a => a.id === agentId);
        if (agent) {
            await this.onAgentAction('toggle-agent', { agentId, enabled: !agent.enabled });
        }
    }

    private async handleEditAgent(agentId: string): Promise<void> {
        // Open agent builder modal for editing (placeholder)
        new Notice('Agent editing modal coming soon!');

        // TODO: Open AgentBuilderModal with existing config
        // const agent = this.state.agents.find(a => a.id === agentId);
        // if (agent) {
        //   const modal = new AgentBuilderModal(this.app, this.plugin, agent, async (config: AgentConfig) => {
        //     await this.onAgentAction('update-agent', { id: agentId, config });
        //   });
        //   modal.open();
        // }
    }

    private async handleDeleteAgent(agentId: string): Promise<void> {
        const agent = this.state.agents.find(a => a.id === agentId);
        if (!agent) return;

        // Simple confirmation dialog
        const confirmed = confirm(`Delete agent "${agent.name}"?\n\nThis action cannot be undone.`);

        if (confirmed) {
            await this.onAgentAction('delete-agent', { agentId });
        }
    }

    update(newState: AgentManagementState, hasProviders: boolean): void {
        this.state = newState;
        this.hasProviders = hasProviders;
    }

    destroy(): void {
        this.container = null;
    }
}
