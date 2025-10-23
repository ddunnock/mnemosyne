import RiskManagementPlugin from '../main';
import { AgentResponse } from '../types';

interface EnhancementResult {
    success: boolean;
    enhancedText?: string;
    error?: string;
    metadata?: {
        action: string;
        originalLength: number;
        enhancedLength: number;
        processingTime: number;
    };
}

export class InlineAIProcessor {
    private plugin: RiskManagementPlugin;

    constructor(plugin: RiskManagementPlugin) {
        this.plugin = plugin;
    }

    async processEnhancement(
        text: string,
        action: string,
        options?: any
    ): Promise<EnhancementResult> {
        const startTime = Date.now();

        try {
            // Check if system is ready
            if (!this.plugin.agentManager?.isReady()) {
                return {
                    success: false,
                    error: 'AI system not ready. Please configure an AI provider first.'
                };
            }

            // Get the default agent or first available agent
            const agent = this.plugin.agentManager.getDefaultAgent();
            if (!agent) {
                return {
                    success: false,
                    error: 'No AI agent available. Please configure an agent first.'
                };
            }

            // Build the enhancement prompt based on action
            const prompt = this.buildEnhancementPrompt(text, action, options);

            // Execute the agent
            const response: AgentResponse = await agent.execute(prompt, {
                noteContext: {
                    notePath: this.getCurrentNotePath(),
                    noteContent: this.getCurrentNoteContent()
                }
            });

            // Extract and clean the enhanced text
            const enhancedText = this.extractEnhancedText(response.answer, text);

            return {
                success: true,
                enhancedText,
                metadata: {
                    action,
                    originalLength: text.length,
                    enhancedLength: enhancedText.length,
                    processingTime: Date.now() - startTime
                }
            };

        } catch (error) {
            console.error('Enhancement processing error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private buildEnhancementPrompt(text: string, action: string, options?: any): string {
        const basePrompt = `Please enhance the following text. The user has selected this text and wants it to be ${action}d.

Selected text: "${text}"

Instructions:`;

        switch (action) {
            case 'summarize':
                return `${basePrompt}
- Create a concise summary that captures the main points
- Maintain the original meaning and key information
- Keep it shorter than the original text
- Use clear, direct language`;

            case 'explain':
                return `${basePrompt}
- Provide a detailed explanation of the concepts
- Break down complex ideas into simpler terms
- Add context and background information where helpful
- Use examples if appropriate`;

            case 'improve':
                return `${basePrompt}
- Improve clarity, flow, and readability
- Fix any grammatical issues
- Enhance word choice and sentence structure
- Maintain the original meaning and tone`;

            case 'expand':
                return `${basePrompt}
- Add more detail and context
- Provide additional examples or explanations
- Elaborate on key points
- Make the text more comprehensive`;

            case 'simplify':
                return `${basePrompt}
- Simplify complex language and concepts
- Use shorter sentences and common words
- Remove unnecessary jargon
- Make it accessible to a broader audience`;

            case 'translate':
                const targetLang = options?.language || 'English';
                return `${basePrompt}
- Translate the text to ${targetLang}
- Maintain the original meaning and tone
- Use natural, fluent language in the target language
- Preserve any technical terms appropriately`;

            case 'analyze':
                return `${basePrompt}
- Provide a critical analysis of the content
- Identify strengths and weaknesses
- Suggest improvements or alternatives
- Offer insights and observations`;

            case 'rewrite':
                return `${basePrompt}
- Completely rewrite the text with a fresh approach
- Maintain the core message and information
- Use different structure and phrasing
- Improve overall quality and impact`;

            case 'custom':
                const customPrompt = options?.prompt || '';
                return `${basePrompt}
- Follow these specific instructions: ${customPrompt}
- Maintain the original meaning unless specifically asked to change it
- Apply the requested changes thoughtfully`;

            default:
                return `${basePrompt}
- Enhance the text according to the "${action}" action
- Maintain the original meaning
- Improve clarity and quality`;

        }
    }

    private extractEnhancedText(response: string, originalText: string): string {
        // Try to extract the enhanced text from the response
        // Look for patterns that indicate the enhanced text
        
        // Remove any markdown formatting that might have been added
        let cleaned = response
            .replace(/^```[\s\S]*?```$/gm, '') // Remove code blocks
            .replace(/^\*\*(.*?)\*\*$/gm, '$1') // Remove bold formatting
            .replace(/^\*(.*?)\*$/gm, '$1') // Remove italic formatting
            .trim();

        // If the response is very different in length, it might be the enhanced text
        if (Math.abs(cleaned.length - originalText.length) > originalText.length * 0.5) {
            return cleaned;
        }

        // Look for quoted text that might be the enhanced version
        const quotedMatch = cleaned.match(/"([^"]+)"/);
        if (quotedMatch) {
            return quotedMatch[1];
        }

        // Look for text after common prefixes
        const prefixes = [
            'Enhanced text:',
            'Here is the enhanced text:',
            'The enhanced version:',
            'Result:',
            'Output:'
        ];

        for (const prefix of prefixes) {
            const index = cleaned.indexOf(prefix);
            if (index !== -1) {
                return cleaned.substring(index + prefix.length).trim();
            }
        }

        // If no clear pattern, return the cleaned response
        return cleaned;
    }

    private getCurrentNotePath(): string {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        return activeFile?.path || '';
    }

    private getCurrentNoteContent(): string {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (!activeFile) return '';

        // Get the current editor content
        const editor = this.plugin.app.workspace.activeEditor?.editor;
        return editor?.getValue() || '';
    }
}