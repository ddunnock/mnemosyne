/**
 * Universal Context Menu for AI Text Actions
 *
 * Works with any text selection on the page:
 * - Input fields
 * - Textareas
 * - ContentEditable elements
 * - DataviewJS forms
 * - Regular text
 */

import { Menu, Notice } from 'obsidian';
import type RiskManagementPlugin from '../main';
import { AITextReviewModal } from '../ui/modals/AITextReviewModal';
import { AI_TEXT_ACTIONS, AITextAction } from './InlineAIController';

export class UniversalContextMenu {
    private plugin: RiskManagementPlugin;
    private contextMenuHandler: (e: MouseEvent) => void;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
        this.contextMenuHandler = this.handleContextMenu.bind(this);
    }

    /**
     * Register the context menu listener
     */
    register(): void {
        document.addEventListener('contextmenu', this.contextMenuHandler);
    }

    /**
     * Unregister the context menu listener
     */
    unregister(): void {
        document.removeEventListener('contextmenu', this.contextMenuHandler);
    }

    /**
     * Handle context menu event
     */
    private handleContextMenu(event: MouseEvent): void {
        // Check if inline AI is enabled
        const settings = this.plugin.inlineAIController.getSettings();
        if (!settings.enabled || !settings.contextMenuEnabled) {
            return;
        }

        // Get selected text
        const selection = this.getSelectedText();
        if (!selection || !selection.text.trim()) {
            return; // No text selected
        }

        // Don't show menu if selection is in CodeMirror editor
        // (that's handled by SelectionToolbar)
        const target = event.target as HTMLElement;
        if (this.isInCodeMirror(target)) {
            return;
        }

        // Prevent default context menu
        event.preventDefault();
        event.stopPropagation();

        // Show AI actions menu
        this.showMenu(event, selection);
    }

    /**
     * Check if element is inside a CodeMirror editor
     */
    private isInCodeMirror(element: HTMLElement): boolean {
        let current: HTMLElement | null = element;
        while (current) {
            if (current.classList?.contains('cm-editor') ||
                current.classList?.contains('CodeMirror')) {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    }

    /**
     * Get selected text and metadata
     */
    private getSelectedText(): { text: string; element: HTMLElement; range?: Range } | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const text = selection.toString();
        if (!text.trim()) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const element = range.commonAncestorContainer.parentElement;

        return {
            text,
            element: element as HTMLElement,
            range,
        };
    }

    /**
     * Show the AI actions menu
     */
    private showMenu(event: MouseEvent, selection: { text: string; element: HTMLElement; range?: Range }): void {
        const menu = new Menu();

        // Add AI action items (excluding "More..." which is for toolbar)
        const actions = AI_TEXT_ACTIONS.filter(action => action.type !== 'custom');

        actions.forEach(action => {
            menu.addItem((item) => {
                item
                    .setTitle(`${action.icon} ${action.label}`)
                    .onClick(async () => {
                        await this.executeAction(action, selection);
                    });
            });
        });

        // Add separator
        menu.addSeparator();

        // Add custom prompt option
        menu.addItem((item) => {
            item
                .setTitle('🔧 Custom Prompt...')
                .onClick(async () => {
                    await this.executeCustomAction(selection);
                });
        });

        // Show menu at cursor position
        menu.showAtMouseEvent(event);
    }

    /**
     * Execute an AI action on the selected text
     */
    private async executeAction(action: AITextAction, selection: { text: string; element: HTMLElement; range?: Range }): Promise<void> {
        // Show loading notice
        const loadingNotice = new Notice(`⏳ ${action.label}: Processing...`, 0);

        try {
            // Process text with AI
            const result = await this.plugin.inlineAIController.processText(
                selection.text,
                action
            );

            // Hide loading notice
            loadingNotice.hide();

            // Show review modal instead of immediately replacing
            new AITextReviewModal(
                this.plugin.app,
                this.plugin,
                selection.text,
                result,
                action,
                (acceptedText) => {
                    // Replace the selected text when user accepts
                    this.replaceSelectedText(selection, acceptedText);
                    new Notice(`✓ ${action.label} applied`);
                }
            ).open();
        } catch (error) {
            console.error('[UniversalContextMenu] Action failed:', error);

            // Hide loading notice and show error
            loadingNotice.hide();
            new Notice(`✗ ${action.label} failed: ${error.message}`);
        }
    }

    /**
     * Execute custom prompt action
     */
    private async executeCustomAction(selection: { text: string; element: HTMLElement; range?: Range }): Promise<void> {
        // Create a simple prompt modal
        const prompt = window.prompt('Enter your custom instruction:', '');
        if (!prompt) {
            return;
        }

        const customAction: AITextAction = {
            type: 'custom',
            label: 'Custom',
            icon: '🔧',
            customPrompt: prompt,
        };

        await this.executeAction(customAction, selection);
    }

    /**
     * Replace selected text with result
     */
    private replaceSelectedText(selection: { text: string; element: HTMLElement; range?: Range }, result: string): void {
        const element = selection.element;

        // Handle different element types
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            // Input or textarea element
            this.replaceInInputElement(element, result);
        } else if (element.isContentEditable || element.closest('[contenteditable="true"]')) {
            // ContentEditable element
            this.replaceInContentEditable(selection.range, result);
        } else {
            // Try to replace using the selection range
            if (selection.range) {
                this.replaceInContentEditable(selection.range, result);
            } else {
                new Notice('Cannot replace text in this element type');
            }
        }
    }

    /**
     * Replace text in input or textarea element
     */
    private replaceInInputElement(element: HTMLInputElement | HTMLTextAreaElement, result: string): void {
        const start = element.selectionStart ?? 0;
        const end = element.selectionEnd ?? 0;
        const value = element.value;

        // Replace selected text
        const newValue = value.substring(0, start) + result + value.substring(end);
        element.value = newValue;

        // Set cursor position after inserted text
        const newCursorPos = start + result.length;
        element.setSelectionRange(newCursorPos, newCursorPos);

        // Focus the element
        element.focus();

        // Trigger input event so DataviewJS can detect the change
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Replace text in contenteditable or using range
     */
    private replaceInContentEditable(range: Range | undefined, result: string): void {
        if (!range) {
            new Notice('Cannot replace text: no selection range');
            return;
        }

        // Delete selected content
        range.deleteContents();

        // Insert new text
        const textNode = document.createTextNode(result);
        range.insertNode(textNode);

        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);

        // Update selection
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}
