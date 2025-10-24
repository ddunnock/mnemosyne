/**
 * Agent Executor
 *
 * Core execution engine for RAG agents
 * Coordinates retrieval, context building, and LLM interaction
 *
 * ✨ MCP ENHANCED: Now supports tool calling for reading/writing notes
 */

import { App } from 'obsidian';
import { RAGRetriever } from '../rag/retriever';
import { LLMManager } from '../llm/llmManager';
import {
    AgentConfig,
    AgentExecutionContext,
    AgentResponse,
    Message,
    RetrievedChunk
} from '../types';
import { RAGError, LLMError } from '../types';
// MCP Agent Functionality
import { ToolExecutor } from "@/tools/toolExecutor";
import { ToolInvocation, ToolResult, ToolExecutionContext } from "@/tools/toolTypes";

export class AgentExecutor {
    private config: AgentConfig;
    private retriever: RAGRetriever;
    private llmManager: LLMManager;
    private toolExecutor?: ToolExecutor; // ✨ NEW: Tool executor for MCP functionality
    private app?: App; // ✨ NEW: Obsidian app instance for tool operations

    constructor(
        config: AgentConfig,
        retriever: RAGRetriever,
        llmManager: LLMManager,
        app?: App  // ✨ NEW: Optional Obsidian App for tool support
    ) {
        this.config = config;
        this.retriever = retriever;
        this.llmManager = llmManager;
        this.app = app;

        // Initialize tool executor if app provided
        if (app) {
            this.toolExecutor = new ToolExecutor(app);
            console.log('🛠️ Tool executor initialized for agent:', config.name);
        }
    }

    /**
     * Execute the agent with a query
     * ✨ MCP ENHANCED: Now supports tool calling
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

            // Step 1: Retrieve relevant chunks (if RAG is available)
            let contextText = '';
            let retrievedChunks: RetrievedChunk[] = [];

            if (this.retriever.isReady()) {
                try {
                    // Debug: Check vector store stats
                    const stats = await this.retriever.getStats();
                    console.log('Vector store stats:', stats);

                    retrievedChunks = await this.retrieveContext(query, context);

                    if (retrievedChunks.length === 0) {
                        console.warn('No relevant chunks found for query:', query);
                        console.log('Vector store has', stats?.totalChunks || 0, 'total chunks');
                        contextText = '[No relevant context found in knowledge base]';
                    } else {
                        console.log('Found', retrievedChunks.length, 'relevant chunks');
                        contextText = this.buildContextText(retrievedChunks);
                    }
                } catch (ragError) {
                    // Gracefully handle RAG failures (e.g., invalid API keys, network issues)
                    console.warn('RAG retrieval failed, continuing without context:', ragError);
                    contextText = '[RAG retrieval failed - agent will respond without knowledge base context]';
                }
            } else {
                console.log('RAG system not available - using agent without knowledge base context');
                contextText = '[RAG system not configured - agent will respond without knowledge base context]';
            }

            // Step 2: Build messages for LLM
            const messages = this.buildMessages(query, contextText, context);

            // ✨ NEW: Check if agent supports tools
            console.log('🔍 Tool support check:', {
                'config.enableTools': this.config.enableTools,
                'toolExecutor exists': !!this.toolExecutor,
                'app exists': !!this.app
            });
            const supportsTools = this.config.enableTools && this.toolExecutor;

            // Step 3: Get LLM response with optional tool support
            let llmResponse;
            let toolResults: ToolResult[] = [];

            if (supportsTools) {
                console.log('🛠️ Agent has tools enabled, using function calling');
                // Use function calling
                const result = await this.executeWithTools(messages);
                llmResponse = result.llmResponse;
                toolResults = result.toolResults;
            } else {
                // Standard execution without tools
                llmResponse = await this.queryLLM(messages);
            }

            // Step 4: Build and return agent response
            const executionTime = Date.now() - startTime;

            return {
                answer: llmResponse.content,
                sources: retrievedChunks.map(chunk => chunk.metadata),
                agentUsed: this.config.name,
                llmProvider: this.getLLMProviderName(),
                model: this.getLLMModelName(),
                retrievedChunks,
                usage: llmResponse.usage,
                executionTime,
                toolResults: toolResults.length > 0 ? toolResults : undefined  // ✨ NEW: Include tool results
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
                this.config.metadataFilters,
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
     * ✨ MCP ENHANCED: Automatically injects tool instructions when enableTools is true
     */
    private buildMessages(
        query: string,
        contextText: string,
        executionContext?: AgentExecutionContext
    ): Message[] {
        const messages: Message[] = [];

        // Add system prompt with context injected
        let systemPrompt = this.config.systemPrompt.replace('{context}', contextText);

        // ✨ AUTO-INJECT: Add tool instructions if MCP is enabled
        if (this.config.enableTools && this.toolExecutor) {
            const toolInstructions = this.buildToolInstructions();
            systemPrompt = `${systemPrompt}\n\n${toolInstructions}`;
        }

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
     * ✨ AUTO-INJECT: Build tool instructions for the system prompt
     * This is automatically added when enableTools is true
     */
    private buildToolInstructions(): string {
        if (!this.toolExecutor) {
            return '';
        }

        const availableTools = this.toolExecutor.getAvailableTools();

        // Filter tools based on agent permissions
        const allowedTools = availableTools.filter(tool => {
            // Filter out dangerous tools if not allowed
            if (tool.dangerous && !this.config.allowDangerousOperations) {
                return false;
            }
            return true;
        });

        if (allowedTools.length === 0) {
            return '';
        }

        const instructions = [
            '---',
            '',
            '## 🛠️ Available Tools',
            '',
            'You have access to the following tools to interact with the Obsidian vault:',
            ''
        ];

        // Group tools by category
        const categories = new Map<string, typeof allowedTools>();
        for (const tool of allowedTools) {
            const category = tool.category || 'other';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(tool);
        }

        // Build tool descriptions
        for (const [category, tools] of categories) {
            instructions.push(`**${category.charAt(0).toUpperCase() + category.slice(1)} Tools:**`);
            instructions.push('');

            for (const tool of tools) {
                instructions.push(`- **${tool.name}**: ${tool.description}`);

                // Add parameter info
                const requiredParams = tool.parameters.filter(p => p.required);
                if (requiredParams.length > 0) {
                    instructions.push(`  - Parameters: ${requiredParams.map(p => p.name).join(', ')}`);
                }

                // Add examples if available
                if (tool.examples && tool.examples.length > 0) {
                    instructions.push(`  - Example: \`${tool.examples[0]}\``);
                }

                instructions.push('');
            }
        }

        // Add usage guidelines
        instructions.push('**Tool Usage Guidelines:**');
        instructions.push('');
        instructions.push('- Use tools when you need to access specific notes, search the vault, or get information beyond the provided context');
        instructions.push('- The `get_active_note` tool gives you the currently open note - very useful for context-aware assistance');
        instructions.push('- Use `search_notes` to find relevant notes when the provided context isn\'t sufficient');
        instructions.push('- Use `read_note` to read specific notes you\'ve discovered or that the user mentions');
        instructions.push('- Use `list_notes` to explore folder structures');

        if (this.config.allowDangerousOperations) {
            instructions.push('- You can create and modify notes using `write_note` - use this responsibly');
        } else {
            instructions.push('- You have read-only access (cannot create or modify notes)');
        }

        if (this.config.folderScope && this.config.folderScope.length > 0) {
            instructions.push(`- **Folder restrictions**: You can only access notes in: ${this.config.folderScope.join(', ')}`);
        } else {
            instructions.push('- You have access to the entire vault');
        }

        instructions.push('');
        instructions.push('**When to use tools:**');
        instructions.push('- The user asks about specific notes you don\'t have in context');
        instructions.push('- You need more recent or detailed information');
        instructions.push('- The user wants to search for or explore their vault');
        instructions.push('- You\'re working with the currently active note');
        instructions.push('');

        return instructions.join('\n');
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
     * ✨ NEW: Execute with tool support (function calling)
     *
     * This method implements a tool calling loop that allows the LLM to:
     * 1. Decide which tools to call based on available tool definitions
     * 2. Execute those tools safely with validation
     * 3. Process tool results and provide a final answer
     */
    private async executeWithTools(messages: Message[]): Promise<{
        llmResponse: { content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } };
        toolResults: ToolResult[];
    }> {
        if (!this.toolExecutor) {
            throw new Error('Tool executor not initialized');
        }

        const toolResults: ToolResult[] = [];
        let currentMessages = [...messages];
        let iteration = 0;
        const maxIterations = 5; // Prevent infinite loops

        while (iteration < maxIterations) {
            iteration++;
            console.log(`🔄 Tool execution iteration ${iteration}/${maxIterations}`);

            // Get LLM provider
            const provider = this.llmManager.getProvider(this.config.llmId);
            if (!provider) {
                throw new LLMError(`LLM provider not found: ${this.config.llmId}`);
            }

            // Check if provider supports function calling
            if (!provider.supportsFunctionCalling || !provider.chatWithFunctions) {
                console.log('⚠️ Provider does not support function calling, falling back to standard execution');
                const response = await this.queryLLM(currentMessages);
                return { llmResponse: response, toolResults: [] };
            }

            // Get tools in the correct format for the provider
            // ✨ FIXED: Pass permission options to filter dangerous tools
            const isAnthropic = provider.name.toLowerCase().includes('anthropic') || provider.name.toLowerCase().includes('claude');
            const tools = isAnthropic
                ? this.toolExecutor.getToolSchemasForAnthropic({ allowDangerousOperations: this.config.allowDangerousOperations })
                : this.toolExecutor.getToolSchemasForOpenAI({ allowDangerousOperations: this.config.allowDangerousOperations });

            const toolNames = isAnthropic
                ? (tools as any[]).map((t: any) => t.name).join(', ')
                : (tools as any[]).map((t: any) => t.function.name).join(', ');
            console.log(`🛠️ Available tools (${isAnthropic ? 'Anthropic' : 'OpenAI'} format):`, toolNames);

            // Call LLM with function definitions
            console.log('📞 Calling LLM with function calling enabled...');
            const response = await provider.chatWithFunctions(
                currentMessages,
                tools,
                {
                    temperature: undefined,
                    maxTokens: undefined
                }
            );

            // Check if LLM wants to call a function
            if (response.functionCall) {
                console.log(`🎯 LLM wants to call tool: ${response.functionCall.name}`);

                // Parse function call
                const toolInvocation: ToolInvocation = {
                    toolName: response.functionCall.name,
                    parameters: response.functionCall.arguments,
                    invocationId: `${Date.now()}-${iteration}`
                };

                console.log(`📋 Tool parameters:`, toolInvocation.parameters);

                // Build execution context
                const execContext: ToolExecutionContext = {
                    agentName: this.config.name,
                    vaultPath: this.app?.vault.getRoot().path || '',
                    restrictToFolders: this.config.folderScope,
                    readOnly: !this.config.allowDangerousOperations,
                    allowDangerousOperations: this.config.allowDangerousOperations || false
                };

                // Execute tool
                console.log(`⚙️ Executing tool: ${toolInvocation.toolName}...`);
                const toolResult = await this.toolExecutor.execute(toolInvocation, execContext);
                toolResults.push(toolResult);

                if (toolResult.success) {
                    console.log(`✅ Tool executed successfully`);
                } else {
                    console.error(`❌ Tool execution failed:`, toolResult.error);
                }

                // Add assistant's function call to conversation
                currentMessages.push({
                    role: 'assistant',
                    content: response.content || `[Calling tool: ${toolInvocation.toolName}]`,
                    functionCall: response.functionCall
                });

                // Add tool result to conversation
                currentMessages.push({
                    role: 'function',
                    name: toolInvocation.toolName,
                    content: JSON.stringify(toolResult)
                });

                // Continue loop to let LLM process tool result
                console.log('🔄 Continuing conversation with tool result...');
                continue;
            } else {
                // LLM provided final answer
                console.log('✅ LLM provided final answer (no more tools to call)');
                return {
                    llmResponse: {
                        content: response.content,
                        usage: response.usage
                    },
                    toolResults
                };
            }
        }

        // Max iterations reached
        console.warn('⚠️ Maximum tool calling iterations reached');
        return {
            llmResponse: {
                content: 'I apologize, but I exceeded the maximum number of tool calls while processing your request. Please try rephrasing your question or breaking it into smaller requests.',
                usage: undefined
            },
            toolResults
        };
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
            const response = await this.execute('Hello, can you help me?');
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
