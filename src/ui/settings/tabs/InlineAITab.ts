/**
 * Inline AI Settings Tab
 * 
 * Settings interface for inline AI functionality
 */

import { Setting } from 'obsidian';
import { InlineAISettings, DEFAULT_INLINE_AI_SETTINGS } from '../inlineAI/types';

export class InlineAITab {
    private containerEl: HTMLElement;
    private settings: InlineAISettings;
    private onSettingsChange: (settings: InlineAISettings) => void;

    constructor(
        containerEl: HTMLElement,
        settings: InlineAISettings,
        onSettingsChange: (settings: InlineAISettings) => void
    ) {
        this.containerEl = containerEl;
        this.settings = settings;
        this.onSettingsChange = onSettingsChange;
    }

    /**
     * Render the settings tab
     */
    render(): void {
        this.containerEl.empty();

        // Header
        this.containerEl.createEl('h2', { text: 'Inline AI Settings' });
        this.containerEl.createEl('p', { 
            text: 'Configure inline AI functionality for text selection and auto-completion.',
            cls: 'setting-item-description'
        });

        // Main toggle
        new Setting(this.containerEl)
            .setName('Enable Inline AI')
            .setDesc('Enable inline AI functionality when text is selected')
            .addToggle(toggle => toggle
                .setValue(this.settings.enabled)
                .onChange(value => this.updateSetting('enabled', value))
            );

        // Feature categories
        this.renderFeatureToggles();
        
        // Selection settings
        this.renderSelectionSettings();
        
        // Suggestion settings
        this.renderSuggestionSettings();
        
        // UI settings
        this.renderUISettings();
        
        // AI settings
        this.renderAISettings();

        // Reset button
        this.renderResetButton();
    }

    /**
     * Render feature toggle settings
     */
    private renderFeatureToggles(): void {
        const featureContainer = this.containerEl.createDiv();
        featureContainer.createEl('h3', { text: 'Feature Categories' });

        new Setting(featureContainer)
            .setName('Analysis Features')
            .setDesc('Enable text analysis features (explain, summarize)')
            .addToggle(toggle => toggle
                .setValue(this.settings.enableAnalysis)
                .onChange(value => this.updateSetting('enableAnalysis', value))
            );

        new Setting(featureContainer)
            .setName('Editing Features')
            .setDesc('Enable text editing features (improve, translate, expand, simplify)')
            .addToggle(toggle => toggle
                .setValue(this.settings.enableEditing)
                .onChange(value => this.updateSetting('enableEditing', value))
            );

        new Setting(featureContainer)
            .setName('Completion Features')
            .setDesc('Enable text completion and suggestion features')
            .addToggle(toggle => toggle
                .setValue(this.settings.enableCompletion)
                .onChange(value => this.updateSetting('enableCompletion', value))
            );
    }

    /**
     * Render selection settings
     */
    private renderSelectionSettings(): void {
        const selectionContainer = this.containerEl.createDiv();
        selectionContainer.createEl('h3', { text: 'Text Selection' });

        new Setting(selectionContainer)
            .setName('Minimum Selection Length')
            .setDesc('Minimum number of characters required to trigger inline AI')
            .addText(text => text
                .setValue(this.settings.minSelectionLength.toString())
                .setPlaceholder('3')
                .onChange(value => {
                    const num = parseInt(value) || 3;
                    this.updateSetting('minSelectionLength', Math.max(1, num));
                })
            );

        new Setting(selectionContainer)
            .setName('Maximum Selection Length')
            .setDesc('Maximum number of characters to process (0 = no limit)')
            .addText(text => text
                .setValue(this.settings.maxSelectionLength.toString())
                .setPlaceholder('1000')
                .onChange(value => {
                    const num = parseInt(value) || 1000;
                    this.updateSetting('maxSelectionLength', Math.max(0, num));
                })
            );
    }

    /**
     * Render suggestion settings
     */
    private renderSuggestionSettings(): void {
        const suggestionContainer = this.containerEl.createDiv();
        suggestionContainer.createEl('h3', { text: 'Text Suggestions' });

        new Setting(suggestionContainer)
            .setName('Maximum Suggestions')
            .setDesc('Maximum number of suggestions to show')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.settings.maxSuggestions)
                .setDynamicTooltip()
                .onChange(value => this.updateSetting('maxSuggestions', value))
            );

        new Setting(suggestionContainer)
            .setName('Suggestion Timeout')
            .setDesc('Timeout in milliseconds for generating suggestions')
            .addText(text => text
                .setValue(this.settings.suggestionTimeout.toString())
                .setPlaceholder('3000')
                .onChange(value => {
                    const num = parseInt(value) || 3000;
                    this.updateSetting('suggestionTimeout', Math.max(1000, num));
                })
            );
    }

    /**
     * Render UI settings
     */
    private renderUISettings(): void {
        const uiContainer = this.containerEl.createDiv();
        uiContainer.createEl('h3', { text: 'User Interface' });

        new Setting(uiContainer)
            .setName('Popup Delay')
            .setDesc('Delay in milliseconds before showing popup after text selection')
            .addText(text => text
                .setValue(this.settings.popupDelay.toString())
                .setPlaceholder('300')
                .onChange(value => {
                    const num = parseInt(value) || 300;
                    this.updateSetting('popupDelay', Math.max(0, num));
                })
            );

        new Setting(uiContainer)
            .setName('Show Icons')
            .setDesc('Show icons in the inline AI popup')
            .addToggle(toggle => toggle
                .setValue(this.settings.showIcons)
                .onChange(value => this.updateSetting('showIcons', value))
            );

        new Setting(uiContainer)
            .setName('Compact Mode')
            .setDesc('Use compact layout for the inline AI popup')
            .addToggle(toggle => toggle
                .setValue(this.settings.compactMode)
                .onChange(value => this.updateSetting('compactMode', value))
            );
    }

    /**
     * Render AI settings
     */
    private renderAISettings(): void {
        const aiContainer = this.containerEl.createDiv();
        aiContainer.createEl('h3', { text: 'AI Configuration' });

        new Setting(aiContainer)
            .setName('Use Context')
            .setDesc('Include file context when processing text')
            .addToggle(toggle => toggle
                .setValue(this.settings.useContext)
                .onChange(value => this.updateSetting('useContext', value))
            );

        new Setting(aiContainer)
            .setName('Include File Content')
            .setDesc('Include full file content as context (may be slower)')
            .addToggle(toggle => toggle
                .setValue(this.settings.includeFileContent)
                .onChange(value => this.updateSetting('includeFileContent', value))
            );

        new Setting(aiContainer)
            .setName('Maximum Context Length')
            .setDesc('Maximum number of characters to include as context')
            .addText(text => text
                .setValue(this.settings.maxContextLength.toString())
                .setPlaceholder('2000')
                .onChange(value => {
                    const num = parseInt(value) || 2000;
                    this.updateSetting('maxContextLength', Math.max(100, num));
                })
            );
    }

    /**
     * Render reset button
     */
    private renderResetButton(): void {
        const resetContainer = this.containerEl.createDiv();
        resetContainer.style.marginTop = '20px';
        resetContainer.style.paddingTop = '20px';
        resetContainer.style.borderTop = '1px solid var(--background-modifier-border)';

        new Setting(resetContainer)
            .setName('Reset to Defaults')
            .setDesc('Reset all inline AI settings to their default values')
            .addButton(button => button
                .setButtonText('Reset')
                .setWarning()
                .onClick(() => {
                    this.settings = { ...DEFAULT_INLINE_AI_SETTINGS };
                    this.onSettingsChange(this.settings);
                    this.render(); // Re-render with new settings
                })
            );
    }

    /**
     * Update a setting value
     */
    private updateSetting<K extends keyof InlineAISettings>(
        key: K,
        value: InlineAISettings[K]
    ): void {
        this.settings[key] = value;
        this.onSettingsChange(this.settings);
    }
}