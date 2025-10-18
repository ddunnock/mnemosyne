// Agent Management UI Component - Modern vanilla TypeScript implementation

import { AgentConfig } from '../../../types/index';
import { App, Modal, Notice } from 'obsidian';

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
      
    const modelDisplay = agent.llmConfig?.model || 'No model';
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
              <span style="color: var(--text-muted); font-weight: 500;">Type:</span>
              <span style="color: var(--text-normal); margin-left: 6px;">${agent.type || 'General'}</span>
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
          await this.handleAgentAction(action, agentId);
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
    } catch (error) {
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

// Agent Management Component for Settings UI

import { AgentConfig } from '../../../types';
import { AgentBuilderModal } from '../../agentBuilderModal';

export interface AgentManagementState {
  agents: AgentConfig[];
  hasProviders: boolean;
  isEnabled: boolean;
}

export class AgentManagement {
  private state: AgentManagementState;
  private onUpdate: (field: string, value: any) => void;
  private onAction: (action: string, data?: any) => Promise<void>;
  private plugin: any;
  private app: any;

  constructor(
    state: AgentManagementState,
    onUpdate: (field: string, value: any) => void,
    onAction: (action: string, data?: any) => Promise<void>,
    plugin: any,
    app: any
  ) {
    this.state = state;
    this.onUpdate = onUpdate;
    this.onAction = onAction;
    this.plugin = plugin;
    this.app = app;
  }

  render(): string {
    return `
      <div class="settings-card agent-management fade-in">
        <div class="card-header">
          <p class="card-description">Manage AI agents for specialized tasks and workflows</p>
          ${this.renderStatusChip()}
        </div>
        
        <div class="agent-controls">
          ${this.renderAgentsList()}
          ${this.renderActionButtons()}
        </div>
      </div>
    `;
  }
  
  private renderStatusChip(): string {
    let status = 'disabled';
    let statusText = 'Disabled';
    let icon = '🔴';
    
    if (!this.state.isEnabled) {
      status = 'disabled';
      statusText = 'Plugin Disabled';
      icon = '🔴';
    } else if (!this.state.hasProviders) {
      status = 'error';
      statusText = 'No AI Providers';
      icon = '❌';
    } else if (this.state.agents.length === 0) {
      status = 'connecting';
      statusText = 'No Agents';
      icon = '⚡';
    } else {
      const enabledAgents = this.state.agents.filter(a => a.enabled).length;
      status = 'ready';
      statusText = `${enabledAgents}/${this.state.agents.length} Active`;
      icon = '✅';
    }
    
    const chipStyles = {
      ready: 'background: rgba(72, 187, 120, 0.1); color: var(--text-success); border: 1px solid rgba(72, 187, 120, 0.3);',
      error: 'background: rgba(245, 101, 101, 0.1); color: var(--text-error); border: 1px solid rgba(245, 101, 101, 0.3);',
      disabled: 'background: var(--background-modifier-border); color: var(--text-muted); border: 1px solid var(--background-modifier-border);',
      connecting: 'background: rgba(59, 130, 246, 0.1); color: var(--interactive-accent); border: 1px solid rgba(59, 130, 246, 0.3);'
    };
    
    const chipStyle = chipStyles[status as keyof typeof chipStyles] || chipStyles.disabled;
    
    return `
      <div class="status-chip" style="${chipStyle} display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-top: 8px;">
        ${icon} ${statusText}
      </div>
    `;
  }

  private renderAgentsList(): string {
    if (!this.state.isEnabled) {
      return `
        <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
          <h3 style="margin-bottom: 8px;">Enable Mnemosyne</h3>
          <p>Enable Mnemosyne in Quick Setup to start managing agents.</p>
        </div>
      `;
    }

    if (!this.state.hasProviders) {
      return `
        <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
          <h3 style="margin-bottom: 8px;">Setup AI Provider First</h3>
          <p>Configure an AI provider in Quick Setup before creating agents.</p>
        </div>
      `;
    }

    if (this.state.agents.length === 0) {
      return `
        <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
          <h3 style="margin-bottom: 8px;">No Agents Created</h3>
          <p>Create your first AI agent to get started with specialized assistance.</p>
        </div>
      `;
    }

    const agentsHTML = this.state.agents.map(agent => this.renderAgentCard(agent)).join('');
    
    return `
      <div class="agents-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 20px;">
        ${agentsHTML}
      </div>
    `;
  }

  private renderAgentCard(agent: AgentConfig): string {
    const enabledClass = agent.enabled ? 'enabled' : 'disabled';
    const statusIcon = agent.enabled ? '✅' : '⏸️';
    const statusText = agent.enabled ? 'Active' : 'Disabled';
    
    // Get provider info
    const provider = this.getProviderInfo(agent.llmId);
    
    return `
      <div class="agent-card ${enabledClass}" data-agent-id="${agent.id}" style="
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 16px;
        transition: all 0.2s ease;
        cursor: pointer;
      ">
        <div class="agent-header" style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 12px;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: var(--text-normal);">
              ${this.escapeHtml(agent.name)}
            </h4>
            <div class="agent-status" style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500;">
              <span class="status-badge" style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 12px;
                background: ${agent.enabled ? 'rgba(72, 187, 120, 0.1)' : 'rgba(156, 163, 175, 0.1)'};
                color: ${agent.enabled ? 'var(--text-success)' : 'var(--text-muted)'};
                border: 1px solid ${agent.enabled ? 'rgba(72, 187, 120, 0.3)' : 'rgba(156, 163, 175, 0.3)'};
              ">
                ${statusIcon} ${statusText}
              </span>
            </div>
          </div>
          <div class="agent-menu" style="margin-left: 12px;">
            <button class="agent-menu-btn" data-action="toggle-menu" data-agent-id="${agent.id}" style="
              background: none;
              border: none;
              cursor: pointer;
              font-size: 16px;
              padding: 4px;
              border-radius: 4px;
              color: var(--text-muted);
              transition: all 0.2s ease;
            ">⋮</button>
          </div>
        </div>
        
        <div class="agent-description" style="
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        ">
          ${this.escapeHtml(agent.description)}
        </div>
        
        <div class="agent-meta" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--text-faint);
        ">
          <div class="provider-info">
            <span style="
              background: var(--background-primary);
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid var(--background-modifier-border);
            ">
              ${provider}
            </span>
          </div>
          <div class="agent-actions" style="display: flex; gap: 8px;">
            <button class="agent-action-btn" data-action="test-agent" data-agent-id="${agent.id}" style="
              background: none;
              border: none;
              cursor: pointer;
              font-size: 12px;
              color: var(--text-muted);
              padding: 4px 8px;
              border-radius: 4px;
              transition: all 0.2s ease;
            ">🧪 Test</button>
            <button class="agent-action-btn" data-action="edit-agent" data-agent-id="${agent.id}" style="
              background: none;
              border: none;
              cursor: pointer;
              font-size: 12px;
              color: var(--text-muted);
              padding: 4px 8px;
              border-radius: 4px;
              transition: all 0.2s ease;
            ">✏️ Edit</button>
            <button class="agent-action-btn" data-action="toggle-agent" data-agent-id="${agent.id}" style="
              background: none;
              border: none;
              cursor: pointer;
              font-size: 12px;
              color: var(--text-muted);
              padding: 4px 8px;
              border-radius: 4px;
              transition: all 0.2s ease;
            ">${agent.enabled ? '⏸️' : '▶️'} ${agent.enabled ? 'Disable' : 'Enable'}</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderActionButtons(): string {
    if (!this.state.isEnabled || !this.state.hasProviders) {
      return '';
    }

    return `
      <div class="agent-actions-bar" style="
        display: flex;
        gap: 12px;
        justify-content: flex-start;
        padding-top: 16px;
        border-top: 1px solid var(--background-modifier-border);
      ">
        <button class="btn btn-primary" data-action="create-agent" style="
          display: inline-flex;
          align-items: center;
          gap: 8px;
        ">
          <span>🎯</span>
          Create Agent
        </button>
        
        <button class="btn btn-secondary" data-action="import-template" style="
          display: inline-flex;
          align-items: center;
          gap: 8px;
        ">
          <span>📋</span>
          From Template
        </button>
        
        ${this.state.agents.length > 0 ? `
          <button class="btn btn-outline" data-action="test-all-agents" style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
          ">
            <span>🧪</span>
            Test All
          </button>
        ` : ''}
      </div>
    `;
  }

  private getProviderInfo(llmId: string): string {
    // This would normally look up the provider from settings
    // For now, return a placeholder
    return 'AI Provider';
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  attachEvents(container: HTMLElement): void {
    // Create Agent button
    const createBtn = container.querySelector('[data-action="create-agent"]');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        await this.handleCreateAgent();
      });
    }

    // Import Template button
    const templateBtn = container.querySelector('[data-action="import-template"]');
    if (templateBtn) {
      templateBtn.addEventListener('click', async () => {
        await this.handleImportTemplate();
      });
    }

    // Test All button
    const testAllBtn = container.querySelector('[data-action="test-all-agents"]');
    if (testAllBtn) {
      testAllBtn.addEventListener('click', async () => {
        await this.handleTestAllAgents();
      });
    }

    // Agent action buttons
    const agentActionBtns = container.querySelectorAll('.agent-action-btn');
    agentActionBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const action = target.getAttribute('data-action');
        const agentId = target.getAttribute('data-agent-id');
        
        if (action && agentId) {
          await this.handleAgentAction(action, agentId);
        }
      });
    });

    // Agent card hover effects
    const agentCards = container.querySelectorAll('.agent-card');
    agentCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        (card as HTMLElement).style.borderColor = 'var(--interactive-hover)';
        (card as HTMLElement).style.transform = 'translateY(-2px)';
        (card as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });

      card.addEventListener('mouseleave', () => {
        (card as HTMLElement).style.borderColor = 'var(--background-modifier-border)';
        (card as HTMLElement).style.transform = 'translateY(0)';
        (card as HTMLElement).style.boxShadow = 'none';
      });

      // Click to edit
      card.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.agent-action-btn')) {
          const agentId = card.getAttribute('data-agent-id');
          if (agentId) {
            this.handleAgentAction('edit-agent', agentId);
          }
        }
      });
    });
  }

  private async handleCreateAgent(): Promise<void> {
    const modal = new AgentBuilderModal(
      this.app,
      this.plugin,
      null,
      async (config: AgentConfig) => {
        await this.onAction('create-agent', config);
      }
    );
    modal.open();
  }

  private async handleImportTemplate(): Promise<void> {
    // Show template selection modal
    await this.handleCreateAgent(); // For now, same as create - template selection is built in
  }

  private async handleTestAllAgents(): Promise<void> {
    await this.onAction('test-all-agents');
  }

  private async handleAgentAction(action: string, agentId: string): Promise<void> {
    const agent = this.state.agents.find(a => a.id === agentId);
    if (!agent) return;

    switch (action) {
      case 'edit-agent':
        const modal = new AgentBuilderModal(
          this.app,
          this.plugin,
          agent,
          async (config: AgentConfig) => {
            await this.onAction('update-agent', { id: agentId, config });
          }
        );
        modal.open();
        break;
      
      case 'test-agent':
        await this.onAction('test-agent', { agentId });
        break;
      
      case 'toggle-agent':
        await this.onAction('toggle-agent', { agentId, enabled: !agent.enabled });
        break;
        
      case 'delete-agent':
        if (confirm(`Are you sure you want to delete "${agent.name}"?`)) {
          await this.onAction('delete-agent', { agentId });
        }
        break;
    }
  }

  update(newState: Partial<AgentManagementState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): AgentManagementState {
    return this.state;
  }
}