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
    private onAccept: (text:     private plugin: RiskManagementPlugin;
    private resultElement: HTMLElement;
    private isRegenerating: boolean = false;
    private resizeHandler: (() => void) | null = null;ng: boolean = false;

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
          onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ai-text-review-modal');

        // Calculate content-based sizing
        const textLength = Math.max(this.originalText.length, this.generatedText.length);
        const wordCount = Math.max(
            this.originalText.split(/\s+/).length,
            this.generatedText.split(/\s+/).length
        );

        // Determine modal size based on content
        let modalWidth = '95vw';
        let modalMaxWidth = '1600px';
        let modalMinWidth = '800px';
        let modalHeight = '60vh';
        let modalMaxHeight = '500px';
        let modalMinHeight = '400px';

        // Content-based breakpoints
        if (textLength > 10000 || wordCount > 2000) {
            // Very large content - maximize space
            modalWidth = '98vw';
            modalMaxWidth = '2000px';
            modalMinWidth = '1200px';
            modalHeight = '85vh';
            modalMaxHeight = '800px';
            modalMinHeight = '600px';
        } else if (textLength > 5000 || wordCount > 1000) {
            // Large content
            modalWidth = '96vw';
            modalMaxWidth = '1800px';
            modalMinWidth = '1000px';
            modalHeight = '75vh';
            modalMaxHeight = '700px';
            modalMinHeight = '500px';
        } else if (textLength > 2000 || wordCount > 400) {
            // Medium content
            modalWidth = '95vw';
            modalMaxWidth = '1600px';
            modalMinWidth = '900px';
            modalHeight = '70vh';
            modalMaxHeight = '600px';
            modalMinHeight = '450px';
        } else if (textLength > 500 || wordCount > 100) {
            // Small content
            modalWidth = '90vw';
            modalMaxWidth = '1200px';
            modalMinWidth = '800px';
            modalHeight = '65vh';
            modalMaxHeight = '550px';
            modalMinHeight = '400px';
        } else {
            // Very small content
            modalWidth = '85vw';
            modalMaxWidth = '1000px';
            modalMinWidth = '700px';
            modalHeight = '60vh';
            modalMaxHeight = '500px';
            modalMinHeight = '350px';
        }

        // Ensure we don't exceed viewport bounds
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust width if it would exceed viewport
        if (parseInt(modalWidth) > 95) {
            modalWidth = '95vw';
        }
        
        // Adjust height if it would exceed viewport
        if (parseInt(modalHeight) > 90) {
            modalHeight = '90vh';
        }

        // Directly set modal size via inline styles for maximum specificity
        const modalEl = contentEl.closest('.modal') as HTMLElement;
        const modalContainer = contentEl.closest('.modal-container') as HTMLElement;

        if (modalEl) {
            modalEl.style.width = modalWidth;
            modalEl.style.maxWidth = modalMaxWidth;
            modalEl.style.minWidth = modalMinWidth;
            modalEl.style.height = modalHeight;
            modalEl.style.maxHeight = modalMaxHeight;
            modalEl.style.minHeight = modalMinHeight;
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
        contentEl.style.overflow = 'hidden';yle.height = '100%';
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

        // Rej        rejectBtn.onclick = () => {
            new Notice('Changes rejected');
            this.close();
        };

        // Add styles
        this.addStyles();

        // Add resize listener to adjust modal size on window resize
        this.resizeHandler = () => this.adjustModalSize();
        window.addEventListener('resize', this.resizeHandler);

        // Focus accept button
        acceptBtn.focus();
    }

    /**
        rejectBtn.onclick = () => {
            new Notice('Changes rejected');
            this.close();
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

            // Adjust modal size based on new content
            this.adjustModalSize();

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
     * Adjust modal size based on current content
     */
    private adjustModalSize(): void {
        const textLength = Math.max(this.originalText.length, this.generatedText.length);
        const wordCount = Math.max(
            this.originalText.split(/\s+/).length,
            this.generatedText.split(/\s+/).length
        );

        // Determine modal size based on content
        let modalWidth = '95vw';
        let modalMaxWidth = '1600px';
        let modalMinWidth = '800px';
        let modalHeight = '60vh';
        let modalMaxHeight = '500px';
        let modalMinHeight = '400px';

        // Content-based breakpoints (same logic as in onOpen)
        if (textLength > 10000 || wordCount > 2000) {
            modalWidth = '98vw';
            modalMaxWidth = '2000px';
            modalMinWidth = '1200px';
            modalHeight = '85vh';
            modalMaxHeight = '800px';
            modalMinHeight = '600px';
        } else if (textLength > 5000 || wordCount > 1000) {
            modalWidth = '96vw';
            modalMaxWidth = '1800px';
            modalMinWidth = '1000px';
            modalHeight = '75vh';
            modalMaxHeight = '700px';
            modalMinHeight = '500px';
        } else if (textLength > 2000 || wordCount > 400) {
            modalWidth = '95vw';
            modalMaxWidth = '1600px';
            modalMinWidth = '900px';
            modalHeight = '70vh';
            modalMaxHeight = '600px';
            modalMinHeight = '450px';
        } else if (textLength > 500 || wordCount > 100) {
            modalWidth = '90vw';
            modalMaxWidth = '1200px';
            modalMinWidth = '800px';
            modalHeight = '65vh';
            modalMaxHeight = '550px';
            modalMinHeight = '400px';
        } else {
            modalWidth = '85vw';
            modalMaxWidth = '1000px';
            modalMinWidth = '700px';
            modalHeight = '60vh';
            modalMaxHeight = '500px';
            modalMinHeight = '350px';
        }

        // Ensure we don't exceed viewport bounds
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust width if it would exceed viewport
        if (parseInt(modalWidth) > 95) {
            modalWidth = '95vw';
        }
        
        // Adjust height if it would exceed viewport
        if (parseInt(modalHeight) > 90) {
            modalHeight = '90vh';
        }

        // Apply the sizing with smooth transition
        const modalEl = this.contentEl.closest('.modal') as HTMLElement;
        if (modalEl) {
            // Add transition for smooth resizing
            modalEl.style.transition = 'width 0.3s ease, height 0.3s ease, max-width 0.3s ease, max-height 0.3s ease';
            
            modalEl.style.width = modalWidth;
            modalEl.style.maxWidth = modalMaxWidth;
            modalEl.style.minWidth = modalMinWidth;
            modalEl.style.height = modalHeight;
            modalEl.style.maxHeight = modalMaxHeight;
            modalEl.style.minHeight = modalMinHeight;
            
            // Remove transition after animation completes
            setTimeout(() => {
                modalEl.style.transition = '';
            }, 300);
        }
    }                cls: 'error'
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
                fle            .review-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                flex: 1;
                min-height: 0;
                min-width: 0;
                overflow: hidden;
                width: 100%;
                max-height: calc(100% - 120px); /* Reserve space for stats and buttons */
            }

            .review-section {
                display: flex;
                flex-direction: column;
                min-height: 0;
                min-width: 0;
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
                min-height: 200px;
                min-width: 0;
                max-height: 100%;
                box-sizing: border-box;
                /* Ensure proper scrolling behavior */
                scroll-behavior: smooth;
                /* Custom scrollbar styling */
                scrollbar-width: thin;
                scrollbar-color: var(--background-modifier-border) transparent;
            }

            .text-box::-webkit-scrollbar {
                width: 8px;
            }

            .text-box::-webkit-scrollbar-track {
                background: transparent;
            }

            .text-box::-webkit-scrollbar-thumb {
                background: var(--background-modifier-border);
                border-radius: 4px;
            }

            .text-box::-webkit-scrollbar-thumb:hover {
                background: var(--interactive-accent);
            }border);
                background: var(--background-primary-alt);
                overflow: auto;
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
                /* Ensure very long lines don't break layout */
                word-break: break-word;
                hyphens: auto;
                /* Improve readability for long content */
                tab-size: 2;
            }
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
                justify-content: center;            .stats {
                margin: 15px 0 0 0;
                padding: 12px 0 8px 0;
                font-size: 13px;
                color: var(--text-muted);
                flex-shrink: 0;
                border-top: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                position: sticky;
                bottom: 0;
                z-index: 10;
            }  .stats {
                margin: 15px 0 0 0;
                padding: 12px 0 8px 0;
                font-size: 13px;
                color: var(--text-muted);
                flex-shrink: 0;
                border-top: 1px solid var(--background-modifier-border);
            }

            .word-count {
                font-weight: 500;
                .button-container {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                padding-top: 12px;
                flex-shrink: 0;
                margin-top: auto;
                background: var(--background-primary);
                position: sticky;
                bottom: 0;
                z-index: 10;
                border-top: 1px solid var(--background-modifier-border);
            }lor: var(--text-warning);
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

            .button            /* Responsive breakpoints - these work in conjunction with content-based sizing */

            /* Large screens - extra wide for comparison */
            @media (min-width: 1400px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    /* Content-based sizing takes precedence, but ensure minimums */
                    min-width: 1200px;
                    min-height: 500px;
                }
            }

            /* Medium-large screens */
            @media (min-width: 1025px) and (max-width: 1399px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    min-width: 1000px;
                    min-height: 450px;
                }
            }

            /* Medium screens */
            @media (min-width: 769px) and (max-width: 1024px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    min-width: 800px;
                    min-height: 400px;
                }
            }

            /* Small screens - stack vertically and adjust for mobile */
            @media (max-width: 768px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    width: 98vw !important;
                    height: 90vh !important;
                    max-width: none !important;
                    min-width: 300px !important;
                    min-height: 400px !important;
                }

                .ai-text-review-modal .review-container {
                    grid-template-columns: 1fr;
                    gap: 12px;
                    max-height: calc(100% - 100px);
                }

                .ai-text-review-modal .text-box {
                    min-height: 200px;
                    max-height: 300px;
                }

                .ai-text-review-modal .button-container {
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .ai-text-review-modal .button-container button {
                    flex: 1;
                    min-width: 120px;
                }
            }

            /* Very small screens */
            @media (max-width: 480px) {
                body > .modal-container:has(.ai-text-review-modal) > .modal,
                .modal-container.mod-dim:has(.ai-text-review-modal) > .modal {
                    width: 100vw !important;
                    height: 95vh !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                }

                .ai-text-review-modal .text-box {
                    min-height: 150px;
                    max-height: 250px;
                }
            } 98vw;
                    height: 85vh;
                    max-width: none;
                }

                .ai-text-review-modal .review-container {
                    grid-template-colu    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Clean up resize listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }text-review-modal .text-box {
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
