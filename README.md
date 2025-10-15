# RAG Agent Manager

A powerful Obsidian plugin that brings RAG (Retrieval-Augmented Generation) capabilities to your vault with multi-LLM support and encrypted API key storage.

## Features

- 🤖 **Multi-LLM Support**: Works with Anthropic Claude, OpenAI GPT, and custom providers
- 🔐 **Secure API Keys**: Encrypted storage ensures your keys are safe even in Git repos
- 🎯 **Custom AI Agents**: Create specialized agents for different risk management tasks
- 📚 **RAG-Enhanced**: Leverage your Risk Management Handbook with semantic search
- 🔌 **DataviewJS Integration**: Use agents directly in your notes with code snippets
- 🎨 **Template Library**: Pre-built agent templates for common risk management scenarios

## Current Status

**Phase 1 Complete** ✅
- Project structure established
- TypeScript configuration
- Build system configured
- Core types and interfaces defined
- Main plugin scaffolding

**Next Steps**:
- Phase 2: API Key Encryption
- Phase 3: RAG Implementation
- Phase 4: LLM Integration
- Phase 5: Agent System
- Phase 6: Settings UI
- Phase 7: DataviewJS Integration

## Development Setup

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Obsidian (latest version)
- Visual Studio Code (recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/rag-agent-manager.git
cd rag-agent-manager
```

2. Install dependencies:
```bash
npm install
```

3. Build the plugin:
```bash
npm run dev
```

### Testing in Obsidian

1. Create a test vault or use an existing one
2. Navigate to your vault's plugins folder:
```bash
cd /path/to/your/vault/.obsidian/plugins/
```

3. Create a symlink to your development folder:
```bash
# On Mac/Linux:
ln -s /path/to/rag-agent-manager rag-agent-manager

# On Windows (as Administrator):
mklink /D rag-agent-manager C:\path\to\rag-agent-manager
```

4. In Obsidian:
    - Open Settings → Community Plugins
    - Disable Safe Mode
    - Enable "RAG Agent Manager"

5. The plugin will hot-reload as you make changes (while `npm run dev` is running)

### Build Commands

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
rag-agent-manager/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── settings.ts             # Settings definitions
│   ├── constants.ts            # Plugin constants
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── encryption/
│   │   └── keyManager.ts      # API key encryption
│   ├── llm/
│   │   ├── base.ts            # Base LLM interface
│   │   ├── anthropic.ts       # Anthropic implementation
│   │   ├── openai.ts          # OpenAI implementation
│   │   └── llmManager.ts      # Central coordinator that manages all providers
│   ├── rag/
│   │   ├── vectorStore.ts     # Vector database
│   │   ├── embeddings.ts      # Embedding generation
│   │   ├── retriever.ts       # Chunk retrieval
│   │   └── ingestor.ts        # Chunk ingestion
│   ├── agents/
│   │   ├── agentManager.ts    # Agent CRUD
│   │   ├── agentExecutor.ts   # Agent execution
│   │   └── templates.ts       # Agent templates
│   ├── ui/
│   │   ├── settingsTab.ts     # Settings interface
│   │   └── agentBuilderModal.ts # Agent creation UI
│   └── integration/
│       ├── dataviewAPI.ts     # DataviewJS integration
│       └── publicAPI.ts       # Public API
├── data/
│   └── rag_chunks/            # Your Risk Management chunks
├── styles/
│   └── main.css               # Plugin styles
├── manifest.json              # Plugin manifest
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## RAG Chunks

Place your converted Risk Management Handbook JSON files in the `data/rag_chunks/` directory:

- `rag_chunks_definitions.json`
- `rag_chunks_handling.json`
- `rag_chunks_assessment.json`
- `rag_chunks_roles.json`
- `rag_chunks_figures.json`

These will be ingested into the vector store during plugin initialization.

## Usage (Coming Soon)

Once development is complete, you'll be able to:

### 1. Configure LLM Providers

```javascript
// In plugin settings
Add LLM Provider → 
  Name: "My Claude"
  Provider: Anthropic
  API Key: [encrypted]
  Model: claude-sonnet-4-20250514
```

### 2. Create Agents

```javascript
// In plugin settings
Create Agent →
  Name: "Risk Identifier"
  LLM: My Claude
  System Prompt: "You are a risk management expert..."
  Retrieval Settings: Top K = 5, Threshold = 0.7
  Metadata Filters: process_phase = [identification, assessment]
```

### 3. Use in DataviewJS

```javascript
```dataviewjs
const agent = dv.app.plugins.plugins['rag-agent-manager']
  .getAgent('risk-identifier');

const response = await agent.execute(
  "What risks should I consider for AI implementation?"
);

dv.paragraph(response.answer);
```
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security

- **Never commit unencrypted API keys**
- The `.gitignore` is configured to exclude sensitive files
- API keys are encrypted using AES-256 with vault-specific salt
- Master password is never stored

## License

MIT License - see LICENSE file for details

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/rag-agent-manager/issues)
- 💬 [Discussions](https://github.com/yourusername/rag-agent-manager/discussions)

## Roadmap

- [x] Phase 0: Prerequisites
- [x] Phase 1: Project Foundation
- [ ] Phase 2: API Key Encryption
- [ ] Phase 3: RAG Implementation
- [ ] Phase 4: LLM Integration
- [ ] Phase 5: Agent System
- [ ] Phase 6: Settings UI
- [ ] Phase 7: DataviewJS Integration
- [ ] Phase 8: Testing & Polish
- [ ] Phase 9: Advanced Features

## Acknowledgments

- Built for flexible RAG-enhanced knowledge management
- Uses Anthropic Claude and OpenAI GPT APIs
- Powered by Transformers.js for local embeddings
- Inspired by the Obsidian community

---

Made with ❤️ for better knowledge management with AI
