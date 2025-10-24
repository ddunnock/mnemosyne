/**
 * AI Text Action Modal
 *
 * Shows a popup menu with AI actions for selected text
 */

import { App, Modal, Notice } from 'obsidian';
import type RiskManagementPlugin from '../../main';
import { AI_TEXT_ACTIONS, AITextAction } from '../../editor/InlineAIController';
import { AITextReviewModal } from './AITextReviewModal';

export class AITextActionModal extends Modal {
    private plugin: RiskManagementPlugin;
    private selectedText: string;
    private onComplete: (result: string) => void;
    private isProcessing: boolean = false;

    constructor(
        app: App,
        plugin: RiskManagementPlugin,
        selectedText: string,
        onComplete: (result: string) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.selectedText = selectedText;
        this.onComplete = onComplete;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('mnemosyne-ai-action-modal');

        // Header
        const header = contentEl.createDiv({ cls: 'mnemosyne-ai-action-header' });
        header.createEl('h3', { text: 'AI Text Actions' });
        header.createEl('p', {
            text: `Selected ${this.selectedText.length} characters`,
            cls: 'mnemosyne-ai-action-subtitle',
        });

        // Actions grid
        const actionsGrid = contentEl.createDiv({ cls: 'mnemosyne-ai-actions-grid' });

        for (const action of AI_TEXT_ACTIONS) {
            const actionButton = actionsGrid.createDiv({ cls: 'mnemosyne-ai-action-button' });

            actionButton.createDiv({
                text: action.icon,
                cls: 'mnemosyne-ai-action-icon',
            });

            actionButton.createDiv({
                text: action.label,
                cls: 'mnemosyne-ai-action-label',
            });

            actionButton.addEventListener('click', async () => {
                if (this.isProcessing) {
                    return;
                }

                if (action.type === 'custom') {
                    await this.handleCustomPrompt();
                } else {
                    await this.processAction(action);
                }
            });
        }

        // Add styles
        this.addStyles();
    }

    private async handleCustomPrompt() {
        // Create a simple prompt input
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', { text: 'Custom Prompt' });

        const promptArea = contentEl.createEl('textarea', {
            placeholder: 'Enter your custom instruction for how to transform the text...',
            cls: 'mnemosyne-custom-prompt-input',
        });
        promptArea.rows = 4;
        promptArea.style.width = '100%';
        promptArea.style.marginBottom = '1rem';

        const buttonContainer = contentEl.createDiv({ cls: 'mnemosyne-modal-buttons' });

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        const submitButton = buttonContainer.createEl('button', {
            text: 'Process',
            cls: 'mod-cta',
        });
        submitButton.addEventListener('click', async () => {
            const customPrompt = promptArea.value.trim();
            if (!customPrompt) {
                new Notice('Please enter a prompt');
                return;
            }

            await this.processAction({
                type: 'custom',
                label: 'Custom',
                icon: '🔧',
                customPrompt,
            });
        });

        promptArea.focus();
    }

    private async processAction(action: AITextAction) {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showProcessing(action.label);

            const result = await this.plugin.inlineAIController.processText(
                this.selectedText,
                action
            );

            // Close this modal first
            this.close();

            // Show review modal before applying changes
            new AITextReviewModal(
                this.app,
                this.plugin,
                this.selectedText,
                result,
                action,
                (acceptedText) => {
                    // Call the completion callback when user accepts
                    this.onComplete(acceptedText);
                    new Notice(`✓ ${action.label} applied`);
                }
            ).open();
        } catch (error) {
            console.error('AI action failed:', error);
            new Notice(`✗ ${action.label} failed: ${error.message}`);
            this.close();
        } finally {
            this.isProcessing = false;
        }
    }

    private showProcessing(actionName: string) {
        const { contentEl } = this;
        contentEl.empty();

        const loadingContainer = contentEl.createDiv({ cls: 'mnemosyne-ai-processing' });
        loadingContainer.createEl('div', {
            cls: 'mnemosyne-ai-spinner',
        });
        loadingContainer.createEl('p', {
            text: `Processing: ${actionName}...`,
        });
        loadingContainer.createEl('p', {
            text: 'This may take a few seconds',
            cls: 'mnemosyne-ai-processing-subtitle',
        });
    }

    private addStyles() {
        // Inject styles if not already present
        if (document.getElementById('mnemosyne-ai-action-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'mnemosyne-ai-action-styles';
        style.textContent = `
            .mnemosyne-ai-action-modal {
                padding: 1.5rem;
            }

            .mnemosyne-ai-action-header h3 {
                margin: 0 0 0.5rem 0;
            }

            .mnemosyne-ai-action-subtitle {
                margin: 0 0 1rem 0;
                opacity: 0.7;
                font-size: 0.9em;
            }

            .mnemosyne-ai-actions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 0.75rem;
                margin-bottom: 1rem;
            }

            .mnemosyne-ai-action-button {
                padding: 1rem;
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                cursor: pointer;
                text-align: center;
                transition: all 0.2s;
                background: var(--background-primary);
            }

            .mnemosyne-ai-action-button:hover {
                background: var(--background-modifier-hover);
                border-color: var(--interactive-accent);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }

            .mnemosyne-ai-action-icon {
                font-size: 2em;
                margin-bottom: 0.5rem;
            }

            .mnemosyne-ai-action-label {
                font-size: 0.85em;
                font-weight: 500;
            }

            .mnemosyne-ai-processing {
                text-align: center;
                padding: 2rem;
            }

            .mnemosyne-ai-spinner {
                width: 40px;
                height: 40px;
                margin: 0 auto 1rem;
                border: 4px solid var(--background-modifier-border);
                border-top-color: var(--interactive-accent);
                border-radius: 50%;
                animation: mnemosyne-spin 1s linear infinite;
            }

            @keyframes mnemosyne-spin {
                to { transform: rotate(360deg); }
            }

            .mnemosyne-ai-processing-subtitle {
                opacity: 0.7;
                font-size: 0.9em;
            }

            .mnemosyne-custom-prompt-input {
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                padding: 0.75rem;
                color: var(--text-normal);
                font-family: var(--font-monospace);
                resize: vertical;
            }

            .mnemosyne-modal-buttons {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
            }

            .mnemosyne-modal-buttons button {
                padding: 0.5rem 1rem;
            }
        `;
        document.head.appendChild(style);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
