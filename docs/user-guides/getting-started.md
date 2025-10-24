# Getting Started with Mnemosyne

**Audience**: 👤 User
**Difficulty**: 🟢 Beginner

Welcome to Mnemosyne! This guide will help you install and configure the plugin in about 10 minutes.

## What is Mnemosyne?

Mnemosyne transforms your Obsidian vault into an intelligent AI assistant with:
- ✍️ **Inline AI** - Auto-completion and text transformations as you write
- 🤖 **Multiple AI Agents** - Specialized assistants for different tasks
- 🧠 **Smart Knowledge Base** - Semantic search across all your notes
- 🏢 **Enterprise Support** - Works with corporate LLMs (L3Harris, Azure OpenAI)
- 🔒 **Privacy First** - Hybrid local/cloud with AES-256 encryption

---

## Installation

### Prerequisites
- **Obsidian** 1.4.0 or later
- At least one of:
  - OpenAI API key
  - Anthropic API key
  - Ollama installed locally
  - Corporate LLM access (L3Harris, Azure OpenAI, etc.)

### Option 1: From Community Plugins (Recommended - Coming Soon)
1. Open **Settings → Community Plugins**
2. Click **Browse** and search for "Mnemosyne"
3. Click **Install**, then **Enable**

### Option 2: Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/dunnock/mnemosyne/releases)
2. Extract the zip file
3. Copy the folder to your vault: `YourVault/.obsidian/plugins/mnemosyne/`
4. Open **Settings → Community Plugins**
5. Refresh the plugin list
6. Enable **Mnemosyne**

### Option 3: Development Build
```bash
git clone https://github.com/dunnock/mnemosyne.git
cd mnemosyne
npm install
npm run build
```

Then link to your vault:
```bash
ln -s $(pwd) /path/to/your/vault/.obsidian/plugins/mnemosyne
```

---

## Initial Setup

### Step 1: Create Master Password

The master password protects your API keys with AES-256 encryption.

1. Open **Settings → Mnemosyne**
2. You'll see a prompt: **"No master password set"**
3. Click **Create Master Password**
4. Enter a strong password (minimum 8 characters)
5. **Important**: This password is never stored. Don't forget it!

**What happens:**
- All API keys are encrypted before being saved
- Password is vault-specific (different vaults use different passwords)
- Without the password, API keys cannot be decrypted

### Step 2: Configure Your First LLM Provider

Choose the provider that fits your needs:

#### Option A: OpenAI (Cloud)
1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Go to **Settings → Mnemosyne → LLM Providers**
3. Click **Add Provider**
4. Configure:
   - Provider Name: `OpenAI GPT-4`
   - Provider Type: `OpenAI`
   - API Key: `sk-...` (your key)
   - Model: `gpt-4o` or `gpt-4o-mini`
5. Click **Test** to verify connection
6. Toggle **Enable** to activate

**Cost**: Pay-per-use, typically $0.01-0.03 per 1K tokens

#### Option B: Anthropic Claude (Cloud)
1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Go to **Settings → Mnemosyne → LLM Providers**
3. Click **Add Provider**
4. Configure:
   - Provider Name: `Claude Sonnet`
   - Provider Type: `Anthropic`
   - API Key: Your Anthropic key
   - Model: `claude-3-5-sonnet-20241022`
5. Click **Test** to verify
6. Toggle **Enable**

**Cost**: Pay-per-use, competitive with OpenAI

#### Option C: Ollama (Local, Free)
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Download a model:
   ```bash
   ollama pull mistral
   # or
   ollama pull llama2
   ```
3. Go to **Settings → Mnemosyne → LLM Providers**
4. Click **Add Provider**
5. Configure:
   - Provider Name: `Ollama Mistral`
   - Provider Type: `Custom (OpenAI-compatible)`
   - Base URL: `http://localhost:11434/v1`
   - Model: `mistral` (or your chosen model)
   - API Key: `ollama` (any value works)
6. Click **Test** to verify
7. Toggle **Enable**

**Cost**: Free! Runs 100% locally

#### Option D: Corporate LLM (L3Harris, Azure OpenAI)
1. Get your corporate API endpoint and key from IT
2. Go to **Settings → Mnemosyne → LLM Providers**
3. Click **Add Provider**
4. Configure:
   - Provider Name: `L3Harris GPT-4`
   - Provider Type: `Custom (OpenAI-compatible)`
   - Base URL: `https://api-lhxgpt.ai.l3harris.com` (example)
   - Model: Your deployment name (e.g., `gpt-4o`)
   - API Key: Your corporate key
5. Click **Test** to verify
6. Toggle **Enable**

📖 **Detailed setup**: [Enterprise Deployment Guide](../deployment/enterprise-deployment.md)

### Step 3: Set Default Agent

Agents are AI assistants with specific personalities and capabilities.

1. Go to **Settings → Mnemosyne → Agents**
2. You'll see pre-installed agents like:
   - **Default Assistant** - General-purpose helper
   - **Research Assistant** - For research and analysis
   - **Writing Assistant** - For content creation
3. Click the **star icon** next to "Default Assistant" to set it as default
4. The default agent is used for:
   - Inline AI features (auto-completion, text actions)
   - Quick chat interactions
   - Knowledge base queries

**Want custom agents?** See [Agent Setup Guide](./agent-setup.md)

### Step 4: Choose Vector Store Backend

The vector store powers semantic search across your notes.

**For most users (default):**
1. Go to **Settings → Mnemosyne → Knowledge Base**
2. Backend is already set to **JSON File** - no setup needed!
3. Click **Start Ingestion** to index your vault

**For large vaults (10K+ notes):**
1. Switch to **SQLite + VSS** for better performance
2. Click **Save Configuration**
3. Click **Start Ingestion**

**For enterprise (100K+ notes):**
1. Set up PostgreSQL with pgvector: [Docker Setup Guide](../deployment/docker-setup.md)
2. Switch to **PostgreSQL + pgvector**
3. Enter connection details
4. Click **Test Connection**, then **Save**
5. Click **Start Ingestion**

📖 **Comparison**: [Vector Store Backends](../deployment/vector-store-backends.md)

---

## First Steps

### 1. Try Inline AI

Inline AI works as you write in any note:

**Auto-Completion:**
1. Create a new note or open an existing one
2. Start typing a sentence
3. Pause for a moment - ghost text will appear suggesting a completion
4. Press **Tab** to accept, **Escape** to dismiss

**Text Transformations:**
1. Select some text in your note
2. A floating toolbar appears with quick actions
3. Click **✨ Rewrite** or **📝 Expand**
4. Review the suggestion in the modal
5. Click **✓ Accept** or **✗ Reject**

**Right-Click Actions:**
1. Select text anywhere (even in DataviewJS forms!)
2. **Right-click** on the selection
3. Choose an AI action from the context menu
4. Review and accept/reject the suggestion

📖 **Complete guide**: [Inline AI Features](./inline-ai-features.md)

### 2. Chat with Your Notes

Use the chat interface to ask questions about your vault:

1. Click the **Mnemosyne icon** in the left sidebar (or use Cmd+P → "Open Mnemosyne Chat")
2. Ask a question: *"What are the main themes in my research notes?"*
3. Mnemosyne will search your notes and provide an answer with sources
4. Click on source citations to jump to relevant notes

**Tips:**
- Be specific: *"Summarize my meeting notes from last week"*
- Ask for connections: *"How do concepts X and Y relate in my notes?"*
- Request analysis: *"What patterns do you see in my project journal?"*

### 3. Configure Inline AI (Optional)

Customize how inline AI behaves:

1. Go to **Settings → Mnemosyne → Advanced → Inline AI Features**
2. Configure:
   - **Enable Auto-Completion**: Toggle on/off
   - **Completion Delay**: How long to wait (default: 500ms)
   - **Max Completion Length**: Maximum words (default: 200)
   - **Show Selection Toolbar**: Toggle floating toolbar
   - **Context Menu Enabled**: Toggle right-click actions

**Performance tip**: If auto-completion feels too aggressive, increase the delay to 1000ms.

### 4. Index More Content

By default, Mnemosyne indexes your entire vault. To customize:

1. Go to **Settings → Mnemosyne → Knowledge Base**
2. Under **Folders to Index**, add or remove folders
3. Click **Start Ingestion** to re-index

**What gets indexed:**
- ✅ Markdown files (.md)
- ✅ Text content
- ✅ Frontmatter (YAML)
- ❌ Images, PDFs (coming soon)
- ❌ Binary files

---

## Common Tasks

### Switching Providers

You can have multiple providers and switch between them:

1. Go to **Settings → Mnemosyne → LLM Providers**
2. Add multiple providers (e.g., OpenAI + Ollama)
3. Enable/disable as needed
4. The first enabled provider is used by default

**Use cases:**
- Use OpenAI for important work, Ollama for experimentation
- Use local LLM when offline, cloud when you need more power
- Use corporate LLM for work, personal LLM for personal notes

### Updating Your Master Password

If you need to change your master password:

1. Go to **Settings → Mnemosyne → Security**
2. Click **Change Master Password**
3. Enter current password
4. Enter new password
5. All API keys are automatically re-encrypted

**Warning**: If you forget your current password, you'll need to re-enter all API keys.

### Backing Up Your Data

**What to back up:**
- Vector store data:
  - JSON: `YourVault/.obsidian/plugins/mnemosyne/vector-store-index.json`
  - SQLite: `YourVault/.obsidian/plugins/mnemosyne/vector-store.db`
- Settings: `YourVault/.obsidian/plugins/mnemosyne/data.json`
- Custom agents: `YourVault/.obsidian/plugins/mnemosyne/agents/`

**Restore:**
- Copy files back to the same locations
- Restart Obsidian
- Enter master password when prompted

**Note**: Encrypted API keys cannot be restored without the original master password.

---

## Troubleshooting

### "Master password required" Error

**Symptom**: Plugin keeps asking for password on every start

**Solution:**
1. Close Obsidian completely
2. Reopen and enter master password
3. Check "Remember password for this session"
4. If persists, check that Obsidian has permission to access the filesystem

### Auto-Completion Not Working

**Symptom**: No ghost text appears when typing

**Checklist:**
- ✅ Is inline AI enabled? (Settings → Advanced → Inline AI)
- ✅ Is a provider configured and enabled?
- ✅ Is a default agent set?
- ✅ Have you entered the master password?
- ✅ Try increasing the completion delay in settings

### Chat Not Finding Notes

**Symptom**: Chat says "I don't have information about that"

**Checklist:**
- ✅ Have you run vault ingestion? (Knowledge Base → Start Ingestion)
- ✅ Are the relevant folders included in indexing?
- ✅ Check ingestion status - is it complete?
- ✅ Try re-ingesting: Delete vector store file and re-run ingestion

### Provider Test Fails

**Symptom**: "Connection failed" when testing provider

**For OpenAI/Anthropic:**
- Verify API key is correct (copy-paste carefully)
- Check internet connection
- Verify you have API credits/quota

**For Ollama:**
- Verify Ollama is running: `ollama list`
- Try `curl http://localhost:11434/v1/models` to test manually
- Check firewall isn't blocking port 11434

**For Corporate LLMs:**
- Verify you're on VPN (if required)
- Check base URL format
- Verify API key hasn't expired
- Contact IT if connection issues persist

📖 **Detailed troubleshooting**: [Enterprise Deployment Guide](../deployment/enterprise-deployment.md)

---

## Next Steps

### 📚 Learn More
- **[Inline AI Features](./inline-ai-features.md)** - Master auto-completion and text actions
- **[Agent Setup](./agent-setup.md)** - Create custom AI agents
- **[LLM Providers](./llm-providers.md)** - Deep dive on all provider types
- **[Knowledge Base](./knowledge-base.md)** - Optimize your RAG system

### 🏢 Enterprise Users
- **[Enterprise Deployment](../deployment/enterprise-deployment.md)** - L3Harris, Azure OpenAI setup
- **[Vector Store Backends](../deployment/vector-store-backends.md)** - Choose the right backend
- **[Docker Setup](../deployment/docker-setup.md)** - PostgreSQL for large deployments

### 🛠️ Advanced Users
- **[Architecture Overview](../capabilities/architecture-overview.md)** - System design
- **[Agent Orchestration](../capabilities/agent-orchestration.md)** - How the Master Agent works
- **[RAG System](../capabilities/rag-system.md)** - Retrieval internals

---

## Getting Help

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/dunnock/mnemosyne/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/dunnock/mnemosyne/discussions)
- 📧 **Security**: See [Security Policy](../capabilities/security.md)
- 📚 **Documentation**: [Complete Docs Hub](../README.md)

---

**Version**: 1.0+
**Last Updated**: 2025-10-24
**Prerequisites**: Obsidian 1.4.0+, Node.js 18+ (for development)
