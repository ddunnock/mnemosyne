/**
 * Loading Modal
 *
 * Persistent loading indicator for agent execution
 * Add this to src/ui/loadingModal.ts
 */

import { Modal, App } from 'obsidian';

export class LoadingModal extends Modal {
    private messageEl: HTMLElement;
    private spinnerEl: HTMLElement;
    private progressEl: HTMLElement;

    constructor(app: App, initialMessage: string = 'Processing...') {
        super(app);
        this.modalEl.addClass('loading-modal');
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Make modal non-dismissable
        this.modalEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';

        // Container
        const container = contentEl.createDiv({ cls: 'loading-container' });
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.padding = '40px';
        container.style.minWidth = '300px';

        // Spinner
        this.spinnerEl = container.createDiv({ cls: 'loading-spinner' });
        this.spinnerEl.style.width = '60px';
        this.spinnerEl.style.height = '60px';
        this.spinnerEl.style.border = '6px solid var(--background-modifier-border)';
        this.spinnerEl.style.borderTop = '6px solid var(--interactive-accent)';
        this.spinnerEl.style.borderRadius = '50%';
        this.spinnerEl.style.animation = 'spin 1s linear infinite';
        this.spinnerEl.style.marginBottom = '20px';

        // Message
        this.messageEl = container.createDiv({ cls: 'loading-message' });
        this.messageEl.style.fontSize = '1.1em';
        this.messageEl.style.fontWeight = '500';
        this.messageEl.style.marginBottom = '10px';
        this.messageEl.style.textAlign = 'center';
        this.messageEl.setText('Processing...');

        // Progress/details
        this.progressEl = container.createDiv({ cls: 'loading-progress' });
        this.progressEl.style.fontSize = '0.9em';
        this.progressEl.style.color = 'var(--text-muted)';
        this.progressEl.style.textAlign = 'center';
        this.progressEl.style.minHeight = '20px';

        // Add CSS animation if not already present
        if (!document.querySelector('#loading-spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'loading-spinner-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Update the loading message
     */
    setMessage(message: string) {
        if (this.messageEl) {
            this.messageEl.setText(message);
        }
    }

    /**
     * Update progress details
     */
    setProgress(progress: string) {
        if (this.progressEl) {
            this.progressEl.setText(progress);
        }
    }

    /**
     * Set both message and progress
     */
    update(message: string, progress?: string) {
        this.setMessage(message);
        if (progress) {
            this.setProgress(progress);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}