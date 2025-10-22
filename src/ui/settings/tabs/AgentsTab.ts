/**
 * Agents Tab
 *
 * Manage AI agents and orchestration
 * - Master agent (orchestrator) overview
 * - Specialized agents list
 * - Quick agent creation from templates
 * - Advanced orchestration settings
 */

import { BaseTab } from './BaseTab';
import { Notice } from 'obsidian';
import { AgentBuilderModal } from '../../agentBuilderModal';
import type { AgentConfig } from '../../../types';

export class AgentsTab implements BaseTab {
    constructor(
        private plugin: any,
        private settings: any,
        private saveSettings: () => Promise<void>,
        private updateComponents: () => void,
        private onAgentAction: (action: string, data?: any) => Promise<void>
    ) {}

    render(): string {
        const agents = this.settings.agents || [];
        const masterAgent = agents.find((a: AgentConfig) => a.isMaster || a.id === 'mnemosyne-master');
        const regularAgents = agents.filter((a: AgentConfig) => !a.isMaster && a.id !== 'mnemosyne-master');
        const hasProviders = (this.settings.providers || []).length > 0;

        return `
            <div class="agents-tab">
                <!-- Header Section -->
                <div class="settings-section">
                    <div style="padding: 16px; background: var(--background-secondary); border-radius: 8px; border-left: 4px solid var(--interactive-accent);">
                        <h2 style="margin-top: 0; margin-bottom: 8px;">🤖 AI Agents</h2>
                        <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                            Create specialized AI agents for different tasks, or use the Master Agent to automatically route requests.
                        </p>
                    </div>
                </div>

                ${!hasProviders ? `
                    <!-- No Providers Warning -->
                    <div class="settings-section">
                        <div style="padding: 24px; text-align: center; background: var(--background-modifier-error-hover); border-radius: 8px; border: 2px solid var(--text-error);">
                            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                            <h3 style="margin-bottom: 8px; color: var(--text-error);">No AI Providers Configured</h3>
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: var(--text-muted);">
                                You need to add at least one AI provider before creating agents.
                            </p>
                            <button id="go-to-providers-tab" class="btn btn-primary">
                                Go to LLM Providers Tab
                            </button>
                        </div>
                    </div>
                ` : `
                    <!-- Master Agent Section -->
                    ${masterAgent ? `
                        <div class="settings-section">
                            <div class="settings-card" style="border: 2px solid var(--interactive-accent); background: var(--background-secondary);">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                    <div>
                                        <h3 style="margin: 0 0 8px 0; color: var(--interactive-accent);">🎭 Master Agent (Orchestrator)</h3>
                                        <p style="margin: 0; font-size: 14px; color: var(--text-muted);">
                                            ${masterAgent.description}
                                        </p>
                                    </div>
                                    <span style="padding: 4px 12px; background: var(--interactive-accent); color: white; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap;">
                                        AUTO-ROUTING
                                    </span>
                                </div>

                                <div style="padding: 12px; background: var(--background-primary-alt); border-radius: 6px; margin-top: 12px;">
                                    <p style="margin: 0; font-size: 13px; color: var(--text-muted); font-style: italic;">
                                        💡 The Master Agent automatically routes your requests to the most appropriate specialized agent.
                                        It updates dynamically when you add, remove, or modify agents.
                                    </p>
                                </div>

                                ${regularAgents.length > 0 ? `
                                    <details style="margin-top: 12px;">
                                        <summary style="cursor: pointer; font-size: 13px; color: var(--text-muted); padding: 8px; background: var(--background-modifier-border); border-radius: 4px;">
                                            Available Agents (${regularAgents.length})
                                        </summary>
                                        <ul style="margin: 8px 0 0 0; padding-left: 24px; font-size: 13px;">
                                            ${regularAgents.map((a: AgentConfig) => `
                                                <li style="margin: 4px 0;">${a.name} ${!a.enabled ? '<span style="color: var(--text-faint);">(disabled)</span>' : ''}</li>
                                            `).join('')}
                                        </ul>
                                    </details>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Create Agent Section -->
                    <div class="settings-section">
                        <div class="settings-card">
                            <h3 style="margin-top: 0; margin-bottom: 16px;">Create a New Agent</h3>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 16px;">
                                <!-- From Template -->
                                <button class="agent-creation-btn" data-mode="template" style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-height: 100px; padding: 20px; background: var(--background-primary-alt); border: 2px solid var(--background-modifier-border); border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left;">
                                    <div style="font-size: 24px; margin-bottom: 12px;">📚</div>
                                    <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px; white-space: nowrap;">From Template</div>
                                    <div style="font-size: 13px; color: var(--text-muted); line-height: 1.4;">Choose a pre-configured agent</div>
                                </button>

                                <!-- Custom Agent -->
                                <button class="agent-creation-btn" data-mode="custom" style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-height: 100px; padding: 20px; background: var(--background-primary-alt); border: 2px solid var(--background-modifier-border); border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left;">
                                    <div style="font-size: 24px; margin-bottom: 12px;">✨</div>
                                    <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px; white-space: nowrap;">Custom Agent</div>
                                    <div style="font-size: 13px; color: var(--text-muted); line-height: 1.4;">Build from scratch</div>
                                </button>
                            </div>

                            <style>
                                .agent-creation-btn:hover {
                                    border-color: var(--interactive-accent);
                                    background: var(--background-modifier-hover);
                                    transform: translateY(-2px);
                                }
                            </style>
                        </div>
                    </div>

                    <!-- Agents List -->
                    ${regularAgents.length > 0 ? `
                        <div class="settings-section">
                            <div class="settings-card">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                    <h3 style="margin: 0;">Your Specialized Agents</h3>
                                    <span style="font-size: 13px; color: var(--text-muted);">${regularAgents.length} agent${regularAgents.length > 1 ? 's' : ''}</span>
                                </div>

                                <div class="agents-list" style="display: grid; gap: 12px;">
                                    ${regularAgents.map((agent: AgentConfig) => this.renderAgentCard(agent)).join('')}
                                </div>

                                ${regularAgents.length > 1 ? `
                                    <div style="margin-top: 16px; text-align: right;">
                                        <button id="test-all-agents-btn" class="btn">
                                            🧪 Test All Agents
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : `
                        <div class="settings-section">
                            <div style="padding: 32px; text-align: center; background: var(--background-secondary); border-radius: 8px; border: 2px dashed var(--background-modifier-border);">
                                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🤖</div>
                                <h3 style="margin-bottom: 8px; color: var(--text-muted);">No Specialized Agents Yet</h3>
                                <p style="margin: 0; font-size: 14px; color: var(--text-faint);">
                                    Create your first specialized agent above
                                </p>
                            </div>
                        </div>
                    `}
                `}

                <!-- Tips Section -->
                <div class="settings-section">
                    <div style="padding: 16px; background: var(--background-modifier-hover); border-radius: 6px; border-left: 3px solid var(--text-accent);">
                        <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 14px;">💡 Agent Tips</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: var(--text-muted);">
                            <li><strong>Master Agent:</strong> Automatically routes requests to specialized agents - no manual selection needed</li>
                            <li><strong>Specialized Agents:</strong> Create agents for specific domains (coding, research, writing, etc.)</li>
                            <li><strong>Templates:</strong> Start with pre-configured agents for common use cases</li>
                            <li><strong>Testing:</strong> Always test agents after creation to ensure they work correctly</li>
                            <li><strong>Default Agent:</strong> Set a default for direct invocations via chat</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    private renderAgentCard(agent: AgentConfig): string {
        const isDefault = this.settings.defaultAgentId === agent.id;
        const statusIcon = agent.enabled ? '🟢' : '⚪';
        const statusText = agent.enabled ? 'Enabled' : 'Disabled';
        const testStatus = agent.testStatus || 'untested';
        const testIcon = testStatus === 'success' ? '✅' : testStatus === 'failed' ? '❌' : '⚠️';
        const isPermanent = agent.isPermanent || false;

        return `
            <div class="agent-card" data-agent-id="${agent.id}" style="padding: 16px; background: var(--background-primary-alt); border-radius: 8px; border: ${isPermanent ? '2px solid var(--interactive-accent)' : '2px solid var(--background-modifier-border)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            ${agent.id === 'mnemosyne-agent-permanent' ? `
                                <svg viewBox="0 0 24 24" width="16" height="16" style="flex-shrink: 0;">
                                    <path d="M11.26,21.27c-.06.53-.07,1.05-.09,1.58,0,.19-.11.4,0,.61.31,0,1.56.22,1.63-.16l-.12-2.03c7.21-.36,11.9-8.19,8.83-14.76C18.28-.59,8.43-1.65,3.69,4.52c-5.08,6.5-.63,16.3,7.57,16.76ZM12.02,15.27c-.07.02-.08-.04-.11-.08-.28-.41-.62-.77-1-1.09-4.09-3.02,1.61-7.16,3.5-3.01.56,2-1.53,2.77-2.39,4.18ZM11.1,1.44c12.6-1.17,14.08,18.19,1.44,18.82v-3.07l2.61.03c.26-.09.24-.8.07-.99h-2.59c1.28-1.95,3.63-2.91,2.75-5.77,1.64.93,2.54,3.03,2.63,4.85.08.14.81.14.89-.03.08-.19.02-.28,0-.45-.14-2.95-2.23-5.3-4.99-6.18,1.57-.76,2.59-2.44,2.43-4.21.01-.77-.88-.36-1.32-.25.88,4.63-6.43,5.13-6.14.43.02-.2.18-.36-.03-.47-.18-.09-.96-.23-1.09-.1-.04.04-.09.24-.1.31-.23,1.67.8,3.47,2.25,4.22.05.04.08.07.07.14-2.55.61-4.7,3.17-4.9,5.79-.01.14-.03.67,0,.77.05.15.89.26.95-.13-.03-1.83.98-3.69,2.52-4.69-.37,1.13-.12,2.3.58,3.25.66.93,1.73,1.48,2.17,2.52h-2.54c-.25,0-.17.79-.11.96h2.75v3.07C-.01,19.84-.41,2.38,11.1,1.44Z" fill="currentColor"/>
                                    <path d="M11.75,10.61c-2.02.59-.41,3.49,1.11,1.98.7-.85-.01-2.17-1.11-1.98Z"/>
                                </svg>
                            ` : ''}
                            <span style="font-size: 16px; font-weight: 600;">${agent.name}</span>
                            ${isDefault ? '<span style="font-size: 11px; padding: 2px 8px; background: var(--interactive-accent); color: white; border-radius: 10px; font-weight: 600;">DEFAULT</span>' : ''}
                            ${isPermanent ? '<span style="font-size: 11px; padding: 2px 8px; background: var(--background-modifier-border); color: var(--text-muted); border-radius: 10px; font-weight: 600;">PERMANENT</span>' : ''}
                        </div>
                        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
                            ${agent.description || 'No description'}
                        </div>
                        <div style="display: flex; gap: 12px; font-size: 12px;">
                            <span style="color: var(--text-muted);">
                                ${statusIcon} ${statusText}
                            </span>
                            <span style="color: var(--text-muted);">
                                ${testIcon} ${testStatus === 'success' ? 'Tested' : testStatus === 'failed' ? 'Test Failed' : 'Not Tested'}
                            </span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-small agent-test-btn" data-agent-id="${agent.id}" title="Test Agent">
                            🧪 Test
                        </button>
                        <button class="btn btn-small agent-edit-btn" data-agent-id="${agent.id}" title="Edit Agent">
                            ✏️
                        </button>
                        ${!isPermanent ? `
                            <button class="btn btn-small agent-delete-btn" data-agent-id="${agent.id}" title="Delete Agent">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Quick Actions -->
                <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--background-modifier-border);">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
                        <input type="checkbox" class="agent-toggle-enabled" data-agent-id="${agent.id}" ${agent.enabled ? 'checked' : ''}>
                        <span>Enabled</span>
                    </label>
                    ${!isDefault && !isPermanent ? `
                        <button class="btn btn-small agent-set-default-btn" data-agent-id="${agent.id}" style="margin-left: auto;">
                            Set as Default
                        </button>
                    ` : ''}
                </div>

                <!-- Advanced Details (Collapsible) -->
                <details style="margin-top: 12px;">
                    <summary style="cursor: pointer; font-size: 13px; color: var(--text-muted); padding: 8px; background: var(--background-modifier-border); border-radius: 4px;">
                        Advanced Details
                    </summary>
                    <div style="padding: 12px; margin-top: 8px; background: var(--background-primary); border-radius: 4px; font-size: 12px; font-family: monospace;">
                        <div style="margin-bottom: 8px;"><strong>ID:</strong> ${agent.id}</div>
                        ${agent.capabilities ? `<div style="margin-bottom: 8px;"><strong>Capabilities:</strong> ${agent.capabilities.join(', ')}</div>` : ''}
                        ${agent.llmId ? `<div style="margin-bottom: 8px;"><strong>LLM Config:</strong> ${agent.llmId}</div>` : ''}
                        ${agent.lastTested ? `<div><strong>Last Tested:</strong> ${new Date(agent.lastTested).toLocaleString()}</div>` : ''}
                    </div>
                </details>
            </div>
        `;
    }

    attachEventListeners(container: HTMLElement): void {
        // Go to Providers Tab Button
        const goToProvidersBtn = container.querySelector('#go-to-providers-tab');
        if (goToProvidersBtn) {
            goToProvidersBtn.addEventListener('click', () => {
                // Find the providers tab button and click it
                const providersTabBtn = document.querySelector('[data-tab="providers"]');
                if (providersTabBtn) {
                    (providersTabBtn as HTMLElement).click();
                }
            });
        }

        // Agent Creation Buttons
        const creationButtons = container.querySelectorAll('.agent-creation-btn');
        creationButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                this.handleCreateAgent(mode === 'template');
            });
        });

        // Edit Agent Buttons
        const editButtons = container.querySelectorAll('.agent-edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const agentId = button.getAttribute('data-agent-id');
                if (agentId) {
                    this.handleEditAgent(agentId);
                }
            });
        });

        // Delete Agent Buttons
        const deleteButtons = container.querySelectorAll('.agent-delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const agentId = button.getAttribute('data-agent-id');
                if (agentId) {
                    this.onAgentAction('delete-agent', { agentId });
                }
            });
        });

        // Test Agent Buttons
        const testButtons = container.querySelectorAll('.agent-test-btn');
        testButtons.forEach(button => {
            button.addEventListener('click', () => {
                const agentId = button.getAttribute('data-agent-id');
                if (agentId) {
                    this.onAgentAction('test-agent', { agentId });
                }
            });
        });

        // Test All Agents Button
        const testAllBtn = container.querySelector('#test-all-agents-btn');
        if (testAllBtn) {
            testAllBtn.addEventListener('click', () => {
                this.onAgentAction('test-all-agents', {});
            });
        }

        // Toggle Enabled Checkboxes
        const toggleCheckboxes = container.querySelectorAll('.agent-toggle-enabled');
        toggleCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const agentId = (e.target as HTMLInputElement).getAttribute('data-agent-id');
                const enabled = (e.target as HTMLInputElement).checked;
                if (agentId) {
                    this.onAgentAction('toggle-agent', { agentId, enabled });
                }
            });
        });

        // Set Default Buttons
        const setDefaultButtons = container.querySelectorAll('.agent-set-default-btn');
        setDefaultButtons.forEach(button => {
            button.addEventListener('click', () => {
                const agentId = button.getAttribute('data-agent-id');
                if (agentId) {
                    this.handleSetDefaultAgent(agentId);
                }
            });
        });
    }

    private handleCreateAgent(fromTemplate: boolean): void {
        const modal = new AgentBuilderModal(
            this.plugin.app,
            this.plugin,
            null, // No existing agent - create new
            async (agent: AgentConfig) => {
                // Add agent to settings
                this.settings.agents.push(agent);

                // If this is the first non-master agent, set as default
                const nonMasterAgents = this.settings.agents.filter((a: AgentConfig) => !a.isMaster && a.id !== 'mnemosyne-master');
                if (nonMasterAgents.length === 1) {
                    this.settings.defaultAgentId = agent.id;
                }

                // Save settings
                await this.saveSettings();

                // Reload agent manager
                if (this.plugin.agentManager) {
                    await this.plugin.agentManager.loadAgents();
                }

                // Update UI
                this.updateComponents();

                new Notice(`Agent "${agent.name}" created successfully!`);
            }
        );

        modal.open();
    }

    private handleEditAgent(agentId: string): void {
        const agent = this.settings.agents.find((a: AgentConfig) => a.id === agentId);
        if (!agent) {
            new Notice('Agent not found');
            return;
        }

        const modal = new AgentBuilderModal(
            this.plugin.app,
            this.plugin,
            agent,
            async (updatedAgent: AgentConfig) => {
                // Update agent in settings
                const index = this.settings.agents.findIndex((a: AgentConfig) => a.id === agentId);
                if (index !== -1) {
                    this.settings.agents[index] = updatedAgent;
                }

                // Save settings
                await this.saveSettings();

                // Reload agent manager
                if (this.plugin.agentManager) {
                    await this.plugin.agentManager.loadAgents();
                }

                // Update UI
                this.updateComponents();

                new Notice(`Agent "${updatedAgent.name}" updated successfully!`);
            }
        );

        modal.open();
    }

    private async handleSetDefaultAgent(agentId: string): Promise<void> {
        const agent = this.settings.agents.find((a: AgentConfig) => a.id === agentId);
        if (!agent) {
            new Notice('Agent not found');
            return;
        }

        // Update default agent
        this.settings.defaultAgentId = agentId;

        await this.saveSettings();
        this.updateComponents();
        new Notice(`"${agent.name}" set as default agent!`);
    }
}
