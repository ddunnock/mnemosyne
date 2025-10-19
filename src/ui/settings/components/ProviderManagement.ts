/**
 * Provider Management Component
 *
 * Manages the display and interaction with AI providers in the settings panel.
 * This component renders provider cards and handles all provider-related actions
 * including create, edit, delete, and test operations.
 */

import { Notice } from 'obsidian';
import { LLMConfig } from '../../../types';
import RiskManagementPlugin from '../../../main';

export interface ProviderManagementState {
    providers: LLMConfig[];
    defaultProvider?: string;
}

export class ProviderManagement {
    private container: HTMLElement | null = null;
    private state: ProviderManagementState;
    private plugin: RiskManagementPlugin;
    private onProviderAction: (action: string, data?: any) => Promise<void>;

    constructor(
        plugin: RiskManagementPlugin,
        initialState: ProviderManagementState,
        onProviderAction: (action: string, data?: any) => Promise<void>
    ) {
        this.plugin = plugin;
        this.state = initialState;
        this.onProviderAction = onProviderAction;
    }

    render(container: HTMLElement): HTMLElement {
        try {
            // Clear container safely
            if (container && typeof container.empty === 'function') {
                container.empty();
            } else {
                // Fallback clearing method
                while (container?.firstChild) {
                    container.removeChild(container.firstChild);
                }
            }

            // Section header
            const header = container.createDiv({ cls: 'settings-section-header' });
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '15px';

            const titleDiv = header.createDiv();
            titleDiv.createEl('h3', { text: '🤖 AI Providers', cls: 'settings-section-title' });
            titleDiv.createDiv({
                text: 'Configure your AI providers and API keys',
                cls: 'settings-section-description'
            });

            const headerActions = header.createDiv({ cls: 'header-actions' });
            headerActions.style.display = 'flex';
            headerActions.style.gap = '8px';

            // Add provider button
            const addButton = headerActions.createEl('button', {
                text: '+ Add Provider',
                cls: 'mod-cta'
            });
            addButton.setAttribute('data-provider-action', 'add');
            addButton.style.padding = '6px 12px';
            addButton.style.cursor = 'pointer';

            // Content area
            const contentArea = container.createDiv({ cls: 'providers-content' });
            contentArea.style.marginTop = '20px';

            if (this.state.providers.length === 0) {
                this.renderEmptyState(contentArea);
            } else {
                this.renderProvidersList(contentArea);
            }

            return container;
        } catch (error) {
            console.error('Failed to render ProviderManagement:', error);
            // Return a safe error state
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-error);">
                    ⚠️ Error rendering provider management. Please try refreshing the settings.
                </div>
            `;
            return container;
        }
    }

    private renderEmptyState(container: HTMLElement) {
        const emptyState = container.createDiv({ cls: 'empty-state' });
        emptyState.style.textAlign = 'center';
        emptyState.style.padding = '40px 20px';
        emptyState.style.color = 'var(--text-muted)';

        emptyState.createEl('div', {
            text: '🤖',
            cls: 'empty-state-icon'
        }).style.fontSize = '48px';

        emptyState.createEl('h4', { text: 'No AI Providers Configured' });
        emptyState.createEl('p', {
            text: 'Add your first AI provider to get started with Mnemosyne.'
        });

        const addButton = emptyState.createEl('button', {
            text: 'Add AI Provider',
            cls: 'mod-cta'
        });
        addButton.setAttribute('data-provider-action', 'add');
        addButton.style.marginTop = '15px';
    }

    private renderProvidersList(container: HTMLElement) {
        const providersList = container.createDiv({ cls: 'providers-list' });
        providersList.style.display = 'grid';
        providersList.style.gap = '12px';

        console.log('Rendering providers:', this.state.providers);
        
        this.state.providers.forEach(provider => {
            console.log('Rendering provider:', provider);
            this.renderProviderCard(providersList, provider);
        });
    }

    private renderProviderCard(container: HTMLElement, provider: LLMConfig) {
        const card = container.createDiv({ cls: 'provider-card' });
        card.style.padding = '16px';
        card.style.borderRadius = '8px';
        card.style.backgroundColor = 'var(--background-secondary)';
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.transition = 'all 0.2s ease';

        // Header
        const cardHeader = card.createDiv({ cls: 'provider-card-header' });
        cardHeader.style.display = 'flex';
        cardHeader.style.justifyContent = 'space-between';
        cardHeader.style.alignItems = 'flex-start';
        cardHeader.style.marginBottom = '12px';

        const titleSection = cardHeader.createDiv();
        const titleDiv = titleSection.createDiv();
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.gap = '8px';

        // Provider name with icon
        const nameSpan = titleDiv.createEl('span', {
            cls: 'provider-card-name'
        });
        nameSpan.style.fontWeight = '600';
        nameSpan.style.fontSize = '1.1em';
        nameSpan.style.display = 'flex';
        nameSpan.style.alignItems = 'center';
        nameSpan.style.gap = '6px';
        
        // Add provider icon based on type
        const icon = this.getProviderIcon(provider.provider);
        nameSpan.innerHTML = `${icon} <span>${provider.name}</span>`;

        // Status badges container
        const badgesContainer = cardHeader.createDiv();
        badgesContainer.style.display = 'flex';
        badgesContainer.style.gap = '6px';
        badgesContainer.style.alignItems = 'center';

        // Status badge
        const statusBadge = badgesContainer.createSpan({
            cls: `provider-status-badge ${provider.enabled ? 'enabled' : 'disabled'}`
        });
        statusBadge.setText(provider.enabled ? 'Enabled' : 'Disabled');
        statusBadge.style.padding = '4px 8px';
        statusBadge.style.borderRadius = '4px';
        statusBadge.style.fontSize = '0.85em';
        statusBadge.style.backgroundColor = provider.enabled
            ? 'var(--interactive-success)'
            : 'var(--background-modifier-error)';
        statusBadge.style.color = 'white';

        // Test status badge
        if (provider.testStatus === 'success') {
            const testBadge = badgesContainer.createSpan({
                cls: 'test-success-badge'
            });
            testBadge.setText('✓ Tested');
            testBadge.style.padding = '4px 8px';
            testBadge.style.borderRadius = '4px';
            testBadge.style.fontSize = '0.85em';
            testBadge.style.backgroundColor = '#10b981'; // Use explicit green color
            testBadge.style.color = 'white';
            testBadge.style.fontWeight = '500';
            testBadge.style.display = 'inline-block';
            testBadge.style.marginLeft = '4px';
        } else if (provider.testStatus === 'failed') {
            const testBadge = badgesContainer.createSpan({
                cls: 'test-failed-badge'
            });
            testBadge.setText('✗ Failed');
            testBadge.style.padding = '4px 8px';
            testBadge.style.borderRadius = '4px';
            testBadge.style.fontSize = '0.85em';
            testBadge.style.backgroundColor = '#ef4444'; // Use explicit red color
            testBadge.style.color = 'white';
            testBadge.style.fontWeight = '500';
            testBadge.style.display = 'inline-block';
            testBadge.style.marginLeft = '4px';
        }

        // Description (using model as description for now)
        if (provider.model) {
            const descDiv = card.createDiv({ cls: 'provider-card-description' });
            descDiv.setText(`Model: ${provider.model}`);
            descDiv.style.color = 'var(--text-muted)';
            descDiv.style.fontSize = '0.9em';
            descDiv.style.marginBottom = '10px';
        }

        // Metadata
        const metaContainer = card.createDiv({ cls: 'provider-card-meta' });
        metaContainer.style.display = 'grid';
        metaContainer.style.gridTemplateColumns = 'auto 1fr';
        metaContainer.style.gap = '8px';
        metaContainer.style.fontSize = '0.85em';
        metaContainer.style.color = 'var(--text-muted)';

        // Provider type
        metaContainer.createSpan({ text: 'Type:' }).style.fontWeight = '500';
        metaContainer.createSpan({ text: (provider.provider || 'unknown').toUpperCase() });

        // Model (if available)
        if (provider.model) {
            metaContainer.createSpan({ text: 'Model:' }).style.fontWeight = '500';
            metaContainer.createSpan({ text: provider.model });
        }

        // Actions
        const actionsContainer = card.createDiv({ cls: 'provider-card-actions' });
        actionsContainer.style.marginTop = '15px';
        actionsContainer.style.display = 'flex';
        actionsContainer.style.gap = '8px';
        actionsContainer.style.flexWrap = 'wrap';

        // Toggle button
        const toggleBtn = actionsContainer.createEl('button', {
            text: provider.enabled ? 'Disable' : 'Enable'
        });
        toggleBtn.setAttribute('data-provider-action', 'toggle');
        toggleBtn.setAttribute('data-provider-id', provider.id);
        toggleBtn.style.padding = '6px 12px';
        toggleBtn.style.cursor = 'pointer';

        // Test button
        const testBtn = actionsContainer.createEl('button', { text: 'Test' });
        testBtn.setAttribute('data-provider-action', 'test');
        testBtn.setAttribute('data-provider-id', provider.id);
        testBtn.style.padding = '6px 12px';
        testBtn.style.cursor = 'pointer';

        // Edit button
        const editBtn = actionsContainer.createEl('button', { text: 'Edit' });
        editBtn.setAttribute('data-provider-action', 'edit');
        editBtn.setAttribute('data-provider-id', provider.id);
        editBtn.style.padding = '6px 12px';
        editBtn.style.cursor = 'pointer';

        // Delete button
        const deleteBtn = actionsContainer.createEl('button', {
            text: 'Delete',
            cls: 'mod-warning'
        });
        deleteBtn.setAttribute('data-provider-action', 'delete');
        deleteBtn.setAttribute('data-provider-id', provider.id);
        deleteBtn.style.padding = '6px 12px';
        deleteBtn.style.cursor = 'pointer';
    }

    private getProviderIcon(type: string | undefined): string {
        if (!type) return '⚙️';
        
        switch (type.toLowerCase()) {
            case 'openai':
                return '🤖';
            case 'anthropic':
                return '🧠';
            case 'custom':
                return '💻';
            default:
                return '⚙️';
        }
    }

    attachEventListeners(container: HTMLElement): void {
        this.container = container;

        // Provider action buttons
        const providerActionButtons = container.querySelectorAll('[data-provider-action]');
        providerActionButtons.forEach(button => {
            const handler = async (e: Event) => {
                e.stopPropagation();
                const target = e.target as HTMLElement;
                const actionButton = target.closest('[data-provider-action]') as HTMLElement;
                const action = actionButton?.getAttribute('data-provider-action');
                const providerId = actionButton?.getAttribute('data-provider-id');

                if (action) {
                    await this.handleProviderAction(action, providerId || undefined);
                }
            };
            button.addEventListener('click', handler);
        });
    }

    private async handleProviderAction(action: string, providerId?: string): Promise<void> {
        try {
            switch (action) {
                case 'add':
                    await this.handleAddProvider();
                    break;
                case 'toggle':
                    if (providerId) await this.handleToggleProvider(providerId);
                    break;
                case 'test':
                    if (providerId) await this.onProviderAction('test-provider', { providerId });
                    break;
                case 'edit':
                    if (providerId) await this.handleEditProvider(providerId);
                    break;
                case 'delete':
                    if (providerId) await this.handleDeleteProvider(providerId);
                    break;
                default:
                    console.warn(`Unknown provider action: ${action}`);
            }
        } catch (error: any) {
            console.error('Provider action failed:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    private async handleAddProvider(): Promise<void> {
        await this.onProviderAction('add-provider');
    }

    private async handleToggleProvider(providerId: string): Promise<void> {
        const provider = this.state.providers.find(p => p.id === providerId);
        if (provider) {
            await this.onProviderAction('toggle-provider', { providerId, enabled: !provider.enabled });
        }
    }

    private async handleEditProvider(providerId: string): Promise<void> {
        await this.onProviderAction('edit-provider', { providerId });
    }

    private async handleDeleteProvider(providerId: string): Promise<void> {
        const provider = this.state.providers.find(p => p.id === providerId);
        if (!provider) return;

        // Simple confirmation dialog
        const confirmed = confirm(`Delete provider "${provider.name}"?\n\nThis action cannot be undone.`);

        if (confirmed) {
            await this.onProviderAction('delete-provider', { providerId });
        }
    }

    update(newState: ProviderManagementState): void {
        this.state = newState;
    }

    destroy(): void {
        this.container = null;
    }
}
