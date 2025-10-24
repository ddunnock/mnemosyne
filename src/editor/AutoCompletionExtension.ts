/**
 * Auto-Completion CodeMirror Extension
 *
 * Provides GitHub Copilot-style inline suggestions
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType, keymap } from '@codemirror/view';
import { StateField, StateEffect, Prec } from '@codemirror/state';
import { InlineAIController } from './InlineAIController';
import type RiskManagementPlugin from '../main';

/**
 * State effect to set completion suggestion
 */
const setCompletionEffect = StateEffect.define<string | null>();

/**
 * State effect to accept completion
 */
const acceptCompletionEffect = StateEffect.define<null>();

/**
 * Widget to display ghost text completion
 */
class CompletionWidget extends WidgetType {
    constructor(readonly completion: string) {
        super();
    }

    toDOM() {
        const span = document.createElement('span');
        span.className = 'mnemosyne-completion-ghost';
        span.textContent = this.completion;
        span.style.opacity = '0.4';
        span.style.fontStyle = 'italic';
        return span;
    }

    eq(other: CompletionWidget) {
        return other.completion === this.completion;
    }
}

/**
 * State field to manage completion decorations
 */
const completionField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations: DecorationSet, tr: any): DecorationSet {
        decorations = decorations.map(tr.changes);

        for (let effect of tr.effects) {
            if (effect.is(setCompletionEffect)) {
                if (effect.value === null) {
                    decorations = Decoration.none;
                } else {
                    const pos = tr.state.selection.main.head;
                    const widget = Decoration.widget({
                        widget: new CompletionWidget(effect.value),
                        side: 1,
                    });
                    decorations = Decoration.set([widget.range(pos)]);
                }
            }
        }

        return decorations;
    },
    provide: (f: any) => EditorView.decorations.from(f),
});

/**
 * View plugin to handle completion logic
 */
export class AutoCompletionPlugin {
    private inlineAI: InlineAIController;
    private completionTimeout: NodeJS.Timeout | null = null;
    private lastCursorPos: number = -1;
    private isInitialized: boolean = false;

    constructor(readonly view: EditorView, readonly plugin: RiskManagementPlugin) {
        this.inlineAI = plugin.inlineAIController;
        this.lastCursorPos = view.state.selection.main.head;
        // Don't schedule completion in constructor - wait for first update
        this.isInitialized = true;
    }

    update(update: ViewUpdate) {
        const settings = this.inlineAI.getSettings();
        if (!settings.enabled || !settings.autoCompletionEnabled) {
            // Clear completion timeout but don't try to clear the decoration
            // during disabled state to avoid update cycle issues
            if (this.completionTimeout) {
                clearTimeout(this.completionTimeout);
                this.completionTimeout = null;
            }
            return;
        }

        // Check if cursor position changed or document was edited
        const cursorPos = update.state.selection.main.head;
        if (update.docChanged || cursorPos !== this.lastCursorPos) {
            this.lastCursorPos = cursorPos;
            this.scheduleCompletion();
        }

        // Handle Tab key to accept completion
        // Handle Escape to dismiss completion
        // (These are handled via keymap in the extension)
    }

    private scheduleCompletion() {
        // Clear existing timeout
        if (this.completionTimeout) {
            clearTimeout(this.completionTimeout);
        }

        // Clear existing completion (if any)
        this.clearCompletion();

        const settings = this.inlineAI.getSettings();

        // Schedule new completion request
        this.completionTimeout = setTimeout(() => {
            this.requestCompletion();
        }, settings.autoCompletionDelay);
    }

    private async requestCompletion() {
        const settings = this.inlineAI.getSettings();
        if (!settings.enabled || !settings.autoCompletionEnabled) {
            return;
        }

        console.debug('[AutoCompletion] Requesting completion...');

        // Get current cursor position
        const state = this.view.state;
        const cursor = state.selection.main.head;
        const line = state.doc.lineAt(cursor);

        // Don't suggest if cursor is not at end of line
        if (cursor !== line.to) {
            return;
        }

        // Don't suggest on empty lines
        const lineText = line.text.trim();
        if (lineText.length === 0) {
            return;
        }

        try {
            // Convert CodeMirror state to Obsidian Editor format for the controller
            const editorAdapter = {
                getLine: (lineNum: number) => {
                    const line = state.doc.line(lineNum + 1); // CodeMirror is 1-indexed
                    return line.text;
                },
            };

            const lineNum = state.doc.lineAt(cursor).number - 1; // Convert to 0-indexed
            const ch = cursor - line.from;

            // Request completion
            const completion = await this.inlineAI.requestCompletion(editorAdapter as any, {
                line: lineNum,
                ch: ch,
            });

            if (completion) {
                console.debug('[AutoCompletion] Got completion:', completion.substring(0, 50) + '...');
                this.showCompletion(completion);
            } else {
                console.debug('[AutoCompletion] No completion returned');
            }
        } catch (error) {
            console.error('[AutoCompletion] Completion request failed:', error);
        }
    }

    private showCompletion(completion: string) {
        this.view.dispatch({
            effects: setCompletionEffect.of(completion),
        });
    }

    private clearCompletion() {
        try {
            this.view.dispatch({
                effects: setCompletionEffect.of(null),
            });
        } catch (error) {
            // Silently ignore if we can't dispatch (e.g., during update cycle)
            console.debug('Could not clear completion:', error);
        }
    }

    acceptCompletion() {
        const decorations = this.view.state.field(completionField);
        const cursor = decorations.iter();

        if (cursor.value) {
            const widget = cursor.value.spec.widget as CompletionWidget;
            const completion = widget.completion;
            const pos = this.view.state.selection.main.head;

            this.view.dispatch({
                changes: { from: pos, insert: completion },
                selection: { anchor: pos + completion.length },
                effects: setCompletionEffect.of(null),
            });
        }
    }

    destroy() {
        if (this.completionTimeout) {
            clearTimeout(this.completionTimeout);
        }
        this.clearCompletion();
    }
}

/**
 * Create the auto-completion extension
 */
export function createAutoCompletionExtension(plugin: RiskManagementPlugin) {
    return [
        completionField,
        ViewPlugin.fromClass(
            class {
                plugin: AutoCompletionPlugin;

                constructor(view: EditorView) {
                    this.plugin = new AutoCompletionPlugin(view, plugin);
                }

                update(update: ViewUpdate) {
                    this.plugin.update(update);
                }

                destroy() {
                    this.plugin.destroy();
                }
            }
        ),
        // Keymap for accepting/rejecting completions
        // Use high precedence to override default Tab behavior
        Prec.high(keymap.of([
            {
                key: 'Tab',
                run: (view: EditorView) => {
                    // Check if there's an active completion
                    const decorations = view.state.field(completionField, false);
                    if (!decorations || decorations.size === 0) {
                        return false; // No completion, allow default Tab behavior
                    }

                    const cursor = decorations.iter();
                    if (cursor.value) {
                        // Extract completion text
                        const widget = cursor.value.spec.widget as CompletionWidget;
                        const completion = widget.completion;
                        const pos = view.state.selection.main.head;

                        // Insert completion and clear decoration in one transaction
                        view.dispatch({
                            changes: { from: pos, insert: completion },
                            selection: { anchor: pos + completion.length },
                            effects: setCompletionEffect.of(null),
                        });

                        return true; // Handled
                    }

                    return false;
                },
            },
            {
                key: 'Escape',
                run: (view: EditorView) => {
                    // Check if there's an active completion to dismiss
                    const decorations = view.state.field(completionField, false);
                    if (!decorations || decorations.size === 0) {
                        return false; // No completion, allow default Escape behavior
                    }

                    // Clear the completion
                    view.dispatch({
                        effects: setCompletionEffect.of(null),
                    });

                    return true; // Handled
                },
            },
        ])),
    ];
}
