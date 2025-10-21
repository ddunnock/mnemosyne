/**
 * Agent Tools
 *
 * Tools that allow the master agent to call other specialized agents
 */

import { ToolDefinition, ToolParameter } from './toolTypes';
import { AgentInfo } from '../types';

export class AgentTools {
    /**
     * Generate tool definition for calling a specific agent
     */
    static generateAgentToolDefinition(agent: AgentInfo): ToolDefinition {
        return {
            name: `call_${this.sanitizeAgentId(agent.id)}`,
            description: `Call the "${agent.name}" agent. ${agent.description}`,
            category: 'agent',
            parameters: [
                {
                    name: 'query',
                    description: 'The question or task to send to this agent',
                    type: 'string',
                    required: true
                },
                {
                    name: 'context',
                    description: 'Optional additional context or information for the agent',
                    type: 'string',
                    required: false
                }
            ],
            returns: {
                type: 'object',
                description: 'The agent\'s response with answer, sources, and metadata'
            },
            examples: [
                `call_${this.sanitizeAgentId(agent.id)}({ query: "example task", context: "additional info" })`
            ],
            dangerous: false
        };
    }

    /**
     * Get the list agents tool definition
     */
    static getListAgentsDefinition(): ToolDefinition {
        return {
            name: 'list_agents',
            description: 'Get a list of all available specialized agents with their capabilities. Use this to understand which agents are available and what they can do.',
            category: 'agent',
            parameters: [],
            returns: {
                type: 'array',
                description: 'List of available agents with their names, descriptions, and capabilities'
            },
            examples: [
                'list_agents()'
            ],
            dangerous: false
        };
    }

    /**
     * Sanitize agent ID to make it a valid function name
     * e.g., "risk-discovery-agent" -> "risk_discovery_agent"
     */
    private static sanitizeAgentId(agentId: string): string {
        return agentId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }
}
