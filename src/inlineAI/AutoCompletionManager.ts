import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import RiskManagementPlugin from '../main';

interface CompletionSuggestion {
    text: string;
    displayText: string;
    description?: string;
    type: 'enhancement' | 'completion' | 'suggestion';
    confidence: number;
}

export class AutoCompletionManager extends EditorSuggest<CompletionSuggestion> {
    private plugin: RiskManagementPlugin;
    private isEnabled: boolean = true;
    private debounceTimer: number | null = null;
    private lastQuery: string = '';
    private lastSuggestions: CompletionSuggestion[] = [];

    constructor(plugin: RiskManagementPlugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for editor changes
        this.plugin.registerEvent(
            this.plugin.app.workspace.on('editor-change', (editor) => {
                this.handleEditorChange(editor);
            })
        );
    }

    private handleEditorChange(editor: Editor): void {
        if (!this.isEnabled) return;

        // Debounce the completion requests
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = window.setTimeout(() => {
            this.checkForCompletion(editor);
        }, 500); // 500ms delay
    }

    private async checkForCompletion(editor: Editor): Promise<void> {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const textBeforeCursor = line.substring(0, cursor.ch);

        // Look for completion triggers
        const triggers = [
            { pattern: /(?:^|\s)(summarize|explain|improve|expand|simplify|translate|analyze|rewrite)\s+(.+)$/i, type: 'enhancement' },
            { pattern: /(?:^|\s)(continue|complete|finish)\s+(.+)$/i, type: 'completion' },
            { pattern: /(?:^|\s)(suggest|recommend|propose)\s+(.+)$/i, type: 'suggestion' }
        ];

        for (const trigger of triggers) {
            const match = textBeforeCursor.match(trigger.pattern);
            if (match) {
                const query = match[2].trim();
                if (query.length > 3 && query !== this.lastQuery) {
                    this.lastQuery = query;
                    await this.generateSuggestions(query, trigger.type);
                    this.showSuggestions();
                    break;
                }
            }
        }
    }

    private async generateSuggestions(query: string, type: string): Promise<void> {
        try {
            if (!this.plugin.agentManager?.isReady()) {
                this.lastSuggestions = [];
                return;
            }

            const agent = this.plugin.agentManager.getDefaultAgent();
            if (!agent) {
                this.lastSuggestions = [];
                return;
            }

            const prompt = this.buildCompletionPrompt(query, type);
            const response = await agent.execute(prompt);

            // Parse suggestions from response
            this.lastSuggestions = this.parseSuggestions(response.answer, type);

        } catch (error) {
            console.error('Error generating suggestions:', error);
            this.lastSuggestions = [];
        }
    }

    private buildCompletionPrompt(query: string, type: string): string {
        const basePrompt = `Based on the following text, provide 3-5 ${type} suggestions. Be concise and practical.

Text: "${query}"

Please provide suggestions in this format:
1. [Suggestion 1]
2. [Suggestion 2]
3. [Suggestion 3]
...`;

        return basePrompt;
    }

    private parseSuggestions(response: string, type: string): CompletionSuggestion[] {
        const suggestions: CompletionSuggestion[] = [];
        const lines = response.split('\n');

        for (const line of lines) {
            const match = line.match(/^\d+\.\s*(.+)$/);
            if (match) {
                const text = match[1].trim();
                if (text.length > 0) {
                    suggestions.push({
                        text,
                        displayText: text,
                        type: type as any,
                        confidence: 0.8
                    });
                }
            }
        }

        return suggestions.slice(0, 5); // Limit to 5 suggestions
    }

    private showSuggestions(): void {
        if (this.lastSuggestions.length > 0) {
            this.open();
        }
    }

    // EditorSuggest implementation
    getSuggestions(context: EditorSuggestContext): CompletionSuggestion[] {
        return this.lastSuggestions;
    }

    renderSuggestion(suggestion: CompletionSuggestion, el: HTMLElement): void {
        el.addClass('mnemosyne-completion-suggestion');
        
        const container = el.createDiv('suggestion-container');
        
        const textEl = container.createDiv('suggestion-text');
        textEl.textContent = suggestion.displayText;
        
        if (suggestion.description) {
            const descEl = container.createDiv('suggestion-description');
            descEl.textContent = suggestion.description;
        }
        
        const typeEl = container.createDiv('suggestion-type');
        typeEl.textContent = suggestion.type;
    }

    selectSuggestion(suggestion: CompletionSuggestion, evt: MouseEvent | KeyboardEvent): void {
        if (this.context) {
            const editor = this.context.editor;
            const start = this.context.start;
            const end = this.context.end;
            
            // Replace the current text with the suggestion
            editor.replaceRange(suggestion.text, start, end);
            
            // Move cursor to end of inserted text
            const newCursor = {
                line: start.line,
                ch: start.ch + suggestion.text.length
            };
            editor.setCursor(newCursor);
        }
        
        this.close();
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        // This is called by the EditorSuggest system
        // We handle triggering manually in checkForCompletion
        return null;
    }

    public enable(): void {
        this.isEnabled = true;
    }

    public disable(): void {
        this.isEnabled = false;
        this.close();
    }

    public destroy(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.close();
    }
}