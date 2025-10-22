/**
 * Advanced Tab
 *
 * Advanced settings and optional features
 * - Security (Master Password)
 * - Memory Management
 * - MCP Tools Integration
 * - Goddess Persona
 * - Debug Settings
 */

import { BaseTab } from './BaseTab';
import { Notice } from 'obsidian';
import type { GoddessPersonaSettings, MemoryConfig } from '../../../types';

export class AdvancedTab implements BaseTab {
    constructor(
        private plugin: any,
        private settings: any,
        private saveSettings: () => Promise<void>,
        private updateComponents: () => void,
        private handlePersonaAction: (action: string, data?: any) => Promise<void>,
        private handleMemoryAction: (action: string, data?: any) => Promise<void>,
        private handleSetMasterPassword: () => Promise<void>
    ) {}

    render(): string {
        const hasMasterPassword = this.settings.masterPassword?.isSet || false;
        const personaSettings: GoddessPersonaSettings = this.settings.persona || {
            enabled: false,
            intensity: 'subtle',
            speechPatterns: {
                useDivineLanguage: true,
                referenceDivineMemory: true,
                useAncientTerminology: false,
                embraceGoddessIdentity: true,
            },
            knowledgeAreas: {
                mythology: true,
                history: true,
                arts: true,
                sciences: true,
                philosophy: true,
                literature: true,
            },
            divineElements: {
                referenceMuses: true,
                mentionSacredDuties: true,
                useDivineTitles: true,
                speakOfEternalMemory: true,
            },
            customPrompt: ''
        };

        const memorySettings = (this.settings.memory || this.plugin.settings.memory || {
            enabled: true,
            maxMessages: 30,
            compressionThreshold: 25,
            compressionRatio: 0.3,
            autoCompress: true,
            addToVectorStore: true,
            compressionPrompt: 'Summarize this conversation, focusing on key decisions, important context, and actionable items.'
        }) as MemoryConfig & { provider?: string; maxTokens?: number; enableAutoSummarization?: boolean; summarizationThreshold?: number; };

        // Get MCP tools status
        const mcpTools = this.plugin.settings.mcpTools || [];
        const mcpEnabled = mcpTools.length > 0;

        return `
            <div class="advanced-tab">
                <!-- Header Section -->
                <div class="settings-section">
                    <div style="padding: 16px; background: var(--background-secondary); border-radius: 8px; border-left: 4px solid var(--interactive-accent);">
                        <h2 style="margin-top: 0; margin-bottom: 8px;">⚙️ Advanced Settings</h2>
                        <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                            Configure security, memory management, MCP tools, and optional persona features.
                        </p>
                    </div>
                </div>

                <!-- Security Section -->
                <div class="settings-section">
                    <div class="settings-card">
                        <h3 style="margin-top: 0; margin-bottom: 16px;">🔐 Security</h3>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                            Your master password encrypts all API keys and sensitive data. It is never stored and cannot be recovered if lost.
                        </p>

                        <div style="padding: 16px; background: var(--background-primary-alt); border-radius: 8px; border: 2px solid ${hasMasterPassword ? 'var(--interactive-success)' : 'var(--background-modifier-border)'};">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <div style="font-weight: 600; margin-bottom: 4px;">
                                        ${hasMasterPassword ? '✅ Master Password Set' : '⚠️ Master Password Not Set'}
                                    </div>
                                    <div style="font-size: 13px; color: var(--text-muted);">
                                        ${hasMasterPassword ? 'Your API keys are encrypted and secure' : 'Required to store API keys securely'}
                                    </div>
                                </div>
                                <button id="set-master-password-btn" class="btn ${hasMasterPassword ? 'btn-secondary' : 'btn-primary'}">
                                    ${hasMasterPassword ? 'Change Password' : 'Set Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Memory Management Section -->
                <div class="settings-section">
                    <div class="settings-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h3 style="margin: 0;">🧠 Memory Management</h3>
                            <span style="font-size: 12px; padding: 4px 12px; background: var(--interactive-accent); color: white; border-radius: 10px; font-weight: 600;">
                                ${memorySettings.provider?.toUpperCase() || 'MEM0'}
                            </span>
                        </div>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                            Configure how conversations are remembered across sessions.
                        </p>

                        <details>
                            <summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: var(--text-muted); padding: 12px; background: var(--background-modifier-border); border-radius: 4px;">
                                Memory Settings
                            </summary>
                            <div style="padding: 16px; margin-top: 12px; background: var(--background-primary); border-radius: 4px; border: 1px solid var(--background-modifier-border);">
                                <!-- Max Tokens -->
                                <div style="margin-bottom: 16px;">
                                    <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 8px;">Max Tokens:</label>
                                    <input type="number" id="memory-max-tokens" value="${memorySettings.maxTokens || 4000}" min="1000" max="128000" step="1000" style="width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);" />
                                    <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-faint);">Maximum tokens for conversation memory</p>
                                </div>

                                <!-- Auto Summarization -->
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                    <div>
                                        <label style="font-size: 13px; font-weight: 600;">Auto Summarization</label>
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-faint);">Automatically summarize long conversations</p>
                                    </div>
                                    <label class="toggle-label">
                                        <input type="checkbox" id="memory-auto-summarization" ${memorySettings.enableAutoSummarization ? 'checked' : ''} style="width: 18px; height: 18px;">
                                    </label>
                                </div>

                                ${memorySettings.enableAutoSummarization ? `
                                    <!-- Summarization Threshold -->
                                    <div style="margin-bottom: 16px;">
                                        <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 8px;">Summarization Threshold:</label>
                                        <input type="number" id="memory-summarization-threshold" value="${memorySettings.summarizationThreshold || 3000}" min="1000" max="100000" step="500" style="width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);" />
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-faint);">Trigger summarization when conversation exceeds this token count</p>
                                    </div>
                                ` : ''}

                                <button id="save-memory-settings-btn" class="btn btn-primary" style="width: 100%;">
                                    Save Memory Settings
                                </button>
                            </div>
                        </details>
                    </div>
                </div>

                <!-- MCP Tools Section -->
                <div class="settings-section">
                    <div class="settings-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h3 style="margin: 0;">🔧 MCP Tools</h3>
                            <span style="font-size: 12px; padding: 4px 12px; background: ${mcpEnabled ? 'var(--interactive-success)' : 'var(--background-modifier-border)'}; color: ${mcpEnabled ? 'white' : 'var(--text-muted)'}; border-radius: 10px; font-weight: 600;">
                                ${mcpEnabled ? `${mcpTools.length} ENABLED` : 'DISABLED'}
                            </span>
                        </div>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                            Model Context Protocol (MCP) allows agents to use external tools and APIs.
                        </p>

                        ${mcpEnabled ? `
                            <div style="padding: 12px; background: var(--background-primary-alt); border-radius: 6px;">
                                <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Enabled Tools:</div>
                                <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                                    ${mcpTools.map((tool: any) => `
                                        <li style="margin: 4px 0;">${tool.name} <span style="color: var(--text-faint);">(${tool.type || 'unknown'})</span></li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : `
                            <div style="padding: 24px; text-align: center; background: var(--background-secondary); border-radius: 8px; border: 2px dashed var(--background-modifier-border);">
                                <div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;">🔧</div>
                                <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                                    No MCP tools configured. Configure them in your plugin settings.
                                </p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Goddess Persona Section -->
                <div class="settings-section">
                    <div class="settings-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h3 style="margin: 0;">🎭 Goddess Persona</h3>
                            <label class="toggle-label">
                                <input type="checkbox" id="persona-enabled" ${personaSettings.enabled ? 'checked' : ''} style="width: 18px; height: 18px;">
                            </label>
                        </div>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                            Enable the Mnemosyne goddess persona for a more immersive experience inspired by Greek mythology.
                        </p>

                        ${personaSettings.enabled ? `
                            <details>
                                <summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: var(--text-muted); padding: 12px; background: var(--background-modifier-border); border-radius: 4px;">
                                    Persona Configuration
                                </summary>
                                <div style="padding: 16px; margin-top: 12px; background: var(--background-primary); border-radius: 4px; border: 1px solid var(--background-modifier-border);">
                                    <!-- Intensity -->
                                    <div style="margin-bottom: 16px;">
                                        <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 8px;">Intensity:</label>
                                        <select id="persona-intensity" style="width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);">
                                            <option value="subtle" ${personaSettings.intensity === 'subtle' ? 'selected' : ''}>Subtle</option>
                                            <option value="moderate" ${personaSettings.intensity === 'moderate' ? 'selected' : ''}>Moderate</option>
                                            <option value="strong" ${personaSettings.intensity === 'strong' ? 'selected' : ''}>Strong</option>
                                        </select>
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-faint);">How strongly the persona influences responses</p>
                                    </div>

                                    <!-- Speech Patterns -->
                                    <div style="margin-bottom: 16px;">
                                        <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 8px;">Speech Patterns:</label>
                                        <div style="display: grid; gap: 8px;">
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                                <input type="checkbox" class="persona-speech-pattern" data-field="useDivineLanguage" ${personaSettings.speechPatterns?.useDivineLanguage ? 'checked' : ''}>
                                                <span style="font-size: 13px;">Use Divine Language</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                                <input type="checkbox" class="persona-speech-pattern" data-field="referenceDivineMemory" ${personaSettings.speechPatterns?.referenceDivineMemory ? 'checked' : ''}>
                                                <span style="font-size: 13px;">Reference Divine Memory</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                                <input type="checkbox" class="persona-speech-pattern" data-field="useAncientTerminology" ${personaSettings.speechPatterns?.useAncientTerminology ? 'checked' : ''}>
                                                <span style="font-size: 13px;">Use Ancient Terminology</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                                <input type="checkbox" class="persona-speech-pattern" data-field="embraceGoddessIdentity" ${personaSettings.speechPatterns?.embraceGoddessIdentity ? 'checked' : ''}>
                                                <span style="font-size: 13px;">Embrace Goddess Identity</span>
                                            </label>
                                        </div>
                                    </div>

                                    <!-- Custom Prompt -->
                                    <div style="margin-bottom: 16px;">
                                        <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 8px;">Custom Persona Prompt:</label>
                                        <textarea id="persona-custom-prompt" rows="4" placeholder="Add custom instructions for the persona..." style="width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-family: var(--font-monospace); font-size: 13px; resize: vertical;">${personaSettings.customPrompt || ''}</textarea>
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-faint);">Optional custom instructions to further customize the persona</p>
                                    </div>

                                    <button id="save-persona-settings-btn" class="btn btn-primary" style="width: 100%;">
                                        Save Persona Settings
                                    </button>
                                </div>
                            </details>
                        ` : `
                            <div style="padding: 16px; background: var(--background-modifier-hover); border-radius: 6px;">
                                <p style="margin: 0; font-size: 13px; color: var(--text-muted); font-style: italic;">
                                    💡 Enable the goddess persona to have Mnemosyne speak in a more mythological, divine manner inspired by her role as the Greek goddess of memory.
                                </p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Debug Section -->
                <div class="settings-section">
                    <div class="settings-card">
                        <h3 style="margin-top: 0; margin-bottom: 16px;">🐛 Debug</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <label style="font-size: 13px; font-weight: 600;">Enable Debug Mode</label>
                                <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-faint);">Show detailed logs in the console</p>
                            </div>
                            <label class="toggle-label">
                                <input type="checkbox" id="debug-enabled" ${this.settings.advanced?.debug ? 'checked' : ''} style="width: 18px; height: 18px;">
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Tips Section -->
                <div class="settings-section">
                    <div style="padding: 16px; background: var(--background-modifier-hover); border-radius: 6px; border-left: 3px solid var(--text-accent);">
                        <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 14px;">💡 Advanced Tips</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: var(--text-muted);">
                            <li><strong>Master Password:</strong> Keep it safe! There's no recovery if you forget it</li>
                            <li><strong>Memory Management:</strong> Tune max tokens based on your LLM's context window</li>
                            <li><strong>MCP Tools:</strong> Extends your agents with custom capabilities like file access, web search, etc.</li>
                            <li><strong>Goddess Persona:</strong> Optional feature for a more mythological experience</li>
                            <li><strong>Debug Mode:</strong> Useful for troubleshooting, but may slow down performance</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners(container: HTMLElement): void {
        // Set/Change Master Password Button
        const setPasswordBtn = container.querySelector('#set-master-password-btn');
        if (setPasswordBtn) {
            setPasswordBtn.addEventListener('click', async () => {
                await this.handleSetMasterPassword();
            });
        }

        // Save Memory Settings Button
        const saveMemoryBtn = container.querySelector('#save-memory-settings-btn');
        if (saveMemoryBtn) {
            saveMemoryBtn.addEventListener('click', async () => {
                await this.handleSaveMemorySettings(container);
            });
        }

        // Auto Summarization Toggle
        const autoSummarizationToggle = container.querySelector('#memory-auto-summarization');
        if (autoSummarizationToggle) {
            autoSummarizationToggle.addEventListener('change', () => {
                this.updateComponents();
            });
        }

        // Persona Enabled Toggle
        const personaEnabledToggle = container.querySelector('#persona-enabled');
        if (personaEnabledToggle) {
            personaEnabledToggle.addEventListener('change', async (e) => {
                const enabled = (e.target as HTMLInputElement).checked;
                await this.handlePersonaAction('toggle-persona', { enabled });
            });
        }

        // Persona Intensity Select
        const personaIntensitySelect = container.querySelector('#persona-intensity');
        if (personaIntensitySelect) {
            personaIntensitySelect.addEventListener('change', async (e) => {
                const intensity = (e.target as HTMLSelectElement).value;
                await this.handlePersonaAction('set-intensity', { intensity });
            });
        }

        // Persona Speech Pattern Checkboxes
        const speechPatternCheckboxes = container.querySelectorAll('.persona-speech-pattern');
        speechPatternCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const field = (e.target as HTMLInputElement).getAttribute('data-field');
                const value = (e.target as HTMLInputElement).checked;
                if (field) {
                    await this.handlePersonaAction('update-speech-patterns', { field, value });
                }
            });
        });

        // Save Persona Settings Button
        const savePersonaBtn = container.querySelector('#save-persona-settings-btn');
        if (savePersonaBtn) {
            savePersonaBtn.addEventListener('click', async () => {
                await this.handleSavePersonaSettings(container);
            });
        }

        // Debug Toggle
        const debugToggle = container.querySelector('#debug-enabled');
        if (debugToggle) {
            debugToggle.addEventListener('change', async (e) => {
                const enabled = (e.target as HTMLInputElement).checked;
                await this.handleDebugToggle(enabled);
            });
        }
    }

    private async handleSaveMemorySettings(container: HTMLElement): Promise<void> {
        try {
            const maxTokensInput = container.querySelector('#memory-max-tokens') as HTMLInputElement;
            const autoSummarizationToggle = container.querySelector('#memory-auto-summarization') as HTMLInputElement;
            const summarizationThresholdInput = container.querySelector('#memory-summarization-threshold') as HTMLInputElement;

            const maxTokens = parseInt(maxTokensInput?.value || '4000', 10);
            const enableAutoSummarization = autoSummarizationToggle?.checked || false;
            const summarizationThreshold = parseInt(summarizationThresholdInput?.value || '3000', 10);

            // Update settings
            if (!this.plugin.settings.memory) {
                this.plugin.settings.memory = {
                    provider: 'mem0',
                    maxTokens: 4000,
                    summarizationThreshold: 3000,
                    enableAutoSummarization: true,
                    mem0: {
                        organizationId: '',
                        projectId: '',
                        userId: 'default-user',
                        config: {
                            version: 'v1.1'
                        }
                    }
                };
            }

            this.plugin.settings.memory.maxTokens = maxTokens;
            this.plugin.settings.memory.enableAutoSummarization = enableAutoSummarization;
            this.plugin.settings.memory.summarizationThreshold = summarizationThreshold;

            await this.plugin.saveSettings();
            this.updateComponents();

            new Notice('Memory settings saved successfully!');
        } catch (error: any) {
            console.error('Failed to save memory settings:', error);
            new Notice(`Failed to save memory settings: ${error.message}`);
        }
    }

    private async handleSavePersonaSettings(container: HTMLElement): Promise<void> {
        try {
            const customPromptTextarea = container.querySelector('#persona-custom-prompt') as HTMLTextAreaElement;
            const customPrompt = customPromptTextarea?.value || '';

            await this.handlePersonaAction('update-custom-prompt', { prompt: customPrompt });

            new Notice('Persona settings saved successfully!');
        } catch (error: any) {
            console.error('Failed to save persona settings:', error);
            new Notice(`Failed to save persona settings: ${error.message}`);
        }
    }

    private async handleDebugToggle(enabled: boolean): Promise<void> {
        try {
            if (!this.settings.advanced) {
                this.settings.advanced = { debug: false };
            }

            this.settings.advanced.debug = enabled;

            await this.saveSettings();
            this.updateComponents();

            new Notice(`Debug mode ${enabled ? 'enabled' : 'disabled'}!`);
        } catch (error: any) {
            console.error('Failed to toggle debug mode:', error);
            new Notice(`Failed to toggle debug mode: ${error.message}`);
        }
    }
}
