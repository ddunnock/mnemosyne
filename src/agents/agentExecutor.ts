/**
 * Agent Executor
 *
 * Core execution engine for RAG agents
 * Coordinates retrieval, context building, and LLM interaction
 */

import { RAGRetriever } from '../rag/retriever';
import { LLMManager } from '../llm/llmManager';
import {
    AgentConfig,
    AgentExecutionContext,
    AgentResponse,
    Message,
    RetrievedChunk,
    MetadataFilters
} from '../types';
import { RAGError, LLMError } from '../types';

export class AgentExecutor {
    private config: AgentConfig;
    private retriever: RAGRetriever;
    private llmManager: LLMManager;

    constructor(
        config: AgentConfig,
        retriever: RAGRetriever,
        llmManager: LLMManager
    ) {
        this.config = config;
        this.retriever = retriever;
        this.llmManager = llmManager;
    }

    /**
     * Execute the agent with a query
     */
    async execute(
        query: string,
        context?: AgentExecutionContext
    ): Promise<AgentResponse> {
        const startTime = Date.now();

        try {
            // Validate inputs
            if (!query || query.trim().length === 0) {
                throw new Error('Query cannot be empty');
            }

            // Ensure RAG system is ready
            if (!this.retriever.isReady()) {
                throw new RAGError(
                    'RAG system not ready. Please configure an OpenAI API key and ingest chunks in settings.'
                );
            }

            // Step 1: Retrieve relevant chunks
            const retrievedChunks = await this.retrieveContext(query, context);

            if (retrievedChunks.length === 0) {
                console.warn('No relevant chunks found for query:', query);
            }

            // Step 2: Build context from chunks
            const contextText = this.buildContextText(retrievedChunks);

            // Step 3: Build messages for LLM
            const messages = this.buildMessages(query, contextText, context);

            // Step 4: Get response from LLM
            const llmResponse = await this.queryLLM(messages);

            // Step 5: Build and return agent response
            const executionTime = Date.now() - startTime;

            return {
                answer: llmResponse.content,
                sources: retrievedChunks.map(chunk => chunk.metadata),
                agentUsed: this.config.name,
                llmProvider: this.getLLMProviderName(),
                model: this.getLLMModelName(),
                retrievedChunks,
                usage: llmResponse.usage,
                executionTime
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Agent execution failed:', error);

            // Provide helpful error messages
            if (error instanceof RAGError) {
                throw error;
            }

            if (error instanceof LLMError) {
                throw error;
            }

            throw new Error(`Agent execution failed: ${errorMessage}`);
        }
    }

    /**
     * Retrieve relevant chunks for the query
     *
     * ✅ PATCHED: Now passes scoreThreshold from agent config to retriever
     */
    private async retrieveContext(
        query: string,
        context?: AgentExecutionContext
    ): Promise<RetrievedChunk[]> {
        try {
            // Build enhanced query if we have conversation history
            let searchQuery = query;

            if (context?.conversationHistory && context.conversationHistory.length > 0) {
                // Extract last few messages for context
                const recentMessages = context.conversationHistory
                    .slice(-3)
                    .filter(m => m.role === 'user')
                    .map(m => m.content)
                    .join(' ');

                // Combine with current query
                searchQuery = `${recentMessages} ${query}`;
            }

            // Retrieve chunks using configured settings
            // ✅ FIXED: Now passes scoreThreshold from agent config
            const chunks = await this.retriever.retrieve(
                searchQuery,
                this.config.retrievalSettings.topK,
                this.config.metadataFilters as MetadataFilters,
                this.config.retrievalSettings.scoreThreshold  // ✅ NEW: Pass the threshold!
            );

            // Retrieved chunks for agent processing

            return chunks;
        } catch (error) {
            console.error('Retrieval failed:', error);
            throw new RAGError('Failed to retrieve context', { originalError: error });
        }
    }

    /**
     * Build context text from retrieved chunks
     */
    private buildContextText(chunks: RetrievedChunk[]): string {
        if (chunks.length === 0) {
            return '[No relevant context found in knowledge base]';
        }

        // Build context with metadata and content
        const contextParts = chunks.map((chunk, index) => {
            const { metadata, content, score } = chunk;

            // Build metadata header
            const metaInfo = [
                `**Source ${index + 1}** (Relevance: ${(score * 100).toFixed(1)}%)`,
                `Document: ${metadata.document_title}`,
                `Section: ${metadata.section}${metadata.section_title ? ' - ' + metadata.section_title : ''}`,
                metadata.content_type ? `Type: ${metadata.content_type}` : null,
                metadata.page_reference ? `Page: ${metadata.page_reference}` : null
            ]
                .filter(Boolean)
                .join('\n');

            // Return formatted chunk
            return `${metaInfo}\n\n${content}\n\n---`;
        });

        return contextParts.join('\n\n');
    }

    /**
     * Build messages array for LLM
     */
    private buildMessages(
        query: string,
        contextText: string,
        executionContext?: AgentExecutionContext
    ): Message[] {
        const messages: Message[] = [];

        // Add system prompt with context injected
        const systemPrompt = this.config.systemPrompt.replace('{context}', contextText);
        messages.push({
            role: 'system',
            content: systemPrompt
        });

        // Add conversation history if provided
        if (executionContext?.conversationHistory) {
            messages.push(...executionContext.conversationHistory);
        }

        // Add note context if provided
        if (executionContext?.noteContext) {
            const noteContextMsg = this.buildNoteContextMessage(executionContext.noteContext);
            if (noteContextMsg) {
                messages.push(noteContextMsg);
            }
        }

        // Add additional context if provided
        if (executionContext?.additionalContext) {
            const additionalMsg = this.buildAdditionalContextMessage(
                executionContext.additionalContext
            );
            if (additionalMsg) {
                messages.push(additionalMsg);
            }
        }

        // Add current query
        messages.push({
            role: 'user',
            content: query
        });

        return messages;
    }

    /**
     * Build message from note context
     */
    private buildNoteContextMessage(noteContext: {
        notePath: string;
        noteContent: string;
        frontmatter?: Record<string, unknown>;
    }): Message | null {
        const parts: string[] = [
            '**Current Note Context:**',
            `Path: ${noteContext.notePath}`
        ];

        if (noteContext.frontmatter && Object.keys(noteContext.frontmatter).length > 0) {
            parts.push('\n**Frontmatter:**');
            parts.push(JSON.stringify(noteContext.frontmatter, null, 2));
        }

        if (noteContext.noteContent && noteContext.noteContent.trim().length > 0) {
            // Truncate if too long
            const maxLength = 2000;
            const content =
                noteContext.noteContent.length > maxLength
                    ? noteContext.noteContent.substring(0, maxLength) + '...\n[Content truncated]'
                    : noteContext.noteContent;

            parts.push('\n**Note Content:**');
            parts.push(content);
        }

        return {
            role: 'user',
            content: parts.join('\n')
        };
    }

    /**
     * Build message from additional context
     */
    private buildAdditionalContextMessage(
        additionalContext: Record<string, unknown>
    ): Message | null {
        if (Object.keys(additionalContext).length === 0) {
            return null;
        }

        return {
            role: 'user',
            content: `**Additional Context:**\n${JSON.stringify(additionalContext, null, 2)}`
        };
    }

    /**
     * Query the LLM with built messages
     */
    private async queryLLM(messages: Message[]) {
        try {
            // Get LLM provider
            const provider = this.llmManager.getProvider(this.config.llmId);

            if (!provider) {
                throw new LLMError(`LLM provider not found: ${this.config.llmId}`);
            }

            // Execute chat
            const response = await this.llmManager.chat(this.config.llmId, messages, {
                temperature: undefined, // Use provider defaults
                maxTokens: undefined
            });

            return response;
        } catch (error) {
            console.error('LLM query failed:', error);
            throw new LLMError('Failed to get LLM response', { originalError: error });
        }
    }

    /**
     * Get LLM provider name for response metadata
     * Made public so AgentManager can access it
     */
    public getLLMProviderName(): string {
        const provider = this.llmManager.getProvider(this.config.llmId);
        return provider?.name || 'Unknown';
    }

    /**
     * Get LLM model name for response metadata
     * Made public so AgentManager can access it
     */
    public getLLMModelName(): string {
        const provider = this.llmManager.getProvider(this.config.llmId);
        return provider?.model || 'Unknown';
    }

    /**
     * Get agent configuration
     */
    getConfig(): AgentConfig {
        return this.config;
    }

    /**
     * Update agent configuration
     */
    updateConfig(newConfig: AgentConfig): void {
        this.config = newConfig;
    }

    /**
     * Test agent execution with a simple query
     */
    async test(): Promise<boolean> {
        try {
            const response = await this.execute('What is risk management?');
            return response.answer.length > 0;
        } catch (error) {
            console.error('Agent test failed:', error);
            return false;
        }
    }

    /**
     * Get agent info for display
     */
    getInfo(): {
        name: string;
        description: string;
        llmProvider: string;
        llmModel: string;
        retrievalSettings: {
            topK: number;
            scoreThreshold: number;
        };
        enabled: boolean;
    } {
        return {
            name: this.config.name,
            description: this.config.description,
            llmProvider: this.getLLMProviderName(),
            llmModel: this.getLLMModelName(),
            retrievalSettings: this.config.retrievalSettings,
            enabled: this.config.enabled
        };
    }
}
