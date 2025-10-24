/**
 * Quick Start Tab
 *
 * Everything you need to get started with Mnemosyne in 3 steps:
 * 1. Add an LLM Provider
 * 2. Create or Select an Agent
 * 3. Ingest Your Vault
 */

import { BaseTab } from './BaseTab';
import { LLMConfig } from '../../../types';
import { Notice } from 'obsidian';
import { AIProviderModal } from '../../modals/AIProviderModal';
import { AgentBuilderModal } from '../../agentBuilderModal';
import { VaultIngestionModal } from '../../vaultIngestionModal';

export class QuickStartTab implements BaseTab {
    constructor(private plugin: any) {}

    render(): string {
        const hasProviders = this.plugin.settings.llmConfigs?.length > 0;
        const hasAgents = this.plugin.settings.agents?.length > 0;
        const hasChunks = this.getChunkCount() > 0;

        return `
            <div class="quick-start-tab">
                <!-- Welcome -->
                <div class="settings-section">
                    <div class="welcome-card" style="background: var(--background-secondary); border-radius: 8px; padding: 24px; margin-bottom: 24px; border-left: 4px solid var(--interactive-accent);">
                        <h2 style="margin-top: 0; margin-bottom: 12px; color: var(--text-normal);">
                            👋 Welcome to Mnemosyne
                        </h2>
                        <p style="color: var(--text-muted); margin-bottom: 16px; line-height: 1.6;">
                            Get started in 3 easy steps. Configure your AI provider, create an agent, and index your vault.
                        </p>
                    </div>
                </div>

                <!-- Step 1: LLM Provider -->
                <div class="settings-section">
                    <div class="settings-card">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${hasProviders ? 'var(--interactive-success)' : 'var(--background-modifier-border)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                                    ${hasProviders ? '✓' : '1'}
                                </div>
                                <div>
                                    <h3 style="margin: 0; font-size: 16px;">Add an LLM Provider</h3>
                                    <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                                        ${hasProviders ? `${this.plugin.settings.llmConfigs.length} provider(s) configured` : 'Connect to OpenAI, Claude, or a local LLM'}
                                    </p>
                                </div>
                            </div>
                            <button id="quick-add-provider" class="btn btn-primary">
                                ${hasProviders ? '+ Add Another' : '+ Add Provider'}
                            </button>
                        </div>

                        ${hasProviders ? `
                            <div style="margin-top: 12px; padding: 12px; background: var(--background-primary-alt); border-radius: 4px;">
                                <div style="font-size: 13px; color: var(--text-muted);">
                                    <strong>Configured Providers:</strong>
                                </div>
                                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px;">
                                    ${this.plugin.settings.llmConfigs.map((config: any) => `
                                        <li style="margin: 4px 0;">
                                            ${config.name}
                                            <span style="color: var(--text-muted);">(${config.provider})</span>
                                            ${config.enabled ? '<span style="color: var(--interactive-success);">●</span>' : '<span style="color: var(--text-faint);">○</span>'}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Step 2: Agent -->
                <div class="settings-section">
                    <div class="settings-card ${!hasProviders ? 'disabled-step' : ''}">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${hasAgents ? 'var(--interactive-success)' : hasProviders ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                                    ${hasAgents ? '✓' : '2'}
                                </div>
                                <div>
                                    <h3 style="margin: 0; font-size: 16px;">Create or Select an Agent</h3>
                                    <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                                        ${hasAgents ? `${this.plugin.settings.agents.length} agent(s) configured` : 'Agents are specialized AI assistants for different tasks'}
                                    </p>
                                </div>
                            </div>
                            <button id="quick-add-agent" class="btn ${hasProviders ? 'btn-primary' : 'btn-secondary'}" ${!hasProviders ? 'disabled' : ''}>
                                ${hasAgents ? '+ Create Agent' : '+ Create Agent'}
                            </button>
                        </div>

                        ${!hasProviders ? `
                            <div style="padding: 12px; background: var(--background-modifier-error-hover); border-radius: 4px; border-left: 3px solid var(--text-error);">
                                <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                                    ⚠️ Add an LLM provider first before creating agents
                                </p>
                            </div>
                        ` : hasAgents ? `
                            <div style="margin-top: 12px; padding: 12px; background: var(--background-primary-alt); border-radius: 4px;">
                                <div style="font-size: 13px; color: var(--text-muted);">
                                    <strong>Your Agents:</strong>
                                </div>
                                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px;">
                                    ${this.plugin.settings.agents.slice(0, 5).map((agent: any) => `
                                        <li style="margin: 4px 0;">
                                            ${agent.name}
                                            ${agent.id === this.plugin.settings.defaultAgentId ? '<span style="color: var(--interactive-accent);">(default)</span>' : ''}
                                        </li>
                                    `).join('')}
                                    ${this.plugin.settings.agents.length > 5 ? `<li style="color: var(--text-faint);">... and ${this.plugin.settings.agents.length - 5} more</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Step 3: Ingest Vault -->
                <div class="settings-section">
                    <div class="settings-card ${!hasProviders ? 'disabled-step' : ''}">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${hasChunks ? 'var(--interactive-success)' : hasProviders ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                                    ${hasChunks ? '✓' : '3'}
                                </div>
                                <div>
                                    <h3 style="margin: 0; font-size: 16px;">Index Your Vault</h3>
                                    <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                                        ${hasChunks ? `${this.getChunkCount().toLocaleString()} chunks indexed` : 'Enable semantic search across your notes'}
                                    </p>
                                </div>
                            </div>
                            <button id="quick-ingest-vault" class="btn ${hasProviders ? 'btn-primary' : 'btn-secondary'}" ${!hasProviders ? 'disabled' : ''}>
                                ${hasChunks ? '🔄 Re-index' : '📚 Index Vault'}
                            </button>
                        </div>

                        ${!hasProviders ? `
                            <div style="padding: 12px; background: var(--background-modifier-error-hover); border-radius: 4px; border-left: 3px solid var(--text-error);">
                                <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                                    ⚠️ Add an LLM provider first before indexing
                                </p>
                            </div>
                        ` : hasChunks ? `
                            <div style="margin-top: 12px; padding: 12px; background: var(--background-primary-alt); border-radius: 4px;">
                                <div style="font-size: 13px; color: var(--text-muted);">
                                    <strong>Index Status:</strong> ${this.getChunkCount().toLocaleString()} chunks indexed
                                </div>
                                <div style="font-size: 12px; color: var(--text-faint); margin-top: 4px;">
                                    Vector Store: ${this.getVectorStoreBackend().toUpperCase()}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Quick Tips -->
                <div class="settings-section">
                    <div style="padding: 16px; background: var(--background-modifier-hover); border-radius: 6px; border-left: 3px solid var(--text-accent);">
                        <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 14px;">💡 Quick Tips</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: var(--text-muted);">
                            <li>Start with <strong>OpenAI (gpt-4)</strong> or <strong>Anthropic (claude-3-5-sonnet)</strong> for best results</li>
                            <li>For privacy, use <strong>Local LLMs</strong> (Ollama, LM Studio) - see LLM Providers tab</li>
                            <li>The <strong>Archon Agent</strong> automatically delegates to specialized agents</li>
                            <li>Enable <strong>Auto-Ingestion</strong> in Knowledge Base tab to automatically index new notes</li>
                            <li>Visit <strong>Advanced tab</strong> for MCP tools, memory settings, and goddess persona</li>
                        </ul>
                    </div>
                </div>

                <style>
                    .disabled-step {
                        opacity: 0.6;
                        pointer-events: none;
                    }
                </style>
            </div>
        `;
    }

    attachEventListeners(container: HTMLElement): void {
        // Add Provider
        const addProviderBtn = container.querySelector('#quick-add-provider');
        if (addProviderBtn) {
            addProviderBtn.addEventListener('click', () => {
                const modal = new AIProviderModal(
                    this.plugin.app,
                    this.plugin.keyManager,
                    {
                        mode: 'add',
                        onSuccess: async (config: LLMConfig) => {
                            // Handled by the modal
                            new Notice('Provider added! Reload settings to see changes.');
                            // Refresh the tab
                            window.location.reload();
                        }
                    }
                );
                modal.open();
            });
        }

        // Add Agent
        const addAgentBtn = container.querySelector('#quick-add-agent');
        if (addAgentBtn) {
            addAgentBtn.addEventListener('click', () => {
                const modal = new AgentBuilderModal(
                    this.plugin.app,
                    this.plugin,
                    null, // No existing agent - create new
                    (agent) => {
                        new Notice(`Agent "${agent.name}" created!`);
                        window.location.reload();
                    }
                );
                modal.open();
            });
        }

        // Ingest Vault
        const ingestBtn = container.querySelector('#quick-ingest-vault');
        if (ingestBtn) {
            ingestBtn.addEventListener('click', () => {
                const modal = new VaultIngestionModal(this.plugin.app, this.plugin);
                modal.open();
            });
        }
    }

    private getChunkCount(): number {
        // Try to get chunk count from vector store stats
        const vectorStore = this.plugin.vectorStoreFactory?.getActiveStore();
        if (vectorStore) {
            return vectorStore.getStats?.()?.totalChunks || 0;
        }
        return 0;
    }

    private getVectorStoreBackend(): string {
        return this.plugin.settings.vectorStore?.backend || 'json';
    }
}
