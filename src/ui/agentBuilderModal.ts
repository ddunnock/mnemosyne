/**
 * Agent Builder Modal
 *
 * UI for creating and editing RAG agents
 */

import { App, Modal, Setting, Notice, TextComponent, DropdownComponent } from 'obsidian';
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
    private descriptionInput: HTMLTextAreaElement;
    private llmSelect: DropdownComponent;
    private systemPromptInput: HTMLTextAreaElement;
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

        // Title
        contentEl.createEl('h2', {
            text: this.agent ? 'Edit Agent' : 'Create New Agent'
        });

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
     * Template selector for new agents
     */
    private createTemplateSelector(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '20px';
        section.style.padding = '15px';
        section.style.backgroundColor = 'var(--background-secondary)';
        section.style.borderRadius = '8px';

        section.createEl('h3', { text: '🎯 Start from a Template' });

        const desc = section.createDiv({ cls: 'setting-item-description' });
        desc.setText(
            'Choose a pre-configured template or start from scratch. Templates provide optimized prompts and settings for specific use cases.'
        );

        const templatesDiv = section.createDiv();
        templatesDiv.style.display = 'grid';
        templatesDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        templatesDiv.style.gap = '10px';
        templatesDiv.style.marginTop = '15px';

        // Add "Blank" option
        const blankCard = this.createTemplateCard(templatesDiv, {
            id: 'blank',
            name: 'Blank Agent',
            description: 'Start with an empty configuration',
            icon: '📄'
        });

        // Add template cards
        getAllTemplates().forEach(({ id, template }) => {
            this.createTemplateCard(templatesDiv, {
                id,
                name: template.name,
                description: template.description,
                icon: template.icon || '🤖'
            });
        });
    }

    /**
     * Create a template selection card
     */
    private createTemplateCard(
        container: HTMLElement,
        template: { id: string; name: string; description: string; icon?: string }
    ): HTMLElement {
        const card = container.createDiv({ cls: 'template-card' });
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.borderRadius = '8px';
        card.style.padding = '15px';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.2s';

        card.onmouseover = () => {
            card.style.borderColor = 'var(--interactive-accent)';
            card.style.backgroundColor = 'var(--background-modifier-hover)';
        };

        card.onmouseout = () => {
            card.style.borderColor = 'var(--background-modifier-border)';
            card.style.backgroundColor = '';
        };

        card.onclick = () => {
            this.loadTemplate(template.id);
        };

        // Icon
        if (template.icon) {
            const icon = card.createDiv({ text: template.icon });
            icon.style.fontSize = '32px';
            icon.style.marginBottom = '8px';
        }

        // Name
        const name = card.createDiv({ text: template.name });
        name.style.fontWeight = 'bold';
        name.style.marginBottom = '5px';

        // Description
        const desc = card.createDiv({ text: template.description });
        desc.style.fontSize = '0.85em';
        desc.style.color = 'var(--text-muted)';

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
        const defaultLLM = this.plugin.settings.llmConfigs.find(c => c.enabled);

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
        section.style.marginBottom = '20px';

        section.createEl('h3', { text: 'Basic Information' });

        // Name
        new Setting(section)
            .setName('Agent Name')
            .setDesc('A descriptive name for this agent')
            .addText(text => {
                this.nameInput = text;
                text.setPlaceholder('e.g., Risk Assessment Specialist');
                text.inputEl.style.width = '100%';
                if (this.agent) text.setValue(this.agent.name);
            });

        // Description
        const descSetting = new Setting(section)
            .setName('Description')
            .setDesc('Brief description of what this agent does');

        this.descriptionInput = descSetting.controlEl.createEl('textarea', {
            placeholder: 'e.g., Expert in risk identification and analysis procedures'
        });
        this.descriptionInput.style.width = '100%';
        this.descriptionInput.style.minHeight = '60px';
        this.descriptionInput.style.resize = 'vertical';
        if (this.agent) this.descriptionInput.value = this.agent.description;
    }

    /**
     * LLM configuration section
     */
    private createLLMSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '20px';

        section.createEl('h3', { text: 'LLM Provider' });

        new Setting(section)
            .setName('Provider')
            .setDesc('Select which LLM provider to use for this agent')
            .addDropdown(dropdown => {
                this.llmSelect = dropdown;

                // Add options
                const enabledProviders = this.plugin.settings.llmConfigs.filter(c => c.enabled);

                if (enabledProviders.length === 0) {
                    dropdown.addOption('', 'No providers configured');
                } else {
                    enabledProviders.forEach(config => {
                        dropdown.addOption(
                            config.id,
                            `${config.name} (${config.provider} - ${config.model})`
                        );
                    });

                    if (this.agent) {
                        dropdown.setValue(this.agent.llmId);
                    }
                }
            });
    }

    /**
     * System prompt section
     */
    private createSystemPromptSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '20px';

        section.createEl('h3', { text: 'System Prompt' });

        const desc = section.createDiv({ cls: 'setting-item-description' });
        desc.style.marginBottom = '10px';
        desc.innerHTML = `
            Define how the agent should behave and respond. The prompt must include <code>{context}</code>
            where retrieved knowledge will be inserted.
        `;

        this.systemPromptInput = section.createEl('textarea', {
            placeholder: 'You are an expert assistant...\n\nContext: {context}\n\nProvide detailed, actionable guidance...'
        });
        this.systemPromptInput.style.width = '100%';
        this.systemPromptInput.style.minHeight = '200px';
        this.systemPromptInput.style.resize = 'vertical';
        this.systemPromptInput.style.fontFamily = 'monospace';

        if (this.agent) {
            this.systemPromptInput.value = this.agent.systemPrompt;
        } else {
            this.systemPromptInput.value = `You are a helpful assistant with access to the Risk Management Handbook.

Context from knowledge base:
{context}

Provide clear, accurate, and actionable guidance based on the retrieved context.`;
        }
    }

    /**
     * Retrieval settings section
     */
    private createRetrievalSection(containerEl: HTMLElement) {
        const section = containerEl.createDiv({ cls: 'modal-section' });
        section.style.marginBottom = '20px';

        section.createEl('h3', { text: 'Retrieval Settings' });

        // Top K
        new Setting(section)
            .setName('Top K')
            .setDesc('Number of chunks to retrieve (1-20)')
            .addText(text => {
                this.topKInput = text;
                text.setPlaceholder('5');
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.max = '20';
                if (this.agent) {
                    text.setValue(String(this.agent.retrievalSettings.topK));
                } else {
                    text.setValue('5');
                }
            });

        // Score Threshold
        new Setting(section)
            .setName('Score Threshold')
            .setDesc('Minimum similarity score (0.0 - 1.0)')
            .addText(text => {
                this.thresholdInput = text;
                text.setPlaceholder('0.7');
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
                text.inputEl.max = '1';
                text.inputEl.step = '0.05';
                if (this.agent) {
                    text.setValue(String(this.agent.retrievalSettings.scoreThreshold));
                } else {
                    text.setValue('0.7');
                }
            });

        // Search Strategy
        new Setting(section)
            .setName('Search Strategy')
            .setDesc('How to search for relevant chunks')
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
        section.style.marginBottom = '20px';

        section.createEl('h3', { text: 'Metadata Filters (Optional)' });

        const desc = section.createDiv({ cls: 'setting-item-description' });
        desc.style.marginBottom = '10px';
        desc.innerHTML = `
            Filter retrieved chunks by metadata. Enter JSON format. Example:<br>
            <code>{ "process_phase": ["assessment", "identification"], "content_type": ["procedure"] }</code>
        `;

        this.filtersTextarea = section.createEl('textarea', {
            placeholder: '{\n  "process_phase": ["assessment"],\n  "content_type": ["procedure", "concept"]\n}'
        });
        this.filtersTextarea.style.width = '100%';
        this.filtersTextarea.style.minHeight = '100px';
        this.filtersTextarea.style.resize = 'vertical';
        this.filtersTextarea.style.fontFamily = 'monospace';

        if (this.agent?.metadataFilters) {
            this.filtersTextarea.value = JSON.stringify(this.agent.metadataFilters, null, 2);
        }
    }

    /**
     * Actions section
     */
    private createActionsSection(containerEl: HTMLElement) {
        const actions = containerEl.createDiv({ cls: 'modal-actions' });
        actions.style.marginTop = '20px';
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.justifyContent = 'flex-end';

        new Setting(actions)
            .addButton(btn =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => this.close())
            )
            .addButton(btn =>
                btn
                    .setButtonText('Save')
                    .setCta()
                    .onClick(() => this.save())
            );
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
                return;
            }

            const llmId = this.llmSelect.getValue();
            if (!llmId) {
                new Notice('Please select an LLM provider');
                return;
            }

            const systemPrompt = this.systemPromptInput.value.trim();
            if (!systemPrompt) {
                new Notice('Please enter a system prompt');
                return;
            }

            if (!systemPrompt.includes('{context}')) {
                new Notice('System prompt must include {context} placeholder');
                return;
            }

            const topK = parseInt(this.topKInput.getValue());
            if (isNaN(topK) || topK < 1 || topK > 20) {
                new Notice('Top K must be between 1 and 20');
                return;
            }

            const threshold = parseFloat(this.thresholdInput.getValue());
            if (isNaN(threshold) || threshold < 0 || threshold > 1) {
                new Notice('Score threshold must be between 0 and 1');
                return;
            }

            // Parse metadata filters
            let metadataFilters: MetadataFilters = {};
            const filtersText = this.filtersTextarea.value.trim();
            if (filtersText) {
                try {
                    metadataFilters = JSON.parse(filtersText);
                } catch (error) {
                    new Notice('Invalid JSON in metadata filters');
                    return;
                }
            }

            // Build config
            const now = Date.now();
            const config: AgentConfig = {
                id: this.agent?.id || this.plugin.generateId(),
                name,
                description: this.descriptionInput.value.trim(),
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

            // Save
            this.onSave(config);
            new Notice(`Agent "${name}" saved successfully`);
            this.close();
        } catch (error: any) {
            console.error('Error saving agent:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}