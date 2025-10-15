/**
 * Settings Tab UI
 *
 * Provides the settings interface for:
 * - Master password management
 * - LLM configuration
 * - API key encryption
 * - RAG configuration
 * - Phase 5: Agent Management
 */

import { App, PluginSettingTab, Setting, Notice, Modal, TextComponent } from 'obsidian';
import RiskManagementPlugin from '../main';
import { LLMConfig, AgentConfig } from '../types';
import { LLMProvider, SUCCESS, ERRORS } from '../constants';
import { KeyManager } from '../encryption/keyManager';
import { AgentBuilderModal } from './agentBuilderModal';

export class RiskManagementSettingTab extends PluginSettingTab {
    plugin: RiskManagementPlugin;
    private passwordVerified: boolean = false;

    constructor(app: App, plugin: RiskManagementPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Add custom class for styling
        containerEl.addClass('risk-management-rag-settings');

        // Header
        containerEl.createEl('h1', { text: 'RAG Agent Manager' });

        // Security Section
        this.displaySecuritySection(containerEl);

        // LLM Provider Section
        if (this.passwordVerified) {
            this.displayLLMSection(containerEl);

            // RAG Configuration Section
            this.displayRAGSection(containerEl);

            // Phase 5: Agent Management Section
            this.displayAgentSection(containerEl);
        } else {
            this.displayLockedSection(containerEl);
        }
    }

    /**
     * Security settings section
     */
    private displaySecuritySection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🔒 Security Settings' });

        const securityDesc = containerEl.createEl('p', {
            text: 'Your API keys are encrypted using AES-256 with a master password. ' +
                'The master password is never stored and must be entered each time you restart Obsidian.',
            cls: 'setting-item-description'
        });
        securityDesc.style.marginBottom = '20px';

        // Master password status
        if (this.plugin.keyManager.hasMasterPassword()) {
            const statusDiv = containerEl.createDiv({ cls: 'message success' });
            statusDiv.style.marginBottom = '15px';
            statusDiv.style.padding = '10px';
            statusDiv.setText('✓ Master password is set for this session');

            this.passwordVerified = true;
        } else {
            const statusDiv = containerEl.createDiv({ cls: 'message' });
            statusDiv.style.marginBottom = '15px';
            statusDiv.style.padding = '10px';
            statusDiv.setText('⚠ Master password not set. Please set it below.');
        }

        // Set/Change password
        new Setting(containerEl)
            .setName('Set Master Password')
            .setDesc('Create or change your master password for API key encryption')
            .addButton(btn => btn
                .setButtonText(this.plugin.keyManager.hasMasterPassword() ? 'Change Password' : 'Set Password')
                .setCta()
                .onClick(() => {
                    this.showPasswordModal();
                }));

        // Warning about password
        if (!this.plugin.keyManager.hasMasterPassword()) {
            const warningDiv = containerEl.createDiv({ cls: 'message' });
            warningDiv.style.padding = '15px';
            warningDiv.style.marginTop = '15px';
            warningDiv.innerHTML = `
                <strong>⚠️ Important:</strong> Your master password encrypts all API keys. 
                Choose a strong password and remember it. 
                There is no password recovery mechanism.
            `;
        }
    }

    /**
     * Show password input modal
     */
    private showPasswordModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Set Master Password');

        let passwordInput: TextComponent;
        let confirmInput: TextComponent;

        new Setting(modal.contentEl)
            .setName('Password')
            .setDesc('Choose a strong master password')
            .addText(text => {
                passwordInput = text;
                text.inputEl.type = 'password';
                text.inputEl.style.width = '100%';
            });

        new Setting(modal.contentEl)
            .setName('Confirm Password')
            .addText(text => {
                confirmInput = text;
                text.inputEl.type = 'password';
                text.inputEl.style.width = '100%';
            });

        new Setting(modal.contentEl)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => modal.close()))
            .addButton(btn => btn
                .setButtonText('Set Password')
                .setCta()
                .onClick(() => {
                    const password = passwordInput.getValue();
                    const confirm = confirmInput.getValue();

                    if (!password || password.length < 8) {
                        new Notice('Password must be at least 8 characters');
                        return;
                    }

                    if (password !== confirm) {
                        new Notice('Passwords do not match');
                        return;
                    }

                    try {
                        this.plugin.keyManager.setMasterPassword(password);
                        new Notice('✓ Master password set successfully');
                        modal.close();
                        this.display(); // Refresh to show unlocked sections
                    } catch (error: any) {
                        new Notice(`✗ Error: ${error.message}`);
                    }
                }));

        modal.open();
    }

    /**
     * Locked section shown when password is not set
     */
    private displayLockedSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🔒 Configuration (Locked)' });

        const lockedDiv = containerEl.createDiv({ cls: 'message' });
        lockedDiv.style.padding = '20px';
        lockedDiv.style.textAlign = 'center';
        lockedDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
            <p style="margin: 0;">Set your master password above to access all settings</p>
        `;
    }

    /**
     * LLM provider configuration section
     */
    private displayLLMSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🤖 LLM Providers' });

        const llmDesc = containerEl.createEl('p', {
            text: 'Configure AI providers (Anthropic Claude, OpenAI GPT, etc.). Your API keys will be encrypted.',
            cls: 'setting-item-description'
        });
        llmDesc.style.marginBottom = '20px';

        // Show initialization status
        if (this.plugin.llmManager) {
            const stats = this.plugin.llmManager.getStats();
            const statusDiv = containerEl.createDiv({ cls: 'message' });
            statusDiv.style.marginBottom = '15px';
            statusDiv.style.padding = '10px';

            const statusText = `📊 Status: ${stats.initializedProviders}/${stats.enabledProviders} providers initialized`;
            statusDiv.setText(statusText);
        }

        // List existing LLM configs
        if (this.plugin.settings.llmConfigs.length === 0) {
            const emptyDiv = containerEl.createDiv({ cls: 'message' });
            emptyDiv.style.padding = '20px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.setText('No LLM providers configured yet. Click "Add Provider" to get started.');
        } else {
            this.plugin.settings.llmConfigs.forEach(config => {
                this.displayLLMConfig(containerEl, config);
            });
        }

        // Add provider button
        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add LLM Provider')
                .setCta()
                .onClick(() => {
                    this.showLLMConfigModal(null);
                }));
    }

    /**
     * Display a single LLM config
     */
    private displayLLMConfig(containerEl: HTMLElement, config: LLMConfig): void {
        const configDiv = containerEl.createDiv({ cls: 'llm-config-item' });
        configDiv.style.border = '1px solid var(--background-modifier-border)';
        configDiv.style.borderRadius = '8px';
        configDiv.style.padding = '15px';
        configDiv.style.marginBottom = '10px';

        const header = configDiv.createDiv();
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';

        const title = header.createEl('h3', { text: config.name });
        title.style.margin = '0';

        // Status badges container
        const badgesContainer = header.createDiv();
        badgesContainer.style.display = 'flex';
        badgesContainer.style.gap = '8px';
        badgesContainer.style.alignItems = 'center';

        // Enabled/Disabled badge
        const enabledBadge = badgesContainer.createEl('span');
        enabledBadge.style.padding = '2px 8px';
        enabledBadge.style.borderRadius = '4px';
        enabledBadge.style.fontSize = '12px';
        enabledBadge.style.fontWeight = 'bold';

        if (config.enabled) {
            enabledBadge.setText('✓ Enabled');
            enabledBadge.style.backgroundColor = 'var(--interactive-success)';
            enabledBadge.style.color = 'var(--text-on-accent)';
        } else {
            enabledBadge.setText('Disabled');
            enabledBadge.style.backgroundColor = 'var(--background-modifier-border)';
        }

        // Test status badge
        const testStatus = (config as any).lastTestResult;
        if (testStatus) {
            const testBadge = badgesContainer.createEl('span');
            testBadge.style.padding = '2px 8px';
            testBadge.style.borderRadius = '4px';
            testBadge.style.fontSize = '12px';
            testBadge.style.fontWeight = 'bold';

            if (testStatus.success) {
                testBadge.setText('✓ Verified');
                testBadge.style.backgroundColor = '#28a745';
                testBadge.style.color = 'white';
            } else {
                testBadge.setText('✗ Failed');
                testBadge.style.backgroundColor = '#dc3545';
                testBadge.style.color = 'white';
            }

            // Add tooltip with timestamp
            const testDate = new Date(testStatus.timestamp);
            testBadge.setAttribute('title', `Last tested: ${testDate.toLocaleString()}`);
            testBadge.style.cursor = 'help';
        }

        const details = configDiv.createDiv();
        details.style.fontSize = '14px';
        details.style.color = 'var(--text-muted)';
        details.innerHTML = `
            <strong>Provider:</strong> ${config.provider}<br>
            <strong>Model:</strong> ${config.model}<br>
            <strong>Temperature:</strong> ${config.temperature}
        `;

        new Setting(configDiv)
            .addButton(btn => btn
                .setButtonText('Edit')
                .onClick(() => {
                    this.showLLMConfigModal(config);
                }))
            .addButton(btn => btn
                .setButtonText('Test')
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Testing...');

                    try {
                        const result = await this.plugin.llmManager.testProvider(config.id);

                        // Store test result
                        (config as any).lastTestResult = {
                            success: result,
                            timestamp: Date.now()
                        };
                        await this.plugin.saveSettings();

                        if (result) {
                            new Notice(`✓ ${config.name} is working!`, 3000);
                        } else {
                            new Notice(`✗ ${config.name} test failed. Check console.`, 5000);
                        }

                        this.display();
                    } catch (error: any) {
                        // Store failure
                        (config as any).lastTestResult = {
                            success: false,
                            timestamp: Date.now()
                        };
                        await this.plugin.saveSettings();

                        new Notice(`✗ Test error: ${error.message}`, 5000);
                        this.display();
                    } finally {
                        btn.setDisabled(false);
                        btn.setButtonText('Test');
                    }
                }))
            .addButton(btn => btn
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                    if (confirm(`Delete LLM configuration "${config.name}"?`)) {
                        this.plugin.settings.llmConfigs = this.plugin.settings.llmConfigs
                            .filter(c => c.id !== config.id);

                        await this.plugin.saveSettings();

                        if (this.plugin.llmManager) {
                            await this.plugin.llmManager.reloadAllProviders();
                        }

                        new Notice(`Deleted ${config.name}`);
                        this.display();
                    }
                }));
    }

    /**
     * Show LLM config modal
     */
    private showLLMConfigModal(config: LLMConfig | null): void {
        new LLMConfigModal(this.app, this.plugin, config, () => {
            this.display();
        }).open();
    }

    /**
     * RAG Configuration section
     */
    private displayRAGSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '📚 RAG Configuration' });

        const ragDesc = containerEl.createEl('p', {
            text: 'Manage your vector database and chunk ingestion. Requires an OpenAI API key for embeddings.',
            cls: 'setting-item-description'
        });
        ragDesc.style.marginBottom = '20px';

        // Statistics
        const stats = this.plugin.retriever?.getStats();
        if (stats) {
            const statsDiv = containerEl.createDiv({ cls: 'message' });
            statsDiv.style.padding = '15px';
            statsDiv.style.marginBottom = '20px';

            const statsContent = `📊 **Vector Store Statistics**

**Chunks:** ${stats.totalChunks} indexed
**Model:** ${stats.embeddingModel}
**Dimensions:** ${stats.dimension}
**Memory:** ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB
**Documents:** ${Object.keys(stats.documentCounts).length}
**Last Updated:** ${stats.updatedAt.toLocaleString()}`;

            statsDiv.setText(statsContent);
        } else {
            const emptyDiv = containerEl.createDiv({ cls: 'message' });
            emptyDiv.setText('No chunks indexed yet. Use "Ingest RAG Chunks" to get started.');
        }

        // Ingest button
        new Setting(containerEl)
            .setName('Ingest Chunks')
            .setDesc('Load and process RAG chunks from data/rag_chunks/')
            .addButton(btn => btn
                .setButtonText('Ingest Chunks')
                .setCta()
                .onClick(async () => {
                    if (!this.plugin.keyManager.hasMasterPassword()) {
                        new Notice('Please set master password first');
                        return;
                    }

                    new Notice('Starting ingestion...');
                    try {
                        await this.plugin.retriever.ingestChunks();
                        this.display();
                    } catch (error: any) {
                        console.error('Ingestion failed:', error);
                        new Notice(`✗ Ingestion failed: ${error.message}`);
                    }
                }));

        // Clear index button
        new Setting(containerEl)
            .setName('Clear Index')
            .setDesc('Remove all indexed chunks (cannot be undone)')
            .addButton(btn => btn
                .setButtonText('Clear Index')
                .setWarning()
                .onClick(async () => {
                    if (confirm('Are you sure? This will delete all indexed chunks.')) {
                        await this.plugin.retriever.clearIndex();
                        new Notice('✓ Vector store cleared');
                        this.display();
                    }
                }));
    }

    /**
     * Phase 5: Agent Management Section
     */
    private displayAgentSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🤖 AI Agents' });

        const agentDesc = containerEl.createEl('p', {
            text: 'Create and manage specialized RAG agents with custom prompts and retrieval strategies.',
            cls: 'setting-item-description'
        });
        agentDesc.style.marginBottom = '20px';

        // Show agent manager status
        if (this.plugin.agentManager) {
            const stats = this.plugin.agentManager.getStats();
            const statusDiv = containerEl.createDiv({ cls: 'message' });
            statusDiv.style.marginBottom = '15px';
            statusDiv.style.padding = '10px';

            const statusText = `📊 Status: ${stats.enabledAgents}/${stats.totalAgents} agents enabled`;
            statusDiv.setText(statusText);

            // Default agent indicator
            if (this.plugin.settings.defaultAgentId) {
                const defaultAgent = this.plugin.settings.agents.find(
                    a => a.id === this.plugin.settings.defaultAgentId
                );
                if (defaultAgent) {
                    const defaultDiv = containerEl.createDiv({ cls: 'message' });
                    defaultDiv.style.marginBottom = '15px';
                    defaultDiv.style.padding = '10px';
                    defaultDiv.setText(`⭐ Default Agent: ${defaultAgent.name}`);
                }
            }
        }

        // List existing agents
        if (this.plugin.settings.agents.length === 0) {
            const emptyDiv = containerEl.createDiv({ cls: 'message' });
            emptyDiv.style.padding = '20px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">🤖</div>
                <p style="margin: 0; margin-bottom: 10px;">No agents configured yet</p>
                <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                    Create your first agent to get started with specialized RAG queries
                </p>
            `;
        } else {
            this.plugin.settings.agents.forEach(agent => {
                this.displayAgentConfig(containerEl, agent);
            });
        }

        // Add agent button
        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Create Agent')
                .setCta()
                .onClick(() => {
                    new AgentBuilderModal(
                        this.app,
                        this.plugin,
                        null,
                        async (config: AgentConfig) => {
                            await this.plugin.agentManager.addAgent(config);
                            new Notice(`✓ Created agent: ${config.name}`);
                            this.display();
                        }
                    ).open();
                }));
    }

    /**
     * Display a single agent config with improved status badges
     * ✅ NEW: Added test status badge and system readiness indicator
     */
    private displayAgentConfig(containerEl: HTMLElement, agent: AgentConfig): void {
        const agentDiv = containerEl.createDiv({ cls: 'agent-config-item' });
        agentDiv.style.border = '1px solid var(--background-modifier-border)';
        agentDiv.style.borderRadius = '8px';
        agentDiv.style.padding = '15px';
        agentDiv.style.marginBottom = '10px';

        const header = agentDiv.createDiv();
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';

        const title = header.createEl('h3', { text: agent.name });
        title.style.margin = '0';

        // ✅ Status badges container
        const badges = header.createDiv();
        badges.style.display = 'flex';
        badges.style.gap = '8px';
        badges.style.alignItems = 'center';

        // Enabled/Disabled badge
        const enabledBadge = badges.createEl('span');
        enabledBadge.style.padding = '2px 8px';
        enabledBadge.style.borderRadius = '4px';
        enabledBadge.style.fontSize = '12px';
        enabledBadge.style.fontWeight = 'bold';

        if (agent.enabled) {
            enabledBadge.setText('✓ Enabled');
            enabledBadge.style.backgroundColor = 'var(--interactive-success)';
            enabledBadge.style.color = 'var(--text-on-accent)';
        } else {
            enabledBadge.setText('Disabled');
            enabledBadge.style.backgroundColor = 'var(--background-modifier-border)';
        }

        // Default badge
        if (this.plugin.settings.defaultAgentId === agent.id) {
            const defaultBadge = badges.createEl('span');
            defaultBadge.setText('⭐ Default');
            defaultBadge.style.padding = '2px 8px';
            defaultBadge.style.borderRadius = '4px';
            defaultBadge.style.fontSize = '12px';
            defaultBadge.style.fontWeight = 'bold';
            defaultBadge.style.backgroundColor = 'var(--interactive-accent)';
            defaultBadge.style.color = 'var(--text-on-accent)';
        }

        // ✅ NEW: Test status badge (similar to LLM configs)
        const testStatus = (agent as any).lastTestResult;
        if (testStatus) {
            const testBadge = badges.createEl('span');
            testBadge.style.padding = '2px 8px';
            testBadge.style.borderRadius = '4px';
            testBadge.style.fontSize = '12px';
            testBadge.style.fontWeight = 'bold';

            if (testStatus.success) {
                testBadge.setText('✓ Verified');
                testBadge.style.backgroundColor = '#28a745';
                testBadge.style.color = 'white';
            } else {
                testBadge.setText('✗ Failed');
                testBadge.style.backgroundColor = '#dc3545';
                testBadge.style.color = 'white';
            }

            // Add tooltip with timestamp and error message
            const testDate = new Date(testStatus.timestamp);
            const tooltipText = testStatus.success
                ? `Last tested: ${testDate.toLocaleString()}`
                : `Failed: ${testDate.toLocaleString()}\n${testStatus.error || 'Check console for details'}`;
            testBadge.setAttribute('title', tooltipText);
            testBadge.style.cursor = 'help';
        }

        // ✅ NEW: System readiness indicator
        const ragReady = this.plugin.retriever?.isReady();
        const llmReady = this.plugin.llmManager?.isReady();

        if (!ragReady || !llmReady) {
            const warningBadge = badges.createEl('span');
            warningBadge.setText('⚠ Not Ready');
            warningBadge.style.padding = '2px 8px';
            warningBadge.style.borderRadius = '4px';
            warningBadge.style.fontSize = '12px';
            warningBadge.style.fontWeight = 'bold';
            warningBadge.style.backgroundColor = '#ffc107';
            warningBadge.style.color = '#000';

            let reason = [];
            if (!ragReady) reason.push('RAG system not ready (ingest chunks)');
            if (!llmReady) reason.push('LLM not configured');
            warningBadge.setAttribute('title', reason.join(', '));
            warningBadge.style.cursor = 'help';
        }

        const description = agentDiv.createDiv();
        description.style.color = 'var(--text-muted)';
        description.style.marginBottom = '10px';
        description.setText(agent.description);

        const details = agentDiv.createDiv();
        details.style.fontSize = '14px';
        details.style.color = 'var(--text-muted)';

        const llmConfig = this.plugin.settings.llmConfigs.find(c => c.id === agent.llmId);
        const llmName = llmConfig ? llmConfig.name : 'Unknown';

        // ✅ Enhanced details display
        const threshold = (agent.retrievalSettings.scoreThreshold * 100).toFixed(0);
        details.innerHTML = `
            <strong>LLM:</strong> ${llmName} ${llmConfig ? `(${llmConfig.model})` : ''}<br>
            <strong>Retrieval:</strong> Top ${agent.retrievalSettings.topK} chunks, ${threshold}% threshold, ${agent.retrievalSettings.searchStrategy} search
        `;

        // ✅ Metadata filters display (if any)
        if (agent.metadataFilters && Object.keys(agent.metadataFilters).length > 0) {
            const filtersDiv = agentDiv.createDiv();
            filtersDiv.style.fontSize = '12px';
            filtersDiv.style.color = 'var(--text-muted)';
            filtersDiv.style.marginTop = '8px';
            filtersDiv.style.padding = '8px';
            filtersDiv.style.backgroundColor = 'var(--background-secondary)';
            filtersDiv.style.borderRadius = '4px';

            const filtersList = Object.entries(agent.metadataFilters)
                .map(([key, values]) => `<strong>${key}:</strong> ${values?.join(', ') || 'any'}`)
                .join(' | ');
            filtersDiv.innerHTML = `<strong>Filters:</strong> ${filtersList}`;
        }

        // Action buttons
        new Setting(agentDiv)
            .addButton(btn => btn
                .setButtonText('Edit')
                .onClick(() => {
                    new AgentBuilderModal(
                        this.app,
                        this.plugin,
                        agent,
                        async (config: AgentConfig) => {
                            await this.plugin.agentManager.updateAgent(agent.id, config);
                            new Notice(`✓ Updated agent: ${config.name}`);
                            this.display();
                        }
                    ).open();
                }))
            .addButton(btn => btn
                .setButtonText('Test')
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Testing...');

                    try {
                        // ✅ NEW: Test and store result
                        const result = await this.plugin.agentManager.testAgent(agent.id);

                        // ✅ Store test result in agent config
                        (agent as any).lastTestResult = {
                            success: result,
                            timestamp: Date.now(),
                            error: null
                        };
                        await this.plugin.saveSettings();

                        if (result) {
                            new Notice(`✓ ${agent.name} is working!`, 3000);
                        } else {
                            new Notice(`✗ ${agent.name} test failed. Check console.`, 5000);
                        }

                        // ✅ Refresh display to show new badge
                        this.display();
                    } catch (error: any) {
                        // ✅ Store failure with error message
                        (agent as any).lastTestResult = {
                            success: false,
                            timestamp: Date.now(),
                            error: error.message
                        };
                        await this.plugin.saveSettings();

                        new Notice(`✗ Test error: ${error.message}`, 5000);

                        // ✅ Refresh display to show failure badge
                        this.display();
                    } finally {
                        btn.setDisabled(false);
                        btn.setButtonText('Test');
                    }
                }))
            .addButton(btn => btn
                .setButtonText(this.plugin.settings.defaultAgentId === agent.id ? 'Unset Default' : 'Set Default')
                .onClick(async () => {
                    if (this.plugin.settings.defaultAgentId === agent.id) {
                        this.plugin.settings.defaultAgentId = undefined;
                        new Notice('Default agent unset');
                    } else {
                        await this.plugin.agentManager.setDefaultAgent(agent.id);
                        new Notice(`✓ Set ${agent.name} as default agent`);
                    }
                    await this.plugin.saveSettings();
                    this.display();
                }))
            .addButton(btn => btn
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                    if (confirm(`Delete agent "${agent.name}"?`)) {
                        await this.plugin.agentManager.deleteAgent(agent.id);
                        new Notice(`Deleted ${agent.name}`);
                        this.display();
                    }
                }));
    }
}

/**
 * Modal for creating/editing LLM configurations
 */
class LLMConfigModal extends Modal {
    plugin: RiskManagementPlugin;
    config: LLMConfig | null;
    onSave: () => void;

    // Form fields
    private nameInput: TextComponent;
    private providerSelect: HTMLSelectElement;
    private apiKeyInput: TextComponent;
    private modelInput: TextComponent;
    private temperatureInput: TextComponent;
    private maxTokensInput: TextComponent;

    constructor(
        app: App,
        plugin: RiskManagementPlugin,
        config: LLMConfig | null,
        onSave: () => void
    ) {
        super(app);
        this.plugin = plugin;
        this.config = config;
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('risk-management-modal');

        // Title
        contentEl.createEl('h2', {
            text: this.config ? 'Edit LLM Provider' : 'Add LLM Provider'
        });

        // Name
        new Setting(contentEl)
            .setName('Name')
            .setDesc('A friendly name for this configuration')
            .addText(text => {
                this.nameInput = text;
                text.setPlaceholder('My Claude API');
                text.inputEl.style.width = '100%';
                text.inputEl.style.minWidth = '300px';
                if (this.config) text.setValue(this.config.name);
            });

        // Provider
        new Setting(contentEl)
            .setName('Provider')
            .setDesc('Select the LLM provider')
            .addDropdown(dropdown => {
                dropdown.addOption(LLMProvider.ANTHROPIC, 'Anthropic (Claude)');
                dropdown.addOption(LLMProvider.OPENAI, 'OpenAI (GPT)');

                if (this.config) {
                    dropdown.setValue(this.config.provider);
                } else {
                    dropdown.setValue(LLMProvider.ANTHROPIC);
                }

                this.providerSelect = dropdown.selectEl;

                // Update model placeholder based on provider
                dropdown.onChange((value) => {
                    this.updateModelPlaceholder(value as LLMProvider);
                });
            });

        // API Key
        new Setting(contentEl)
            .setName('API Key')
            .setDesc(this.config ? 'Leave empty to keep existing key' : 'Your API key (will be encrypted)')
            .addText(text => {
                this.apiKeyInput = text;
                text.inputEl.type = 'password';
                text.inputEl.style.width = '100%';
                text.inputEl.style.minWidth = '300px';
                text.setPlaceholder(this.config ? '••••••••••••••••' : 'sk-...');
            });

        // Model
        new Setting(contentEl)
            .setName('Model')
            .setDesc('The specific model to use')
            .addText(text => {
                this.modelInput = text;
                text.inputEl.style.width = '100%';
                text.inputEl.style.minWidth = '300px';
                if (this.config) {
                    text.setValue(this.config.model);
                } else {
                    this.updateModelPlaceholder(LLMProvider.ANTHROPIC);
                }
            });

        // Temperature
        new Setting(contentEl)
            .setName('Temperature')
            .setDesc('Response randomness (0.0 = focused, 1.0 = creative). Use 1.0 for GPT-5 models.')
            .addText(text => {
                this.temperatureInput = text;
                text.setPlaceholder('0.7');
                text.inputEl.type = 'number';
                text.inputEl.step = '0.1';
                text.inputEl.min = '0';
                text.inputEl.max = '2';
                text.inputEl.style.width = '100%';
                text.inputEl.style.minWidth = '100px';
                if (this.config) text.setValue(String(this.config.temperature));
            });

        // Max Tokens
        new Setting(contentEl)
            .setName('Max Tokens')
            .setDesc('Maximum response length')
            .addText(text => {
                this.maxTokensInput = text;
                text.setPlaceholder('4096');
                text.inputEl.type = 'number';
                text.inputEl.style.width = '100%';
                text.inputEl.style.minWidth = '100px';
                if (this.config) text.setValue(String(this.config.maxTokens));
            });

        // Actions
        const actions = contentEl.createDiv({ cls: 'modal-actions' });
        actions.style.marginTop = '20px';
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.justifyContent = 'flex-end';

        new Setting(actions)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(() => this.save()));
    }

    private updateModelPlaceholder(provider: LLMProvider) {
        const placeholders = {
            [LLMProvider.ANTHROPIC]: 'claude-sonnet-4-20250514',
            [LLMProvider.OPENAI]: 'gpt-4o',
            [LLMProvider.CUSTOM]: 'model-name'
        };
        this.modelInput.setPlaceholder(placeholders[provider] || 'model-name');
    }

    private async save() {
        const name = this.nameInput.getValue().trim();
        const provider = this.providerSelect.value as LLMProvider;
        const apiKey = this.apiKeyInput.getValue().trim();
        const model = this.modelInput.getValue().trim();
        const temperature = parseFloat(this.temperatureInput.getValue()) || 0.7;
        const maxTokens = parseInt(this.maxTokensInput.getValue()) || 4096;

        // Validation
        if (!name) {
            new Notice('Please enter a name');
            return;
        }

        if (!model) {
            new Notice('Please enter a model');
            return;
        }

        if (!apiKey && !this.config) {
            new Notice('Please enter an API key');
            return;
        }

        try {
            // Encrypt API key if provided
            let encryptedApiKey = this.config?.encryptedApiKey || '';

            if (apiKey) {
                const encrypted = this.plugin.keyManager.encrypt(apiKey);
                encryptedApiKey = JSON.stringify(encrypted);
            }

            const now = Date.now();

            if (this.config) {
                // Update existing config
                const updatedConfig: LLMConfig = {
                    ...this.config,
                    name,
                    provider,
                    model,
                    temperature,
                    maxTokens,
                    encryptedApiKey,
                    updatedAt: now
                };

                const index = this.plugin.settings.llmConfigs.findIndex(c => c.id === this.config!.id);
                this.plugin.settings.llmConfigs[index] = updatedConfig;
            } else {
                // Create new config
                const newConfig: LLMConfig = {
                    id: this.plugin.generateId(),
                    name,
                    provider,
                    encryptedApiKey,
                    model,
                    temperature,
                    maxTokens,
                    enabled: true,
                    createdAt: now,
                    updatedAt: now
                };

                this.plugin.settings.llmConfigs.push(newConfig);
            }

            await this.plugin.saveSettings();

            // Reload LLM manager
            if (this.plugin.llmManager) {
                await this.plugin.llmManager.reloadAllProviders();
            }

            new Notice(`✓ ${this.config ? 'Updated' : 'Created'} ${name}`);
            this.close();
            this.onSave();
        } catch (error: any) {
            new Notice(`✗ Error: ${error.message}`);
            console.error('Save error:', error);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
