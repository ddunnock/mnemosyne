# Agent Installation Guide

This guide will help you install all 10 risk management agents for Mnemosyne.

## Quick Installation

### Method 1: JavaScript (Recommended - No dependencies)

```bash
# From your Obsidian vault root
node /path/to/mnemosyne/install-agents.js .obsidian/plugins/mnemosyne/data.json
```

### Method 2: TypeScript (Requires ts-node)

```bash
# From your Obsidian vault root
npx ts-node /path/to/mnemosyne/install-agents.ts .obsidian/plugins/mnemosyne/data.json
```

## What Gets Installed

The installation script adds all 10 agents from the Complete-Agent-Configuration-Guide.md:

1. **Mnemosyne (Archon)** - Master orchestrator agent (formerly "Master Agent")
2. **Risk Management Agent** - General risk management with vault access
3. **Risk Discovery Agent** - Discovers risks from documents
4. **Risk Title Polisher** - Refines risk titles
5. **Risk Statement Builder** - Creates IF-THEN-SO statements
6. **Risk Mitigation Suggester** - Suggests mitigation strategies
7. **Risk Assessment Agent** - Performs 5x5 risk scoring
8. **Risk Trend Analyzer** - Analyzes risk trends over time
9. **Program Risk Rollup** - Aggregates program-level risks
10. **Mitigation ROI Calculator** - Calculates mitigation cost-benefit

## Prerequisites

1. **Mnemosyne Plugin Installed** - Install and activate the Mnemosyne plugin in Obsidian
2. **LLM Provider Configured** - Set up at least one LLM provider (OpenAI, Anthropic, etc.) in Settings → Mnemosyne → LLM Providers
3. **Node.js** (for running the installation script)

## Step-by-Step Installation

### Step 1: Locate Your data.json File

Your Mnemosyne plugin settings are stored in:
```
<vault-path>/.obsidian/plugins/mnemosyne/data.json
```

Example paths:
- **macOS**: `/Users/yourname/Documents/MyVault/.obsidian/plugins/mnemosyne/data.json`
- **Windows**: `C:\Users\yourname\Documents\MyVault\.obsidian\plugins\mnemosyne\data.json`
- **Linux**: `/home/yourname/Documents/MyVault/.obsidian/plugins/mnemosyne/data.json`

### Step 2: Close Obsidian

**Important**: Close Obsidian before running the installation script to prevent conflicts.

### Step 3: Run the Installation Script

Navigate to your vault directory and run:

```bash
# If you have the mnemosyne repo cloned
node /path/to/mnemosyne/install-agents.js .obsidian/plugins/mnemosyne/data.json

# Or copy the script to your vault first
cp /path/to/mnemosyne/install-agents.js .
node install-agents.js .obsidian/plugins/mnemosyne/data.json
```

### Step 4: Verify Installation

The script will:
- ✅ Create a backup of your data.json (data.json.backup.TIMESTAMP)
- ✅ Add all 10 agent configurations
- ✅ Skip any agents that already exist
- ✅ Set the Archon Agent as the master orchestrator

You should see output like:

```
🚀 Mnemosyne Agent Installer
================================

📁 Target file: .obsidian/plugins/mnemosyne/data.json

📖 Reading existing settings...
✅ Using LLM: OpenAI GPT-4 (gpt-4)

🔨 Creating agent configurations...

💾 Backup created: .obsidian/plugins/mnemosyne/data.json.backup.1729699200000

✅ Installation Complete!

📊 Summary:
   - Added 10 new agents
   - Skipped 0 existing agents
   - Total agents: 10
```

### Step 5: Restart Obsidian

Open Obsidian and verify the agents are loaded:

1. Go to **Settings → Mnemosyne → Agents**
2. You should see the **Archon Agent (Orchestrator)** at the top
3. Scroll down to see all 10 specialized agents

### Step 6: Test the Agents

1. Click on each agent in the list
2. Click the **"Test Agent"** button
3. Verify you see ✅ "Tested" status

Or use the **"🧪 Test All Agents"** button to test them all at once.

### Step 7: Index Your Vault

For the agents to work effectively with your notes:

1. Go to **Settings → Mnemosyne → Knowledge Base**
2. Select folders to index (especially `01_Risks`, `02_References`, `03_Programs`)
3. Click **"Start Ingestion"**
4. Wait for indexing to complete

## Using the Archon Agent

The **Archon Agent** (formerly Master Agent) is your main entry point:

### What is the Archon Agent?

- **Archon** means "chief magistrate" or "ruler" in ancient Greek
- It's an intelligent orchestrator that automatically routes your requests to the right specialized agents
- You don't need to manually select which agent to use - the Archon figures it out!

### How to Use It

Simply chat with Mnemosyne and the Archon will route your request:

**Example Requests:**

```
"Find risks in this contract: [paste contract text]"
→ Archon routes to Risk Discovery Agent

"Score this risk for me: [describe risk]"
→ Archon routes to Risk Assessment Agent

"Suggest mitigations for supplier delays"
→ Archon routes to Risk Mitigation Suggester

"What are the top 10 risks across all programs?"
→ Archon routes to Program Risk Rollup Agent

"Polish this title: vendor problems"
→ Archon routes to Risk Title Polisher
```

The Archon can also handle **multi-step workflows**:

```
"Find risks in this document and score them"
→ Archon routes to Risk Discovery, then Risk Assessment

"Discover risks and suggest mitigations"
→ Archon routes to Risk Discovery, then Risk Mitigation Suggester
```

## Troubleshooting

### Error: "data.json not found"

**Solution**: Ensure you're providing the correct path to your data.json file. Use absolute paths if relative paths don't work.

```bash
# Use absolute path
node install-agents.js /full/path/to/vault/.obsidian/plugins/mnemosyne/data.json
```

### Error: "No LLM configured"

**Solution**: Configure at least one LLM provider before running the installation:

1. Open Obsidian
2. Go to **Settings → Mnemosyne → LLM Providers**
3. Add an LLM provider (OpenAI, Anthropic, etc.)
4. Enable it
5. Close Obsidian and re-run the installation

### Error: "Invalid settings file"

**Solution**: Your data.json may be corrupted. Restore from the backup:

```bash
# Restore from backup
cp .obsidian/plugins/mnemosyne/data.json.backup.TIMESTAMP .obsidian/plugins/mnemosyne/data.json
```

### Agents Not Showing Up in Obsidian

**Solution**:

1. Verify the installation completed successfully (check console output)
2. Restart Obsidian completely (quit and reopen)
3. Go to **Settings → Mnemosyne → Agents** to verify agents are listed
4. Check that agents are **enabled** (toggle should be on)

### Agent Tests Failing

**Solution**:

1. Verify your LLM provider is working (check API keys, quotas)
2. Check internet connectivity
3. Try testing individual agents one at a time
4. Review the error messages in Obsidian's console (Ctrl+Shift+I / Cmd+Opt+I)

### Archon Not Routing Correctly

**Solution**:

1. Verify the Archon Agent is enabled
2. Check that specialist agents have proper **capabilities** and **category** metadata
3. Update the Archon's system prompt to include your agents (it auto-updates, but you can manually refresh in Settings)
4. Try being more explicit: "Route this to the Risk Discovery Agent: [request]"

## Advanced Configuration

### Customizing Agents

After installation, you can customize any agent:

1. Go to **Settings → Mnemosyne → Agents**
2. Click on an agent card
3. Modify:
   - **System Prompt** - Adjust behavior and personality
   - **Temperature** - Control randomness (0.0-1.0)
   - **Max Tokens** - Adjust response length
   - **Retrieval Settings** - Fine-tune RAG behavior
   - **Tools & Permissions** - Configure vault access
   - **Capabilities** - Add/remove capability tags
   - **Folder Scope** - Restrict to specific folders

### Folder Permissions

For security, configure folder scopes:

- **Risk Management Agent**: Only `01_Risks` (has write permission)
- **Risk Discovery Agent**: `00_Inbox`, `02_References` (read-only)
- **Risk Trend Analyzer**: `01_Risks` (read-only)
- **Program Risk Rollup**: `01_Risks`, `03_Programs` (read-only)

### Updating Agent Names

The Archon Agent was renamed from "Master Agent". To update references in your documentation:

```bash
# Search for old references
grep -r "Master Agent" your-vault/

# Update manually in any custom notes or templates
```

## Uninstalling Agents

To remove agents:

### Option 1: Via Obsidian UI

1. Go to **Settings → Mnemosyne → Agents**
2. Click on an agent
3. Click **"Delete Agent"**
4. Confirm deletion

**Note**: The Archon Agent is **permanent** and cannot be deleted via UI.

### Option 2: Manual Removal

1. Close Obsidian
2. Edit `.obsidian/plugins/mnemosyne/data.json`
3. Remove agent objects from the `agents` array
4. Save the file
5. Restart Obsidian

## Backup and Restore

### Creating Backups

The installation script automatically creates backups, but you can also:

```bash
# Manual backup
cp .obsidian/plugins/mnemosyne/data.json .obsidian/plugins/mnemosyne/data.json.backup
```

### Restoring from Backup

```bash
# Restore from backup
cp .obsidian/plugins/mnemosyne/data.json.backup .obsidian/plugins/mnemosyne/data.json
```

## Getting Help

If you encounter issues:

1. Check this guide's **Troubleshooting** section
2. Review the **Complete-Agent-Configuration-Guide.md** for detailed agent info
3. Check Obsidian's console for error messages (Ctrl+Shift+I / Cmd+Opt+I)
4. Open an issue on the Mnemosyne GitHub repository

## Next Steps

After installation:

1. ✅ **Test all agents** - Verify they work correctly
2. ✅ **Index your vault** - Enable agents to access your notes
3. ✅ **Create a test risk** - Try the Risk Capture Form with AI helpers
4. ✅ **Chat with the Archon** - Test the orchestration system
5. ✅ **Customize agents** - Adjust prompts and settings to your needs
6. ✅ **Set up auto-ingestion** - Automatically index new notes (optional)

## Additional Resources

- **Complete-Agent-Configuration-Guide.md** - Full agent documentation
- **Risk-Capture-Agents-Configuration.md** - Original 3-agent configuration
- **Enhanced-Risk-Management-Agent-Prompt.md** - Detailed prompt for Risk Management Agent
- **Mnemosyne Plugin Settings** - In-app configuration and testing

---

**Version**: 1.0
**Last Updated**: 2025-10-23
**Archon Agent**: Formerly known as "Master Agent"
