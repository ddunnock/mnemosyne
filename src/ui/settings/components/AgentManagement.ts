// Agent Management UI Component - Modern vanilla TypeScript implementation

import { AgentConfig } from '../../../types/index';
import { App, Notice } from 'obsidian';

export interface AgentManagementState {
  agents: AgentConfig[];
  hasProviders: boolean;
  isEnabled: boolean;
}

export class AgentManagement {
  private state: AgentManagementState;
  private onSettingUpdate: (field: string, value: any) => Promise<void>;
  private onAgentAction: (action: string, data?: any) => Promise<void>;
  private plugin: any;
  private app: App;
  private container: HTMLElement | null = null;

  constructor(
    initialState: AgentManagementState,
    onSettingUpdate: (field: string, value: any) => Promise<void>,
    onAgentAction: (action: string, data?: any) => Promise<void>,
    plugin: any,
    app: App
  ) {
    this.state = initialState;
    this.onSettingUpdate = onSettingUpdate;
    this.onAgentAction = onAgentAction;
    this.plugin = plugin;
    this.app = app;
  }

  render(): string {
    const { agents, hasProviders, isEnabled } = this.state;
    
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
              ${!hasProviders ? 'disabled title="Configure an AI provider first"' : ''}
            >
              <span>✨</span>
              Create Agent
            </button>
            <button 
              class="btn btn-secondary" 
              data-agent-action="import-templates" 
              ${!hasProviders ? 'disabled title="Configure an AI provider first"' : ''}
            >
              <span>📚</span>
              Import Templates
            </button>
            <button 
              class="btn btn-outline" 
              data-agent-action="test-all" 
              ${agents.length === 0 || !isEnabled ? 'disabled' : ''}
            >
              <span>🧪</span>
              Test All
            </button>
          </div>
        </div>
        
        <!-- Agents List -->
        <div class="agents-list">
          ${agentList}
        </div>
      </div>
    `;
  }

  private renderStatusChip(): string {
    const { agents, isEnabled } = this.state;
    const activeCount = agents.filter(a => a.enabled).length;
    const totalCount = agents.length;
    
    let status = 'disabled';
    let text = 'Disabled';
    let color = 'var(--background-modifier-border)';
    let textColor = 'var(--text-muted)';
    
    if (isEnabled) {
      if (totalCount === 0) {
        status = 'empty';
        text = 'No Agents';
        color = 'rgba(59, 130, 246, 0.1)';
        textColor = 'var(--interactive-accent)';
      } else if (activeCount > 0) {
        status = 'active';
        text = `${activeCount}/${totalCount} Active`;
        color = 'rgba(72, 187, 120, 0.1)';
        textColor = 'var(--text-success)';
      } else {
        status = 'inactive';
        text = `${totalCount} Inactive`;
        color = 'rgba(245, 101, 101, 0.1)';
        textColor = 'var(--text-error)';
      }
    }
    
    return `
      <div class="status-chip" style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        background: ${color};
        color: ${textColor};
        border: 1px solid ${color};
        margin-top: 8px;
      ">
        ${this.getStatusIcon(status)} ${text}
      </div>
    `;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return '✅';
      case 'inactive': return '⏸️';
      case 'empty': return '🔷';
      case 'disabled': return '🔴';
      default: return '❔';
    }
  }

  private renderEmptyState(): string {
    const { hasProviders } = this.state;
    
    if (!hasProviders) {
      return `
        <div class="empty-state" style="
          padding: 40px 20px;
          text-align: center;
          border: 1px dashed var(--background-modifier-border);
          border-radius: 8px;
          background: var(--background-primary);
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">⚡</div>
          <h3 style="color: var(--text-normal); font-size: 18px; margin-bottom: 8px;">Configure AI Provider First</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">
            Set up an AI provider (OpenAI, Anthropic, or local Ollama) before creating agents.
          </p>
          <button class="btn btn-primary" data-action="setup-provider">
            <span>⚡</span>
            Setup AI Provider
          </button>
        </div>
      `;
    }
    
    return `
      <div class="empty-state" style="
        padding: 40px 20px;
        text-align: center;
        border: 1px dashed var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
        <h3 style="color: var(--text-normal); font-size: 18px; margin-bottom: 8px;">No Agents Yet</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">
          Create your first AI agent to get started. Choose from templates or create a custom agent.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" data-agent-action="create">
            <span>✨</span>
            Create Agent
          </button>
          <button class="btn btn-secondary" data-agent-action="import-templates">
            <span>📚</span>
            Browse Templates
          </button>
        </div>
      </div>
    `;
  }

  private renderAgentCard(agent: AgentConfig): string {
    const statusColor = agent.enabled 
      ? 'background: rgba(72, 187, 120, 0.1); color: var(--text-success);' 
      : 'background: var(--background-modifier-border); color: var(--text-muted);';
      
    // Find LLM config by ID to get model name
    const llmConfig = this.plugin?.settings?.llmConfigs?.find((c: any) => c.id === agent.llmId);
    const modelDisplay = llmConfig?.model || 'Unknown model';
    
    const descriptionPreview = agent.description 
      ? (agent.description.length > 100 ? agent.description.substring(0, 100) + '...' : agent.description)
      : 'No description';

    return `
      <div class="agent-card" style="
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        background: var(--background-primary);
        transition: all 0.2s ease;
      ">
        <div class="agent-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-normal);">
              ${agent.name}
            </h4>
            <div class="agent-status" style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
              ${statusColor}
            ">
              ${agent.enabled ? '✅ Active' : '⏸️ Disabled'}
            </div>
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

  update(newState: AgentManagementState): void {
    this.state = newState;
  }

  destroy(): void {
    this.container = null;
  }
}