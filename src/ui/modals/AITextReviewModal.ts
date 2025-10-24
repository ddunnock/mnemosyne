/**
 * AI Text Review Modal
 *
 * Shows before/after comparison and allows user to:
 * - Accept the changes
 * - Reject and keep original
 * - Try again (regenerate)
 */

import { App, Modal, Notice } from 'obsidian';
import type RiskManagementPlugin from '../../main';
import { AITextAction } from '../../editor/InlineAIController';

export class AITextReviewModal extends Modal {
    private originalText: string;
    private generatedText: string;
    private action: AITextAction;
    private onAccept: (text: string) => void;
    private plugin: RiskManagementPlugin;
    private resultElement: HTMLElement;
    private isRegenerating: boolean = false;

    constructor(
        app: App,
        plugin: RiskManagementPlugin,
        originalText: string,
        generatedText: string,
        action: AITextAction,
        onAccept: (text: string) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.originalText = originalText;
        this.generatedText = generatedText;
        this.action = action;
        this.onAccept = onAccept;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ai-text-review-modal');

        // Directly set modal size via inline styles for maximum specificity
        const modalEl = contentEl.closest('.modal') as HTMLElement;
        const modalContainer = contentEl.closest('.modal-container') as HTMLElement;

        if (modalEl) {
            modalEl.style.width = '95vw';
            modalEl.style.maxWidth = '1600px';
            modalEl.style.minWidth = '800px';
            modalEl.style.height = '60vh';
            modalEl.style.maxHeight = '500px';
            modalEl.style.minHeight = '400px';
            // Prevent modal itself from scrolling
            modalEl.style.overflow = 'hidden';
        }

        if (modalContainer) {
            modalContainer.style.display = 'flex';
            modalContainer.style.alignItems = 'center';
            modalContainer.style.justifyContent = 'center';
        }

        // Ensure contentEl uses full height and doesn't scroll
        contentEl.style.height = '100%';
        contentEl.style.overflow = 'hidden';

        // Title
        contentEl.createEl('h2', { text: `${this.action.icon} ${this.action.label} - Review` });

        // Create container with two columns
        const container = contentEl.createDiv({ cls: 'review-container' });

        // Original text section
        const originalSection = container.createDiv({ cls: 'review-section' });
        originalSection.createEl('h3', { text: 'Original' });
        const originalBox = originalSection.createDiv({ cls: 'text-box original' });
        originalBox.createEl('pre', { text: this.originalText });

        // Generated text section
        const generatedSection = container.createDiv({ cls: 'review-section' });
        generatedSection.createEl('h3', { text: 'AI Generated' });
        this.resultElement = generatedSection.createDiv({ cls: 'text-box generated' });
        this.resultElement.createEl('pre', { text: this.generatedText });

        // Synchronized scrolling between text boxes
        let isScrolling = false;
        originalBox.addEventListener('scroll', () => {
            if (isScrolling) return;
            isScrolling = true;
            this.resultElement.scrollTop = originalBox.scrollTop;
            this.resultElement.scrollLeft = originalBox.scrollLeft;
            setTimeout(() => { isScrolling = false; }, 50);
        });

        this.resultElement.addEventListener('scroll', () => {
            if (isScrolling) return;
            isScrolling = true;
            originalBox.scrollTop = this.resultElement.scrollTop;
            originalBox.scrollLeft = this.resultElement.scrollLeft;
            setTimeout(() => { isScrolling = false; }, 50);
        });

        // Word count comparison
        const originalWords = this.originalText.split(/\s+/).length;
        const generatedWords = this.generatedText.split(/\s+/).length;
        const statsDiv = contentEl.createDiv({ cls: 'stats' });
        statsDiv.createEl('span', {
            text: `Word count: ${originalWords} → ${generatedWords} `,
            cls: 'word-count'
        });
        if (generatedWords > originalWords) {
            statsDiv.createEl('span', {
                text: `(+${generatedWords - originalWords})`,
                cls: 'word-change positive'
            });
        } else if (generatedWords < originalWords) {
            statsDiv.createEl('span', {
                text: `(-${originalWords - generatedWords})`,
                cls: 'word-change negative'
            });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'button-container' });

        // Accept button
        const acceptBtn = buttonContainer.createEl('button', {
            text: '✓ Accept',
            cls: 'mod-cta'
        });
        acceptBtn.onclick = () => {
            this.onAccept(this.generatedText);
            this.close();
        };

        // Try Again button
        const retryBtn = buttonContainer.createEl('button', {
            text: '🔄 Try Again'
        });
        retryBtn.onclick = async () => {
            await this.regenerate();
        };

        // Reject button
        const rejectBtn = buttonContainer.createEl('button', {
            text: '✗ Reject'
        });
        rejectBtn.onclick = () => {
            new Notice('Changes rejected');
            this.close();
        };

        // Add styles
        this.addStyles();

        // Focus accept button
        acceptBtn.focus();
    }

    /**
     * Regenerate the AI result
     */
    private async regenerate(): Promise<void> {
        if (this.isRegenerating) return;

        this.isRegenerating = true;

        // Show loading state
        this.resultElement.empty();
        const loadingDiv = this.resultElement.createDiv({ cls: 'loading' });
        loadingDiv.createEl('p', { text: '⏳ Regenerating...' });

        try {
            // Call AI again
            const newResult = await this.plugin.inlineAIController.processText(
                this.originalText,
                this.action
            );

            // Update the generated text
            this.generatedText = newResult;

            // Update the display
            this.resultElement.empty();
            this.resultElement.createEl('pre', { text: this.generatedText });

            // Update word count
            const statsDiv = this.contentEl.querySelector('.stats');
            if (statsDiv) {
                statsDiv.empty();
                const originalWords = this.originalText.split(/\s+/).length;
                const generatedWords = this.generatedText.split(/\s+/).length;
                statsDiv.createEl('span', {
                    text: `Word count: ${originalWords} → ${generatedWords} `,
                    cls: 'word-count'
                });
                if (generatedWords > originalWords) {
                    statsDiv.createEl('span', {
                        text: `(+${generatedWords - originalWords})`,
                        cls: 'word-change positive'
                    });
                } else if (generatedWords < originalWords) {
                    statsDiv.createEl('span', {
                        text: `(-${originalWords - generatedWords})`,
                        cls: 'word-change negative'
                    });
                }
            }

            new Notice('✓ Regenerated successfully');
        } catch (error) {
            console.error('Regeneration failed:', error);
            this.resultElement.empty();
            this.resultElement.createEl('p', {
                text: `✗ Failed to regenerate: ${error.message}`,
                cls: 'error'
            });
            new Notice(`Failed to regenerate: ${error.message}`);
        } finally {
            this.isRegenerating = false;
        }
    }

    /**
     * Add modal styles
     */
    private addStyles(): void {
        if (document.getElementById('ai-text-review-modal-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'ai-text-review-modal-styles';
        style.textContent = `
            /* Target the modal container wrapper with high specificity */
            body > .modal-container:has(.ai-text-review-modal),
            .modal-container.mod-dim:has(.ai-text-review-modal) {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* Target the outer modal with full selector chain */
            body > .modal-container:has(.ai-text-review-modal) > .modal,
            .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                width: 95vw;
                max-width: 1600px;
                min-width: 800px;
                height: 60vh;
                max-height: 500px;
                min-height: 400px;
            }

            /* The modal content itself with full chain */
            body > .modal-container > .modal > .modal-content.ai-text-review-modal,
            .modal-container.mod-dim > .modal > .modal-content.ai-text-review-modal {
                padding: 20px;
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                overflow: hidden;
            }

            .ai-text-review-modal h2 {
                margin: 0 0 15px 0;
                flex-shrink: 0;
            }

            .review-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                flex: 1;
                min-height: 0;
                min-width: 0;
                overflow: hidden;
                width: 100%;
            }

            .review-section {
                display: flex;
                flex-direction: column;
                min-height: 0;
                min-width: 0;
                overflow: hidden;
            }

            .review-section h3 {
                margin: 0 0 10px 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                flex-shrink: 0;
            }

            .text-box {
                padding: 15px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary-alt);
                overflow: auto;
                flex: 1;
                min-height: 0;
                min-width: 0;
                max-height: 100%;
                box-sizing: border-box;
            }

            .text-box pre {
                margin: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
                font-family: var(--font-text);
                font-size: 13px;
                line-height: 1.6;
                min-width: 0;
                max-width: 100%;
                display: block;
            }

            .text-box.original {
                border-left: 3px solid var(--text-muted);
            }

            .text-box.generated {
                border-left: 3px solid var(--interactive-accent);
            }

            .text-box.loading {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100px;
            }

            .text-box.loading p {
                color: var(--text-muted);
                font-style: italic;
            }

            .text-box .error {
                color: var(--text-error);
            }

            .stats {
                margin: 15px 0 0 0;
                padding: 12px 0 8px 0;
                font-size: 13px;
                color: var(--text-muted);
                flex-shrink: 0;
                border-top: 1px solid var(--background-modifier-border);
            }

            .word-count {
                font-weight: 500;
            }

            .word-change {
                font-weight: 600;
            }

            .word-change.positive {
                color: var(--text-success);
            }

            .word-change.negative {
                color: var(--text-warning);
            }

            .button-container {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                padding-top: 12px;
                flex-shrink: 0;
                margin-top: auto;
            }

            .button-container button {
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                color: var(--text-normal);
                transition: all 0.15s;
            }

            .button-container button:hover {
                background: var(--background-modifier-hover);
                border-color: var(--interactive-accent);
            }

            .button-container button.mod-cta {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border-color: var(--interactive-accent);
            }

            .button-container button.mod-cta:hover {
                background: var(--interactive-accent-hover);
            }

            /* Responsive breakpoints */

            /* Large screens - extra wide for comparison */
            @media (min-width: 1400px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    width: 90vw;
                    max-width: 1800px;
                }
            }

            /* Medium-large screens */
            @media (min-width: 1025px) and (max-width: 1399px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    width: 92vw;
                    max-width: 1400px;
                }
            }

            /* Medium screens */
            @media (min-width: 769px) and (max-width: 1024px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    width: 95vw;
                    max-width: 1200px;
                }
            }

            /* Small screens - stack vertically */
            @media (max-width: 768px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    width: 98vw;
                    height: 85vh;
                    max-width: none;
                }

                .ai-text-review-modal .review-container {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                .ai-text-review-modal .text-box {
                    max-height: 250px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
