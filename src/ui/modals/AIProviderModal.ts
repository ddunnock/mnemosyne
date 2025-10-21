/**
 * AIProviderModal - AI Provider Configuration
 * 
 * Provides UI for adding and editing AI providers with easy setup
 * and advanced configuration options.
 */

import { App, Modal, Notice } from 'obsidian';
import { LLMConfig } from '../../types';
import { LLMProvider } from '../../constants';
import { KeyManager } from '../../encryption/keyManager';

export interface AIProviderModalOptions {
    mode: 'add' | 'edit';
    provider?: LLMConfig;
    onSuccess: (provider: LLMConfig) => Promise<void>;
    onCancel?: () => void;
}

export class AIProviderModal extends Modal {
    private keyManager: KeyManager;
    private options: AIProviderModalOptions;
    private isSubmitting: boolean = false;
    private wasSuccessful: boolean = false;
    private showAdvanced: boolean = false;

    // Form data
    private providerType: LLMProvider = LLMProvider.OPENAI;
    private providerName: string = '';
    private apiKey: string = '';
    private baseUrl: string = '';
    private model: string = '';
    private maxTokens: number = 4000;
    private temperature: number = 0.7;
    private isDefault: boolean = false;
    private isEnabled: boolean = true;

    constructor(app: App, keyManager: KeyManager, options: AIProviderModalOptions) {
        super(app);
        this.keyManager = keyManager;
        this.options = options;
        
        // Initialize form data if editing
        if (options.mode === 'edit' && options.provider) {
            this.initializeFromProvider(options.provider);
        }
    }

    private initializeFromProvider(provider: LLMConfig): void {
        this.providerType = provider.provider;
        this.providerName = provider.name;
        this.apiKey = provider.encryptedApiKey ? '[ENCRYPTED]' : '';
        this.baseUrl = provider.baseUrl || '';
        this.model = provider.model;
        this.maxTokens = provider.maxTokens || 4000;
        this.temperature = provider.temperature || 0.7;
        this.isDefault = provider.isDefault || false;
        this.isEnabled = provider.enabled;
    }

    onOpen(): void {
        this.injectStyles();
        this.renderModal();
    }

    onClose(): void {
        // Clear sensitive data from memory
        this.apiKey = '';
        this.providerName = '';
        this.baseUrl = '';
        this.model = '';

        // Only call onCancel if the operation wasn't successful
        if (!this.wasSuccessful && this.options.onCancel) {
            this.options.onCancel();
        }
    }

    private injectStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .ai-provider-modal {
                padding: 0;
            }
            
            .ai-provider-modal .modal-content {
                padding: 24px;
                max-width: 600px;
            }
            
            .ai-provider-modal .modal-title {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--text-normal);
            }
            
            .ai-provider-modal .modal-description {
                color: var(--text-muted);
                margin-bottom: 24px;
                line-height: 1.5;
            }
            
            .ai-provider-modal .form-section {
                margin-bottom: 24px;
            }
            
            .ai-provider-modal .form-section-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                color: var(--text-normal);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .ai-provider-modal .form-group {
                margin-bottom: 16px;
            }
            
            .ai-provider-modal .form-label {
                display: block;
                font-weight: 500;
                margin-bottom: 6px;
                color: var(--text-normal);
            }
            
            .ai-provider-modal .form-help {
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 4px;
                line-height: 1.4;
            }
            
            .ai-provider-modal .form-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 14px;
            }
            
            .ai-provider-modal .form-input:focus {
                outline: none;
                border-color: var(--interactive-accent);
                box-shadow: 0 0 0 2px var(--interactive-accent-hover);
            }
            
            .ai-provider-modal .form-select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 14px;
            }
            
            .ai-provider-modal .form-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .ai-provider-modal .form-checkbox input[type="checkbox"] {
                margin: 0;
            }
            
            .ai-provider-modal .form-checkbox-label {
                font-size: 14px;
                color: var(--text-normal);
            }
            
            .ai-provider-modal .advanced-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .ai-provider-modal .advanced-toggle:hover {
                background: var(--background-modifier-hover);
            }
            
            .ai-provider-modal .advanced-toggle-icon {
                transition: transform 0.2s ease;
            }
            
            .ai-provider-modal .advanced-toggle.expanded .advanced-toggle-icon {
                transform: rotate(90deg);
            }
            
            .ai-provider-modal .advanced-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }
            
            .ai-provider-modal .advanced-content.expanded {
                max-height: 1000px;
            }
            
            .ai-provider-modal .modal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid var(--background-modifier-border);
            }
            
            .ai-provider-modal .btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
            }
            
            .ai-provider-modal .btn-primary {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
            }
            
            .ai-provider-modal .btn-primary:hover {
                background: var(--interactive-accent-hover);
            }
            
            .ai-provider-modal .btn-primary:disabled {
                background: var(--background-modifier-border);
                color: var(--text-muted);
                cursor: not-allowed;
            }
            
            .ai-provider-modal .btn-secondary {
                background: var(--background-secondary);
                color: var(--text-normal);
                border: 1px solid var(--background-modifier-border);
            }
            
            .ai-provider-modal .btn-secondary:hover {
                background: var(--background-modifier-hover);
            }
            
            .ai-provider-modal .provider-card {
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                background: var(--background-secondary);
            }
            
            .ai-provider-modal .provider-card-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .ai-provider-modal .provider-icon {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }
            
            .ai-provider-modal .provider-info h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-normal);
            }
            
            .ai-provider-modal .provider-info p {
                margin: 4px 0 0 0;
                font-size: 12px;
                color: var(--text-muted);
            }
        `;
        document.head.appendChild(style);
    }

    private renderModal(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ai-provider-modal');

        const modalHTML = `
            <div class="modal-content">
                <h2 class="modal-title">
                    ${this.options.mode === 'add' ? '➕ Add AI Provider' : '✏️ Edit AI Provider'}
                </h2>
                <p class="modal-description">
                    ${this.options.mode === 'add' 
                        ? 'Configure a new AI provider to power your Mnemosyne agents.'
                        : 'Update your AI provider configuration.'
                    }
                </p>

                ${this.renderEasySetup()}
                ${this.renderAdvancedOptions()}
                ${this.renderActions()}
            </div>
        `;

        contentEl.innerHTML = modalHTML;
        this.attachEventListeners();
    }

    private renderEasySetup(): string {
        return `
            <div class="form-section">
                <h3 class="form-section-title">
                    <span>🚀</span>
                    Quick Setup
                </h3>
                
                <div class="form-group">
                    <label class="form-label" for="provider-type">Provider Type</label>
                    <select id="provider-type" class="form-select">
                        <option value="openai" ${this.providerType === LLMProvider.OPENAI ? 'selected' : ''}>OpenAI (Cloud)</option>
                        <option value="anthropic" ${this.providerType === LLMProvider.ANTHROPIC ? 'selected' : ''}>Anthropic Claude (Cloud)</option>
                        <option value="custom" ${this.providerType === LLMProvider.CUSTOM ? 'selected' : ''}>Local/Enterprise LLM (Ollama, Open WebUI, etc.)</option>
                    </select>
                    <div class="form-help">
                        <strong>OpenAI/Anthropic:</strong> Cloud-based APIs requiring API keys<br>
                        <strong>Local/Enterprise:</strong> Self-hosted or corporate LLM endpoints (requires Base URL in Advanced settings)
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="provider-name">Provider Name</label>
                    <input 
                        type="text" 
                        id="provider-name" 
                        class="form-input" 
                        placeholder="My OpenAI Provider"
                        value="${this.providerName}"
                    >
                    <div class="form-help">
                        A friendly name to identify this provider in your settings.
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="api-key">API Key</label>
                    <input 
                        type="password" 
                        id="api-key" 
                        class="form-input" 
                        placeholder="sk-..."
                        value="${this.apiKey === '[ENCRYPTED]' ? '' : this.apiKey}"
                    >
                    <div class="form-help">
                        Your API key from the provider. This will be encrypted and stored securely.
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="model">Model</label>
                    <input 
                        type="text" 
                        id="model" 
                        class="form-input" 
                        placeholder="gpt-4o-mini"
                        value="${this.model}"
                    >
                    <div class="form-help">
                        The specific model to use (e.g., gpt-4o-mini, claude-3-sonnet-20240229).
                    </div>
                </div>

                <div class="form-checkbox">
                    <input type="checkbox" id="is-default" ${this.isDefault ? 'checked' : ''}>
                    <label class="form-checkbox-label" for="is-default">
                        Set as default provider
                    </label>
                </div>

                <div class="form-checkbox">
                    <input type="checkbox" id="is-enabled" ${this.isEnabled ? 'checked' : ''}>
                    <label class="form-checkbox-label" for="is-enabled">
                        Enable this provider
                    </label>
                </div>
            </div>
        `;
    }

    private renderAdvancedOptions(): string {
        return `
            <div class="form-section">
                <div class="advanced-toggle" id="advanced-toggle">
                    <span class="advanced-toggle-icon">▶</span>
                    <span>Advanced Configuration</span>
                </div>
                
                <div class="advanced-content" id="advanced-content">
                    <div class="form-group">
                        <label class="form-label" for="base-url">Base URL (Optional)</label>
                        <input
                            type="url"
                            id="base-url"
                            class="form-input"
                            placeholder="e.g., http://localhost:11434/v1 (Ollama)"
                            value="${this.baseUrl}"
                        >
                        <div class="form-help">
                            <strong>For local/enterprise LLMs:</strong><br>
                            • Ollama: <code>http://localhost:11434/v1</code><br>
                            • LM Studio: <code>http://localhost:1234/v1</code><br>
                            • Open WebUI: <code>https://your-company.com/api/v1</code><br>
                            • Leave empty for OpenAI/Anthropic default endpoints
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="max-tokens">Max Tokens</label>
                        <input 
                            type="number" 
                            id="max-tokens" 
                            class="form-input" 
                            min="1"
                            max="100000"
                            value="${this.maxTokens}"
                        >
                        <div class="form-help">
                            Maximum number of tokens to generate in responses (1-100,000).
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="temperature">Temperature</label>
                        <input 
                            type="range" 
                            id="temperature" 
                            class="form-input" 
                            min="0"
                            max="2"
                            step="0.1"
                            value="${this.temperature}"
                        >
                        <div class="form-help">
                            Controls randomness: 0 = deterministic, 2 = very random. Current: <span id="temperature-value">${this.temperature}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderActions(): string {
        return `
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
                <button class="btn btn-primary" id="save-btn" disabled>
                    ${this.isSubmitting ? 'Saving...' : (this.options.mode === 'add' ? 'Add Provider' : 'Save Changes')}
                </button>
            </div>
        `;
    }

    private attachEventListeners(): void {
        // Advanced toggle
        const advancedToggle = this.contentEl.querySelector('#advanced-toggle');
        const advancedContent = this.contentEl.querySelector('#advanced-content');
        
        if (advancedToggle && advancedContent) {
            advancedToggle.addEventListener('click', () => {
                this.showAdvanced = !this.showAdvanced;
                advancedToggle.classList.toggle('expanded', this.showAdvanced);
                advancedContent.classList.toggle('expanded', this.showAdvanced);
            });
        }

        // Temperature slider
        const temperatureSlider = this.contentEl.querySelector('#temperature') as HTMLInputElement;
        const temperatureValue = this.contentEl.querySelector('#temperature-value');
        
        if (temperatureSlider && temperatureValue) {
            temperatureSlider.addEventListener('input', () => {
                temperatureValue.textContent = temperatureSlider.value;
            });
        }

        // Form validation
        const inputs = this.contentEl.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateForm());
        });

        // Cancel button
        const cancelBtn = this.contentEl.querySelector('#cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Save button
        const saveBtn = this.contentEl.querySelector('#save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSubmit());
        }

        // Initial validation
        this.validateForm();
    }

    private validateForm(): void {
        const providerName = (this.contentEl.querySelector('#provider-name') as HTMLInputElement)?.value.trim();
        const apiKey = (this.contentEl.querySelector('#api-key') as HTMLInputElement)?.value.trim();
        const model = (this.contentEl.querySelector('#model') as HTMLInputElement)?.value.trim();

        const isValid = providerName && apiKey && model;
        const saveBtn = this.contentEl.querySelector('#save-btn') as HTMLButtonElement;
        
        if (saveBtn) {
            saveBtn.disabled = !isValid || this.isSubmitting;
        }
    }

    private async handleSubmit(): Promise<void> {
        if (this.isSubmitting) return;

        try {
            this.isSubmitting = true;
            this.updateSubmitButton(true);

            // Collect form data
            const providerType = (this.contentEl.querySelector('#provider-type') as HTMLSelectElement)?.value as LLMProvider;
            const providerName = (this.contentEl.querySelector('#provider-name') as HTMLInputElement)?.value.trim();
            const apiKey = (this.contentEl.querySelector('#api-key') as HTMLInputElement)?.value.trim();
            const baseUrl = (this.contentEl.querySelector('#base-url') as HTMLInputElement)?.value.trim();
            const model = (this.contentEl.querySelector('#model') as HTMLInputElement)?.value.trim();
            const maxTokens = parseInt((this.contentEl.querySelector('#max-tokens') as HTMLInputElement)?.value || '4000');
            const temperature = parseFloat((this.contentEl.querySelector('#temperature') as HTMLInputElement)?.value || '0.7');
            const isDefault = (this.contentEl.querySelector('#is-default') as HTMLInputElement)?.checked || false;
            const isEnabled = (this.contentEl.querySelector('#is-enabled') as HTMLInputElement)?.checked !== false;

            // Validate required fields
            if (!providerName || !apiKey || !model) {
                throw new Error('Please fill in all required fields');
            }

            // Encrypt API key
            const encryptedData = this.keyManager.encrypt(apiKey);
            const encryptedApiKey = JSON.stringify(encryptedData);

            // Create provider config
            const provider: LLMConfig = {
                id: this.options.mode === 'edit' && this.options.provider ? this.options.provider.id : Date.now().toString(),
                name: providerName,
                provider: providerType,
                model: model,
                encryptedApiKey: encryptedApiKey,
                baseUrl: baseUrl || undefined,
                maxTokens: maxTokens,
                temperature: temperature,
                isDefault: isDefault,
                enabled: isEnabled,
                createdAt: this.options.mode === 'edit' && this.options.provider ? this.options.provider.createdAt : Date.now(),
                updatedAt: Date.now()
            };

            // Call success callback
            await this.options.onSuccess(provider);

            this.wasSuccessful = true;
            new Notice(`AI Provider ${this.options.mode === 'add' ? 'added' : 'updated'} successfully!`);
            this.close();

        } catch (error) {
            console.error('AI Provider operation failed:', error);
            new Notice(error.message || 'Operation failed');
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    private updateSubmitButton(isLoading: boolean): void {
        const saveBtn = this.contentEl.querySelector('#save-btn') as HTMLButtonElement;
        if (saveBtn) {
            saveBtn.disabled = isLoading;
            saveBtn.textContent = isLoading ? 'Saving...' : (this.options.mode === 'add' ? 'Add Provider' : 'Save Changes');
        }
    }
}
