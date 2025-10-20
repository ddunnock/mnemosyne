# Quickstart: Mnemosyne RAG Agent Platform

**Goal**: Get from installation to first successful query in under 5 minutes

## Prerequisites

- Obsidian 1.4.0+ installed
- An Obsidian vault with some markdown notes (at least 10 for meaningful results)
- ONE of the following:
  - OpenAI API key (recommended for beginners)
  - Anthropic API key
  - Ollama installed locally (for privacy-focused users)

## Installation

### Option 1: From Community Plugins (Recommended - Coming Soon)
1. Open Obsidian Settings (⚙️)
2. Navigate to **Community Plugins**
3. Search for "**Mnemosyne**"
4. Click **Install** → **Enable**

### Option 2: Manual Installation (Development)
1. Download latest release from GitHub
2. Extract to `.obsidian/plugins/mnemosyne/`
3. Restart Obsidian
4. Enable in Settings → Community Plugins

---

## 5-Minute Setup

### Step 1: Launch Setup Wizard (30 seconds)

1. After enabling the plugin, Mnemosyne's setup wizard will automatically open
2. You'll see a welcome screen explaining what Mnemosyne does
3. Click **Get Started**

### Step 2: Configure AI Provider (1 minute)

**If using OpenAI**:
1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key
4. Paste into Mnemosyne setup wizard
5. Click **Validate** (checks connection)
6. Choose default model: `gpt-4o` (recommended) or `gpt-3.5-turbo` (cheaper)

**If using Ollama (Local AI)**:
1. Install Ollama from [ollama.com](https://ollama.com)
2. Run: `ollama pull llama2` in terminal
3. In Mnemosyne wizard, select "Local AI (Ollama)"
4. Click **Detect Ollama** (should find it automatically)
5. Choose model: `llama2` or `mistral`

### Step 3: Select Vault Folders (1 minute)

1. The wizard shows your vault's folder structure
2. Select which folders to include in the knowledge base
   - ✅ Check: Folders with notes you want to query
   - ❌ Uncheck: Private folders, templates, archives
3. (Optional) Add exclude patterns for specific files
   - Example: `*.excalidraw.md` to skip drawings
   - Example: `Daily Notes/**` to skip daily notes
4. Click **Next**

### Step 4: Choose Your First Agent (1 minute)

1. Browse the **Professional Agent Template Library**
2. Preview templates by clicking on them:
   - **Research Analyst** - Academic research, citations, literature review
   - **Knowledge Curator** - Information organization, content strategy
   - **Personal Coach** - Goal setting, habit tracking, productivity
   - **Creative Director** - Brainstorming, concept development
   - *...and 8 more specialist agents*
3. Select one that matches your use case
4. Click **Create Agent**
5. (Optional) Customize the name - default is fine for quickstart

### Step 5: Start Ingestion (1.5 minutes)

1. Wizard displays ingestion configuration summary
2. Click **Start Ingestion**
3. Progress bar shows:
   - Files processed: `23/100`
   - Chunks created: `147`
   - Estimated time: `2m 15s`
4. **You can skip ahead!** Click **Start Using Mnemosyne** to try it while ingestion continues in background

---

## Your First Query (30 seconds)

### Method 1: Command Palette (Fastest)
1. Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux)
2. Type "**Mnemosyne: Quick Query**"
3. Press Enter
4. A modal opens with your agent selected
5. Type your question: *"What are the main topics I've written about?"*
6. Press Enter or click **Ask**
7. **Result**: Within 3-5 seconds, you'll see:
   - AI-generated response
   - Source citations (clickable links to your notes)
   - Excerpt previews from relevant notes

### Method 2: Right Sidebar Chat (Persistent)
1. Click the **Mnemosyne icon** in the right sidebar ribbon
2. Chat interface opens
3. Agent selector at top shows your selected agent
4. Type your question in the input box
5. See streaming response with live citations

---

## What Just Happened?

🎉 **Congratulations!** You now have:

✅ A fully configured AI agent platform
✅ Your vault indexed and searchable with semantic AI
✅ Multiple professional agents available
✅ A chat interface for ongoing queries

### Behind the Scenes:
1. **Ingestion**: Mnemosyne processed your notes, breaking them into semantically meaningful chunks
2. **Embeddings**: Each chunk was converted to a vector representation for similarity search
3. **Retrieval**: Your question was embedded and matched against your vault's chunks
4. **Generation**: The AI agent generated a response using the most relevant chunks as context
5. **Citations**: Sources were tracked and linked back to your original notes

---

## Next Steps

### Explore More Agents
1. Open Settings → Mnemosyne → **Agent Management**
2. Click **+ Create Agent**
3. Browse all 12 professional templates
4. Create specialized agents for different use cases:
   - **Technical Writer** for documentation projects
   - **Code Reviewer** for programming notes
   - **Meeting Facilitator** for meeting notes analysis

### Customize an Agent
1. Select an existing agent
2. Click **Edit**
3. Modify:
   - **System Prompt**: Adjust personality or expertise level
   - **Retrieval Settings**: Change how many sources to include
   - **Folder Scope**: Limit agent to specific project folders
   - **Model**: Switch between GPT-4, GPT-3.5, or local models

### Advanced: Try Local AI (Privacy Mode)
1. Install Ollama: [ollama.com](https://ollama.com)
2. Pull models: `ollama pull llama2` and `ollama pull nomic-embed-text`
3. In Mnemosyne Settings → **AI Providers**
4. Enable **Ollama**
5. Set as default provider
6. **Now 100% offline!** All processing happens locally

---

## Common Questions

### Q: How much does it cost?
**A**: Depends on your provider:
- **OpenAI**: ~$0.01-0.03 per query (GPT-3.5) or $0.05-0.15 per query (GPT-4)
- **Ollama Local**: FREE (but requires powerful computer)
- **Anthropic**: Similar to OpenAI pricing

**Tip**: Start with GPT-3.5-turbo for cost-effective testing, upgrade to GPT-4 when you need better quality.

### Q: Is my data private?
**A**:
- **Cloud (OpenAI/Anthropic)**: Your notes are sent to the API for processing, covered by their privacy policies
- **Local (Ollama)**: 100% private, everything runs on your computer
- **API Keys**: Encrypted with AES-256 and stored securely in your vault

### Q: How many notes can it handle?
**A**: Tested with up to 10,000 notes. Performance depends on:
- Vault size: 10-1,000 notes (instant), 1,000-5,000 (seconds), 5,000+ (may need optimization)
- Hardware: Better CPU = faster ingestion and local AI

### Q: Can I use multiple AI providers?
**A**: Yes! Configure multiple providers and choose per-agent:
- Agent 1: OpenAI GPT-4 (best quality)
- Agent 2: GPT-3.5 (fast and cheap)
- Agent 3: Ollama Llama2 (private and offline)

### Q: What if ingestion fails?
**A**: Check:
1. **File Permissions**: Ensure Obsidian can read your vault files
2. **API Limits**: You may have hit rate limits, wait a few minutes
3. **Malformed Notes**: Check error log for specific files with issues
4. **Exclude Problematic Files**: Add exclude patterns for files that cause errors

### Q: How do I update my knowledge base?
**A**: Automatic! Mnemosyne watches for file changes and auto-updates embeddings. You can also manually trigger:
- Command Palette → "**Mnemosyne: Refresh Index**"

---

## Troubleshooting

### "API Key Invalid" Error
- **OpenAI**: Verify key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: Check [console.anthropic.com](https://console.anthropic.com)
- **Ollama**: Ensure Ollama is running (`ollama list` in terminal)

### "No Results Found"
- **Check Ingestion**: Settings → Mnemosyne → View ingestion status
- **Check Folders**: Verify selected folders contain the notes you're asking about
- **Lower Relevance**: In agent settings, decrease `minRelevance` from 0.7 to 0.5

### Slow Responses
- **OpenAI/Anthropic**: Normal, cloud latency (3-10 seconds)
- **Ollama**: First query loads model (10-30 seconds), subsequent queries faster
- **Too Many Sources**: Reduce `maxResults` in retrieval settings

### Plugin Won't Load
- **Version Check**: Obsidian 1.4.0+ required
- **Reload**: Cmd+R (Mac) or Ctrl+R (Windows) to reload Obsidian
- **Check Console**: View → Toggle Developer Tools → Console for errors

---

## Getting Help

- **Documentation**: Full user guide in Settings → Mnemosyne → Help
- **GitHub Issues**: Report bugs or request features
- **Community**: Join discussions on Obsidian forums

---

## Success! 🎉

You're now ready to use Mnemosyne as your intelligent knowledge assistant. Try asking:
- *"Summarize the key insights from my project notes"*
- *"What have I learned about [topic]?"*
- *"Find connections between my notes on X and Y"*
- *"What are my open questions or TODOs?"*

**Next**: Run `/speckit.tasks` to break down implementation into actionable tasks!
