/**
 * Tool Executor
 *
 * Safely executes agent tools with validation and error handling
 */

import { App } from 'obsidian';
import {
    ToolDefinition,
    ToolInvocation,
    ToolResult,
    ToolExecutionContext,
    ToolAuditEntry,
    ToolExecutionError,
    ToolValidationError
} from './toolTypes';
import { VaultTools } from './vaultTools';
import { ToolRegistry } from './toolRegistry';

export class ToolExecutor {
    private vaultTools: VaultTools;
    private registry: ToolRegistry;
    private auditLog: ToolAuditEntry[] = [];

    constructor(private app: App) {
        this.vaultTools = new VaultTools(app);
        this.registry = new ToolRegistry(this.vaultTools);
    }

    /**
     * Get all available tools
     */
    getAvailableTools(): ToolDefinition[] {
        return this.registry.getAllTools();
    }

    /**
     * Get tools formatted for OpenAI function calling
     * ✨ FIXED: Now supports filtering based on permissions
     */
    getToolSchemasForOpenAI(options?: { allowDangerousOperations?: boolean }): Array<{
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
        const allTools = this.registry.getToolSchemasForOpenAI();

        // Filter out dangerous tools if not allowed
        if (options && options.allowDangerousOperations === false) {
            const allowedToolNames = this.getAvailableTools()
                .filter(tool => !tool.dangerous)
                .map(tool => tool.name);

            return allTools.filter(tool => allowedToolNames.includes(tool.function.name));
        }

        return allTools;
    }

    /**
     * Get tools formatted for Anthropic Claude tool use
     * ✨ FIXED: Now supports filtering based on permissions
     */
    getToolSchemasForAnthropic(options?: { allowDangerousOperations?: boolean }): Array<{
        name: string;
        description: string;
        input_schema: {
            type: 'object';
            properties: Record<string, unknown>;
            required: string[];
        };
    }> {
        const allTools = this.registry.getToolSchemasForAnthropic();

        // Filter out dangerous tools if not allowed
        if (options && options.allowDangerousOperations === false) {
            const allowedToolNames = this.getAvailableTools()
                .filter(tool => !tool.dangerous)
                .map(tool => tool.name);

            return allTools.filter(tool => allowedToolNames.includes(tool.name));
        }

        return allTools;
    }

    /**
     * Get specific tool definition
     */
    getToolDefinition(toolName: string): ToolDefinition | null {
        return this.registry.getTool(toolName);
    }

    /**
     * Execute a tool invocation
     */
    async execute(
        invocation: ToolInvocation,
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            // Validate tool exists
            const toolDef = this.getToolDefinition(invocation.toolName);
            if (!toolDef) {
                throw new ToolExecutionError(
                    `Unknown tool: ${invocation.toolName}`,
                    'UNKNOWN_TOOL',
                    invocation.toolName
                );
            }

            // Validate parameters
            this.validateParameters(invocation.parameters, toolDef);

            // Check dangerous operations
            if (toolDef.dangerous && !context.allowDangerousOperations) {
                throw new ToolExecutionError(
                    `Dangerous operation not allowed: ${invocation.toolName}`,
                    'DANGEROUS_OPERATION',
                    invocation.toolName
                );
            }

            // Execute the tool
            const result = await this.executeTool(invocation.toolName, invocation.parameters, context);

            // Log successful execution
            this.logExecution(
                context.agentName,
                invocation.toolName,
                invocation.parameters,
                result,
                Date.now() - startTime
            );

            return result;
        } catch (error) {
            // Log failed execution
            const failedResult: ToolResult = {
                success: false,
                error: {
                    code: error instanceof ToolExecutionError ? error.code : 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                    details: error instanceof ToolExecutionError ? error.details : undefined
                }
            };

            this.logExecution(
                context.agentName,
                invocation.toolName,
                invocation.parameters,
                failedResult,
                Date.now() - startTime
            );

            return failedResult;
        }
    }

    /**
     * Execute multiple tools in sequence
     */
    async executeMultiple(
        invocations: ToolInvocation[],
        context: ToolExecutionContext
    ): Promise<ToolResult[]> {
        const results: ToolResult[] = [];

        for (const invocation of invocations) {
            const result = await this.execute(invocation, context);
            results.push(result);

            // Stop on first failure if not configured to continue
            if (!result.success) {
                break;
            }
        }

        return results;
    }

    /**
     * Validate parameters against tool definition
     */
    private validateParameters(
        parameters: Record<string, unknown>,
        toolDef: ToolDefinition
    ): void {
        // Check required parameters
        for (const param of toolDef.parameters) {
            if (param.required && !(param.name in parameters)) {
                throw new ToolValidationError(
                    toolDef.name,
                    `Missing required parameter: ${param.name}`,
                    { requiredParameters: toolDef.parameters.filter(p => p.required).map(p => p.name) }
                );
            }

            // Validate parameter type if present
            if (param.name in parameters) {
                const value = parameters[param.name];
                const actualType = Array.isArray(value) ? 'array' : typeof value;

                if (actualType !== param.type && value !== null && value !== undefined) {
                    throw new ToolValidationError(
                        toolDef.name,
                        `Invalid type for parameter ${param.name}: expected ${param.type}, got ${actualType}`,
                        { parameter: param.name, expected: param.type, actual: actualType }
                    );
                }

                // Validate enum values
                if (param.enum && param.enum.length > 0) {
                    if (!param.enum.includes(String(value))) {
                        throw new ToolValidationError(
                            toolDef.name,
                            `Invalid value for parameter ${param.name}: must be one of ${param.enum.join(', ')}`,
                            { parameter: param.name, allowedValues: param.enum }
                        );
                    }
                }
            }
        }
    }

    /**
     * Execute the appropriate tool handler
     */
    private async executeTool(
        toolName: string,
        parameters: Record<string, unknown>,
        context: ToolExecutionContext
    ): Promise<ToolResult> {
        switch (toolName) {
            case 'read_note':
                return this.vaultTools.executeReadNote(
                    parameters as { path: string; include_frontmatter?: boolean },
                    context
                );

            case 'write_note':
                return this.vaultTools.executeWriteNote(
                    parameters as {
                        path: string;
                        content: string;
                        frontmatter?: Record<string, unknown>;
                        append?: boolean;
                    },
                    context
                );

            case 'search_notes':
                return this.vaultTools.executeSearchNotes(parameters, context);

            case 'list_notes':
                return this.vaultTools.executeListNotes(
                    parameters as { folder: string; recursive?: boolean },
                    context
                );

            case 'get_active_note':
                return this.vaultTools.executeGetActiveNote(
                    parameters as { include_content?: boolean },
                    context
                );

            default:
                throw new ToolExecutionError(
                    `Tool handler not implemented: ${toolName}`,
                    'NOT_IMPLEMENTED',
                    toolName
                );
        }
    }

    /**
     * Log tool execution to audit log
     */
    private logExecution(
        agentName: string,
        toolName: string,
        parameters: Record<string, unknown>,
        result: ToolResult,
        durationMs: number
    ): void {
        const entry: ToolAuditEntry = {
            timestamp: Date.now(),
            agentName,
            toolName,
            parameters,
            result,
            durationMs
        };

        this.auditLog.push(entry);

        // Keep only last 1000 entries
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
    }

    /**
     * Get recent audit log entries
     */
    getAuditLog(limit: number = 100): ToolAuditEntry[] {
        return this.auditLog.slice(-limit);
    }

    /**
     * Clear audit log
     */
    clearAuditLog(): void {
        this.auditLog = [];
    }
}