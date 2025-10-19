/**
 * Agent Management Component
 *
 * Manages the display and interaction with AI agents in the settings panel.
 * This component renders agent cards and handles all agent-related actions
 * including create, edit, delete, toggle, and test operations.
 */

import { Notice } from 'obsidian';
import { AgentConfig } from '../../../types';
import { AgentBuilderModal } from '../../agentBuilderModal';
import RiskManagementPlugin from '../../../main';

export interface AgentManagementState {
    agents: AgentConfig[];
    defaultAgentId?: string;
}

export class AgentManagement {
    private container: HTMLElement | null = null;
    private state: AgentManagementState;
    private hasProviders: boolean;
    private plugin: RiskManagementPlugin;
    private onAgentAction: (action: string, data?: any) => Promise<void>;

    constructor(
        plugin: RiskManagementPlugin,
        initialState: AgentManagementState,
        hasProviders: boolean,
        onAgentAction: (action: string, data?: any) => Promise<void>
    ) {
        this.plugin = plugin;
        this.state = initialState;
        this.hasProviders = hasProviders;
        this.onAgentAction = onAgentAction;
    }

    render(container: HTMLElement): HTMLElement {
        container.empty();

        // Section header
        const header = container.createDiv({ cls: 'settings-section-header' });
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '15px';

        const titleDiv = header.createDiv();
        titleDiv.createEl('h3', { text: '🤖 AI Agents', cls: 'settings-section-title' });
        titleDiv.createDiv({
            text: 'Configure specialized AI agents for different tasks',
            cls: 'settings-section-description'
        });

        const headerActions = header.createDiv({ cls: 'header-actions' });
        headerActions.style.display = 'flex';
        headerActions.style.gap = '8px';

        // Create agent button
        const createButton = headerActions.createEl('button', {
            text: '+ Create Agent',
            cls: 'mod-cta'
        });
        createButton.setAttribute('data-agent-action', 'create');
        createButton.style.padding = '6px 12px';
        createButton.style.cursor = 'pointer';

        // Import templates button
        const importButton = headerActions.createEl('button', {
            text: '📚 Import Templates'
        });
        importButton.setAttribute('data-agent-action', 'import-templates');
        importButton.style.padding = '6px 12px';
        importButton.style.cursor = 'pointer';

        // Content area
        const contentArea = container.createDiv({ cls: 'agents-content' });
        contentArea.style.marginTop = '20px';

        if (!this.hasProviders) {
            this.renderEmptyState(contentArea, 'no-providers');
        } else if (this.state.agents.length === 0) {
            this.renderEmptyState(contentArea, 'no-agents');
        } else {
            this.renderAgentsList(contentArea);
        }

        return container;
    }

    private renderEmptyState(container: HTMLElement, type: 'no-providers' | 'no-agents') {
        const emptyState = container.createDiv({ cls: 'empty-state' });
        emptyState.style.textAlign = 'center';
        emptyState.style.padding = '40px 20px';
        emptyState.style.color = 'var(--text-muted)';

        if (type === 'no-providers') {
            emptyState.createEl('div', {
                text: '⚠️',
                cls: 'empty-state-icon'
            }).style.fontSize = '48px';

            emptyState.createEl('h4', { text: 'No AI Providers Configured' });
            emptyState.createEl('p', {
                text: 'You need to configure at least one AI provider before creating agents.'
            });

            const setupButton = emptyState.createEl('button', {
                text: 'Setup AI Provider',
                cls: 'mod-cta'
            });
            setupButton.setAttribute('data-action', 'setup-provider');
            setupButton.style.marginTop = '15px';
        } else {
            emptyState.createEl('div', {
                text: '🤖',
                cls: 'empty-state-icon'
            }).style.fontSize = '48px';

            emptyState.createEl('h4', { text: 'No Agents Created Yet' });
            emptyState.createEl('p', {
                text: 'Create your first AI agent to get started. Choose from templates or build from scratch.'
            });
        }
    }

    private renderAgentsList(container: HTMLElement) {
        const agentsList = container.createDiv({ cls: 'agents-list' });
        agentsList.style.display = 'grid';
        agentsList.style.gap = '12px';

        this.state.agents.forEach(agent => {
            this.renderAgentCard(agentsList, agent);
        });

        // Test all button
        if (this.state.agents.length > 1) {
            const testAllContainer = container.createDiv();
            testAllContainer.style.marginTop = '20px';
            testAllContainer.style.textAlign = 'right';

            const testAllButton = testAllContainer.createEl('button', {
                text: '🧪 Test All Agents'
            });
            testAllButton.setAttribute('data-agent-action', 'test-all');
            testAllButton.style.padding = '8px 16px';
            testAllButton.style.cursor = 'pointer';
        }
    }

    private renderAgentCard(container: HTMLElement, agent: AgentConfig) {
        const card = container.createDiv({ cls: 'agent-card' });
        card.style.padding = '16px';
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.borderRadius = '8px';
        card.style.backgroundColor = 'var(--background-secondary)';

        // Header
        const cardHeader = card.createDiv({ cls: 'agent-card-header' });
        cardHeader.style.display = 'flex';
        cardHeader.style.justifyContent = 'space-between';
        cardHeader.style.alignItems = 'flex-start';
        cardHeader.style.marginBottom = '10px';

        const titleSection = cardHeader.createDiv();
        const titleDiv = titleSection.createDiv();
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.gap = '8px';

        const nameSpan = titleDiv.createEl('span', {
            text: agent.name,
            cls: 'agent-card-name'
        });
        nameSpan.style.fontWeight = '600';
        nameSpan.style.fontSize = '1.1em';

        if (agent.id === this.state.defaultAgentId) {
            const defaultBadge = titleDiv.createSpan({
                text: 'Default',
                cls: 'agent-default-badge'
            });
            defaultBadge.style.padding = '2px 6px';
            defaultBadge.style.fontSize = '0.75em';
            defaultBadge.style.borderRadius = '3px';
            defaultBadge.style.backgroundColor = 'var(--interactive-accent)';
            defaultBadge.style.color = 'white';
        }

        const statusBadge = cardHeader.createSpan({
            cls: `agent-status-badge ${agent.enabled ? 'enabled' : 'disabled'}`
        });
        statusBadge.setText(agent.enabled ? 'Enabled' : 'Disabled');
        statusBadge.style.padding = '4px 8px';
        statusBadge.style.borderRadius = '4px';
        statusBadge.style.fontSize = '0.85em';
        statusBadge.style.backgroundColor = agent.enabled
            ? 'var(--interactive-success)'
            : 'var(--background-modifier-error)';
        statusBadge.style.color = 'white';

        // Description
        if (agent.description) {
            const descDiv = card.createDiv({ cls: 'agent-card-description' });
            descDiv.setText(agent.description);
            descDiv.style.color = 'var(--text-muted)';
            descDiv.style.fontSize = '0.9em';
            descDiv.style.marginBottom = '10px';
        }

        // Metadata
        const metaContainer = card.createDiv({ cls: 'agent-card-meta' });
        metaContainer.style.display = 'grid';
        metaContainer.style.gridTemplateColumns = 'auto 1fr';
        metaContainer.style.gap = '8px';
        metaContainer.style.fontSize = '0.85em';
        metaContainer.style.color = 'var(--text-muted)';

        // Retrieval settings
        const topK = agent.retrievalSettings.topK;
        const threshold = (agent.retrievalSettings.scoreThreshold * 100).toFixed(0);
        const strategy = agent.retrievalSettings.searchStrategy;

        metaContainer.createSpan({ text: 'Retrieval:' }).style.fontWeight = '500';
        metaContainer.createSpan({
            text: `Top ${topK} chunks, ${threshold}% threshold, ${strategy}`
        });

        // Filters (if any)
        if (agent.metadataFilters && Object.keys(agent.metadataFilters).length > 0) {
            metaContainer.createSpan({ text: 'Filters:' }).style.fontWeight = '500';
            const filterText = Object.entries(agent.metadataFilters)
                .map(([key, values]) => `${key}: ${values?.join(', ') || 'none'}`)
                .join(' | ');
            metaContainer.createSpan({ text: filterText });
        }

        // Actions
        const actionsContainer = card.createDiv({ cls: 'agent-card-actions' });
        actionsContainer.style.marginTop = '15px';
        actionsContainer.style.display = 'flex';
        actionsContainer.style.gap = '8px';
        actionsContainer.style.flexWrap = 'wrap';

        // Toggle button
        const toggleBtn = actionsContainer.createEl('button', {
            text: agent.enabled ? 'Disable' : 'Enable'
        });
        toggleBtn.setAttribute('data-agent-action', 'toggle');
        toggleBtn.setAttribute('data-agent-id', agent.id);
        toggleBtn.style.padding = '6px 12px';
        toggleBtn.style.cursor = 'pointer';

        // Test button
        const testBtn = actionsContainer.createEl('button', { text: 'Test' });
        testBtn.setAttribute('data-agent-action', 'test');
        testBtn.setAttribute('data-agent-id', agent.id);
        testBtn.style.padding = '6px 12px';
        testBtn.style.cursor = 'pointer';

        // Edit button
        const editBtn = actionsContainer.createEl('button', { text: 'Edit' });
        editBtn.setAttribute('data-agent-action', 'edit');
        editBtn.setAttribute('data-agent-id', agent.id);
        editBtn.style.padding = '6px 12px';
        editBtn.style.cursor = 'pointer';

        // Delete button
        const deleteBtn = actionsContainer.createEl('button', {
            text: 'Delete',
            cls: 'mod-warning'
        });
        deleteBtn.setAttribute('data-agent-action', 'delete');
        deleteBtn.setAttribute('data-agent-id', agent.id);
        deleteBtn.style.padding = '6px 12px';
        deleteBtn.style.cursor = 'pointer';
    }

    attachEventListeners(container: HTMLElement): void {
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
                new Notice('Please configure an AI provider in the AI Providers section above');
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
        // Open agent builder modal for creating a new agent
        const modal = new AgentBuilderModal(
            this.plugin.app,
            this.plugin,
            null,
            async (config: AgentConfig) => {
                await this.onAgentAction('create-agent', config);
            }
        );
        modal.open();
    }

    private async handleImportTemplates(): Promise<void> {
        // Open template browser (placeholder for now)
        new Notice('Template browser coming soon!');
    }

    private async handleToggleAgent(agentId: string): Promise<void> {
        const agent = this.state.agents.find(a => a.id === agentId);
        if (agent) {
            await this.onAgentAction('toggle-agent', { agentId, enabled: !agent.enabled });
        }
    }

    private async handleEditAgent(agentId: string): Promise<void> {
        // Find the agent to edit
        const agent = this.state.agents.find(a => a.id === agentId);
        if (!agent) {
            new Notice('Agent not found');
            return;
        }

        // Open agent builder modal with existing agent config
        const modal = new AgentBuilderModal(
            this.plugin.app,
            this.plugin,
            agent,
            async (config: AgentConfig) => {
                await this.onAgentAction('update-agent', { id: agentId, config });
            }
        );
        modal.open();
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
