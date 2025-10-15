/**
 * Settings Tab
 *
 * Complete settings UI with initialization controls
 */

import { App, PluginSettingTab, Setting, Notice, TextComponent, DropdownComponent } from 'obsidian';
import RiskManagementPlugin from '../main';
import { LLMConfig } from '../types';
import { LLMProvider } from '../constants';
import { AgentBuilderModal } from './agentBuilderModal';
import { createAgentCard } from './components';
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

        // ========== NEW: System Status Section (FIRST!) ==========
        this.displaySystemStatus(containerEl);

        // ========== Security Section ==========
        this.displaySecuritySection(containerEl);

        // ========== Only show other sections if password verified ==========
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
        const section = containerEl.createEl('div', { cls: 'system-status-section' });
        section.style.marginBottom = '30px';
        section.style.padding = '20px';
        section.style.backgroundColor = 'var(--background-secondary)';
        section.style.borderRadius = '8px';
        section.style.border = '2px solid var(--background-modifier-border)';

        // Header
        const header = section.createEl('h2', { text: '🎛️ System Status' });
        header.style.marginTop = '0';
        header.style.marginBottom = '15px';

        // Get initialization manager (create if doesn't exist)
        if (!this.plugin.initManager) {
            this.plugin.initManager = new InitializationManager(this.plugin);
        }

        const status = this.plugin.initManager.getStatus();
        const requirements = this.plugin.initManager.getRequirements();

        // Overall Status Badge
        const overallStatus = section.createDiv({ cls: 'overall-status' });
        overallStatus.style.marginBottom = '20px';
        overallStatus.style.padding = '15px';
        overallStatus.style.borderRadius = '6px';
        overallStatus.style.textAlign = 'center';
        overallStatus.style.fontSize = '1.1em';
        overallStatus.style.fontWeight = 'bold';

        if (status.overall) {
            overallStatus.style.backgroundColor = 'var(--interactive-success)';
            overallStatus.style.color = 'white';
            overallStatus.innerHTML = '✅ All Systems Operational';
        } else if (this.plugin.initManager.isInitializing()) {
            overallStatus.style.backgroundColor = 'var(--background-modifier-border)';
            overallStatus.style.color = 'var(--text-normal)';
            overallStatus.innerHTML = '⏳ Initializing...';
        } else {
            overallStatus.style.backgroundColor = 'var(--background-modifier-error)';
            overallStatus.style.color = 'white';
            overallStatus.innerHTML = '⚠️ System Initialization Required';
        }

        // Component Status Grid
        const statusGrid = section.createDiv({ cls: 'status-grid' });
        statusGrid.style.display = 'grid';
        statusGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        statusGrid.style.gap = '10px';
        statusGrid.style.marginBottom = '20px';

        // Status components
        const components = [
            { name: 'Security', key: 'keyManager', icon: '🔐' },
            { name: 'RAG System', key: 'retriever', icon: '📚' },
            { name: 'LLM Providers', key: 'llmManager', icon: '🤖' },
            { name: 'Agent System', key: 'agentManager', icon: '👔' }
        ];

        components.forEach(component => {
            const card = statusGrid.createDiv({ cls: 'status-card' });
            card.style.padding = '12px';
            card.style.borderRadius = '6px';
            card.style.border = '1px solid var(--background-modifier-border)';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.gap = '10px';

            const isReady = status[component.key as keyof typeof status];

            if (isReady) {
                card.style.backgroundColor = 'var(--background-secondary-alt)';
            } else {
                card.style.backgroundColor = 'var(--background-primary)';
                card.style.opacity = '0.7';
            }

            const icon = card.createSpan({ text: component.icon });
            icon.style.fontSize = '24px';

            const info = card.createDiv();
            const name = info.createDiv({ text: component.name });
            name.style.fontWeight = '500';
            name.style.marginBottom = '3px';

            const statusText = info.createDiv({
                text: isReady ? 'Ready' : 'Not Ready'
            });
            statusText.style.fontSize = '0.85em';
            statusText.style.color = isReady ? 'var(--text-success)' : 'var(--text-muted)';
        });

        // Requirements Checklist
        const reqSection = section.createDiv({ cls: 'requirements-section' });
        reqSection.style.marginBottom = '20px';

        const reqHeader = reqSection.createEl('h3', { text: 'Setup Requirements' });
        reqHeader.style.fontSize = '1em';
        reqHeader.style.marginBottom = '10px';

        const reqList = reqSection.createEl('ul');
        reqList.style.listStyle = 'none';
        reqList.style.padding = '0';
        reqList.style.margin = '0';

        requirements.forEach(req => {
            const item = reqList.createEl('li');
            item.style.padding = '8px 0';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '10px';

            const checkbox = item.createSpan({ text: req.met ? '✅' : '⬜' });
            checkbox.style.fontSize = '16px';

            const text = item.createDiv();
            text.style.flex = '1';

            const reqName = text.createSpan({ text: req.requirement });
            reqName.style.fontWeight = '500';
            reqName.style.marginRight = '10px';

            const reqMessage = text.createSpan({ text: req.message });
            reqMessage.style.fontSize = '0.85em';
            reqMessage.style.color = 'var(--text-muted)';
        });

        // Action Buttons
        const actions = section.createDiv({ cls: 'initialization-actions' });
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.flexWrap = 'wrap';
        actions.style.marginBottom = '15px';

        // Initialize All Button
        new Setting(actions)
            .addButton(btn => btn
                .setButtonText(status.overall ? 'Re-Initialize All' : 'Initialize All Systems')
                .setCta()
                .setDisabled(this.plugin.initManager.isInitializing())
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Initializing...');

                    const result = await this.plugin.initManager.initializeAll(status.overall);

                    if (result.success) {
                        new Notice('✅ Systems initialized successfully!');
                    } else {
                        new Notice(`❌ Initialization failed: ${result.errors.join(', ')}`);
                    }

                    // Refresh display
                    this.display();
                }));

        // Initialize Missing Button
        if (!status.overall) {
            new Setting(actions)
                .addButton(btn => btn
                    .setButtonText('Initialize Missing')
                    .setDisabled(this.plugin.initManager.isInitializing())
                    .onClick(async () => {
                        btn.setDisabled(true);
                        btn.setButtonText('Initializing...');

                        const result = await this.plugin.initManager.initializeMissing();

                        if (result.success) {
                            new Notice('✅ Missing components initialized!');
                        } else if (result.warnings.length > 0) {
                            new Notice(`⚠️ ${result.warnings.join(', ')}`, 5000);
                        }

                        // Refresh display
                        this.display();
                    }));
        }

        // Test All Button
        new Setting(actions)
            .addButton(btn => btn
                .setButtonText('Test All Systems')
                .setDisabled(!status.overall)
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Testing...');

                    try {
                        const results = [];

                        // Test RAG
                        if (this.plugin.retriever?.isReady()) {
                            const ragTest = await this.plugin.retriever.test();
                            results.push(`RAG: ${ragTest ? '✓' : '✗'}`);
                        }

                        // Test LLM
                        if (this.plugin.llmManager?.isReady()) {
                            const llmTests = await this.plugin.llmManager.testAllProviders();
                            const passed = Array.from(llmTests.values()).filter(v => v).length;
                            results.push(`LLM: ${passed}/${llmTests.size} providers`);
                        }

                        // Test Agents
                        if (this.plugin.agentManager?.isReady()) {
                            const agentTests = await this.plugin.agentManager.testAllAgents();
                            const passed = Array.from(agentTests.values()).filter(v => v).length;
                            results.push(`Agents: ${passed}/${agentTests.size}`);
                        }

                        new Notice(`Test Results:\n${results.join('\n')}`, 8000);

                    } catch (error: any) {
                        new Notice(`Test failed: ${error.message}`);
                    } finally {
                        btn.setDisabled(false);
                        btn.setButtonText('Test All Systems');
                    }
                }));

        // Refresh Status Button
        new Setting(actions)
            .addButton(btn => btn
                .setButtonText('Refresh Status')
                .onClick(() => {
                    this.display();
                    new Notice('Status refreshed');
                }));

        // Details Section (collapsible)
        if (!status.overall) {
            const details = section.createDiv({ cls: 'initialization-details' });
            details.style.marginTop = '20px';
            details.style.padding = '15px';
            details.style.backgroundColor = 'var(--background-primary)';
            details.style.borderRadius = '6px';
            details.style.fontSize = '0.9em';

            const detailsHeader = details.createEl('h4', { text: '📋 Next Steps' });
            detailsHeader.style.marginTop = '0';
            detailsHeader.style.marginBottom = '10px';

            const missingPrereqs = this.plugin.initManager.getMissingPrerequisites();

            if (missingPrereqs.length > 0) {
                details.createDiv({
                    text: 'Complete these requirements to enable all features:',
                    cls: 'details-text'
                });

                const steps = details.createEl('ol');
                steps.style.marginLeft = '20px';

                missingPrereqs.forEach(prereq => {
                    const step = steps.createEl('li');
                    step.style.marginBottom = '8px';

                    switch (prereq) {
                        case 'Master Password':
                            step.innerHTML = '<strong>Set Master Password:</strong> Scroll down to Security section';
                            break;
                        case 'OpenAI API Key':
                            step.innerHTML = '<strong>Add OpenAI Provider:</strong> Required for embeddings (RAG system)';
                            break;
                        case 'LLM Provider':
                            step.innerHTML = '<strong>Configure LLM Provider:</strong> Add Anthropic or OpenAI provider';
                            break;
                        case 'RAG Chunks':
                            step.innerHTML = '<strong>Ingest Chunks:</strong> Scroll to RAG Configuration section and click "Ingest Chunks"';
                            break;
                        case 'Agent Configuration':
                            step.innerHTML = '<strong>Create Agent:</strong> Scroll to Agents section and click "Create Agent"';
                            break;
                    }
                });
            } else {
                details.createDiv({
                    text: 'All requirements met! Click "Initialize All Systems" above.',
                    cls: 'details-text'
                });
            }
        }
    }

    /**
     * Display Security Section (Master Password)
     */
    private displaySecuritySection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🔐 Security' });

        const desc = containerEl.createEl('p', {
            text: 'Set a master password to encrypt your API keys. This password is stored in memory only and never saved to disk.',
            cls: 'setting-item-description'
        });
        desc.style.marginBottom = '20px';

        // Check if master password is set
        const hasPassword = this.plugin.keyManager.hasMasterPassword();

        if (!hasPassword) {
            // Prompt to set master password
            const warningDiv = containerEl.createDiv({ cls: 'message warning' });
            warningDiv.style.padding = '15px';
            warningDiv.style.marginBottom = '20px';
            warningDiv.style.backgroundColor = 'var(--background-modifier-error)';
            warningDiv.style.borderRadius = '6px';
            warningDiv.innerHTML = '⚠️ <strong>Master password not set.</strong> Set a password below to enable encryption and access other features.';

            let passwordInput: TextComponent;
            let confirmInput: TextComponent;

            new Setting(containerEl)
                .setName('Master Password')
                .setDesc('Enter a strong password to encrypt your API keys')
                .addText(text => {
                    passwordInput = text;
                    text.setPlaceholder('Enter master password');
                    text.inputEl.type = 'password';
                    text.inputEl.style.width = '100%';
                });

            new Setting(containerEl)
                .setName('Confirm Password')
                .setDesc('Re-enter your password')
                .addText(text => {
                    confirmInput = text;
                    text.setPlaceholder('Confirm password');
                    text.inputEl.type = 'password';
                    text.inputEl.style.width = '100%';
                });

            new Setting(containerEl)
                .addButton(btn => btn
                    .setButtonText('Set Master Password')
                    .setCta()
                    .onClick(async () => {
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

                        // Set the master password
                        this.plugin.keyManager.setMasterPassword(password);
                        this.plugin.settings.lastPasswordChangeDate = Date.now();
                        await this.plugin.saveSettings();

                        new Notice('✓ Master password set successfully!');
                        this.passwordVerified = true;
                        this.display();
                    }));

        } else {
            // Master password is set - show verification
            if (!this.passwordVerified) {
                const infoDiv = containerEl.createDiv({ cls: 'message info' });
                infoDiv.style.padding = '15px';
                infoDiv.style.marginBottom = '20px';
                infoDiv.style.backgroundColor = 'var(--background-secondary)';
                infoDiv.style.borderRadius = '6px';
                infoDiv.innerHTML = '🔒 Master password is set. Enter it below to access configuration.';

                let passwordInput: TextComponent;

                new Setting(containerEl)
                    .setName('Enter Master Password')
                    .setDesc('Verify your master password to continue')
                    .addText(text => {
                        passwordInput = text;
                        text.setPlaceholder('Enter password');
                        text.inputEl.type = 'password';
                        text.inputEl.style.width = '100%';
                    });

                new Setting(containerEl)
                    .addButton(btn => btn
                        .setButtonText('Verify Password')
                        .setCta()
                        .onClick(() => {
                            const password = passwordInput.getValue();

                            if (!password) {
                                new Notice('Please enter your password');
                                return;
                            }

                            // Set the password (this will be used for decryption)
                            this.plugin.keyManager.setMasterPassword(password);

                            // Test if it works by trying to decrypt something
                            const testConfig = this.plugin.settings.llmConfigs[0];
                            if (testConfig) {
                                try {
                                    this.plugin.keyManager.decryptApiKey(testConfig.encryptedApiKey);
                                    new Notice('✓ Password verified!');
                                    this.passwordVerified = true;
                                    this.display();
                                } catch (error) {
                                    new Notice('✗ Incorrect password');
                                    this.plugin.keyManager.clearMasterPassword();
                                }
                            } else {
                                // No configs to test with, just accept it
                                new Notice('✓ Password accepted!');
                                this.passwordVerified = true;
                                this.display();
                            }
                        }));

            } else {
                // Password verified - show options
                const successDiv = containerEl.createDiv({ cls: 'message success' });
                successDiv.style.padding = '15px';
                successDiv.style.marginBottom = '20px';
                successDiv.style.backgroundColor = 'var(--interactive-success)';
                successDiv.style.color = 'white';
                successDiv.style.borderRadius = '6px';
                successDiv.innerHTML = '✓ Master password verified. Configuration sections unlocked.';

                new Setting(containerEl)
                    .setName('Change Master Password')
                    .setDesc('Set a new master password (will re-encrypt all API keys)')
                    .addButton(btn => btn
                        .setButtonText('Change Password')
                        .onClick(() => {
                            this.showChangePasswordModal();
                        }));

                new Setting(containerEl)
                    .setName('Lock Settings')
                    .setDesc('Clear password from memory')
                    .addButton(btn => btn
                        .setButtonText('Lock')
                        .onClick(() => {
                            this.plugin.keyManager.clearMasterPassword();
                            this.passwordVerified = false;
                            this.display();
                            new Notice('Settings locked');
                        }));
            }
        }
    }

    /**
     * Display LLM Providers Section
     */
    private displayLLMSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🤖 LLM Providers' });

        const desc = containerEl.createEl('p', {
            text: 'Configure language model providers for agent responses. At least one provider is required.',
            cls: 'setting-item-description'
        });
        desc.style.marginBottom = '20px';

        // Show LLM status
        if (this.plugin.llmManager) {
            const stats = this.plugin.llmManager.getStats();
            const statusDiv = containerEl.createDiv({ cls: 'message' });
            statusDiv.style.marginBottom = '15px';
            statusDiv.style.padding = '10px';
            statusDiv.innerHTML = `📊 Status: ${stats.initializedProviders}/${stats.enabledProviders} providers ready`;
        }

        // List existing providers
        if (this.plugin.settings.llmConfigs.length === 0) {
            const emptyDiv = containerEl.createDiv({ cls: 'message' });
            emptyDiv.style.padding = '20px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.marginBottom = '20px';
            emptyDiv.setText('No LLM providers configured yet. Add one below to get started.');
        } else {
            this.plugin.settings.llmConfigs.forEach((config, index) => {
                this.displayLLMConfigCard(containerEl, config, index);
            });
        }

        // Add provider button
        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add LLM Provider')
                .setCta()
                .onClick(() => {
                    this.showAddLLMModal();
                }));
    }

    /**
     * Display individual LLM config card
     */
    private displayLLMConfigCard(containerEl: HTMLElement, config: LLMConfig, index: number): void {
        const card = containerEl.createDiv({ cls: 'llm-config-card' });
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.borderRadius = '8px';
        card.style.padding = '15px';
        card.style.marginBottom = '15px';

        // Header
        const header = card.createDiv();
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '10px';

        const title = header.createEl('h3', { text: config.name });
        title.style.margin = '0';

        const badge = header.createSpan({
            text: config.enabled ? 'Enabled' : 'Disabled',
            cls: config.enabled ? 'status-badge enabled' : 'status-badge disabled'
        });
        badge.style.padding = '4px 8px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '0.85em';
        badge.style.backgroundColor = config.enabled ? 'var(--interactive-success)' : 'var(--background-modifier-error)';
        badge.style.color = 'white';

        // Info
        const info = card.createDiv();
        info.style.fontSize = '0.9em';
        info.style.color = 'var(--text-muted)';
        info.style.marginBottom = '15px';
        info.innerHTML = `
            <strong>Provider:</strong> ${config.provider}<br>
            <strong>Model:</strong> ${config.model}<br>
            <strong>Temperature:</strong> ${config.temperature}
        `;

        // Actions
        const actions = card.createDiv();
        actions.style.display = 'flex';
        actions.style.gap = '8px';

        new Setting(actions)
            .addButton(btn => btn
                .setButtonText('Test')
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Testing...');

                    try {
                        const success = await this.plugin.llmManager.testProvider(config.id);
                        new Notice(success ? `✓ ${config.name} working` : `✗ ${config.name} failed`);
                    } finally {
                        btn.setDisabled(false);
                        btn.setButtonText('Test');
                    }
                }))
            .addButton(btn => btn
                .setButtonText(config.enabled ? 'Disable' : 'Enable')
                .onClick(async () => {
                    config.enabled = !config.enabled;
                    await this.plugin.saveSettings();
                    this.display();
                }))
            .addButton(btn => btn
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                    if (confirm(`Delete provider "${config.name}"?`)) {
                        this.plugin.settings.llmConfigs.splice(index, 1);
                        await this.plugin.saveSettings();
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
            text: 'Configure the Retrieval-Augmented Generation system for knowledge retrieval.',
            cls: 'setting-item-description'
        });
        desc.style.marginBottom = '20px';

        // Show RAG stats
        if (this.plugin.retriever) {
            const stats = this.plugin.retriever.getStats();
            if (stats) {
                const statusDiv = containerEl.createDiv({ cls: 'message' });
                statusDiv.style.marginBottom = '15px';
                statusDiv.style.padding = '10px';
                statusDiv.innerHTML = `
                    📊 Status: ${stats.totalChunks} chunks indexed | 
                    Model: ${stats.embeddingModel} | 
                    Memory: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB
                `;
            }
        }

        // Ingest chunks button
        new Setting(containerEl)
            .setName('Ingest Knowledge Base')
            .setDesc('Load and index chunks from the data/rag_chunks directory')
            .addButton(btn => btn
                .setButtonText('Ingest Chunks')
                .setCta()
                .onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText('Ingesting...');

                    try {
                        await this.plugin.retriever.ingestChunks();
                        new Notice('✓ Chunks ingested successfully!');
                        this.display();
                    } catch (error: any) {
                        new Notice(`✗ Ingestion failed: ${error.message}`);
                    } finally {
                        btn.setDisabled(false);
                        btn.setButtonText('Ingest Chunks');
                    }
                }));

        // Clear index button
        new Setting(containerEl)
            .setName('Clear Vector Index')
            .setDesc('Remove all indexed chunks (requires re-ingestion)')
            .addButton(btn => btn
                .setButtonText('Clear Index')
                .setWarning()
                .onClick(async () => {
                    if (confirm('Clear all indexed chunks? You will need to re-ingest.')) {
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
        containerEl.createEl('h2', { text: '🤖 AI Agents' });

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

        // List existing agents
        if (this.plugin.settings.agents.length === 0) {
            const emptyDiv = containerEl.createDiv({ cls: 'message' });
            emptyDiv.style.padding = '20px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.marginBottom = '20px';
            emptyDiv.setText('No agents configured yet. Click "Create Agent" to get started.');
        } else {
            this.plugin.settings.agents.forEach(config => {
                createAgentCard(containerEl, config, {
                    onEdit: () => {
                        new AgentBuilderModal(this.app, this.plugin, config, async (updated) => {
                            await this.plugin.agentManager.updateAgent(config.id, updated);
                            this.display();
                        }).open();
                    },
                    onTest: async () => {
                        try {
                            await this.plugin.agentManager.testAgent(config.id);
                            new Notice(`✓ ${config.name} test passed`);
                        } catch (error: any) {
                            new Notice(`✗ Test failed: ${error.message}`);
                        }
                    },
                    onToggle: async (enabled) => {
                        await this.plugin.agentManager.toggleAgent(config.id, enabled);
                        this.display();
                    },
                    onDelete: async () => {
                        if (confirm(`Delete agent "${config.name}"?`)) {
                            await this.plugin.agentManager.deleteAgent(config.id);
                            this.display();
                        }
                    }
                });
            });
        }

        // Create agent button
        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Create Agent')
                .setCta()
                .onClick(() => {
                    new AgentBuilderModal(this.app, this.plugin, null, async (config) => {
                        await this.plugin.agentManager.addAgent(config);
                        this.display();
                    }).open();
                }));
    }

    /**
     * Show modal to add LLM provider
     */
    private showAddLLMModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Add LLM Provider');

        let nameInput: TextComponent;
        let providerSelect: DropdownComponent;
        let apiKeyInput: TextComponent;
        let modelInput: TextComponent;

        new Setting(modal.contentEl)
            .setName('Provider Name')
            .setDesc('A friendly name for this provider')
            .addText(text => {
                nameInput = text;
                text.setPlaceholder('My Claude API');
                text.inputEl.style.width = '100%';
            });

        new Setting(modal.contentEl)
            .setName('Provider Type')
            .setDesc('Select the LLM provider')
            .addDropdown(dropdown => {
                providerSelect = dropdown;
                dropdown.addOption(LLMProvider.ANTHROPIC, 'Anthropic (Claude)');
                dropdown.addOption(LLMProvider.OPENAI, 'OpenAI (GPT)');
            });

        new Setting(modal.contentEl)
            .setName('API Key')
            .setDesc('Your API key (will be encrypted)')
            .addText(text => {
                apiKeyInput = text;
                text.setPlaceholder('sk-...');
                text.inputEl.type = 'password';
                text.inputEl.style.width = '100%';
            });

        new Setting(modal.contentEl)
            .setName('Model')
            .setDesc('Model identifier (e.g., claude-sonnet-4-5-20250929)')
            .addText(text => {
                modelInput = text;
                text.setPlaceholder('claude-sonnet-4-5-20250929');
                text.inputEl.style.width = '100%';
            });

        new Setting(modal.contentEl)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => modal.close()))
            .addButton(btn => btn
                .setButtonText('Add Provider')
                .setCta()
                .onClick(async () => {
                    const name = nameInput.getValue();
                    const provider = providerSelect.getValue() as LLMProvider;
                    const apiKey = apiKeyInput.getValue();
                    const model = modelInput.getValue();

                    if (!name || !apiKey || !model) {
                        new Notice('Please fill all fields');
                        return;
                    }

                    // Encrypt API key
                    const encryptedKey = this.plugin.keyManager.encryptApiKey(apiKey);

                    // Create config
                    const config: LLMConfig = {
                        id: this.plugin.generateId(),
                        name,
                        provider,
                        encryptedApiKey: encryptedKey,
                        model,
                        temperature: 0.7,
                        maxTokens: 4096,
                        enabled: true,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };

                    this.plugin.settings.llmConfigs.push(config);
                    await this.plugin.saveSettings();

                    new Notice(`✓ Provider "${name}" added`);
                    modal.close();
                    this.display();
                }));

        modal.open();
    }

    /**
     * Show modal to change master password
     */
    private showChangePasswordModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Change Master Password');

        let currentInput: TextComponent;
        let newInput: TextComponent;
        let confirmInput: TextComponent;

        new Setting(modal.contentEl)
            .setName('Current Password')
            .addText(text => {
                currentInput = text;
                text.inputEl.type = 'password';
                text.inputEl.style.width = '100%';
            });

        new Setting(modal.contentEl)
            .setName('New Password')
            .addText(text => {
                newInput = text;
                text.inputEl.type = 'password';
                text.inputEl.style.width = '100%';
            });

        new Setting(modal.contentEl)
            .setName('Confirm New Password')
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
                .setButtonText('Change Password')
                .setCta()
                .onClick(async () => {
                    const current = currentInput.getValue();
                    const newPass = newInput.getValue();
                    const confirm = confirmInput.getValue();

                    // Validate
                    if (newPass.length < 8) {
                        new Notice('New password must be at least 8 characters');
                        return;
                    }

                    if (newPass !== confirm) {
                        new Notice('Passwords do not match');
                        return;
                    }

                    // Re-encrypt all API keys
                    try {
                        // Decrypt with old password
                        const decryptedKeys = this.plugin.settings.llmConfigs.map(config => ({
                            id: config.id,
                            apiKey: this.plugin.keyManager.decryptApiKey(config.encryptedApiKey)
                        }));

                        // Set new password
                        this.plugin.keyManager.setMasterPassword(newPass);

                        // Re-encrypt with new password
                        decryptedKeys.forEach(({ id, apiKey }) => {
                            const config = this.plugin.settings.llmConfigs.find(c => c.id === id);
                            if (config) {
                                config.encryptedApiKey = this.plugin.keyManager.encryptApiKey(apiKey);
                            }
                        });

                        this.plugin.settings.lastPasswordChangeDate = Date.now();
                        await this.plugin.saveSettings();

                        new Notice('✓ Master password changed successfully');
                        modal.close();
                    } catch (error) {
                        new Notice('✗ Failed to change password. Incorrect current password?');
                    }
                }));

        modal.open();
    }
}
