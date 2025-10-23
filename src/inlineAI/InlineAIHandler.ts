import { Plugin, Notice, Menu, TFile } from 'obsidian';
import { InlineAIModal } from './InlineAIModal';
import { InlineAIProcessor } from './InlineAIProcessor';
import { AutoCompletionManager } from './AutoCompletionManager';
import RiskManagementPlugin from '../main';

export class InlineAIHandler {
    private plugin: RiskManagementPlugin;
    private processor: InlineAIProcessor;
    private autoCompletion: AutoCompletionManager;
    private isEnabled: boolean = true;
    private currentSelection: string = '';
    private selectionRange: Range | null = null;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
        this.processor = new InlineAIProcessor(plugin);
        this.autoCompletion = new AutoCompletionManager(plugin);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for text selection changes
        document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
        
        // Listen for context menu events
        document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    private handleSelectionChange(): void {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            this.clearSelection();
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
            this.currentSelection = selectedText;
            this.selectionRange = range;
            this.showInlineAIIndicator(range);
        } else {
            this.clearSelection();
        }
    }

    private handleContextMenu(event: MouseEvent): void {
        if (!this.currentSelection || !this.isEnabled) return;

        // Check if the context menu is over selected text
        const target = event.target as HTMLElement;
        if (!target.closest('.markdown-preview-view') && !target.closest('.cm-editor')) {
            return;
        }

        event.preventDefault();
        this.showContextMenu(event);
    }

    private handleKeyDown(event: KeyboardEvent): void {
        // Ctrl/Cmd + Shift + I for inline AI
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
            event.preventDefault();
            this.showInlineAIModal();
        }
    }

    private showInlineAIIndicator(range: Range): void {
        // Remove existing indicator
        this.removeInlineAIIndicator();

        // Create floating indicator
        const indicator = document.createElement('div');
        indicator.className = 'mnemosyne-inline-ai-indicator';
        indicator.innerHTML = '🤖';
        indicator.style.cssText = `
            position: absolute;
            background: var(--interactive-accent);
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        `;

        // Position indicator near selection
        const rect = range.getBoundingClientRect();
        indicator.style.left = `${rect.right + 5}px`;
        indicator.style.top = `${rect.top - 2}px`;

        document.body.appendChild(indicator);

        // Add click handler
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showInlineAIModal();
        });

        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.removeInlineAIIndicator();
        }, 3000);
    }

    private removeInlineAIIndicator(): void {
        const existing = document.querySelector('.mnemosyne-inline-ai-indicator');
        if (existing) {
            existing.remove();
        }
    }

    private showContextMenu(event: MouseEvent): void {
        const menu = new Menu();
        
        menu.addItem((item) => {
            item.setTitle('🤖 AI Enhance')
                .setIcon('sparkles')
                .onClick(() => this.showInlineAIModal());
        });

        menu.addItem((item) => {
            item.setTitle('📝 Summarize')
                .setIcon('file-text')
                .onClick(() => this.processEnhancement('summarize'));
        });

        menu.addItem((item) => {
            item.setTitle('🔍 Explain')
                .setIcon('search')
                .onClick(() => this.processEnhancement('explain'));
        });

        menu.addItem((item) => {
            item.setTitle('✏️ Improve')
                .setIcon('edit')
                .onClick(() => this.processEnhancement('improve'));
        });

        menu.addItem((item) => {
            item.setTitle('🌐 Translate')
                .setIcon('globe')
                .onClick(() => this.processEnhancement('translate'));
        });

        menu.showAtMouseEvent(event);
    }

    private showInlineAIModal(): void {
        if (!this.currentSelection) {
            new Notice('Please select some text first');
            return;
        }

        const modal = new InlineAIModal(
            this.plugin,
            this.currentSelection,
            this.selectionRange,
            (action: string, options?: any) => this.processEnhancement(action, options)
        );
        modal.open();
    }

    private async processEnhancement(action: string, options?: any): Promise<void> {
        if (!this.currentSelection || !this.selectionRange) return;

        try {
            const result = await this.processor.processEnhancement(
                this.currentSelection,
                action,
                options
            );

            if (result.success) {
                this.replaceSelection(result.enhancedText);
                new Notice(`Text ${action}d successfully`);
            } else {
                new Notice(`Failed to ${action} text: ${result.error}`);
            }
        } catch (error) {
            console.error('Enhancement processing error:', error);
            new Notice(`Error processing enhancement: ${error.message}`);
        }
    }

    private replaceSelection(newText: string): void {
        if (!this.selectionRange) return;

        try {
            this.selectionRange.deleteContents();
            this.selectionRange.insertNode(document.createTextNode(newText));
            
            // Clear selection
            window.getSelection()?.removeAllRanges();
            this.clearSelection();
        } catch (error) {
            console.error('Error replacing selection:', error);
        }
    }

    private clearSelection(): void {
        this.currentSelection = '';
        this.selectionRange = null;
        this.removeInlineAIIndicator();
    }

    public enable(): void {
        this.isEnabled = true;
    }

    public disable(): void {
        this.isEnabled = false;
        this.clearSelection();
    }

    public destroy(): void {
        this.clearSelection();
        document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
        document.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
}