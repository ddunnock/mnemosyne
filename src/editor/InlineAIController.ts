/**
 * Inline AI Controller
 *
 * Manages AI-powered editor features:
 * - Auto-completion suggestions
 * - Text selection context menu
 */

import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import type RiskManagementPlugin from '../main';

export interface InlineAISettings {
    enabled: boolean;
    autoCompletionEnabled: boolean;
    contextMenuEnabled: boolean;
    autoCompletionDelay: number; // ms
    autoCompletionAgentId?: string;
    maxCompletionLength: number;
    showInlineMenu: boolean;
}

export const DEFAULT_INLINE_AI_SETTINGS: InlineAISettings = {
    enabled: true,
    autoCompletionEnabled: true,
    contextMenuEnabled: true,
    autoCompletionDelay: 500,
    maxCompletionLength: 200,
    showInlineMenu: true,
};

export class InlineAIController {
    private plugin: RiskManagementPlugin;
    private settings: InlineAISettings;
    private completionTimeout: NodeJS.Timeout | null = null;
    private lastCompletion: string = '';
    private isGenerating: boolean = false;

    constructor(plugin: RiskManagementPlugin, settings: InlineAISettings) {
        this.plugin = plugin;
        this.settings = settings;
    }

    /**
     * Request AI completion for current cursor position
     */
    async requestCompletion(editor: Editor, cursor: EditorPosition): Promise<string | null> {
        if (!this.settings.autoCompletionEnabled || this.isGenerating) {
            return null;
        }

        try {
            this.isGenerating = true;

            // Get context (current line + previous lines)
            const currentLine = editor.getLine(cursor.line);
            const beforeCursor = currentLine.substring(0, cursor.ch);

            // Get more context (previous 5 lines)
            const contextLines: string[] = [];
            const startLine = Math.max(0, cursor.line - 5);
            for (let i = startLine; i < cursor.line; i++) {
                contextLines.push(editor.getLine(i));
            }
            contextLines.push(beforeCursor);

            const context = contextLines.join('\n');

            // Get the agent to use
            const agentId = this.settings.autoCompletionAgentId || this.plugin.settings.defaultAgentId;
            if (!agentId) {
                console.warn('No agent configured for auto-completion. Please set a default agent in settings.');
                return null;
            }

            // Check if agent manager is ready
            if (!this.plugin.agentManager) {
                console.warn('Agent manager not initialized. Auto-completion unavailable.');
                return null;
            }

            // Create completion prompt
            const prompt = `Continue writing the following text naturally. Provide only the next 1-2 sentences that would logically follow. Do not repeat the context, only provide the continuation:

${context}`;

            // Call the agent
            const result = await this.plugin.agentManager?.executeAgent(agentId, prompt);

            if (result?.answer) {
                // Clean up the response - remove any repeated context
                let completion = result.answer.trim();

                // Remove leading quotes or formatting
                completion = completion.replace(/^["'`]+/, '').replace(/["'`]+$/, '');

                // Limit length
                if (completion.length > this.settings.maxCompletionLength) {
                    completion = completion.substring(0, this.settings.maxCompletionLength);
                    // Try to end at a word boundary
                    const lastSpace = completion.lastIndexOf(' ');
                    if (lastSpace > this.settings.maxCompletionLength * 0.7) {
                        completion = completion.substring(0, lastSpace);
                    }
                }

                this.lastCompletion = completion;
                return completion;
            }

            return null;
        } catch (error) {
            console.error('Auto-completion error:', error);
            return null;
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Process text with AI based on selected action
     */
    async processText(text: string, action: AITextAction): Promise<string> {
        const prompt = this.buildPrompt(text, action);

        // Get the agent to use
        const agentId = this.settings.autoCompletionAgentId || this.plugin.settings.defaultAgentId;
        if (!agentId) {
            throw new Error('No agent configured for inline AI. Please set a default agent in settings.');
        }

        // Check if agent manager is ready
        if (!this.plugin.agentManager) {
            throw new Error('Agent manager not initialized. Please reload the plugin.');
        }

        // Call the agent
        const result = await this.plugin.agentManager?.executeAgent(agentId, prompt);

        if (!result?.answer) {
            throw new Error('No response from AI');
        }

        return result.answer.trim();
    }

    /**
     * Build prompt for specific action
     */
    private buildPrompt(text: string, action: AITextAction): string {
        const prompts: Record<string, string> = {
            rewrite: `Rewrite the following text to improve clarity and flow while maintaining the original meaning:\n\n${text}`,
            expand: `Expand on the following text with more details, examples, and elaboration:\n\n${text}`,
            summarize: `Summarize the following text concisely while keeping the key points:\n\n${text}`,
            fixGrammar: `Fix any grammar, spelling, and punctuation errors in the following text:\n\n${text}`,
            makeConcise: `Make the following text more concise and direct:\n\n${text}`,
            makeDetailed: `Make the following text more detailed and comprehensive:\n\n${text}`,
            simplify: `Simplify the following text to make it easier to understand:\n\n${text}`,
            professional: `Rewrite the following text in a professional and formal tone:\n\n${text}`,
            casual: `Rewrite the following text in a casual and friendly tone:\n\n${text}`,
        };

        if (action.type === 'custom' && action.customPrompt) {
            return `${action.customPrompt}\n\n${text}`;
        }

        return prompts[action.type] || prompts.rewrite;
    }

    /**
     * Update settings
     */
    updateSettings(settings: Partial<InlineAISettings>) {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * Get current settings
     */
    getSettings(): InlineAISettings {
        return { ...this.settings };
    }
}

/**
 * AI Text Action Types
 */
export type AITextActionType =
    | 'rewrite'
    | 'expand'
    | 'summarize'
    | 'fixGrammar'
    | 'makeConcise'
    | 'makeDetailed'
    | 'simplify'
    | 'professional'
    | 'casual'
    | 'custom';

export interface AITextAction {
    type: AITextActionType;
    label: string;
    icon: string;
    customPrompt?: string;
    temperature?: number;
}

/**
 * Predefined AI actions
 */
export const AI_TEXT_ACTIONS: AITextAction[] = [
    { type: 'rewrite', label: 'Rewrite', icon: '✨' },
    { type: 'expand', label: 'Expand', icon: '📝' },
    { type: 'summarize', label: 'Summarize', icon: '📄' },
    { type: 'fixGrammar', label: 'Fix Grammar', icon: '✅' },
    { type: 'makeConcise', label: 'Make Concise', icon: '🎯' },
    { type: 'makeDetailed', label: 'Make Detailed', icon: '📖' },
    { type: 'simplify', label: 'Simplify', icon: '💡' },
    { type: 'professional', label: 'Professional Tone', icon: '👔' },
    { type: 'casual', label: 'Casual Tone', icon: '😊' },
    { type: 'custom', label: 'Custom Prompt...', icon: '🔧' },
];
