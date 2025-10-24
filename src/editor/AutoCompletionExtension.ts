/**
 * Auto-Completion CodeMirror Extension
 *
 * Provides GitHub Copilot-style inline suggestions
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { InlineAIController } from './InlineAIController';
import type RiskManagementPlugin from '../main';

/**
 * State effect to set completion suggestion
 */
const setCompletionEffect = StateEffect.define<string | null>();

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

    constructor(readonly view: EditorView, readonly plugin: RiskManagementPlugin) {
        this.inlineAI = plugin.inlineAIController;
        this.scheduleCompletion();
    }

    update(update: ViewUpdate) {
        const settings = this.inlineAI.getSettings();
        if (!settings.enabled || !settings.autoCompletionEnabled) {
            this.clearCompletion();
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

        // Clear existing completion
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
                this.showCompletion(completion);
            }
        } catch (error) {
            console.error('Completion request failed:', error);
        }
    }

    private showCompletion(completion: string) {
        this.view.dispatch({
            effects: setCompletionEffect.of(completion),
        });
    }

    private clearCompletion() {
        this.view.dispatch({
            effects: setCompletionEffect.of(null),
        });
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
        EditorView.domEventHandlers({
            keydown(event: KeyboardEvent, view: EditorView) {
                // Tab to accept
                if (event.key === 'Tab') {
                    const decorations = view.state.field(completionField, false);
                    if (decorations && !decorations.size) {
                        return false; // No completion to accept
                    }

                    // Check if there's an active completion
                    const cursor = decorations?.iter();
                    if (cursor?.value) {
                        event.preventDefault();
                        // Find the plugin instance and accept completion
                        // This is a bit hacky but necessary due to CodeMirror's architecture
                        const plugins = (view as any).plugin;
                        for (const p of plugins || []) {
                            if (p instanceof AutoCompletionPlugin) {
                                p.acceptCompletion();
                                return true;
                            }
                        }
                    }
                }

                // Escape to dismiss
                if (event.key === 'Escape') {
                    view.dispatch({
                        effects: setCompletionEffect.of(null),
                    });
                    return true;
                }

                return false;
            },
        }),
    ];
}
