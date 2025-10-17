/**
 * Settings Tab - Complete Implementation (All TypeScript Errors Fixed)
 *
 * Includes smart initialization and comprehensive system status
 */

import { App, PluginSettingTab, Setting, Notice, TextComponent, DropdownComponent, Modal } from 'obsidian';
import RiskManagementPlugin from '../main';
import { LLMProviderConfig, AgentConfig } from '../types';
import { LLMProvider } from '../constants';
import { AgentBuilderModal } from './agentBuilderModal';
import { InitializationManager } from '../utils/initializationManager';

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
        containerEl.addClass('risk-management-rag-settings');

        // Header
        containerEl.createEl('h1', { text: 'Risk Management RAG Assistant' });

        // System Status Section (FIRST - before security)
        this.displaySystemStatus(containerEl);

        // Security Section
        this.displaySecuritySection(containerEl);

        // Only show other sections if password verified
        if (this.passwordVerified) {
            this.displayLLMSection(containerEl);
            this.displayRAGSection(containerEl);
            this.displayAgentsSection(containerEl);
        }
    }

    /**
     * Display System Status and Initialization Controls
     */
    private displaySystemStatus(containerEl: HTMLElement): void {
        const section = containerEl.createDiv({ cls: 'system-status-section' });
        section.style.marginBottom = '30px';
        section.style.padding = '20px';
        section.style.backgroundColor = 'var(--background-secondary)';
        section.style.borderRadius = '8px';
        section.style.border = '2px solid var(--background-modifier-border)';

        // Header
        const header = section.createEl('h2', { text: '🎛️ System Status' });
        header.style.marginTop = '0';
        header.style.marginBottom = '15px';

        // Get or create initialization manager
        if (!this.plugin.initManager) {
            this.plugin.initManager = new InitializationManager(this.plugin);
        }

        const status = this.plugin.initManager.getStatus();
        const requirements = this.plugin.initManager.getRequirements();
        const issues = this.plugin.initManager.diagnose();

        // Overall Status Badge
        const statusBadge = section.createDiv();
        statusBadge.style.display = 'inline-block';
        statusBadge.style.padding = '10px 20px';
        statusBadge.style.borderRadius = '20px';
        statusBadge.style.fontWeight = '600';
        statusBadge.style.marginBottom = '20px';
        statusBadge.style.fontSize = '1.1em';

        if (status.overall) {
            statusBadge.textContent = '✅ All Systems Ready';
            statusBadge.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
            statusBadge.style.color = '#28a745';
            statusBadge.style.border = '2px solid #28a745';
        } else {
            statusBadge.textContent = '⚠️ Action Required';
            statusBadge.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
            statusBadge.style.color = '#ffc107';
            statusBadge.style.border = '2px solid #ffc107';
        }

        // Component Status Grid
        const grid = section.createDiv();
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        grid.style.gap = '15px';
        grid.style.marginBottom = '20px';

        // Helper to create status cards
        const createCard = (icon: string, title: string, isReady: boolean, details: string) => {
            const card = grid.createDiv();
            card.style.padding = '15px';
            card.style.borderRadius = '8px';
            card.style.border = '2px solid ' + (isReady ? '#28a745' : '#dc3545');
            card.style.backgroundColor = isReady
                ? 'rgba(40, 167, 69, 0.1)'
                : 'rgba(220, 53, 69, 0.1)';

            const headerDiv = card.createDiv();
            headerDiv.style.display = 'flex';
            headerDiv.style.alignItems = 'center';
            headerDiv.style.gap = '8px';
            headerDiv.style.marginBottom = '8px';

            const iconSpan = headerDiv.createSpan({ text: icon });
            iconSpan.style.fontSize = '24px';

            const titleSpan = headerDiv.createSpan({ text: title });
            titleSpan.style.fontWeight = '600';
            titleSpan.style.fontSize = '1em';

            const statusSpan = card.createDiv({
                text: isReady ? '✓ Ready' : '✗ Not Ready'
            });
            statusSpan.style.fontSize = '0.9em';
            statusSpan.style.color = isReady ? '#28a745' : '#dc3545';
            statusSpan.style.marginBottom = '5px';

            const detailsSpan = card.createDiv({ text: details });
            detailsSpan.style.fontSize = '0.85em';
            detailsSpan.style.opacity = '0.8';
        };

        // Status cards
        createCard(
            '🔐',
            'Security',
            status.keyManager,
            status.keyManager ? 'Password configured' : 'Set master password'
        );

        createCard(
            '📚',
            'RAG System',
            status.retriever,
            status.chunksIngested
                ? `${status.chunkCount} chunks loaded`
                : 'No chunks ingested'
        );

        createCard(
            '🤖',
            'LLM Providers',
            status.llmManager,
            status.llmProvidersConfigured
                ? `${status.llmProvidersInitialized}/${status.providerCount} active`
                : 'No providers configured'
        );

        createCard(
            '🎯',
            'AI Agents',
            status.agentManager,
            status.agentsConfigured
                ? `${status.agentsInitialized}/${status.agentCount} active`
                : 'No agents configured'
        );

        // Issues & Diagnostics (if any)
        if (issues.length > 0) {
            const issuesBox = section.createDiv();
            issuesBox.style.padding = '15px';
            issuesBox.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
            issuesBox.style.border = '1px solid rgba(255, 193, 7, 0.3)';
            issuesBox.style.borderRadius = '6px';
            issuesBox.style.marginBottom = '20px';

            const issuesHeader = issuesBox.createEl('h4', { text: '⚠️ Issues Detected' });
            issuesHeader.style.marginTop = '0';
            issuesHeader.style.marginBottom = '10px';
            issuesHeader.style.color = '#ffc107';

            const issuesList = issuesBox.createEl('ul');
            issuesList.style.margin = '0';
            issuesList.style.paddingLeft = '20px';

            issues.forEach(issue => {
                const li = issuesList.createEl('li');
                li.style.marginBottom = '5px';
                li.textContent = issue;
            });
        }

        // Action Buttons
        const actionsDiv = section.createDiv();
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '10px';
        actionsDiv.style.flexWrap = 'wrap';
        actionsDiv.style.marginTop = '20px';

        // Initialize/Re-initialize All
        new Setting(actionsDiv)
            .addButton(btn => {
                btn.setButtonText(status.overall ? '🔄 Re-initialize All' : '⚡ Initialize All')
                    .setCta()
                    .setDisabled(this.plugin.initManager.isInitializing())
                    .onClick(async () => {
                        btn.setDisabled(true);
                        const originalText = btn.buttonEl.textContent;
                        btn.setButtonText('⏳ Initializing...');

                        const result = await this.plugin.initManager.initializeAll(status.overall);

                        if (result.success) {
                            new Notice('✅ All systems initialized!', 3000);
                        } else {
                            new Notice(`⚠️ Errors: ${result.errors.join(', ')}`, 5000);
                        }

                        if (result.warnings.length > 0) {
                            new Notice(`ℹ️ ${result.warnings.join(', ')}`, 4000);
                        }

                        // Refresh display
                        this.display();
                    });
            });

        // Initialize Missing (only show if something is missing)
        if (!status.overall && (status.llmProvidersConfigured || status.agentsConfigured)) {
            new Setting(actionsDiv)
                .addButton(btn => {
                    btn.setButtonText('🔧 Initialize Missing')
                        .setDisabled(this.plugin.initManager.isInitializing())
                        .onClick(async () => {
                            btn.setDisabled(true);
                            btn.setButtonText('⏳ Initializing...');

                            const result = await this.plugin.initManager.initializeMissing();

                            if (result.success) {
                                new Notice('✅ Missing components initialized!', 3000);
                            } else {
                                new Notice(`⚠️ Errors: ${result.errors.join(', ')}`, 5000);
                            }

                            this.display();
                        });
                });
        }

        // Re-initialize LLM (if providers configured but not all initialized)
        if (status.llmProvidersConfigured && status.llmProvidersInitialized < status.providerCount) {
            new Setting(actionsDiv)
                .addButton(btn => {
                    btn.setButtonText('🤖 Re-initialize LLM')
                        .setDisabled(this.plugin.initManager.isInitializing())
                        .onClick(async () => {
                            btn.setDisabled(true);
                            btn.setButtonText('⏳ Working...');

                            await this.plugin.initManager.reinitializeLLM();

                            this.display();
                        });
                });
        }

        // Re-initialize Agents (if agents configured but not all initialized)
        if (status.agentsConfigured && status.agentsInitialized < status.agentCount) {
            new Setting(actionsDiv)
                .addButton(btn => {
                    btn.setButtonText('🎯 Re-initialize Agents')
                        .setDisabled(this.plugin.initManager.isInitializing())
                        .onClick(async () => {
                            btn.setDisabled(true);
                            btn.setButtonText('⏳ Working...');

                            await this.plugin.initManager.reinitializeAgents();

                            this.display();
                        });
                });
        }

        // Refresh Status Button
        new Setting(actionsDiv)
            .addButton(btn => {
                btn.setButtonText('🔄 Refresh Status')
                    .onClick(() => {
                        this.display();
                        new Notice('Status refreshed', 2000);
                    });
            });

        // Divider
        section.createEl('hr', { attr: { style: 'margin: 20px 0; border: none; border-top: 1px solid var(--background-modifier-border);' } });

        // Help text
        const helpText = section.createEl('p');
        helpText.style.fontSize = '0.9em';
        helpText.style.opacity = '0.8';
        helpText.style.margin = '0';
        helpText.innerHTML = `
            <strong>💡 Tip:</strong> If you've just added providers or agents, click <strong>"Initialize Missing"</strong> 
            to activate them without restarting Obsidian.
        `;
    }

    /**
     * Verify password by attempting to decrypt a test config
     */
    private verifyMasterPassword(password: string): boolean {
        if (!password) {
            return false;
        }

        try {
            // Set the password
            this.plugin.keyManager.setMasterPassword(password);

            // Test decryption if we have any configs
            if (this.plugin.settings.llmConfigs.length > 0) {
                const testConfig = this.plugin.settings.llmConfigs[0];
                if (testConfig.encryptedApiKey) {
                    const encrypted = JSON.parse(testConfig.encryptedApiKey);
                    this.plugin.keyManager.decrypt(encrypted);
                }
            }

            return true;
        } catch (error) {
            // Clear failed password attempt
            this.plugin.keyManager.clearMasterPassword();
            return false;
        }
    }

    /**
     * Display Security Section
     */
    private displaySecuritySection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🔐 Security' });

        const desc = containerEl.createEl('p', {
            text: 'Set a master password to encrypt your API keys. This password is required to use the plugin.',
            cls: 'setting-item-description'
        });
        desc.style.marginBottom = '20px';

        // Check if password is already set
        const hasPassword = this.plugin.keyManager.hasMasterPassword();

        if (!hasPassword) {
            // Show password setup
            new Setting(containerEl)
                .setName('Master Password')
                .setDesc('Create a master password to encrypt your API keys')
                .addText(text => {
                    text.setPlaceholder('Enter master password')
                        .inputEl.type = 'password';
                    text.inputEl.id = 'master-password-input';
                })
                .addButton(btn => btn
                    .setButtonText('Set Password')
                    .setCta()
                    .onClick(async () => {
                        const input = document.getElementById('master-password-input') as HTMLInputElement;
                        const password = input?.value;

                        if (!password || password.length < 8) {
                            new Notice('Password must be at least 8 characters');
                            return;
                        }

                        try {
                            await this.plugin.keyManager.setMasterPassword(password);
                            new Notice('Master password set successfully!');
                            this.passwordVerified = true;
                            this.display();
                        } catch (error: any) {
                            new Notice(`Failed to set password: ${error.message}`);
                        }
                    }));
        } else {
            // Show password verification
            if (!this.passwordVerified) {
                new Setting(containerEl)
                    .setName('Verify Password')
                    .setDesc('Enter your master password to access settings')
                    .addText(text => {
                        text.setPlaceholder('Enter master password')
                            .inputEl.type = 'password';
                        text.inputEl.id = 'verify-password-input';
                    })
                    .addButton(btn => btn
                        .setButtonText('Unlock')
                        .setCta()
                        .onClick(() => {
                            const input = document.getElementById('verify-password-input') as HTMLInputElement;
                            const password = input?.value;

                            if (this.verifyMasterPassword(password)) {
                                this.passwordVerified = true;
                                new Notice('Password verified!');
                                this.display();
                            } else {
                                new Notice('Incorrect password');
                            }
                        }));
            } else {
                // Show password management options
                const statusDiv = containerEl.createDiv({ cls: 'message' });
                statusDiv.style.padding = '15px';
                statusDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                statusDiv.style.border = '1px solid rgba(40, 167, 69, 0.3)';
                statusDiv.style.borderRadius = '6px';
                statusDiv.style.marginBottom = '20px';
                statusDiv.setText('✓ Master password is set and verified');
            }
        }
    }

    /**
     * Display LLM Providers Section
     */
    private displayLLMSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🤖 LLM Providers' });

        const desc = containerEl.createEl('p', {
            text: 'Configure Large Language Model providers for generating responses.',
            cls: 'setting-item-description'
        });
        desc.style.marginBottom = '20px';

        // Add provider button
        new Setting(containerEl)
            .setName('Add LLM Provider')
            .setDesc('Add a new LLM provider configuration')
            .addButton(btn => btn
                .setButtonText('Add Provider')
                .setCta()
                .onClick(() => {
                    new LLMConfigModal(this.app, this.plugin, null, async (config) => {
                        this.plugin.settings.llmConfigs.push(config);
                        await this.plugin.saveSettings();

                        // Re-initialize LLM manager
                        await this.plugin.llmManager.initialize();

                        new Notice(`Provider "${config.name}" added successfully`);
                        this.display();
                    }).open();
                }));

        // List existing providers
        if (this.plugin.settings.llmConfigs.length === 0) {
            const emptyDiv = containerEl.createDiv({ cls: 'message' });
            emptyDiv.style.padding = '20px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.marginBottom = '20px';
            emptyDiv.setText('No LLM providers configured yet.');
        } else {
            this.plugin.settings.llmConfigs.forEach((config, index) => {
                this.displayLLMProviderCard(containerEl, config, index);
            });
        }
    }

    /**
     * Display individual LLM provider card
     */
    private displayLLMProviderCard(containerEl: HTMLElement, config: LLMProviderConfig, index: number): void {
        const card = containerEl.createDiv({ cls: 'llm-provider-card' });
        card.style.padding = '15px';
        card.style.marginBottom = '15px';
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.borderRadius = '8px';
        card.style.backgroundColor = (config.enabled ?? false)
            ? 'var(--background-secondary)'
            : 'var(--background-primary)';

        // Header row
        const headerRow = card.createDiv();
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '10px';

        const titleDiv = headerRow.createDiv();
        const title = titleDiv.createEl('h3', { text: config.name });
        title.style.margin = '0';
        title.style.fontSize = '1.1em';

        const statusBadge = headerRow.createSpan({
            text: (config.enabled ?? false) ? '✓ Enabled' : '○ Disabled'
        });
        statusBadge.style.padding = '4px 12px';
        statusBadge.style.borderRadius = '12px';
        statusBadge.style.fontSize = '0.85em';
        statusBadge.style.backgroundColor = (config.enabled ?? false)
            ? 'rgba(40, 167, 69, 0.2)'
            : 'rgba(108, 117, 125, 0.2)';
        statusBadge.style.color = (config.enabled ?? false) ? '#28a745' : '#6c757d';

        // Details
        const detailsDiv = card.createDiv();
        detailsDiv.style.fontSize = '0.9em';
        detailsDiv.style.marginBottom = '10px';
        detailsDiv.innerHTML = `
            <strong>Provider:</strong> ${config.provider}<br>
            <strong>Model:</strong> ${config.model}<br>
            <strong>Temperature:</strong> ${config.temperature}<br>
            <strong>Max Tokens:</strong> ${config.maxTokens}
        `;

        // Actions
        const actionsDiv = card.createDiv();
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '8px';

        new Setting(actionsDiv)
            .addButton(btn => btn
                .setButtonText('Edit')
                .onClick(() => {
                    new LLMConfigModal(this.app, this.plugin, config, async (updatedConfig) => {
                        this.plugin.settings.llmConfigs[index] = updatedConfig;
                        await this.plugin.saveSettings();
                        await this.plugin.llmManager.initialize();
                        new Notice(`Provider "${updatedConfig.name}" updated`);
                        this.display();
                    }).open();
                }))
            .addButton(btn => btn
                .setButtonText((config.enabled ?? false) ? 'Disable' : 'Enable')
                .onClick(async () => {
                    config.enabled = !(config.enabled ?? false);
                    await this.plugin.saveSettings();
                    await this.plugin.llmManager.initialize();
                    new Notice(`Provider ${config.enabled ? 'enabled' : 'disabled'}`);
                    this.display();
                }))
            .addButton(btn => btn
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                    if (confirm(`Delete provider "${config.name}"?`)) {
                        this.plugin.settings.llmConfigs.splice(index, 1);
                        await this.plugin.saveSettings();
                        await this.plugin.llmManager.initialize();
                        new Notice(`Provider "${config.name}" deleted`);
                        this.display();
                    }
                }));
    }

    /**
     * Display RAG Configuration Section
     */
    private displayRAGSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '📚 RAG Configuration' });

        const desc = containerEl.createEl('p', {
            text: 'Configure Retrieval Augmented Generation settings.',
            cls: 'setting-item-description'
        });
        desc.style.marginBottom = '20px';

        // Show stats
        const stats = this.plugin.retriever.getStats();
        const statsDiv = containerEl.createDiv({ cls: 'message' });
        statsDiv.style.marginBottom = '15px';
        statsDiv.style.padding = '15px';
        statsDiv.innerHTML = `
            <strong>📊 Current Status:</strong><br>
            Total Chunks: ${stats?.totalChunks || 0}<br>
            Embedding Model: ${stats?.embeddingModel || 'N/A'}<br>
            Dimension: ${stats?.dimension || 0}
        `;

        // Vector DB path
        new Setting(containerEl)
            .setName('Vector Database Path')
            .setDesc('Path to store the vector database index')
            .addText(text => text
                .setPlaceholder('vector-store-index.json')
                .setValue(this.plugin.settings.vectorDbPath || '')
                .onChange(async (value) => {
                    this.plugin.settings.vectorDbPath = value;
                    await this.plugin.saveSettings();
                }));

        // Ingestion controls
        new Setting(containerEl)
            .setName('Ingest Chunks')
            .setDesc('Ingest or re-ingest RAG chunks from the handbook directory')
            .addButton(btn => btn
                .setButtonText('Ingest Chunks')
                .setCta()
                .onClick(async () => {
                    if (!this.plugin.retriever.isReady()) {
                        new Notice('RAG system not ready. Configure an OpenAI provider first.');
                        return;
                    }

                    try {
                        await this.plugin.retriever.ingestChunks();
                        this.display();
                    } catch (error: any) {
                        new Notice(`Ingestion failed: ${error.message}`);
                    }
                }))
            .addButton(btn => btn
                .setButtonText('Clear Index')
                .setWarning()
                .onClick(async () => {
                    if (confirm('Clear all ingested chunks? You will need to re-ingest.')) {
                        await this.plugin.retriever.clearIndex();
                        new Notice('✓ Index cleared');
                        this.display();
                    }
                }));
    }

    /**
     * Display Agents Section
     */
    private displayAgentsSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🎯 AI Agents' });

        const desc = containerEl.createEl('p', {
            text: 'Create and manage specialized AI agents for different risk management tasks.',
            cls: 'setting-item-description'
        });
        desc.style.marginBottom = '20px';

        // Show agent stats
        if (this.plugin.agentManager) {
            const stats = this.plugin.agentManager.getStats();
            const statusDiv = containerEl.createDiv({ cls: 'message' });
            statusDiv.style.marginBottom = '15px';
            statusDiv.style.padding = '10px';
            statusDiv.innerHTML = `📊 Status: ${stats.initializedAgents}/${stats.enabledAgents} agents initialized`;
        }

        // Add agent button
        new Setting(containerEl)
            .setName('Create Agent')
            .setDesc('Create a new AI agent')
            .addButton(btn => btn
                .setButtonText('Create Agent')
                .setCta()
                .onClick(() => {
                    new AgentBuilderModal(
                        this.app,
                        this.plugin,
                        null,
                        async (config) => {
                            await this.plugin.agentManager.addAgent(config);
                            new Notice(`Agent "${config.name}" created successfully`);
                            this.display();
                        }
                    ).open();
                }));

        // List existing agents
        if (this.plugin.settings.agents.length === 0) {
            const emptyDiv = containerEl.createDiv({ cls: 'message' });
            emptyDiv.style.padding = '20px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.marginBottom = '20px';
            emptyDiv.setText('No agents configured yet. Click "Create Agent" to get started.');
        } else {
            this.plugin.settings.agents.forEach((config, index) => {
                this.displayAgentCard(containerEl, config, index);
            });
        }
    }

    /**
     * Display individual agent card
     */
    private displayAgentCard(containerEl: HTMLElement, config: AgentConfig, index: number): void {
        const card = containerEl.createDiv({ cls: 'agent-card' });
        card.style.padding = '15px';
        card.style.marginBottom = '15px';
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.borderRadius = '8px';
        card.style.backgroundColor = config.enabled
            ? 'var(--background-secondary)'
            : 'var(--background-primary)';

        // Header row
        const headerRow = card.createDiv();
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '10px';

        const titleDiv = headerRow.createDiv();
        const title = titleDiv.createEl('h3', { text: config.name });
        title.style.margin = '0';
        title.style.fontSize = '1.1em';

        const statusBadge = headerRow.createSpan({
            text: config.enabled ? '✓ Enabled' : '○ Disabled'
        });
        statusBadge.style.padding = '4px 12px';
        statusBadge.style.borderRadius = '12px';
        statusBadge.style.fontSize = '0.85em';
        statusBadge.style.backgroundColor = config.enabled
            ? 'rgba(40, 167, 69, 0.2)'
            : 'rgba(108, 117, 125, 0.2)';
        statusBadge.style.color = config.enabled ? '#28a745' : '#6c757d';

        // Description
        const descDiv = card.createDiv();
        descDiv.style.fontSize = '0.9em';
        descDiv.style.marginBottom = '10px';
        descDiv.style.opacity = '0.8';
        descDiv.textContent = config.description;

        // Details
        const llmConfig = this.plugin.settings.llmConfigs.find(c => c.id === config.llmId);
        const detailsDiv = card.createDiv();
        detailsDiv.style.fontSize = '0.85em';
        detailsDiv.style.marginBottom = '10px';
        detailsDiv.innerHTML = `
            <strong>LLM:</strong> ${llmConfig?.name || 'Unknown'}<br>
            <strong>Retrieval:</strong> Top ${config.retrievalSettings.topK} chunks (threshold: ${config.retrievalSettings.scoreThreshold})
        `;

        // Actions
        const actionsDiv = card.createDiv();
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '8px';

        new Setting(actionsDiv)
            .addButton(btn => btn
                .setButtonText('Edit')
                .onClick(() => {
                    new AgentBuilderModal(
                        this.app,
                        this.plugin,
                        config,
                        async (updatedConfig) => {
                            await this.plugin.agentManager.updateAgent(config.id, updatedConfig);
                            new Notice(`Agent "${updatedConfig.name}" updated`);
                            this.display();
                        }
                    ).open();
                }))
            .addButton(btn => btn
                .setButtonText(config.enabled ? 'Disable' : 'Enable')
                .onClick(async () => {
                    config.enabled = !config.enabled;
                    await this.plugin.saveSettings();
                    await this.plugin.agentManager.initialize();
                    new Notice(`Agent ${config.enabled ? 'enabled' : 'disabled'}`);
                    this.display();
                }))
            .addButton(btn => btn
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                    if (confirm(`Delete agent "${config.name}"?`)) {
                        await this.plugin.agentManager.deleteAgent(config.id);
                        new Notice(`Agent "${config.name}" deleted`);
                        this.display();
                    }
                }));
    }
}

/**
 * Modal for LLM provider configuration
 */
class LLMConfigModal extends Modal {
    private plugin: RiskManagementPlugin;
    private config: LLMProviderConfig | null;
    private onSave: (config: LLMProviderConfig) => void;

    constructor(
        app: App,
        plugin: RiskManagementPlugin,
        config: LLMProviderConfig | null,
        onSave: (config: LLMProviderConfig) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.config = config;
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: this.config ? 'Edit LLM Provider' : 'Add LLM Provider' });

        // Form fields
        let name = this.config?.name || '';
        let provider = this.config?.provider || LLMProvider.OPENAI;
        let model = this.config?.model || '';
        let apiKey = '';
        let temperature = this.config?.temperature || 0.7;
        let maxTokens = this.config?.maxTokens || 4096;

        new Setting(contentEl)
            .setName('Provider Name')
            .addText(text => text
                .setPlaceholder('My OpenAI Provider')
                .setValue(name)
                .onChange(v => name = v));

        new Setting(contentEl)
            .setName('Provider Type')
            .addDropdown(dropdown => {
                dropdown.addOption(LLMProvider.OPENAI, 'OpenAI');
                dropdown.addOption(LLMProvider.ANTHROPIC, 'Anthropic');
                dropdown.setValue(provider);
                dropdown.onChange(v => provider = v as LLMProvider);
            });

        new Setting(contentEl)
            .setName('Model')
            .addText(text => text
                .setPlaceholder('gpt-4')
                .setValue(model)
                .onChange(v => model = v));

        new Setting(contentEl)
            .setName('API Key')
            .setDesc(this.config ? 'Leave blank to keep existing key' : 'Enter your API key')
            .addText(text => {
                text.setPlaceholder('sk-...')
                    .onChange(v => apiKey = v);
                text.inputEl.type = 'password';
            });

        new Setting(contentEl)
            .setName('Temperature')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(temperature)
                .setDynamicTooltip()
                .onChange(v => temperature = v));

        new Setting(contentEl)
            .setName('Max Tokens')
            .addText(text => text
                .setPlaceholder('4096')
                .setValue(String(maxTokens))
                .onChange(v => maxTokens = parseInt(v) || 4096));

        // Buttons
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    if (!name || !provider || !model) {
                        new Notice('Please fill in all required fields');
                        return;
                    }

                    if (!this.config && !apiKey) {
                        new Notice('API key is required');
                        return;
                    }

                    try {
                        let encryptedApiKey = this.config?.encryptedApiKey;

                        if (apiKey) {
                            const encrypted = this.plugin.keyManager.encrypt(apiKey);
                            encryptedApiKey = JSON.stringify(encrypted);
                        }

                        const now = Date.now();
                        const newConfig: LLMProviderConfig = {
                            id: this.config?.id || this.plugin.generateId(),
                            name,
                            provider: provider as 'openai' | 'anthropic' | 'ollama',
                            model,
                            encryptedApiKey: encryptedApiKey!,
                            temperature,
                            maxTokens,
                            enabled: this.config?.enabled ?? true,
                            createdAt: this.config?.createdAt || now,
                            updatedAt: now
                        };

                        this.onSave(newConfig);
                        this.close();
                    } catch (error: any) {
                        new Notice(`Error: ${error.message}`);
                    }
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
