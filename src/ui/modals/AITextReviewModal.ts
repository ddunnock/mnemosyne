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

        // Set up flexbox layout on contentEl
        contentEl.style.display = 'flex';
        contentEl.style.flexDirection = 'column';
        contentEl.style.height = '100%';
        contentEl.style.overflow = 'hidden';

        // Calculate dynamic size based on content length
        const charCount = Math.max(this.originalText.length, this.generatedText.length);
        const lineCount = Math.max(
            this.originalText.split('\n').length,
            this.generatedText.split('\n').length
        );

        // Dynamic sizing strategy: Maximize height, use current width as max
        // This minimizes horizontal scrolling by making the modal taller
        const availableWidth = window.innerWidth * 0.9;
        const availableHeight = window.innerHeight * 0.9;

        // Width: Use available width (90vw) with minimum for two columns
        const width = Math.max(900, availableWidth);

        // Height: Maximize to 90vh to reduce need for horizontal scroll
        const height = Math.max(500, availableHeight);

        // Apply dynamic sizing to modal
        const modalEl = contentEl.closest('.modal') as HTMLElement;
        if (modalEl) {
            // Add class to modal element for CSS targeting
            modalEl.classList.add('ai-text-review-modal');

            modalEl.style.width = `${width}px`;
            modalEl.style.maxWidth = '90vw';
            modalEl.style.minWidth = '900px'; // Ensure both columns fit
            modalEl.style.height = `${height}px`;
            modalEl.style.maxHeight = '90vh'; // Increased from 85vh
            modalEl.style.minHeight = '500px'; // Increased from 300px
        }

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
        // Remove old styles if they exist to ensure we apply the latest version
        const oldStyle = document.getElementById('ai-text-review-modal-styles');
        if (oldStyle) {
            oldStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'ai-text-review-modal-styles';
        style.textContent = `
            /* Force modal to respect our sizing */
            .ai-text-review-modal .modal {
                width: 90vw !important;
                max-width: 90vw !important;
                min-width: 900px !important;
                height: 90vh !important;
                max-height: 90vh !important;
                min-height: 500px !important;
            }

            .ai-text-review-modal .modal-content {
                padding: 20px;
                height: 100%;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }

            .review-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
                flex: 1;
                min-height: 0;
                overflow: hidden;
            }

            .review-section {
                display: flex;
                flex-direction: column;
                min-height: 0;
                overflow: hidden;
                height: 100%;
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
                box-sizing: border-box;
            }

            .text-box pre {
                margin: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: var(--font-text);
                font-size: 13px;
                line-height: 1.6;
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
                margin: 10px 0;
                padding: 8px 0;
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
                padding-top: 16px;
                flex-shrink: 0;
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

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .review-container {
                    grid-template-columns: 1fr;
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
