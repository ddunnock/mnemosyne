/**
 * Agent Builder Modal - Complete Implementation
 *
 * Modal for creating and editing AI agents with full configuration options
 *
 * Note: If you see TypeScript errors about CSS variables (e.g., var(--background-secondary)),
 * add the css-variables.d.ts file to your project's src/types/ directory to suppress them.
 * The CSS variables work correctly at runtime in Obsidian.
 */

import { App, Modal, Setting, Notice, TextComponent, DropdownComponent, TextAreaComponent } from 'obsidian';
import RiskManagementPlugin from '../main';
import { AgentConfig, MetadataFilters } from '../types';
import { SearchStrategy } from '../constants';
import { AGENT_TEMPLATES, getAllTemplates } from '../agents/templates';

export class AgentBuilderModal extends Modal {
    plugin: RiskManagementPlugin;
    agent: AgentConfig | null;
    onSave: (config: AgentConfig) => void;

    // Form fields
    private nameInput: TextComponent;
    private descriptionTextarea: HTMLTextAreaElement;
    private llmSelect: DropdownComponent;
    private systemPromptTextarea: HTMLTextAreaElement;
    private topKInput: TextComponent;
    private thresholdInput: TextComponent;
    private strategySelect: DropdownComponent;
    private filtersTextarea: HTMLTextAreaElement;

    constructor(
        app: App,
        plugin: RiskManagementPlugin,
        agent: AgentConfig | null,
        onSave: (config: AgentConfig) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.agent = agent;
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('agent-builder-modal');

        // Add custom styles
        this.addCustomStyles();

        // Title
        const titleEl = contentEl.createEl('h2', {
            text: this.agent ? 'Edit Agent' : 'Create New Agent'
        });
        titleEl.style.marginTop = '0';
        titleEl.style.marginBottom = '20px';

        // Template selector (only for new agents)
        if (!this.agent) {
            this.createTemplateSelector(contentEl);
        }

        // Basic Info Section
        this.createBasicInfoSection(contentEl);

        // LLM Configuration
        this.createLLMSection(contentEl);

        // System Prompt
        this.createSystemPromptSection(contentEl);

        // Retrieval Settings
        this.createRetrievalSection(contentEl);

        // Metadata Filters
        this.createFiltersSection(contentEl);

        // Actions
        this.createActionsSection(contentEl);
    }

    /**
     * Add custom modal styles
     */
    private addCustomStyles() {
        const { contentEl } = this;

        // Set modal width
        const modalEl = contentEl.closest('.modal') as HTMLElement;
        if (modalEl) {
            modalEl.style.width = '700px';
            modalEl.style.maxWidth = '90vw';
        }

        // Add scrolling to content
        contentEl.style.maxHeight = '80vh';
        contentEl.style.overflowY = 'auto';
    }

    /**
     * Template selector for new agents
     */
    private createTemplateSelector(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section template-section' });
        section.style.marginBottom = '25px';
        section.style.padding = '20px';
        section.style.backgroundColor = 'var(--background-secondary)';
        section.style.borderRadius = '8px';
        section.style.border = '1px solid var(--background-modifier-border)';

        const header = section.createEl('h3', { text: '🎯 Start from a Template' });
        header.style.marginTop = '0';
        header.style.marginBottom = '10px';

        const desc = section.createDiv({ cls: 'setting-item-description' });
        desc.style.marginBottom = '15px';
        desc.style.color = 'var(--text-muted)';
        desc.setText(
            'Choose a pre-configured template or start from scratch. Templates provide optimized prompts and settings for specific use cases.'
        );

        // Template grid
        const templateGrid = section.createDiv({ cls: 'template-grid' });
        templateGrid.style.display = 'grid';
        templateGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        templateGrid.style.gap = '12px';

        // Get all templates
        const templates = getAllTemplates();

        // Add "Blank" template first
        this.createTemplateCard(templateGrid, {
            id: 'blank',
            name: 'Blank Agent',
            description: 'Start from scratch with a blank template',
            icon: '📝',
            systemPrompt: '',
            retrievalSettings: {
                topK: 5,
                scoreThreshold: 0.7,
                searchStrategy: SearchStrategy.HYBRID
            }
        });

        // Add all other templates
        templates.forEach(({ id, template }) => {
            this.createTemplateCard(templateGrid, {
                id,
                name: template.name,
                description: template.description,
                icon: template.icon,
                systemPrompt: template.systemPrompt,
                retrievalSettings: template.retrievalSettings,
                metadataFilters: template.metadataFilters
            });
        });
    }

    /**
     * Create a template card
     */
    private createTemplateCard(
        container: HTMLElement,
        template: {
            id: string;
            name: string;
            description: string;
            icon?: string;
            systemPrompt?: string;
            retrievalSettings?: any;
            metadataFilters?: any;
        }
    ): HTMLElement {
        const card = container.createDiv({ cls: 'template-card' });
        card.style.border = '2px solid var(--background-modifier-border)';
        card.style.borderRadius = '8px';
        card.style.padding = '16px';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.2s ease';
        card.style.textAlign = 'center';

        // Hover effects
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'var(--interactive-accent)';
            card.style.backgroundColor = 'var(--background-modifier-hover)';
            card.style.transform = 'translateY(-2px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'var(--background-modifier-border)';
            card.style.backgroundColor = '';
            card.style.transform = 'translateY(0)';
        });

        // Click handler
        card.addEventListener('click', () => {
            this.loadTemplate(template.id);
        });

        // Icon
        if (template.icon) {
            const icon = card.createDiv({ text: template.icon });
            icon.style.fontSize = '32px';
            icon.style.marginBottom = '8px';
        }

        // Name
        const name = card.createDiv({ text: template.name });
        name.style.fontWeight = '600';
        name.style.marginBottom = '6px';
        name.style.fontSize = '14px';

        // Description
        const desc = card.createDiv({ text: template.description });
        desc.style.fontSize = '12px';
        desc.style.color = 'var(--text-muted)';
        desc.style.lineHeight = '1.4';

        return card;
    }

    /**
     * Load template data into form
     */
    private loadTemplate(templateId: string) {
        if (templateId === 'blank') {
            // Just refresh the modal to show empty form
            this.close();
            new AgentBuilderModal(this.app, this.plugin, null, this.onSave).open();
            return;
        }

        const template = AGENT_TEMPLATES[templateId];
        if (!template) {
            new Notice('Template not found');
            return;
        }

        // Create agent config from template
        const now = Date.now();
        const defaultLLM = this.plugin.settings.llmConfigs.find((c: any) => c.enabled);

        if (!defaultLLM) {
            new Notice('Please configure an LLM provider first');
            return;
        }

        this.agent = {
            id: this.plugin.generateId(),
            name: template.name,
            description: template.description,
            llmId: defaultLLM.id,
            systemPrompt: template.systemPrompt,
            retrievalSettings: template.retrievalSettings,
            metadataFilters: template.metadataFilters,
            enabled: true,
            createdAt: now,
            updatedAt: now
        };

        // Reload modal with template data
        this.close();
        new AgentBuilderModal(this.app, this.plugin, this.agent, this.onSave).open();
    }

    /**
     * Basic info section
     */
    private createBasicInfoSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '25px';

        const header = section.createEl('h3', { text: 'Basic Information' });
        header.style.marginTop = '0';
        header.style.marginBottom = '15px';

        // Name
        new Setting(section)
            .setName('Agent Name')
            .setDesc('A descriptive name for this agent')
            .addText(text => {
                this.nameInput = text;
                text.setPlaceholder('e.g., Research Analyst');
                text.inputEl.style.width = '100%';
                if (this.agent) {
                    text.setValue(this.agent.name);
                }
            });

        // Description
        const descSetting = new Setting(section)
            .setName('Description')
            .setDesc('Brief description of what this agent does');

        this.descriptionTextarea = descSetting.controlEl.createEl('textarea', {
            placeholder: 'e.g., Expert in analyzing research papers and providing comprehensive summaries'
        });
        this.descriptionTextarea.style.width = '100%';
        this.descriptionTextarea.style.minHeight = '80px';
        this.descriptionTextarea.style.resize = 'vertical';
        this.descriptionTextarea.style.padding = '8px';
        this.descriptionTextarea.style.borderRadius = '4px';
        this.descriptionTextarea.style.border = '1px solid var(--background-modifier-border)';
        this.descriptionTextarea.style.backgroundColor = 'var(--background-primary)';
        this.descriptionTextarea.style.color = 'var(--text-normal)';
        this.descriptionTextarea.style.fontFamily = 'var(--font-text)';

        if (this.agent) {
            this.descriptionTextarea.value = this.agent.description;
        }
    }

    /**
     * LLM configuration section
     */
    private createLLMSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '25px';

        const header = section.createEl('h3', { text: 'LLM Provider' });
        header.style.marginTop = '0';
        header.style.marginBottom = '15px';

        new Setting(section)
            .setName('Provider')
            .setDesc('Select which LLM provider to use for this agent')
            .addDropdown(dropdown => {
                this.llmSelect = dropdown;

                // Add options
                const enabledProviders = this.plugin.settings.llmConfigs.filter((c: any) => c.enabled);

                if (enabledProviders.length === 0) {
                    dropdown.addOption('', 'No providers configured');
                    dropdown.setDisabled(true);
                } else {
                    enabledProviders.forEach((config: any) => {
                        dropdown.addOption(
                            config.id,
                            `${config.name} (${config.provider} - ${config.model})`
                        );
                    });

                    if (this.agent) {
                        dropdown.setValue(this.agent.llmId);
                    } else if (enabledProviders.length > 0) {
                        dropdown.setValue(enabledProviders[0].id);
                    }
                }
            });
    }

    /**
     * System prompt section
     */
    private createSystemPromptSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '25px';

        const header = section.createEl('h3', { text: 'System Prompt' });
        header.style.marginTop = '0';
        header.style.marginBottom = '10px';

        const desc = section.createDiv({ cls: 'setting-item-description' });
        desc.style.marginBottom = '12px';
        desc.style.color = 'var(--text-muted)';
        desc.innerHTML = `
            Define how the agent should behave and respond. The prompt must include <code>{context}</code>
            where retrieved knowledge will be inserted.
        `;

        this.systemPromptTextarea = section.createEl('textarea', {
            placeholder: 'You are an expert assistant...\n\nContext: {context}\n\nProvide detailed, actionable guidance...'
        });
        this.systemPromptTextarea.style.width = '100%';
        this.systemPromptTextarea.style.minHeight = '200px';
        this.systemPromptTextarea.style.resize = 'vertical';
        this.systemPromptTextarea.style.padding = '12px';
        this.systemPromptTextarea.style.borderRadius = '4px';
        this.systemPromptTextarea.style.border = '1px solid var(--background-modifier-border)';
        this.systemPromptTextarea.style.backgroundColor = 'var(--background-primary)';
        this.systemPromptTextarea.style.color = 'var(--text-normal)';
        this.systemPromptTextarea.style.fontFamily = 'var(--font-monospace)';
        this.systemPromptTextarea.style.fontSize = '13px';
        this.systemPromptTextarea.style.lineHeight = '1.6';

        if (this.agent) {
            this.systemPromptTextarea.value = this.agent.systemPrompt;
        } else {
            // Default system prompt
            this.systemPromptTextarea.value = `You are a helpful AI assistant with access to the user's knowledge base.

Context from knowledge base:
{context}

Please provide detailed, accurate, and helpful responses based on the context provided. Always cite your sources when referencing specific information from the knowledge base.`;
        }
    }

    /**
     * Retrieval settings section
     */
    private createRetrievalSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '25px';

        const header = section.createEl('h3', { text: 'Retrieval Settings' });
        header.style.marginTop = '0';
        header.style.marginBottom = '15px';

        // Top K
        new Setting(section)
            .setName('Top K Results')
            .setDesc('Number of relevant chunks to retrieve (1-20)')
            .addText(text => {
                this.topKInput = text;
                text.setPlaceholder('5');
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.max = '20';
                text.inputEl.style.width = '100px';

                if (this.agent) {
                    text.setValue(String(this.agent.retrievalSettings.topK));
                } else {
                    text.setValue('5');
                }
            });

        // Score Threshold
        new Setting(section)
            .setName('Score Threshold')
            .setDesc('Minimum similarity score (0-1, lower is more lenient)')
            .addText(text => {
                this.thresholdInput = text;
                text.setPlaceholder('0.7');
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
                text.inputEl.max = '1';
                text.inputEl.step = '0.1';
                text.inputEl.style.width = '100px';

                if (this.agent) {
                    text.setValue(String(this.agent.retrievalSettings.scoreThreshold));
                } else {
                    text.setValue('0.7');
                }
            });

        // Search Strategy
        new Setting(section)
            .setName('Search Strategy')
            .setDesc('How to retrieve relevant content')
            .addDropdown(dropdown => {
                this.strategySelect = dropdown;
                dropdown.addOption(SearchStrategy.SEMANTIC, 'Semantic (embeddings only)');
                dropdown.addOption(SearchStrategy.KEYWORD, 'Keyword (metadata only)');
                dropdown.addOption(SearchStrategy.HYBRID, 'Hybrid (both)');

                if (this.agent) {
                    dropdown.setValue(this.agent.retrievalSettings.searchStrategy);
                } else {
                    dropdown.setValue(SearchStrategy.HYBRID);
                }
            });
    }

    /**
     * Metadata filters section
     */
    private createFiltersSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '25px';

        const header = section.createEl('h3', { text: 'Metadata Filters (Optional)' });
        header.style.marginTop = '0';
        header.style.marginBottom = '10px';

        const desc = section.createDiv({ cls: 'setting-item-description' });
        desc.style.marginBottom = '12px';
        desc.style.color = 'var(--text-muted)';
        desc.innerHTML = `
            Filter retrieved chunks by metadata fields. Enter JSON format. Leave empty for no filtering.<br><br>
            <strong>Example:</strong><br>
            <code style="display: block; padding: 8px; background-color: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; margin-top: 4px; font-family: var(--font-monospace);">
{
  "content_type": ["research", "documentation"],
  "tags": ["important", "reference"]
}
            </code>
        `;

        this.filtersTextarea = section.createEl('textarea', {
            placeholder: '{\n  "content_type": ["research"],\n  "tags": ["important"]\n}'
        });
        this.filtersTextarea.style.width = '100%';
        this.filtersTextarea.style.minHeight = '120px';
        this.filtersTextarea.style.resize = 'vertical';
        this.filtersTextarea.style.padding = '12px';
        this.filtersTextarea.style.borderRadius = '4px';
        this.filtersTextarea.style.border = '1px solid var(--background-modifier-border)';
        this.filtersTextarea.style.backgroundColor = 'var(--background-primary)';
        this.filtersTextarea.style.color = 'var(--text-normal)';
        this.filtersTextarea.style.fontFamily = 'var(--font-monospace)';
        this.filtersTextarea.style.fontSize = '13px';

        if (this.agent?.metadataFilters && Object.keys(this.agent.metadataFilters).length > 0) {
            this.filtersTextarea.value = JSON.stringify(this.agent.metadataFilters, null, 2);
        }
    }

    /**
     * Actions section
     */
    private createActionsSection(containerEl: HTMLElement) {
        const actions = containerEl.createDiv({ cls: 'modal-actions' });
        actions.style.marginTop = '30px';
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.justifyContent = 'flex-end';
        actions.style.paddingTop = '20px';
        actions.style.borderTop = '1px solid var(--background-modifier-border)';

        // Cancel button
        const cancelBtn = actions.createEl('button', { text: 'Cancel' });
        cancelBtn.style.padding = '8px 20px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        // Save button
        const saveBtn = actions.createEl('button', { text: this.agent ? 'Save Changes' : 'Create Agent' });
        saveBtn.addClass('mod-cta');
        saveBtn.style.padding = '8px 20px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.addEventListener('click', () => {
            this.save();
        });
    }

    /**
     * Save agent configuration
     */
    private async save() {
        try {
            // Validate inputs
            const name = this.nameInput.getValue().trim();
            if (!name) {
                new Notice('Please enter an agent name');
                this.nameInput.inputEl.focus();
                return;
            }

            const llmId = this.llmSelect.getValue();
            if (!llmId) {
                new Notice('Please select an LLM provider');
                return;
            }

            const systemPrompt = this.systemPromptTextarea.value.trim();
            if (!systemPrompt) {
                new Notice('Please enter a system prompt');
                this.systemPromptTextarea.focus();
                return;
            }

            if (!systemPrompt.includes('{context}')) {
                new Notice('System prompt must include {context} placeholder');
                this.systemPromptTextarea.focus();
                return;
            }

            const topK = parseInt(this.topKInput.getValue());
            if (isNaN(topK) || topK < 1 || topK > 20) {
                new Notice('Top K must be between 1 and 20');
                this.topKInput.inputEl.focus();
                return;
            }

            const threshold = parseFloat(this.thresholdInput.getValue());
            if (isNaN(threshold) || threshold < 0 || threshold > 1) {
                new Notice('Score threshold must be between 0 and 1');
                this.thresholdInput.inputEl.focus();
                return;
            }

            // Parse metadata filters
            let metadataFilters: MetadataFilters | undefined = undefined;
            const filtersText = this.filtersTextarea.value.trim();
            if (filtersText) {
                try {
                    const parsed = JSON.parse(filtersText);
                    // Validate it's an object
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                        metadataFilters = parsed as MetadataFilters;
                    } else {
                        new Notice('Metadata filters must be a JSON object');
                        this.filtersTextarea.focus();
                        return;
                    }
                } catch (error) {
                    new Notice('Invalid JSON in metadata filters');
                    this.filtersTextarea.focus();
                    return;
                }
            }

            // Build config
            const now = Date.now();
            const config: AgentConfig = {
                id: this.agent?.id || this.plugin.generateId(),
                name,
                description: this.descriptionTextarea.value.trim(),
                llmId,
                systemPrompt,
                retrievalSettings: {
                    topK,
                    scoreThreshold: threshold,
                    searchStrategy: this.strategySelect.getValue() as SearchStrategy
                },
                metadataFilters,
                enabled: this.agent?.enabled ?? true,
                createdAt: this.agent?.createdAt || now,
                updatedAt: now
            };

            // Call the save callback
            this.onSave(config);

            // Show success message
            new Notice(this.agent ? 'Agent updated successfully' : 'Agent created successfully');

            // Close modal
            this.close();
        } catch (error) {
            console.error('Error saving agent:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
