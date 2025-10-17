/**
 * Reusable UI Components
 *
 * Common UI elements used throughout the plugin
 */

import { setIcon } from 'obsidian';
import { AgentConfig, LLMConfig, AgentResponse } from '../types';

/**
 * Create an agent card for display in lists
 */
export function createAgentCard(
    container: HTMLElement,
    config: AgentConfig,
    options: {
        onEdit?: () => void;
        onDelete?: () => void;
        onTest?: () => void;
        onToggle?: (enabled: boolean) => void;
        showActions?: boolean;
    } = {}
): HTMLElement {
    const card = container.createDiv({ cls: 'agent-card' });
    card.style.border = '1px solid var(--background-modifier-border)';
    card.style.borderRadius = '8px';
    card.style.padding = '15px';
    card.style.marginBottom = '15px';

    // Header
    const header = card.createDiv({ cls: 'agent-card-header' });
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'flex-start';
    header.style.marginBottom = '10px';

    // Left side: Icon and title
    const titleContainer = header.createDiv();
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.gap = '10px';

    // Icon
    const iconSpan = titleContainer.createSpan({ cls: 'agent-card-icon' });
    iconSpan.style.fontSize = '24px';
    iconSpan.setText('🤖'); // Default icon

    // Title
    const titleDiv = titleContainer.createDiv();
    titleDiv.createSpan({ text: config.name, cls: 'setting-item-name' });
    titleDiv.style.fontWeight = 'bold';

    // Right side: Status badges
    const statusContainer = header.createDiv();
    statusContainer.style.display = 'flex';
    statusContainer.style.gap = '8px';
    statusContainer.style.alignItems = 'center';

    // Enabled/Disabled badge
    const statusBadge = statusContainer.createSpan({
        cls: `agent-card-status ${config.enabled ? 'enabled' : 'disabled'}`
    });
    statusBadge.setText(config.enabled ? 'Enabled' : 'Disabled');
    statusBadge.style.padding = '4px 8px';
    statusBadge.style.borderRadius = '4px';
    statusBadge.style.fontSize = '0.85em';
    statusBadge.style.backgroundColor = config.enabled
        ? 'var(--interactive-success)'
        : 'var(--background-modifier-error)';
    statusBadge.style.color = 'white';

    // Description
    if (config.description) {
        const descDiv = card.createDiv({ cls: 'agent-card-description' });
        descDiv.setText(config.description);
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
    const topK = config.retrievalSettings.topK;
    const threshold = (config.retrievalSettings.scoreThreshold * 100).toFixed(0);
    const strategy = config.retrievalSettings.searchStrategy;

    metaContainer.createSpan({ text: 'Retrieval:' }).style.fontWeight = '500';
    metaContainer.createSpan({
        text: `Top ${topK} chunks, ${threshold}% threshold, ${strategy}`
    });

    // Filters (if any)
    if (config.metadataFilters && Object.keys(config.metadataFilters).length > 0) {
        metaContainer.createSpan({ text: 'Filters:' }).style.fontWeight = '500';
        const filterText = Object.entries(config.metadataFilters)
            .map(([key, values]) => {
                const valueStr = Array.isArray(values) ? values.join(', ') : String(values);
                return `${key}: ${valueStr || 'none'}`;
            })
            .join(' | ');
        metaContainer.createSpan({ text: filterText });
    }

    // Actions
    if (options.showActions !== false) {
        const actionsContainer = card.createDiv({ cls: 'agent-card-actions' });
        actionsContainer.style.marginTop = '15px';
        actionsContainer.style.display = 'flex';
        actionsContainer.style.gap = '8px';
        actionsContainer.style.flexWrap = 'wrap';

        // Edit button
        if (options.onEdit) {
            const editBtn = actionsContainer.createEl('button', { text: 'Edit' });
            editBtn.style.padding = '6px 12px';
            editBtn.onclick = options.onEdit;
        }

        // Test button
        if (options.onTest) {
            const testBtn = actionsContainer.createEl('button', { text: 'Test' });
            testBtn.style.padding = '6px 12px';
            testBtn.onclick = options.onTest;
        }

        // Toggle button
        if (options.onToggle) {
            const toggleBtn = actionsContainer.createEl('button', {
                text: config.enabled ? 'Disable' : 'Enable'
            });
            toggleBtn.style.padding = '6px 12px';
            toggleBtn.onclick = () => options.onToggle!(!config.enabled);
        }

        // Delete button
        if (options.onDelete) {
            const deleteBtn = actionsContainer.createEl('button', { text: 'Delete' });
            deleteBtn.style.padding = '6px 12px';
            deleteBtn.style.backgroundColor = 'var(--background-modifier-error)';
            deleteBtn.style.color = 'white';
            deleteBtn.onclick = options.onDelete;
        }
    }

    return card;
}

/**
 * Create a response card for displaying agent responses
 */
export function createResponseCard(
    container: HTMLElement,
    response: AgentResponse
): HTMLElement {
    const card = container.createDiv({ cls: 'response-card' });
    card.style.border = '1px solid var(--background-modifier-border)';
    card.style.borderRadius = '8px';
    card.style.padding = '20px';
    card.style.marginBottom = '20px';

    // Header with metadata
    const header = card.createDiv({ cls: 'response-header' });
    header.style.marginBottom = '15px';
    header.style.paddingBottom = '10px';
    header.style.borderBottom = '1px solid var(--background-modifier-border)';

    // Agent and model info
    const infoDiv = header.createDiv();
    infoDiv.style.fontSize = '0.9em';
    infoDiv.style.color = 'var(--text-muted)';
    infoDiv.innerHTML = `
        <strong>Agent:</strong> ${response.agentUsed} |
        <strong>Model:</strong> ${response.llmProvider} (${response.model}) |
        <strong>Time:</strong> ${response.executionTime}ms
    `;

    // Usage stats (if available)
    if (response.usage) {
        const usageDiv = header.createDiv();
        usageDiv.style.fontSize = '0.85em';
        usageDiv.style.color = 'var(--text-muted)';
        usageDiv.style.marginTop = '5px';
        usageDiv.innerHTML = `
            <strong>Tokens:</strong> ${response.usage.totalTokens}
            (${response.usage.promptTokens} prompt + ${response.usage.completionTokens} completion)
        `;
    }

    // Answer content
    const contentDiv = card.createDiv({ cls: 'response-content' });
    contentDiv.style.marginBottom = '15px';

    // Render markdown (simplified - you might want to use a proper markdown renderer)
    contentDiv.innerHTML = response.answer
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    // Sources section
    if (response.sources.length > 0) {
        const sourcesDiv = card.createDiv({ cls: 'response-sources' });
        sourcesDiv.style.marginTop = '15px';
        sourcesDiv.style.paddingTop = '15px';
        sourcesDiv.style.borderTop = '1px solid var(--background-modifier-border)';

        const sourcesHeader = sourcesDiv.createEl('h4', { text: 'Sources' });
        sourcesHeader.style.marginBottom = '10px';
        sourcesHeader.style.fontSize = '0.95em';

        const sourcesList = sourcesDiv.createEl('ul');
        sourcesList.style.fontSize = '0.85em';
        sourcesList.style.color = 'var(--text-muted)';

        response.sources.forEach((source, index) => {
            const li = sourcesList.createEl('li');
            li.innerHTML = `
                <strong>${source.document_title}</strong> -
                Section ${source.section}${source.section_title ? ': ' + source.section_title : ''}
                (Page ${source.page_reference})
            `;
        });
    }

    return card;
}

/**
 * Create a loading spinner
 */
export function createLoadingSpinner(container: HTMLElement, text?: string): HTMLElement {
    const spinnerDiv = container.createDiv({ cls: 'loading-spinner' });
    spinnerDiv.style.display = 'flex';
    spinnerDiv.style.flexDirection = 'column';
    spinnerDiv.style.alignItems = 'center';
    spinnerDiv.style.padding = '20px';

    // Spinner icon
    const spinner = spinnerDiv.createDiv();
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.border = '4px solid var(--background-modifier-border)';
    spinner.style.borderTop = '4px solid var(--interactive-accent)';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 1s linear infinite';

    // Add CSS animation if not already present
    if (!document.querySelector('#spinner-animation-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-animation-style';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Text
    if (text) {
        const textDiv = spinnerDiv.createDiv({ text });
        textDiv.style.marginTop = '10px';
        textDiv.style.color = 'var(--text-muted)';
        textDiv.style.fontSize = '0.9em';
    }

    return spinnerDiv;
}

/**
 * Create an empty state message
 */
export function createEmptyState(
    container: HTMLElement,
    options: {
        icon?: string;
        title: string;
        message: string;
        actionText?: string;
        onAction?: () => void;
    }
): HTMLElement {
    const emptyDiv = container.createDiv({ cls: 'empty-state' });
    emptyDiv.style.textAlign = 'center';
    emptyDiv.style.padding = '40px 20px';
    emptyDiv.style.color = 'var(--text-muted)';

    // Icon
    if (options.icon) {
        const iconDiv = emptyDiv.createDiv();
        iconDiv.style.fontSize = '48px';
        iconDiv.style.marginBottom = '10px';
        iconDiv.setText(options.icon);
    }

    // Title
    const titleDiv = emptyDiv.createEl('h3', { text: options.title });
    titleDiv.style.marginBottom = '10px';
    titleDiv.style.color = 'var(--text-normal)';

    // Message
    emptyDiv.createDiv({ text: options.message });

    // Action button
    if (options.actionText && options.onAction) {
        const actionBtn = emptyDiv.createEl('button', { text: options.actionText });
        actionBtn.style.marginTop = '15px';
        actionBtn.style.padding = '8px 16px';
        actionBtn.onclick = options.onAction;
    }

    return emptyDiv;
}

/**
 * Create an error message
 */
export function createErrorMessage(
    container: HTMLElement,
    error: Error | string
): HTMLElement {
    const errorDiv = container.createDiv({ cls: 'error-message' });
    errorDiv.style.backgroundColor = 'var(--background-modifier-error)';
    errorDiv.style.color = 'var(--text-error)';
    errorDiv.style.padding = '15px';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.marginBottom = '15px';

    const errorText = typeof error === 'string' ? error : error.message;
    errorDiv.setText(`❌ ${errorText}`);

    return errorDiv;
}

/**
 * Create a success message
 */
export function createSuccessMessage(container: HTMLElement, message: string): HTMLElement {
    const successDiv = container.createDiv({ cls: 'success-message' });
    successDiv.style.backgroundColor = 'var(--interactive-success)';
    successDiv.style.color = 'white';
    successDiv.style.padding = '15px';
    successDiv.style.borderRadius = '4px';
    successDiv.style.marginBottom = '15px';

    successDiv.setText(`✓ ${message}`);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);

    return successDiv;
}

/**
 * Create a confirmation dialog
 */
export function createConfirmDialog(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';

    const dialog = overlay.createDiv({ cls: 'confirm-dialog' });
    dialog.style.backgroundColor = 'var(--background-primary)';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '8px';
    dialog.style.maxWidth = '400px';
    dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

    // Title
    const titleEl = dialog.createEl('h3', { text: title });
    titleEl.style.marginBottom = '10px';

    // Message
    dialog.createDiv({ text: message, cls: 'confirm-message' });

    // Buttons
    const buttonsDiv = dialog.createDiv({ cls: 'confirm-buttons' });
    buttonsDiv.style.marginTop = '20px';
    buttonsDiv.style.display = 'flex';
    buttonsDiv.style.gap = '10px';
    buttonsDiv.style.justifyContent = 'flex-end';

    const cancelBtn = buttonsDiv.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };

    const confirmBtn = buttonsDiv.createEl('button', { text: 'Confirm' });
    confirmBtn.style.backgroundColor = 'var(--interactive-accent)';
    confirmBtn.style.color = 'white';
    confirmBtn.onclick = () => {
        overlay.remove();
        onConfirm();
    };

    document.body.appendChild(overlay);
    return overlay;
}