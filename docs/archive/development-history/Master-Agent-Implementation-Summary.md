# Master Agent Orchestration Implementation

## Overview

The Mnemosyne plugin now features an intelligent master agent that automatically routes requests to specialized agents. This provides a single, transparent entry point for all interactions.

## What Was Implemented

### 1. **Master Agent (Mnemosyne)**

**File**: `src/agents/masterAgent.ts`

The master agent is an intelligent orchestrator with:
- **Auto-generated system prompt** that lists all available specialized agents
- **Tool-enabled architecture** allowing it to call other agents as tools
- **Transparent operation** - users don't need to know which agent handles their request
- **Automatic updates** - whenever you add, modify, or remove agents, the master's knowledge updates automatically

### 2. **Agent-Calling MCP Tools**

**Files**: `src/tools/agentTools.ts`, `src/tools/toolExecutor.ts`, `src/tools/toolRegistry.ts`

New tools that enable agent orchestration:
- `list_agents()` - Returns all available specialized agents with descriptions
- `call_{agent_id}(query, context?)` - Dynamically generated tools for each agent
  - Example: `call_risk_discovery_agent()`
  - Example: `call_risk_mitigation_suggester()`

**Key Feature**: Tool list auto-synchronizes when agents change!

### 3. **Enhanced Agent Metadata**

**File**: `src/types/index.ts`

New `AgentConfig` fields:
```typescript
interface AgentConfig {
    // Existing fields...

    // NEW: Orchestration metadata
    isMaster?: boolean;           // Identifies the master agent
    isSpecialized?: boolean;      // Marks specialized agents
    capabilities?: string[];      // Tags: ['risk-discovery', 'mitigation']
    category?: string;            // Category: 'risk-management', 'general'
    visibility?: 'public' | 'specialist'; // Access control
}
```

### 4. **Auto-Sync Architecture**

**File**: `src/agents/agentManager.ts`

The AgentManager now:
1. **Creates master agent** on first initialization
2. **Sets up tool callbacks** so master can call other agents
3. **Synchronizes agent tools** whenever agents change
4. **Updates master prompt** with current agent list

**Triggers**: Sync happens automatically on:
- Agent creation
- Agent updates
- Agent deletion
- Agent enable/disable

### 5. **Updated UI**

**File**: `src/ui/settings/components/AgentManagement.ts`

Settings now show:
- **Master Agent Section** (top) - Read-only, highlighted box explaining the orchestrator
- **Specialized Agents Section** (below) - Normal editable agent cards

Users see that the master exists but can't accidentally modify or delete it.

### 6. **Public API Enhancement**

**File**: `src/integration/publicAPI.ts`

The `ask()` method now:
1. **Routes to master agent first** (new behavior)
2. **Falls back to default agent** (backwards compatibility)
3. **Auto-injects active note context** (existing behavior)

```javascript
// Usage (unchanged from user perspective)
window.RAGAgentManager.ask("Help me with my risk analysis")
// Now automatically routes through master agent!
```

### 7. **Migration Logic**

**File**: `src/settings.ts`

Automatic migration on plugin load:
- Adds new metadata fields to existing agents
- Marks existing agents as specialized
- Sets default values for capabilities, category, visibility

**Result**: Existing setups upgrade seamlessly!

## How It Works

### User Perspective

**Before**: User selects specific agent → Agent executes task

**After**: User asks question → Master agent analyzes → Master calls appropriate specialist(s) → User gets answer

### Technical Flow

```
1. User: "Help me identify risks in my API"
   ↓
2. Public API routes to Master Agent
   ↓
3. Master Agent:
   - Analyzes request
   - Identifies "Risk Discovery Agent" is appropriate
   - Calls tool: call_risk_discovery_agent(query)
   ↓
4. Tool Executor:
   - Receives tool call
   - Routes to AgentManager.executeAgent()
   - Executes Risk Discovery Agent
   ↓
5. Master Agent:
   - Receives response from specialist
   - Synthesizes and returns to user
```

## Benefits

### For Users

1. **Single entry point** - No need to choose agents
2. **Smarter routing** - Master picks the right specialist
3. **Multi-agent workflows** - Master can chain multiple agents
4. **Transparent** - Works automatically with existing code

### For You as Developer

1. **Auto-sync** - No manual updates needed
2. **Extensible** - Add agents, master learns automatically
3. **Backwards compatible** - Existing code still works
4. **Clean separation** - Master UI is clearly separated

## Key Files Modified

### New Files
- `src/agents/masterAgent.ts` - Master agent configuration generator
- `src/tools/agentTools.ts` - Agent-calling tools

### Modified Files
- `src/agents/agentManager.ts` - Added orchestration methods
- `src/tools/toolExecutor.ts` - Agent tool execution
- `src/tools/toolRegistry.ts` - Dynamic tool registration
- `src/tools/toolTypes.ts` - Added 'agent' category
- `src/types/index.ts` - New agent metadata fields
- `src/settings.ts` - Migration logic
- `src/ui/settings/components/AgentManagement.ts` - Master agent UI section
- `src/integration/publicAPI.ts` - Route through master

## Testing the Implementation

### 1. Reload Plugin

After rebuild, reload the plugin in Obsidian to see the master agent created automatically.

### 2. Check Settings

Go to Plugin Settings → Agents:
- You should see "🎭 Master Agent (Orchestrator)" section at top
- Below that, your specialized agents (Risk Discovery, etc.)

### 3. Test Interaction

```javascript
// In any note, use dataviewjs:
const response = await window.RAGAgentManager.ask(
    "Help me find risks in our authentication system"
);
dv.paragraph(response.answer);
```

### 4. Verify Orchestration

Check console logs for:
- `🎭 Agent Manager initialization complete. X agents loaded (including master)`
- `🔗 Agent executor callback registered with ToolExecutor`
- `🔄 Syncing agent tools: X callable agents`
- `✅ Master agent prompt updated and executor reloaded`

### 5. Test Agent Addition

1. Add a new specialized agent
2. Check console - should see master agent update automatically
3. Master agent now knows about the new agent without any manual steps

## Architecture Highlights

### Circular Dependency Solution

**Problem**: AgentManager creates ToolExecutor, but ToolExecutor needs to call AgentManager

**Solution**: Callback pattern
- ToolExecutor stores callbacks (not direct references)
- AgentManager provides execution functions after initialization
- Clean separation of concerns

### Dynamic Tool Generation

**Problem**: Master needs tools for agents that don't exist yet

**Solution**: Runtime tool registration
- Tools generated from agent configs
- Registry updated whenever agents change
- Tool definitions always reflect current agent list

### Master Agent Auto-Update

**Problem**: Master's system prompt must list all available agents

**Solution**: Prompt regeneration
- Prompt template accepts agent list
- Regenerated whenever agents change
- Master agent executor reloaded with new prompt

## Next Steps

### Immediate

1. **Reload plugin** to create master agent
2. **Test basic routing** with existing agents
3. **Verify console logs** showing orchestration

### Optional Enhancements

1. **Add capabilities tags** to your existing agents:
   ```javascript
   capabilities: ['risk-discovery', 'security-analysis']
   category: 'risk-management'
   ```

2. **Customize visibility** if you want some agents hidden:
   ```javascript
   visibility: 'specialist' // Only callable by master, not directly
   ```

3. **Monitor orchestration** by checking `toolResults` in responses

## Troubleshooting

### Master Agent Not Created

**Check**: Do you have at least one LLM configured?
- Master agent requires an LLM to be created
- Check Settings → LLM Providers

### Tools Not Working

**Check Console** for:
- `🔗 Agent executor callback registered` (should see this)
- `🔄 Syncing agent tools: X callable agents` (should see number > 0)

**Fix**: Reload plugin to reinitialize

### Master Not Routing

**Check**: Is master agent enabled?
- Settings → Agents → Master Agent section
- Should show as enabled

### Agents Not Listed in Master Prompt

**Trigger Update**:
1. Toggle any agent on/off
2. Or reload plugin
3. Check console for "✅ Master agent prompt updated"

## Summary

You now have a fully functional master agent orchestration system that:
- ✅ Routes all requests through intelligent master agent
- ✅ Automatically updates when agents change
- ✅ Provides clean UI separation
- ✅ Maintains backwards compatibility
- ✅ Scales transparently as you add more agents

The implementation is production-ready and all builds are passing!
