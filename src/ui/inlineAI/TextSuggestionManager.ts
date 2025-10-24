/**
 * Text Suggestion Manager
 * 
 * Handles AI-powered text completion and suggestions
 */

import { Plugin, TFile } from 'obsidian';
import { InlineAISettings } from './types';

export interface TextSuggestion {
    text: string;
    confidence: number;
    type: 'completion' | 'alternative' | 'expansion';
}

export class TextSuggestionManager {
    private plugin: Plugin;
    private settings: InlineAISettings;
    private suggestionCache: Map<string, TextSuggestion[]> = new Map();
    private isGenerating: boolean = false;

    constructor(plugin: Plugin, settings: InlineAISettings) {
        this.plugin = plugin;
        this.settings = settings;
    }

    /**
     * Update settings
     */
    updateSettings(newSettings: InlineAISettings): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Get text completion suggestions
     */
    async getSuggestions(text: string, file: TFile | null): Promise<string[]> {
        if (!this.settings.enableCompletion) {
            return [];
        }

        // Check cache first
        const cacheKey = this.getCacheKey(text, file);
        if (this.suggestionCache.has(cacheKey)) {
            const cached = this.suggestionCache.get(cacheKey)!;
            return cached.map(s => s.text);
        }

        if (this.isGenerating) {
            return [];
        }

        try {
            this.isGenerating = true;
            const suggestions = await this.generateSuggestions(text, file);
            
            // Cache the results
            this.suggestionCache.set(cacheKey, suggestions);
            
            // Limit cache size
            if (this.suggestionCache.size > 50) {
                const firstKey = this.suggestionCache.keys().next().value;
                this.suggestionCache.delete(firstKey);
            }

            return suggestions.map(s => s.text);
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return [];
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Generate suggestions using AI
     */
    private async generateSuggestions(text: string, file: TFile | null): Promise<TextSuggestion[]> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            throw new Error('No AI agent available');
        }

        // Prepare context
        let context = '';
        if (file) {
            try {
                const fileContent = await this.plugin.app.vault.read(file);
                context = `\n\nContext from the current note:\n${fileContent}`;
            } catch (error) {
                console.warn('Could not read file for context:', error);
            }
        }

        // Create prompt for text completion
        const prompt = `Please provide ${this.settings.maxSuggestions} different ways to complete or continue the following text. Each suggestion should be a natural continuation that makes sense in context. Return only the completion text, one per line, without any explanations or formatting:

"${text}"${context}

Suggestions:`;

        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: context,
                    frontmatter: {}
                } : undefined
            });

            // Parse suggestions from response
            const suggestions = this.parseSuggestions(response.answer);
            
            // Generate different types of suggestions
            const result: TextSuggestion[] = [];
            
            // Add completion suggestions
            suggestions.slice(0, Math.min(3, this.settings.maxSuggestions)).forEach((suggestion, index) => {
                result.push({
                    text: suggestion,
                    confidence: 0.9 - (index * 0.1),
                    type: 'completion'
                });
            });

            // Add alternative suggestions if we have space
            if (result.length < this.settings.maxSuggestions) {
                const alternatives = await this.generateAlternativeSuggestions(text, file);
                alternatives.slice(0, this.settings.maxSuggestions - result.length).forEach((suggestion, index) => {
                    result.push({
                        text: suggestion,
                        confidence: 0.8 - (index * 0.1),
                        type: 'alternative'
                    });
                });
            }

            return result;
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return [];
        }
    }

    /**
     * Generate alternative suggestions
     */
    private async generateAlternativeSuggestions(text: string, file: TFile | null): Promise<string[]> {
        const agent = this.plugin.agentManager?.getDefaultAgent();
        if (!agent) {
            return [];
        }

        const prompt = `Please provide alternative ways to express or continue the following text. Focus on different styles, tones, or approaches. Return only the alternative text, one per line:

"${text}"

Alternatives:`;

        try {
            const response = await agent.execute(prompt, {
                noteContext: file ? {
                    notePath: file.path,
                    noteContent: await this.plugin.app.vault.read(file),
                    frontmatter: {}
                } : undefined
            });

            return this.parseSuggestions(response.answer);
        } catch (error) {
            console.error('Error generating alternative suggestions:', error);
            return [];
        }
    }

    /**
     * Parse suggestions from AI response
     */
    private parseSuggestions(response: string): string[] {
        const lines = response.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !line.match(/^(suggestions?|alternatives?|completions?):?$/i));

        // Remove common prefixes
        const cleaned = lines.map(line => {
            // Remove numbered lists (1., 2., etc.)
            line = line.replace(/^\d+\.\s*/, '');
            // Remove bullet points
            line = line.replace(/^[-*•]\s*/, '');
            // Remove quotes
            line = line.replace(/^["']|["']$/g, '');
            return line.trim();
        }).filter(line => line.length > 0);

        return cleaned;
    }

    /**
     * Get cache key for text and file
     */
    private getCacheKey(text: string, file: TFile | null): string {
        const fileKey = file ? file.path : 'no-file';
        return `${fileKey}:${text.substring(0, 100)}`;
    }

    /**
     * Clear suggestion cache
     */
    clearCache(): void {
        this.suggestionCache.clear();
    }

    /**
     * Get suggestion statistics
     */
    getStats(): {
        cacheSize: number;
        isGenerating: boolean;
    } {
        return {
            cacheSize: this.suggestionCache.size,
            isGenerating: this.isGenerating
        };
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        this.clearCache();
        this.isGenerating = false;
    }
}