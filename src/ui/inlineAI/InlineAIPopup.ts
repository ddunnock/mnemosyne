/**
 * Inline AI Popup
 * 
 * Contextual popup that appears when text is selected, showing AI action options
 */

import { Plugin, TFile } from 'obsidian';
import { InlineAISettings } from './types';

export interface AIAction {
    id: string;
    label: string;
    icon: string;
    description: string;
    category: 'analysis' | 'editing' | 'completion';
}

export class InlineAIPopup {
    private plugin: Plugin;
    private settings: InlineAISettings;
    private selectedText: string;
    private file: TFile | null;
    private onAction: (action: string, text: string, file: TFile | null) => void;
    private popupElement: HTMLElement | null = null;
    private isVisible: boolean = false;

    // Available AI actions
    private actions: AIAction[] = [
        {
            id: 'explain',
            label: 'Explain',
            icon: '💡',
            description: 'Explain this text in simple terms',
            category: 'analysis'
        },
        {
            id: 'summarize',
            label: 'Summarize',
            icon: '📝',
            description: 'Create a concise summary',
            category: 'analysis'
        },
        {
            id: 'improve',
            label: 'Improve',
            icon: '✨',
            description: 'Improve grammar and clarity',
            category: 'editing'
        },
        {
            id: 'translate',
            label: 'Translate',
            icon: '🌐',
            description: 'Translate to English',
            category: 'editing'
        },
        {
            id: 'expand',
            label: 'Expand',
            icon: '📈',
            description: 'Add more detail and context',
            category: 'editing'
        },
        {
            id: 'simplify',
            label: 'Simplify',
            icon: '🔍',
            description: 'Make text easier to understand',
            category: 'editing'
        },
        {
            id: 'suggest-completion',
            label: 'Complete',
            icon: '🤖',
            description: 'Suggest text completion',
            category: 'completion'
        }
    ];

    constructor(
        plugin: Plugin,
        settings: InlineAISettings,
        selectedText: string,
        file: TFile | null,
        onAction: (action: string, text: string, file: TFile | null) => void
    ) {
        this.plugin = plugin;
        this.settings = settings;
        this.selectedText = selectedText;
        this.file = file;
        this.onAction = onAction;
    }

    /**
     * Show the popup at specified coordinates
     */
    show(x: number, y: number): void {
        if (this.isVisible) return;

        this.createPopup();
        this.positionPopup(x, y);
        this.isVisible = true;

        // Auto-hide after delay if no interaction
        setTimeout(() => {
            if (this.isVisible && !this.popupElement?.matches(':hover')) {
                this.hide();
            }
        }, 5000);
    }

    /**
     * Hide the popup
     */
    hide(): void {
        if (this.popupElement) {
            this.popupElement.remove();
            this.popupElement = null;
        }
        this.isVisible = false;
    }

    /**
     * Update settings
     */
    updateSettings(newSettings: InlineAISettings): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Check if popup contains the given node
     */
    contains(node: Node): boolean {
        return this.popupElement?.contains(node) || false;
    }

    /**
     * Create the popup element
     */
    private createPopup(): void {
        this.popupElement = document.createElement('div');
        this.popupElement.className = 'inline-ai-popup';
        this.popupElement.style.cssText = `
            position: fixed;
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            min-width: 200px;
            max-width: 300px;
            font-family: var(--font-family);
            font-size: 14px;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.2s ease, transform 0.2s ease;
        `;

        // Filter actions based on settings
        const enabledActions = this.getEnabledActions();
        const categorizedActions = this.categorizeActions(enabledActions);

        this.popupElement.innerHTML = `
            <div style="padding: 12px;">
                <div style="margin-bottom: 8px; font-size: 12px; color: var(--text-muted);">
                    Selected: "${this.truncateText(this.selectedText, 30)}"
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${this.renderActionCategories(categorizedActions)}
                </div>
            </div>
        `;

        // Add event listeners
        this.addEventListeners();

        // Add to document
        document.body.appendChild(this.popupElement);

        // Trigger animation
        requestAnimationFrame(() => {
            if (this.popupElement) {
                this.popupElement.style.opacity = '1';
                this.popupElement.style.transform = 'translateY(0)';
            }
        });
    }

    /**
     * Position the popup
     */
    private positionPopup(x: number, y: number): void {
        if (!this.popupElement) return;

        const rect = this.popupElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust position to keep popup in viewport
        let finalX = x;
        let finalY = y - rect.height - 10; // Position above cursor

        // Adjust if popup would go off screen
        if (finalX + rect.width > viewportWidth) {
            finalX = viewportWidth - rect.width - 10;
        }
        if (finalX < 10) {
            finalX = 10;
        }

        if (finalY < 10) {
            finalY = y + 20; // Position below cursor if no space above
        }

        this.popupElement.style.left = `${finalX}px`;
        this.popupElement.style.top = `${finalY}px`;
    }

    /**
     * Get enabled actions based on settings
     */
    private getEnabledActions(): AIAction[] {
        return this.actions.filter(action => {
            switch (action.category) {
                case 'analysis':
                    return this.settings.enableAnalysis;
                case 'editing':
                    return this.settings.enableEditing;
                case 'completion':
                    return this.settings.enableCompletion;
                default:
                    return true;
            }
        });
    }

    /**
     * Categorize actions for display
     */
    private categorizeActions(actions: AIAction[]): { [key: string]: AIAction[] } {
        const categories: { [key: string]: AIAction[] } = {};
        
        actions.forEach(action => {
            if (!categories[action.category]) {
                categories[action.category] = [];
            }
            categories[action.category].push(action);
        });

        return categories;
    }

    /**
     * Render action categories
     */
    private renderActionCategories(categorizedActions: { [key: string]: AIAction[] }): string {
        const categoryLabels = {
            'analysis': 'Analysis',
            'editing': 'Editing',
            'completion': 'Completion'
        };

        return Object.entries(categorizedActions).map(([category, actions]) => `
            <div class="action-category" style="margin-bottom: 8px;">
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${categoryLabels[category as keyof typeof categoryLabels] || category}
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    ${actions.map(action => this.renderAction(action)).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render individual action
     */
    private renderAction(action: AIAction): string {
        return `
            <div 
                class="action-item" 
                data-action="${action.id}"
                style="
                    display: flex;
                    align-items: center;
                    padding: 6px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    gap: 8px;
                "
                onmouseover="this.style.backgroundColor='var(--background-modifier-hover)'"
                onmouseout="this.style.backgroundColor='transparent'"
            >
                <span style="font-size: 16px;">${action.icon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 13px;">${action.label}</div>
                    <div style="font-size: 11px; color: var(--text-muted); line-height: 1.2;">${action.description}</div>
                </div>
            </div>
        `;
    }

    /**
     * Add event listeners
     */
    private addEventListeners(): void {
        if (!this.popupElement) return;

        this.popupElement.addEventListener('click', (event) => {
            const actionItem = (event.target as HTMLElement).closest('.action-item');
            if (actionItem) {
                const actionId = actionItem.getAttribute('data-action');
                if (actionId) {
                    this.onAction(actionId, this.selectedText, this.file);
                    this.hide();
                }
            }
        });

        // Prevent clicks from propagating to document
        this.popupElement.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

    /**
     * Truncate text for display
     */
    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}