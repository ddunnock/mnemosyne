import { Modal, App, ButtonComponent, TextAreaComponent, DropdownComponent } from 'obsidian';
import RiskManagementPlugin from '../main';

interface EnhancementOption {
    id: string;
    label: string;
    description: string;
    icon: string;
    category: 'text' | 'analysis' | 'creative' | 'utility';
}

export class InlineAIModal extends Modal {
    private plugin: RiskManagementPlugin;
    private selectedText: string;
    private selectionRange: Range | null;
    private onProcess: (action: string, options?: any) => void;
    private isProcessing: boolean = false;

    private enhancementOptions: EnhancementOption[] = [
        {
            id: 'summarize',
            label: 'Summarize',
            description: 'Create a concise summary',
            icon: '📝',
            category: 'text'
        },
        {
            id: 'explain',
            label: 'Explain',
            description: 'Provide detailed explanation',
            icon: '🔍',
            category: 'analysis'
        },
        {
            id: 'improve',
            label: 'Improve Writing',
            description: 'Enhance clarity and style',
            icon: '✏️',
            category: 'text'
        },
        {
            id: 'expand',
            label: 'Expand',
            description: 'Add more detail and context',
            icon: '📈',
            category: 'creative'
        },
        {
            id: 'simplify',
            label: 'Simplify',
            description: 'Make more accessible',
            icon: '🎯',
            category: 'text'
        },
        {
            id: 'translate',
            label: 'Translate',
            description: 'Translate to another language',
            icon: '🌐',
            category: 'utility'
        },
        {
            id: 'analyze',
            label: 'Analyze',
            description: 'Provide critical analysis',
            icon: '🔬',
            category: 'analysis'
        },
        {
            id: 'rewrite',
            label: 'Rewrite',
            description: 'Completely rewrite the text',
            icon: '🔄',
            category: 'creative'
        }
    ];

    constructor(
        app: App,
        plugin: RiskManagementPlugin,
        selectedText: string,
        selectionRange: Range | null,
        onProcess: (action: string, options?: any) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.selectedText = selectedText;
        this.selectionRange = selectionRange;
        this.onProcess = onProcess;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('mnemosyne-inline-ai-modal');

        // Header
        const header = contentEl.createDiv('modal-header');
        header.innerHTML = `
            <h2>🤖 AI Text Enhancement</h2>
            <p class="modal-subtitle">Enhance your selected text with AI</p>
        `;

        // Selected text preview
        const previewSection = contentEl.createDiv('preview-section');
        previewSection.innerHTML = `
            <h3>Selected Text:</h3>
            <div class="selected-text-preview">${this.selectedText}</div>
        `;

        // Enhancement options
        const optionsSection = contentEl.createDiv('options-section');
        optionsSection.innerHTML = '<h3>Choose Enhancement:</h3>';

        const optionsGrid = optionsSection.createDiv('options-grid');
        
        this.enhancementOptions.forEach(option => {
            const optionCard = optionsGrid.createDiv('option-card');
            optionCard.innerHTML = `
                <div class="option-icon">${option.icon}</div>
                <div class="option-content">
                    <div class="option-label">${option.label}</div>
                    <div class="option-description">${option.description}</div>
                </div>
            `;
            
            optionCard.addEventListener('click', () => {
                this.handleOptionClick(option);
            });
        });

        // Custom prompt section
        const customSection = contentEl.createDiv('custom-section');
        customSection.innerHTML = '<h3>Or Custom Enhancement:</h3>';
        
        const customTextarea = new TextAreaComponent(customSection)
            .setPlaceholder('Describe how you want to enhance the text...')
            .setValue('')
            .setDisabled(this.isProcessing);

        // Language selection for translation
        const languageSection = contentEl.createDiv('language-section');
        languageSection.innerHTML = '<h3>Target Language (for translation):</h3>';
        
        const languageDropdown = new DropdownComponent(languageSection)
            .addOption('auto', 'Detect Language')
            .addOption('en', 'English')
            .addOption('es', 'Spanish')
            .addOption('fr', 'French')
            .addOption('de', 'German')
            .addOption('it', 'Italian')
            .addOption('pt', 'Portuguese')
            .addOption('ru', 'Russian')
            .addOption('ja', 'Japanese')
            .addOption('ko', 'Korean')
            .addOption('zh', 'Chinese')
            .setValue('auto')
            .setDisabled(this.isProcessing);

        // Action buttons
        const buttonSection = contentEl.createDiv('button-section');
        
        const processButton = new ButtonComponent(buttonSection)
            .setButtonText('Process with Custom Prompt')
            .setCta()
            .onClick(() => {
                const customPrompt = customTextarea.getValue().trim();
                if (customPrompt) {
                    this.processCustomEnhancement(customPrompt, languageDropdown.getValue());
                }
            });

        const cancelButton = new ButtonComponent(buttonSection)
            .setButtonText('Cancel')
            .onClick(() => this.close());

        // Add styles
        this.addStyles();
    }

    private addStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .mnemosyne-inline-ai-modal .modal-content {
                max-width: 600px;
            }
            
            .mnemosyne-inline-ai-modal .modal-header h2 {
                margin: 0 0 8px 0;
                color: var(--text-normal);
            }
            
            .mnemosyne-inline-ai-modal .modal-subtitle {
                margin: 0 0 20px 0;
                color: var(--text-muted);
                font-size: 14px;
            }
            
            .mnemosyne-inline-ai-modal .preview-section {
                margin-bottom: 20px;
            }
            
            .mnemosyne-inline-ai-modal .selected-text-preview {
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 12px;
                margin-top: 8px;
                font-style: italic;
                color: var(--text-muted);
                max-height: 100px;
                overflow-y: auto;
            }
            
            .mnemosyne-inline-ai-modal .options-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
                margin-top: 12px;
            }
            
            .mnemosyne-inline-ai-modal .option-card {
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: var(--background-primary);
            }
            
            .mnemosyne-inline-ai-modal .option-card:hover {
                border-color: var(--interactive-accent);
                background: var(--background-modifier-hover);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .mnemosyne-inline-ai-modal .option-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }
            
            .mnemosyne-inline-ai-modal .option-label {
                font-weight: 600;
                color: var(--text-normal);
                margin-bottom: 4px;
            }
            
            .mnemosyne-inline-ai-modal .option-description {
                font-size: 12px;
                color: var(--text-muted);
            }
            
            .mnemosyne-inline-ai-modal .custom-section,
            .mnemosyne-inline-ai-modal .language-section {
                margin: 20px 0;
            }
            
            .mnemosyne-inline-ai-modal .button-section {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid var(--background-modifier-border);
            }
        `;
        document.head.appendChild(style);
    }

    private handleOptionClick(option: EnhancementOption): void {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.updateProcessingState();

        // Process the enhancement
        this.onProcess(option.id, { option }).finally(() => {
            this.isProcessing = false;
            this.updateProcessingState();
            this.close();
        });
    }

    private processCustomEnhancement(prompt: string, language: string): void {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.updateProcessingState();

        this.onProcess('custom', { prompt, language }).finally(() => {
            this.isProcessing = false;
            this.updateProcessingState();
            this.close();
        });
    }

    private updateProcessingState(): void {
        const buttons = this.contentEl.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = this.isProcessing;
        });

        const textareas = this.contentEl.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.disabled = this.isProcessing;
        });

        const dropdowns = this.contentEl.querySelectorAll('select');
        dropdowns.forEach(dropdown => {
            dropdown.disabled = this.isProcessing;
        });

        if (this.isProcessing) {
            this.contentEl.querySelector('.modal-header h2')!.textContent = '🤖 Processing...';
        } else {
            this.contentEl.querySelector('.modal-header h2')!.textContent = '🤖 AI Text Enhancement';
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}