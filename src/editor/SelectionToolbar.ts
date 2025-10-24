/**
 * Selection Toolbar
 *
 * Floating toolbar that appears when text is selected, providing quick AI actions
 */

import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { Notice } from 'obsidian';
import type RiskManagementPlugin from '../main';
import { AITextActionModal } from '../ui/modals/AITextActionModal';
import { AITextReviewModal } from '../ui/modals/AITextReviewModal';
import { AI_TEXT_ACTIONS, AITextAction } from './InlineAIController';

export class SelectionToolbar {
    private plugin: RiskManagementPlugin;
    private toolbar: HTMLElement | null = null;
    private hideTimeout: NodeJS.Timeout | null = null;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
        this.createToolbar();
    }

    private createToolbar() {
        this.toolbar = document.body.createDiv({ cls: 'mnemosyne-selection-toolbar' });
        this.toolbar.style.display = 'none';

        // Add quick action buttons (top 5 most useful)
        const quickActions = [
            AI_TEXT_ACTIONS.find(a => a.type === 'rewrite'),
            AI_TEXT_ACTIONS.find(a => a.type === 'fixGrammar'),
            AI_TEXT_ACTIONS.find(a => a.type === 'makeConcise'),
            AI_TEXT_ACTIONS.find(a => a.type === 'expand'),
            { type: 'more', label: 'More...', icon: '⋯' } as any,
        ].filter(Boolean);

        quickActions.forEach(action => {
            const button = this.toolbar!.createDiv({
                cls: 'mnemosyne-toolbar-button',
                attr: { title: action!.label }
            });
            button.textContent = action!.icon;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (action!.type === 'more') {
                    this.showFullModal();
                } else {
                    this.executeQuickAction(action as AITextAction);
                }
            });
        });

        // Add styles
        this.addStyles();
    }

    /**
     * Show toolbar at selection position
     */
    show(view: EditorView, selection: EditorSelection) {
        if (!this.toolbar) return;

        const settings = this.plugin.inlineAIController.getSettings();
        if (!settings.enabled || !settings.showInlineMenu) {
            return;
        }

        // Clear any pending hide timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        // Get selection bounds
        const range = selection.main;
        if (range.empty) {
            this.hide();
            return;
        }

        // Get editor coordinates
        const fromCoords = view.coordsAtPos(range.from);
        const toCoords = view.coordsAtPos(range.to);

        if (!fromCoords || !toCoords) {
            this.hide();
            return;
        }

        // Position toolbar above selection
        const left = fromCoords.left;
        const top = fromCoords.top - 50; // 50px above selection

        this.toolbar.style.display = 'flex';
        this.toolbar.style.left = `${left}px`;
        this.toolbar.style.top = `${top}px`;
    }

    /**
     * Hide toolbar
     */
    hide() {
        if (!this.toolbar) return;

        // Delay hiding to allow clicking buttons
        this.hideTimeout = setTimeout(() => {
            if (this.toolbar) {
                this.toolbar.style.display = 'none';
            }
        }, 200);
    }

    /**
     * Get selected text from active editor
     */
    private getSelectedText(): string | null {
        const activeLeaf = this.plugin.app.workspace.activeLeaf;
        if (!activeLeaf) return null;

        const view = activeLeaf.view;
        if (view.getViewType() !== 'markdown') return null;

        const editor = (view as any).editor;
        if (!editor) return null;

        return editor.getSelection();
    }

    /**
     * Replace selected text in active editor
     */
    private replaceSelectedText(newText: string) {
        const activeLeaf = this.plugin.app.workspace.activeLeaf;
        if (!activeLeaf) return;

        const view = activeLeaf.view;
        if (view.getViewType() !== 'markdown') return;

        const editor = (view as any).editor;
        if (!editor) return;

        editor.replaceSelection(newText);
    }

    /**
     * Execute quick action
     */
    private async executeQuickAction(action: AITextAction) {
        const selectedText = this.getSelectedText();
        if (!selectedText) return;

        this.hide();

        // Show loading notice
        const loadingNotice = new Notice(`⏳ ${action.label}: Processing...`, 0);

        try {
            const result = await this.plugin.inlineAIController.processText(
                selectedText,
                action
            );

            // Hide loading notice
            loadingNotice.hide();

            // Show review modal instead of immediately replacing
            new AITextReviewModal(
                this.plugin.app,
                this.plugin,
                selectedText,
                result,
                action,
                (acceptedText) => {
                    this.replaceSelectedText(acceptedText);
                    new Notice(`✓ ${action.label} applied`);
                }
            ).open();
        } catch (error: any) {
            console.error('Quick action failed:', error);

            // Hide loading notice and show error
            loadingNotice.hide();
            new Notice(`✗ ${action.label} failed: ${error.message}`);
        }
    }

    /**
     * Show full modal with all actions
     */
    private showFullModal() {
        const selectedText = this.getSelectedText();
        if (!selectedText) return;

        this.hide();

        new AITextActionModal(
            this.plugin.app,
            this.plugin,
            selectedText,
            (result) => {
                this.replaceSelectedText(result);
            }
        ).open();
    }

    /**
     * Add styles for toolbar
     */
    private addStyles() {
        if (document.getElementById('mnemosyne-selection-toolbar-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'mnemosyne-selection-toolbar-styles';
        style.textContent = `
            .mnemosyne-selection-toolbar {
                position: fixed;
                display: flex;
                gap: 4px;
                padding: 4px;
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                animation: mnemosyne-toolbar-appear 0.15s ease-out;
                pointer-events: auto;
            }

            @keyframes mnemosyne-toolbar-appear {
                from {
                    opacity: 0;
                    transform: translateY(4px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .mnemosyne-toolbar-button {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s;
                font-size: 16px;
                background: var(--background-primary-alt);
                border: 1px solid transparent;
            }

            .mnemosyne-toolbar-button:hover {
                background: var(--background-modifier-hover);
                border-color: var(--interactive-accent);
                transform: scale(1.1);
            }

            .mnemosyne-toolbar-button:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        if (this.toolbar) {
            this.toolbar.remove();
            this.toolbar = null;
        }
    }
}
