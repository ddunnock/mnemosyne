/**
 * Inline AI Manager
 * 
 * Handles text selection, contextual popup display, and AI-powered text operations
 */

import { Plugin, Notice, TFile } from 'obsidian';
import { InlineAIPopup } from './InlineAIPopup';
import { TextSuggestionManager } from './TextSuggestionManager';
import { InlineAISettings } from './types';

export class InlineAIManager {
    private plugin: Plugin;
    private popup: InlineAIPopup | null = null;
    private suggestionManager: TextSuggestionManager;
    private settings: InlineAISettings;
    private isEnabled: boolean = false;
    private currentSelection: {
        text: string;
        range: Range;
        file: TFile | null;
    } | null = null;

    constructor(plugin: Plugin, settings: InlineAISettings) {
        this.plugin = plugin;
        this.settings = settings;
        this.suggestionManager = new TextSuggestionManager(plugin, settings);
        this.setupEventListeners();
    }

    /**
     * Enable inline AI functionality
     */
    enable(): void {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        this.setupTextSelectionListener();
        this.setupKeyboardShortcuts();
        console.log('Inline AI enabled');
    }

    /**
     * Disable inline AI functionality
     */
    disable(): void {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.hidePopup();
        this.removeTextSelectionListener();
        this.removeKeyboardShortcuts();
        console.log('Inline AI disabled');
    }

    /**
     * Update settings
     */
    updateSettings(newSettings: InlineAISettings): void {
        this.settings = { ...this.settings, ...newSettings };
        this.suggestionManager.updateSettings(this.settings);
        
        if (this.popup) {
            this.popup.updateSettings(this.settings);
        }
    }

    /**
     * Setup event listeners for text selection
     */
    private setupTextSelectionListener(): void {
        document.addEventListener('mouseup', this.handleTextSelection.bind(this));
        document.addEventListener('keyup', this.handleTextSelection.bind(this));
    }

    /**
     * Remove text selection listeners
     */
    private removeTextSelectionListener(): void {
        document.removeEventListener('mouseup', this.handleTextSelection.bind(this));
        document.removeEventListener('keyup', this.handleTextSelection.bind(this));
    }

    /**
     * Handle text selection events
     */
    private handleTextSelection(event: Event): void {
        if (!this.isEnabled) return;

        // Small delay to ensure selection is complete
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                this.hidePopup();
                return;
            }

            const selectedText = selection.toString().trim();
            if (selectedText.length < this.settings.minSelectionLength) {
                this.hidePopup();
                return;
            }

            // Get the active file
            const activeFile = this.plugin.app.workspace.getActiveFile();
            
            // Store current selection
            this.currentSelection = {
                text: selectedText,
                range: selection.getRangeAt(0).cloneRange(),
                file: activeFile
            };

            // Show contextual popup
            this.showPopup(event as MouseEvent, selectedText, activeFile);
        }, 100);
    }

    /**
     * Show contextual popup with AI options
     */
    private showPopup(event: MouseEvent, selectedText: string, file: TFile | null): void {
        // Hide existing popup
        this.hidePopup();

        // Create new popup
        this.popup = new InlineAIPopup(
            this.plugin,
            this.settings,
            selectedText,
            file,
            this.handleAIAction.bind(this)
        );

        // Position and show popup
        this.popup.show(event.clientX, event.clientY);
    }

    /**
     * Hide the contextual popup
     */
    private hidePopup(): void {
        if (this.popup) {
            this.popup.hide();
            this.popup = null;
        }
    }

    /**
     * Handle AI action from popup
     */
    private async handleAIAction(action: string, text: string, file: TFile | null): Promise<void> {
        try {
            switch (action) {
                case 'explain':
                    await this.explainText(text, file);
                    break;
                case 'summarize':
                    await this.summarizeText(text, file);
                    break;
                case 'improve':
                    await this.improveText(text, file);
                    break;
                case 'translate':
                    await this.translateText(text, file);
                    break;
                case 'expand':
                    await this.expandText(text, file);
                    break;
                case 'simplify':
                    await this.simplifyText(text, file);
                    break;
                case 'suggest-completion':
                    await this.suggestCompletion(text, file);
                    break;
                default:
                    console.warn('Unknown AI action:', action);
            }
        } catch (error) {
            console.error('Error handling AI action:', error);
            new Notice(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Explain selected text
     */
    private async explainText(text: string, file: TFile | null): Promise<void> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            new Notice('No AI agent available');
            return;
        }

        const prompt = `Please explain the following text in simple terms:\n\n"${text}"`;
        
        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: await this.plugin.app.vault.read(file),
                    frontmatter: {}
                } : undefined
            });

            this.showResultModal('Explanation', response.answer);
        } catch (error) {
            new Notice('Failed to explain text');
        }
    }

    /**
     * Summarize selected text
     */
    private async summarizeText(text: string, file: TFile | null): Promise<void> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            new Notice('No AI agent available');
            return;
        }

        const prompt = `Please provide a concise summary of the following text:\n\n"${text}"`;
        
        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: await this.plugin.app.vault.read(file),
                    frontmatter: {}
                } : undefined
            });

            this.showResultModal('Summary', response.answer);
        } catch (error) {
            new Notice('Failed to summarize text');
        }
    }

    /**
     * Improve selected text
     */
    private async improveText(text: string, file: TFile | null): Promise<void> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            new Notice('No AI agent available');
            return;
        }

        const prompt = `Please improve the following text for clarity, grammar, and flow:\n\n"${text}"`;
        
        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: await this.plugin.app.vault.read(file),
                    frontmatter: {}
                } : undefined
            });

            this.showResultModal('Improved Text', response.answer);
        } catch (error) {
            new Notice('Failed to improve text');
        }
    }

    /**
     * Translate selected text
     */
    private async translateText(text: string, file: TFile | null): Promise<void> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            new Notice('No AI agent available');
            return;
        }

        const prompt = `Please translate the following text to English (if not already in English):\n\n"${text}"`;
        
        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: await this.plugin.app.vault.read(file),
                    frontmatter: {}
                } : undefined
            });

            this.showResultModal('Translation', response.answer);
        } catch (error) {
            new Notice('Failed to translate text');
        }
    }

    /**
     * Expand selected text
     */
    private async expandText(text: string, file: TFile | null): Promise<void> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            new Notice('No AI agent available');
            return;
        }

        const prompt = `Please expand on the following text with more detail and context:\n\n"${text}"`;
        
        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: await this.plugin.app.vault.read(file),
                    frontmatter: {}
                } : undefined
            });

            this.showResultModal('Expanded Text', response.answer);
        } catch (error) {
            new Notice('Failed to expand text');
        }
    }

    /**
     * Simplify selected text
     */
    private async simplifyText(text: string, file: TFile | null): Promise<void> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            new Notice('No AI agent available');
            return;
        }

        const prompt = `Please simplify the following text to make it easier to understand:\n\n"${text}"`;
        
        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: await this.plugin.app.vault.read(file),
                    frontmatter: {}
                } : undefined
            });

            this.showResultModal('Simplified Text', response.answer);
        } catch (error) {
            new Notice('Failed to simplify text');
        }
    }

    /**
     * Suggest text completion
     */
    private async suggestCompletion(text: string, file: TFile | null): Promise<void> {
        if (!this.currentSelection) return;

        try {
            const suggestions = await this.suggestionManager.getSuggestions(text, file);
            this.showCompletionSuggestions(suggestions);
        } catch (error) {
            new Notice('Failed to get completion suggestions');
        }
    }

    /**
     * Show completion suggestions
     */
    private showCompletionSuggestions(suggestions: string[]): void {
        if (suggestions.length === 0) {
            new Notice('No suggestions available');
            return;
        }

        // Create a simple modal to show suggestions
        const modal = this.plugin.app.workspace.activeLeaf?.view.containerEl.createEl('div', {
            cls: 'inline-ai-suggestions-modal',
            attr: {
                style: `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--background-primary);
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 8px;
                    padding: 16px;
                    max-width: 500px;
                    max-height: 400px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                `
            }
        });

        if (!modal) return;

        modal.innerHTML = `
            <div style="margin-bottom: 12px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Text Completion Suggestions</h3>
                <p style="margin: 0; color: var(--text-muted); font-size: 14px;">Click a suggestion to insert it</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${suggestions.map((suggestion, index) => `
                    <div 
                        class="suggestion-item" 
                        data-suggestion="${suggestion}"
                        style="
                            padding: 8px 12px;
                            background: var(--background-secondary);
                            border: 1px solid var(--background-modifier-border);
                            border-radius: 4px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        "
                        onmouseover="this.style.backgroundColor='var(--background-modifier-hover)'"
                        onmouseout="this.style.backgroundColor='var(--background-secondary)'"
                    >
                        ${suggestion}
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 12px; text-align: right;">
                <button 
                    id="close-suggestions"
                    style="
                        padding: 6px 12px;
                        background: var(--interactive-normal);
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 4px;
                        cursor: pointer;
                    "
                >
                    Close
                </button>
            </div>
        `;

        // Add click handlers
        modal.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const suggestion = item.getAttribute('data-suggestion');
                if (suggestion && this.currentSelection) {
                    this.insertTextAtSelection(suggestion);
                    modal.remove();
                }
            });
        });

        modal.querySelector('#close-suggestions')?.addEventListener('click', () => {
            modal.remove();
        });

        // Close on outside click
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.1);
            z-index: 999;
        `;
        overlay.addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    /**
     * Insert text at current selection
     */
    private insertTextAtSelection(text: string): void {
        if (!this.currentSelection) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Show result modal
     */
    private showResultModal(title: string, content: string): void {
        const modal = this.plugin.app.workspace.activeLeaf?.view.containerEl.createEl('div', {
            cls: 'inline-ai-result-modal',
            attr: {
                style: `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--background-primary);
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 600px;
                    max-height: 500px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                `
            }
        });

        if (!modal) return;

        modal.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${title}</h3>
            </div>
            <div style="margin-bottom: 16px; line-height: 1.6; white-space: pre-wrap;">${content}</div>
            <div style="text-align: right;">
                <button 
                    id="close-result"
                    style="
                        padding: 8px 16px;
                        background: var(--interactive-accent);
                        color: var(--text-on-accent);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    "
                >
                    Close
                </button>
            </div>
        `;

        modal.querySelector('#close-result')?.addEventListener('click', () => {
            modal.remove();
        });

        // Close on outside click
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.1);
            z-index: 999;
        `;
        overlay.addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    /**
     * Setup keyboard shortcuts
     */
    private setupKeyboardShortcuts(): void {
        // Add keyboard shortcuts for quick access
        this.plugin.addCommand({
            id: 'inline-ai-explain',
            name: 'Explain Selected Text',
            callback: () => {
                if (this.currentSelection) {
                    this.explainText(this.currentSelection.text, this.currentSelection.file);
                }
            }
        });

        this.plugin.addCommand({
            id: 'inline-ai-summarize',
            name: 'Summarize Selected Text',
            callback: () => {
                if (this.currentSelection) {
                    this.summarizeText(this.currentSelection.text, this.currentSelection.file);
                }
            }
        });

        this.plugin.addCommand({
            id: 'inline-ai-improve',
            name: 'Improve Selected Text',
            callback: () => {
                if (this.currentSelection) {
                    this.improveText(this.currentSelection.text, this.currentSelection.file);
                }
            }
        });

        this.plugin.addCommand({
            id: 'inline-ai-suggest-completion',
            name: 'Suggest Text Completion',
            callback: () => {
                if (this.currentSelection) {
                    this.suggestCompletion(this.currentSelection.text, this.currentSelection.file);
                }
            }
        });
    }

    /**
     * Remove keyboard shortcuts
     */
    private removeKeyboardShortcuts(): void {
        // Note: Obsidian doesn't provide a direct way to remove commands
        // They will be disabled when the plugin is disabled
    }

    /**
     * Setup general event listeners
     */
    private setupEventListeners(): void {
        // Listen for clicks outside to hide popup
        document.addEventListener('click', (event) => {
            if (this.popup && !this.popup.contains(event.target as Node)) {
                this.hidePopup();
            }
        });

        // Listen for escape key to hide popup
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.popup) {
                this.hidePopup();
            }
        });
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        this.disable();
        this.suggestionManager.cleanup();
    }
}