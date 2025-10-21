/**
 * Tool Registry
 *
 * Central registry of all available tools
 */

import { ToolDefinition } from './toolTypes';
import { VaultTools } from './vaultTools';
import { AgentTools } from './agentTools';

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    constructor(private vaultTools: VaultTools) {
        this.registerTools();
    }

    /**
     * Register all available tools
     */
    private registerTools(): void {
        // Vault tools
        this.registerTool(VaultTools.getReadNoteDefinition());
        this.registerTool(VaultTools.getWriteNoteDefinition());
        this.registerTool(VaultTools.getSearchNotesDefinition());
        this.registerTool(VaultTools.getListNotesDefinition());
        this.registerTool(VaultTools.getActiveNoteDefinition());

        // Agent coordination tool
        this.registerTool(AgentTools.getListAgentsDefinition());

        // Dynamic agent tools are registered via updateAgentTools()
    }

    /**
     * Register a single tool
     */
    registerTool(definition: ToolDefinition): void {
        this.tools.set(definition.name, definition);
    }

    /**
     * Unregister a tool
     */
    unregisterTool(toolName: string): void {
        this.tools.delete(toolName);
    }

    /**
     * Update agent-specific tools
     * Called by AgentManager when agents are added/removed/updated
     */
    updateAgentTools(agents: Array<{ id: string; name: string; description: string; enabled: boolean }>): void {
        // Remove all existing agent call tools
        const existingAgentTools = Array.from(this.tools.values())
            .filter(tool => tool.name.startsWith('call_'));
        existingAgentTools.forEach(tool => this.unregisterTool(tool.name));

        // Register new agent tools (only for enabled agents)
        agents
            .filter(agent => agent.enabled)
            .forEach(agent => {
                const toolDef = AgentTools.generateAgentToolDefinition(agent);
                this.registerTool(toolDef);
            });

        console.log(`🔄 Updated agent tools: ${agents.filter(a => a.enabled).length} agents available`);
    }

    /**
     * Get all registered tools
     */
    getAllTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get specific tool by name
     */
    getTool(name: string): ToolDefinition | null {
        return this.tools.get(name) || null;
    }

    /**
     * Get tools by category
     */
    getToolsByCategory(category: string): ToolDefinition[] {
        return Array.from(this.tools.values()).filter(t => t.category === category);
    }

    /**
     * Search tools by description
     */
    searchTools(query: string): ToolDefinition[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.tools.values()).filter(
            t =>
                t.name.toLowerCase().includes(lowerQuery) ||
                t.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get tool schemas for LLM (OpenAI format)
     */
    getToolSchemasForOpenAI(): Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: {
                type: 'object';
                properties: Record<string, unknown>;
                required: string[];
            };
        };
    }> {
        return this.getAllTools().map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: this.convertParametersToSchema(tool.parameters),
                    required: tool.parameters.filter(p => p.required).map(p => p.name)
                }
            }
        }));
    }

    /**
     * Get tool schemas for Anthropic Claude format
     */
    getToolSchemasForAnthropic(): Array<{
        name: string;
        description: string;
        input_schema: {
            type: 'object';
            properties: Record<string, unknown>;
            required: string[];
        };
    }> {
        return this.getAllTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object',
                properties: this.convertParametersToSchema(tool.parameters),
                required: tool.parameters.filter(p => p.required).map(p => p.name)
            }
        }));
    }

    /**
     * Convert tool parameters to JSON schema
     * ✨ FIXED: Now properly handles array items and nested objects
     */
    private convertParametersToSchema(
        parameters: Array<{
            name: string;
            description: string;
            type: string;
            enum?: string[];
            items?: any; // ToolParameter for array items
            properties?: Record<string, any>; // For nested objects
        }>
    ): Record<string, unknown> {
        const schema: Record<string, unknown> = {};

        for (const param of parameters) {
            const paramSchema: any = {
                type: param.type,
                description: param.description
            };

            // Handle enum values
            if (param.enum) {
                paramSchema.enum = param.enum;
            }

            // ✨ FIXED: Handle array items - convert ToolParameter to JSON Schema
            if (param.type === 'array' && param.items) {
                paramSchema.items = {
                    type: param.items.type,
                    description: param.items.description
                };

                // Handle nested enums in array items
                if (param.items.enum) {
                    paramSchema.items.enum = param.items.enum;
                }
            }

            // Handle nested object properties
            if (param.type === 'object' && param.properties) {
                const nestedProps: Record<string, any> = {};
                for (const [key, value] of Object.entries(param.properties)) {
                    nestedProps[key] = {
                        type: value.type,
                        description: value.description
                    };
                    if (value.enum) {
                        nestedProps[key].enum = value.enum;
                    }
                }
                paramSchema.properties = nestedProps;
            }

            schema[param.name] = paramSchema;
        }

        return schema;
    }
}