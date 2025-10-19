/**
 * Plugin Settings
 *
 * Default settings and validation - Updated for Phase 5
 */

import { PluginSettings, AgentConfig, GoddessPersonaSettings, LLMConfig } from './types';
import { SearchStrategy, LLMProvider } from './constants';

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PluginSettings = {
    // Security
    isEncryptionEnabled: true,
    lastPasswordChangeDate: undefined,
    masterPassword: {
        isSet: false,
    },

    // LLM Configurations (Phase 4)
    llmConfigs: [],

    // Agent Configurations (Phase 5)
    agents: [],

    // Default Agent (Phase 5)
    defaultAgentId: undefined,

    // Goddess Persona Configuration
    persona: {
        enabled: false,
        intensity: 'moderate',
        customPrompt: '',
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
    },

    // RAG Configuration (Phase 3)
    vectorDbPath: 'vector-store-index.json',
    embeddingModel: 'text-embedding-3-small',
    chunkSize: 500,
    chunkOverlap: 50,

    // Auto Ingestion Configuration
    autoIngestion: {
        enabled: false, // disabled by default for safety
        debounceDelay: 2000, // 2 seconds after file stops changing
        batchSize: 10, // process max 10 files at once
        maxFileSize: 5, // max 5MB files
        processingInterval: 5000, // 5 seconds between batches
        retryAttempts: 3, // retry failed files 3 times
        excludePatterns: [
            '**/.obsidian/**',
            '**/node_modules/**',
            '**/.git/**',
            '**/.DS_Store',
            '**/Thumbs.db',
            '**/*.tmp',
            '**/*.temp'
        ],
        includeFileTypes: ['.md', '.txt'], // only markdown and text files by default
        maxQueueSize: 100, // max 100 files in queue
        logLevel: 'minimal', // minimal logging by default
        enabledFolders: [], // empty = watch all folders
        ignoreHiddenFiles: true // ignore hidden files by default
    },

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
        // Ensure autoIngestion config exists with defaults
        autoIngestion: {
            ...DEFAULT_SETTINGS.autoIngestion,
            ...(loadedSettings.autoIngestion || {})
        }
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
 * Create the permanent Mnemosyne Agent
 * This agent cannot be deleted, only disabled
 */
export function createMnemosyneAgent(llmId?: string): AgentConfig {
    return {
        id: 'mnemosyne-agent-permanent',
        name: 'Mnemosyne Agent',
        description: 'The core Mnemosyne AI assistant. This agent provides general knowledge assistance and cannot be deleted, only disabled.',
        systemPrompt: `You are Mnemosyne, the Greek goddess of memory and the AI assistant for this knowledge vault. You help users find, understand, and connect information from their personal knowledge base.

Your role:
- Answer questions using the context from the user's knowledge vault (when available)
- Help users discover connections between different pieces of information
- Provide thoughtful analysis and insights based on their stored knowledge
- Be concise, helpful, and accurate in your responses

Context from the user's knowledge vault:
{context}

Guidelines:
- If context is available, base your answers primarily on the provided context
- If no context is available, use your general knowledge to provide helpful responses
- If the context doesn't contain relevant information, say so clearly
- Cite specific sources when referencing information from the context
- Be conversational but professional
- Help users think through complex topics by asking clarifying questions when appropriate`,
        llmId: llmId || 'default-openai-provider',
        enabled: true,
        isPermanent: true, // Mark as permanent so it can't be deleted
        retrievalSettings: {
            topK: 5,
            scoreThreshold: 0.7,
            searchStrategy: SearchStrategy.HYBRID
        },
        metadataFilters: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

/**
 * Ensure we have at least one LLM provider configured
 */
export function ensureDefaultLlmProvider(settings: PluginSettings): void {
    // Check if we already have a default provider
    const hasDefaultProvider = settings.llmConfigs.some(c => c.id === 'default-openai-provider');
    
    if (!hasDefaultProvider) {
        // Create a default OpenAI provider as a placeholder
        const defaultProvider: LLMConfig = {
            id: 'default-openai-provider',
            name: 'Default OpenAI Provider',
            provider: LLMProvider.OPENAI,
            model: 'gpt-4o-mini',
            enabled: false, // Start disabled so user can configure it
            encryptedApiKey: '',
            baseUrl: 'https://api.openai.com/v1',
            temperature: 0.7,
            maxTokens: 4000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        
        settings.llmConfigs.push(defaultProvider);
        console.log('Created default OpenAI provider (disabled - needs configuration)');
    }
}

/**
 * Ensure the permanent Mnemosyne Agent exists in settings
 */
export function ensureMnemosyneAgent(settings: PluginSettings): void {
    const mnemosyneAgentId = 'mnemosyne-agent-permanent';
    
    // First ensure we have at least one LLM provider
    ensureDefaultLlmProvider(settings);
    
    // Check if Mnemosyne agent already exists
    const existingAgent = settings.agents.find(a => a.id === mnemosyneAgentId);
    
    if (!existingAgent) {
        // Find the first available LLM provider
        const defaultLlmId = settings.llmConfigs.find(c => c.enabled)?.id;
        
        // Create the permanent agent
        const mnemosyneAgent = createMnemosyneAgent(defaultLlmId);
        
        // Add it to the beginning of the agents array
        settings.agents.unshift(mnemosyneAgent);
        
        // Set as default agent if no default is set
        if (!settings.defaultAgentId) {
            settings.defaultAgentId = mnemosyneAgentId;
        }
        
        console.log('Created permanent Mnemosyne Agent');
    } else {
        // Ensure existing agent is marked as permanent
        existingAgent.isPermanent = true;
        
        // Update LLM ID if it's invalid
        if (!settings.llmConfigs.find(c => c.id === existingAgent.llmId && c.enabled)) {
            const defaultLlmId = settings.llmConfigs.find(c => c.enabled)?.id;
            if (defaultLlmId) {
                existingAgent.llmId = defaultLlmId;
                console.log('Updated Mnemosyne Agent LLM provider');
            }
        }
    }
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
