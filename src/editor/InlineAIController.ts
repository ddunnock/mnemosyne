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

            // Ensure system is initialized (will attempt to initialize if not ready)
            const ready = await this.ensureSystemReady();
            if (!ready) {
                console.debug('[InlineAI] System not ready for auto-completion yet');
                return null;
            }

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
                console.debug('[InlineAI] No agent configured for auto-completion');
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
     * Check if all required systems are initialized
     */
    private isSystemReady(): boolean {
        // Check if agent manager exists
        if (!this.plugin.agentManager) {
            return false;
        }

        // Check if LLM manager exists and is ready
        if (!this.plugin.llmManager || !this.plugin.llmManager.isReady()) {
            return false;
        }

        // Check if key manager has password (needed for API key decryption)
        if (!this.plugin.keyManager || !this.plugin.keyManager.hasMasterPassword()) {
            return false;
        }

        return true;
    }

    /**
     * Attempt to initialize the LLM system if not already ready
     */
    private async ensureSystemReady(): Promise<boolean> {
        if (this.isSystemReady()) {
            return true;
        }

        console.debug('[InlineAI] System not ready, attempting initialization...');

        // Check if we have the key manager with password
        if (!this.plugin.keyManager || !this.plugin.keyManager.hasMasterPassword()) {
            console.debug('[InlineAI] No master password available - cannot initialize');
            return false;
        }

        // Try to initialize LLM Manager if it exists but isn't ready
        if (this.plugin.llmManager && !this.plugin.llmManager.isReady()) {
            try {
                console.debug('[InlineAI] Initializing LLM Manager...');
                await this.plugin.llmManager.initialize();
                console.debug('[InlineAI] LLM Manager initialized successfully');
                return this.isSystemReady();
            } catch (error) {
                console.error('[InlineAI] Failed to initialize LLM Manager:', error);
                return false;
            }
        }

        return this.isSystemReady();
    }

    /**
     * Process text with AI based on selected action
     */
    async processText(text: string, action: AITextAction): Promise<string> {
        // Ensure system is initialized (will attempt to initialize if not ready)
        const ready = await this.ensureSystemReady();
        if (!ready) {
            throw new Error('AI system is not initialized yet. Please ensure your master password is set and LLM providers are configured.');
        }

        const prompt = this.buildPrompt(text, action);

        // Get the agent to use
        const agentId = this.settings.autoCompletionAgentId || this.plugin.settings.defaultAgentId;
        if (!agentId) {
            throw new Error('No agent configured for inline AI. Please set a default agent in settings.');
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
        // Count approximate word count for length constraints
        const wordCount = text.split(/\s+/).length;

        const prompts: Record<string, string> = {
            rewrite: `Rewrite the following text to improve clarity and flow while maintaining the original meaning.

IMPORTANT: Return ONLY the rewritten text. Do not include any explanations, preambles, or phrases like "Here is..." or "The revised text is...". Just return the improved text directly.

Text to rewrite:
${text}`,

            expand: `Expand on the following text with more details and elaboration. Add approximately ${Math.max(20, wordCount * 2)} to ${Math.max(40, wordCount * 3)} words of additional content.

IMPORTANT: Return ONLY the expanded text. Do not include any explanations, preambles, or introductory phrases. Just return the expanded version directly.

Text to expand:
${text}`,

            summarize: `Summarize the following text concisely while keeping the key points. Aim for approximately ${Math.max(10, Math.floor(wordCount / 3))} words.

IMPORTANT: Return ONLY the summary. Do not include any explanations, preambles, or phrases like "Summary:" or "In summary...". Just return the concise summary directly.

Text to summarize:
${text}`,

            fixGrammar: `Fix any grammar, spelling, and punctuation errors in the following text. Make minimal changes - only correct errors, do not rephrase or restructure.

IMPORTANT: Return ONLY the corrected text. Do not include any explanations, lists of changes, or phrases like "Here is the corrected text...". Just return the fixed text directly.

Text to fix:
${text}`,

            makeConcise: `Make the following text more concise and direct. Remove unnecessary words while preserving the core meaning.

IMPORTANT: Return ONLY the concise version. Do not include any explanations or preambles. Just return the shortened text directly.

Text to make concise:
${text}`,

            makeDetailed: `Make the following text more detailed and comprehensive. Add relevant information and context to enrich the content.

IMPORTANT: Return ONLY the detailed version. Do not include any explanations or preambles. Just return the enhanced text directly.

Text to make detailed:
${text}`,

            simplify: `Simplify the following text to make it easier to understand. Use simpler words and shorter sentences.

IMPORTANT: Return ONLY the simplified text. Do not include any explanations or preambles. Just return the simpler version directly.

Text to simplify:
${text}`,

            professional: `Rewrite the following text in a professional and formal tone.

IMPORTANT: Return ONLY the professionally rewritten text. Do not include any explanations or preambles. Just return the formal version directly.

Text to make professional:
${text}`,

            casual: `Rewrite the following text in a casual and friendly tone.

IMPORTANT: Return ONLY the casually rewritten text. Do not include any explanations or preambles. Just return the friendly version directly.

Text to make casual:
${text}`,
        };

        if (action.type === 'custom' && action.customPrompt) {
            return `${action.customPrompt}

IMPORTANT: Return ONLY the modified text based on the instruction above. Do not include explanations or preambles.

Text:
${text}`;
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
