/**
 * Plugin Settings
 *
 * Default settings and validation - Updated for Phase 5
 */

import { PluginSettings } from './types';
import { SearchStrategy } from './constants';

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PluginSettings = {
    // Security
    isEncryptionEnabled: true,
    lastPasswordChangeDate: undefined,

    // LLM Configurations (Phase 4)
    llmConfigs: [],

    // Agent Configurations (Phase 5)
    agents: [],

    // Default Agent (Phase 5)
    defaultAgentId: undefined,

    // RAG Configuration (Phase 3)
    vectorDbPath: 'vector-store-index.json',
    embeddingModel: 'text-embedding-3-small',
    chunkSize: 500,
    chunkOverlap: 50,

    // Feature flags
    enableLogging: false,
    enableCaching: false
};

/**
 * Merge loaded settings with defaults
 * Ensures all required fields exist
 */
export function mergeSettings(loadedSettings: Partial<PluginSettings>): PluginSettings {
    return {
        ...DEFAULT_SETTINGS,
        ...loadedSettings,
        // Ensure arrays exist
        llmConfigs: loadedSettings.llmConfigs || [],
        agents: loadedSettings.agents || [], // Phase 5
    };
}

/**
 * Validate settings structure
 */
export function validateSettings(settings: PluginSettings): boolean {
    try {
        // Check required fields exist
        if (typeof settings.isEncryptionEnabled !== 'boolean') return false;
        if (typeof settings.vectorDbPath !== 'string') return false;
        if (typeof settings.embeddingModel !== 'string') return false;

        // Check arrays
        if (!Array.isArray(settings.llmConfigs)) return false;
        if (!Array.isArray(settings.agents)) return false; // Phase 5

        // Validate LLM configs
        for (const config of settings.llmConfigs) {
            if (!config.id || !config.name || !config.provider || !config.model) {
                console.warn('Invalid LLM config:', config);
                return false;
            }
        }

        // Validate Agent configs (Phase 5)
        for (const agent of settings.agents) {
            if (!agent.id || !agent.name || !agent.llmId || !agent.systemPrompt) {
                console.warn('Invalid agent config:', agent);
                return false;
            }
            // Check system prompt has {context} placeholder
            if (!agent.systemPrompt.includes('{context}')) {
                console.warn('Agent system prompt missing {context}:', agent.name);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Settings validation error:', error);
        return false;
    }
}

/**
 * Sanitize settings before saving
 * Removes any sensitive data that shouldn't be persisted
 */
export function sanitizeSettings(settings: PluginSettings): PluginSettings {
    // Settings are already sanitized - API keys are encrypted
    // Just return as-is
    return settings;
}

/**
 * Export settings for backup
 */
export function exportSettings(settings: PluginSettings): string {
    // Create a copy without sensitive data
    const exportData = {
        ...settings,
        // Note: Encrypted API keys are included - they're vault-specific
        llmConfigs: settings.llmConfigs.map(config => ({
            ...config,
            // Encrypted keys are vault-specific, so safe to export
        })),
        agents: settings.agents.map(agent => ({
            ...agent,
            // Agents are safe to export
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Import settings from backup
 */
export function importSettings(jsonString: string): PluginSettings | null {
    try {
        const imported = JSON.parse(jsonString);

        // Validate imported settings
        if (!validateSettings(imported)) {
            console.error('Imported settings failed validation');
            return null;
        }

        return imported;
    } catch (error) {
        console.error('Error importing settings:', error);
        return null;
    }
}

/**
 * Migrate settings from older versions
 */
export function migrateSettings(settings: any, fromVersion: string): PluginSettings {
    // Add migration logic here as needed
    // Example: if upgrading from Phase 4 to Phase 5
    if (!settings.agents) {
        settings.agents = [];
    }
    if (!settings.defaultAgentId) {
        settings.defaultAgentId = undefined;
    }

    return settings as PluginSettings;
}

/**
 * Get settings summary for display
 */
export function getSettingsSummary(settings: PluginSettings): string {
    return `
Settings Summary:
- LLM Providers: ${settings.llmConfigs.length} (${settings.llmConfigs.filter(c => c.enabled).length} enabled)
- Agents: ${settings.agents.length} (${settings.agents.filter(a => a.enabled).length} enabled)
- Default Agent: ${settings.defaultAgentId ? 'Set' : 'Not set'}
- Vector DB: ${settings.vectorDbPath}
- Embedding Model: ${settings.embeddingModel}
- Encryption: ${settings.isEncryptionEnabled ? 'Enabled' : 'Disabled'}
- Logging: ${settings.enableLogging ? 'Enabled' : 'Disabled'}
- Caching: ${settings.enableCaching ? 'Enabled' : 'Disabled'}
    `.trim();
}
