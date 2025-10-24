/**
 * Types for Inline AI functionality
 */

export interface InlineAISettings {
    // Feature toggles
    enabled: boolean;
    enableAnalysis: boolean;
    enableEditing: boolean;
    enableCompletion: boolean;
    
    // Selection settings
    minSelectionLength: number;
    maxSelectionLength: number;
    
    // Suggestion settings
    maxSuggestions: number;
    suggestionTimeout: number;
    
    // UI settings
    popupDelay: number;
    showIcons: boolean;
    compactMode: boolean;
    
    // AI settings
    useContext: boolean;
    includeFileContent: boolean;
    maxContextLength: number;
}

export const DEFAULT_INLINE_AI_SETTINGS: InlineAISettings = {
    enabled: true,
    enableAnalysis: true,
    enableEditing: true,
    enableCompletion: true,
    minSelectionLength: 3,
    maxSelectionLength: 1000,
    maxSuggestions: 5,
    suggestionTimeout: 3000,
    popupDelay: 300,
    showIcons: true,
    compactMode: false,
    useContext: true,
    includeFileContent: true,
    maxContextLength: 2000
};

export interface InlineAIResult {
    action: string;
    originalText: string;
    result: string;
    timestamp: number;
    file?: string;
}

export interface InlineAIStats {
    totalActions: number;
    actionsByType: { [key: string]: number };
    averageResponseTime: number;
    cacheHitRate: number;
}