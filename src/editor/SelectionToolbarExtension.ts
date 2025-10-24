/**
 * Selection Toolbar Extension for CodeMirror
 *
 * Detects text selection and shows the floating toolbar
 */

import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import type RiskManagementPlugin from '../main';
import { SelectionToolbar } from './SelectionToolbar';

/**
 * View plugin to handle selection changes
 */
export class SelectionToolbarPlugin {
    private toolbar: SelectionToolbar;
    private lastSelectionHash: string = '';

    constructor(readonly view: EditorView, readonly plugin: RiskManagementPlugin) {
        this.toolbar = new SelectionToolbar(plugin);
    }

    update(update: ViewUpdate) {
        // Only process if selection changed
        if (!update.selectionSet && !update.docChanged) {
            return;
        }

        const selection = update.state.selection;
        const range = selection.main;

        // Create a hash of the selection to detect changes
        const selectionHash = `${range.from}-${range.to}`;

        if (selectionHash === this.lastSelectionHash) {
            return;
        }

        this.lastSelectionHash = selectionHash;

        // If selection is empty, hide toolbar
        if (range.empty) {
            this.toolbar.hide();
            return;
        }

        // Get selected text length
        const selectedText = update.state.sliceDoc(range.from, range.to);

        // Only show for non-trivial selections (> 1 character)
        if (selectedText.length <= 1) {
            this.toolbar.hide();
            return;
        }

        // Show toolbar at selection position
        // Small delay to ensure selection is fully rendered
        setTimeout(() => {
            this.toolbar.show(this.view, selection);
        }, 50);
    }

    destroy() {
        this.toolbar.destroy();
    }
}

/**
 * Create the selection toolbar extension
 */
export function createSelectionToolbarExtension(plugin: RiskManagementPlugin) {
    return ViewPlugin.fromClass(
        class {
            plugin: SelectionToolbarPlugin;

            constructor(view: EditorView) {
                this.plugin = new SelectionToolbarPlugin(view, plugin);
            }

            update(update: ViewUpdate) {
                this.plugin.update(update);
            }

            destroy() {
                this.plugin.destroy();
            }
        }
    );
}
