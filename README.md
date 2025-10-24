# Mnemosyne

<div align="center">
  <img src="Mnemosyne-Logo-Color.png" alt="Mnemosyne Logo" width="200"/>
  
  <h3>Professional AI Agent Platform for Obsidian</h3>
  <p><em>Transform your knowledge vault into an intelligent assistant with multiple specialized AI agents</em></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple)](https://obsidian.md/)
</div>

---

## 🌟 Overview

**Mnemosyne** (named after the Greek goddess of memory) is a professional AI agent platform that transforms your Obsidian vault into an intelligent knowledge assistant. With inline AI features, advanced RAG capabilities, multiple specialized AI agents, enterprise LLM support, and hybrid local/cloud AI, Mnemosyne represents the next evolution in personal knowledge management.

### ✨ Key Features

- ✍️ **Inline AI** - Auto-completion, text transformations, and smart editing as you write
- 🤖 **Multi-Agent Platform** - Multiple specialized AI assistants with orchestration support
- 🧠 **Advanced RAG** - Intelligent chunking, semantic search, and contextual retrieval
- 🏢 **Enterprise LLM Support** - L3Harris, Azure OpenAI, and corporate API gateways
- 🔒 **Hybrid AI Support** - Local privacy with Ollama + cloud power with OpenAI/Anthropic/Claude
- 🛡️ **Enterprise Security** - AES-256 encryption with vault-scoped key management
- 💎 **Modern UI** - Professional React + Tailwind interface with native Obsidian integration
- ⚡ **High Performance** - Optimized for speed and memory efficiency

---

## 🚀 Quick Start

### Prerequisites

- **Obsidian** 1.4.0 or later
- **Node.js** 18.0+ (for development)
- At least one AI provider API key (OpenAI, Anthropic, or local Ollama setup)

### Installation

#### Option 1: From Obsidian Community Plugins (Coming Soon)
1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Mnemosyne"
4. Install and enable

#### Option 2: Manual Installation
1. Download the latest release from [Releases](../../releases)
2. Extract to your vault's `.obsidian/plugins/mnemosyne/` folder
3. Enable the plugin in Obsidian settings

#### Option 3: Development Setup
```bash
# Clone the repository
git clone https://github.com/dunnock/mnemosyne.git
cd mnemosyne

# Install dependencies
npm install

# Build the plugin
npm run build

# Link to your test vault
ln -s $(pwd) /path/to/your/vault/.obsidian/plugins/mnemosyne
```

### Initial Configuration

1. **Set Master Password**: Open Mnemosyne settings and create a secure master password for API key encryption
2. **Configure AI Provider**: Add your OpenAI, Anthropic, Ollama, L3Harris, or Azure OpenAI endpoint
3. **Set Default Agent**: Choose which agent to use for inline AI features and chat
4. **Choose Vector Backend**: Select the appropriate vector store backend for your vault size (see below)
5. **Enable Inline AI** (Optional): Configure auto-completion and text transformation features in Advanced settings

---

## ⚙️ Vector Store Configuration

### Using JSON Backend (Default)

No configuration needed! JSON backend works out of the box:

```
Settings → Mnemosyne → Vector Store → Backend: JSON File
```

Your vector index will be stored in `vector-store-index.json` in your vault's plugin folder.

### Using SQLite Backend (Recommended)

Perfect for most users - combines simplicity with performance:

1. Open **Settings → Mnemosyne → Vector Store**
2. Select **SQLite + VSS** from the backend dropdown
3. Optionally customize:
   - Database Path: `vector-store.db` (default)
   - Enable WAL Mode: ✓ (recommended for better concurrency)
4. Click **Save Configuration**

**Migrating from JSON:**
- Click **Migrate to SQLite** button
- Wait for migration to complete
- Your original JSON data is preserved

**Benefits:**
- ✅ Zero external setup (embedded database)
- ✅ 2-3x faster search than JSON
- ✅ Lower memory usage
- ✅ Single file backup (just copy the .db file)
- ✅ ACID transaction safety

### Using PostgreSQL Backend

For large vaults or advanced deployments.

**📘 Quick Start**: See [DOCKER_SETUP.md](DOCKER_SETUP.md) for a complete Docker-based setup guide.

#### 1. Setup PostgreSQL with pgvector

**Using Docker (Recommended):**
```bash
docker run -d \
  --name mnemosyne-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=mnemosyne \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

**Using Docker Compose:**
```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: mnemosyne
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: yourpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**Manual Installation:**
```bash
# Install PostgreSQL 14+
sudo apt-get install postgresql postgresql-contrib

# Install pgvector extension
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Enable extension
psql -U postgres -c "CREATE EXTENSION vector;"
```

#### 2. Configure in Mnemosyne

1. Open **Settings → Mnemosyne → Vector Store**
2. Select **PostgreSQL + pgvector** from backend dropdown
3. Enter connection details:
   - Host: `localhost` (or your server IP)
   - Port: `5432`
   - Database: `mnemosyne`
   - User: `postgres`
   - Password: `yourpassword`
   - SSL: Enable if using remote server
4. Click **Test Connection** to verify
5. Click **Save Configuration**

#### 3. Migration (Optional)

To migrate existing data:
- Click **Migrate to PostgreSQL** button
- Monitor real-time progress
- Verify chunk count matches source

**Benefits:**
- ✅ Scales to millions of chunks
- ✅ HNSW indexing for ultra-fast search
- ✅ Connection pooling for concurrency
- ✅ Professional-grade reliability
- ✅ Multi-vault support

### Performance Comparison

| Vault Size | JSON | SQLite | PostgreSQL |
|------------|------|--------|------------|
| 1K chunks | ~10ms | ~8ms | ~5ms |
| 10K chunks | ~50ms | ~25ms | ~10ms |
| 100K chunks | N/A (too slow) | ~100ms | ~15ms |
| 1M chunks | N/A | N/A | ~20ms |

*Search times are averages for semantic similarity queries with k=5 results*

---

## ✍️ Inline AI Features

Get AI assistance directly in your writing flow without breaking focus:

### 🔮 Auto-Completion
- **Ghost text suggestions** appear as you type
- **Tab to accept**, Escape to dismiss
- Context-aware completions based on your current note
- Configurable delay and length

### 🎨 Text Transformations
- **Selection Toolbar** - Floating toolbar in editor with quick actions
- **Universal Context Menu** - Right-click AI actions that work **everywhere** (even DataviewJS forms!)
- **9 Built-in Actions**:
  - ✨ Rewrite - Improve clarity and flow
  - 📝 Expand - Add detail and elaboration
  - 📄 Summarize - Condense to key points
  - ✅ Fix Grammar - Correct errors
  - 🎯 Make Concise - Remove unnecessary words
  - 📖 Make Detailed - Add context and examples
  - 💡 Simplify - Use simpler language
  - 👔 Professional Tone - Formal business language
  - 😊 Casual Tone - Friendly conversational style
- **Custom Prompts** - Any transformation you can imagine

### ✓ Review Modal
- **Side-by-side comparison** of original vs AI-generated text
- **Accept, Reject, or Try Again** - Full control over changes
- **Word count tracking** - See exactly how much was added/removed
- **Dynamic sizing** - Adapts from small tweaks to full paragraphs

**Works with**: All LLM providers (OpenAI, Anthropic, Ollama, L3Harris, Azure)

📖 **[Complete Inline AI Guide →](docs/user-guides/inline-ai-features.md)**

---

## 🎯 Core Capabilities

### 🤖 Intelligent Agent System
- **Pre-built Templates** - 10+ professional agent templates for common use cases
- **Custom Agents** - Create specialized assistants tailored to your workflow
- **Agent Chaining** - Combine multiple agents for complex reasoning tasks
- **Performance Analytics** - Track usage and optimize agent performance

### 🧠 Advanced RAG Engine
- **Smart Chunking** - Context-aware document processing with quality scoring
- **Semantic Search** - Vector-based content retrieval using state-of-the-art embeddings
- **Folder Awareness** - Contextual search within project hierarchies
- **Batch Processing** - Efficient vault-wide operations
- **Multi-Backend Storage** - Choose from JSON, SQLite, or PostgreSQL based on vault size

#### 📊 Vector Store Backends

Mnemosyne supports three vector storage backends, each optimized for different vault sizes:

| Backend | Best For | Setup | Performance | Scalability |
|---------|----------|-------|-------------|-------------|
| **JSON File** | Small vaults (0-10K chunks) | Zero setup | Fast for small datasets | Limited to ~10K chunks |
| **SQLite + VSS** | Medium vaults (10K-100K chunks) | Zero setup, embedded | 2-3x faster than JSON | Scales to 100K chunks |
| **PostgreSQL + pgvector** | Large vaults (100K+ chunks) | Requires PostgreSQL server | Fastest with HNSW indexing | Millions of chunks |

**Choosing a Backend:**

- **JSON** (Default) - Perfect for getting started, works out of the box, ideal for smaller personal vaults
- **SQLite** - Recommended sweet spot for most users, zero external setup with significantly better performance
- **PostgreSQL** - For power users with large knowledge bases or requiring multi-vault setups

All backends support seamless migration, so you can start with JSON and upgrade as your vault grows.

### 🔒 Enterprise-Grade Security
- **AES-256 Encryption** - Military-grade API key protection
- **Vault-Scoped Keys** - Unique encryption per vault for maximum security
- **Zero-Knowledge** - Master password never stored or transmitted
- **Local Privacy** - Option for 100% local processing with Ollama

### 🎨 Modern User Experience
- **React Interface** - Professional, responsive design system
- **Dark Mode Support** - Seamless integration with Obsidian themes
- **Setup Wizard** - Guided onboarding experience
- **Real-time Feedback** - Live processing updates and error handling

---

## 🛠️ Supported AI Providers

| Provider | Models | Features | Local |
|----------|--------|----------|-------|
| **OpenAI** | GPT-4, GPT-4 Turbo, GPT-3.5 | ✅ Chat, ✅ Embeddings, ✅ Streaming | ❌ |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | ✅ Chat, ❌ Embeddings, ✅ Streaming | ❌ |
| **Ollama** | Llama, Mistral, CodeLlama, etc. | ✅ Chat, ✅ Embeddings, ✅ Streaming | ✅ |
| **L3Harris AI Platform** | GPT-4, GPT-3.5-Turbo | ✅ Chat, ✅ Embeddings, ✅ Streaming | 🏢 Corporate |
| **Azure OpenAI** | GPT-4, GPT-3.5, Embeddings | ✅ Chat, ✅ Embeddings, ✅ Streaming | 🏢 Corporate |
| **Custom OpenAI-Compatible** | Any model | ✅ Chat, ✅ Embeddings, ✅ Streaming | 🔧 Configurable |

### 🏢 Enterprise & Corporate LLMs

Mnemosyne fully supports enterprise LLM deployments with:
- **Automatic Endpoint Detection** - L3Harris and Azure endpoints automatically detected and adapted
- **CORS Bypass** - Built-in support for corporate networks using Obsidian's requestUrl
- **Custom Authentication** - Flexible header and authentication schemes
- **Air-Gapped Deployments** - 100% offline with local LLMs (Ollama, vLLM, etc.)

**Supported Platforms:**
- ✅ L3Harris AI Platform (fully tested)
- ✅ Azure OpenAI (fully tested)
- ✅ Open WebUI
- ✅ vLLM servers
- ✅ Any OpenAI-compatible API

📖 **[Enterprise Deployment Guide →](docs/deployment/enterprise-deployment.md)**

### 🔌 Local Embeddings (Offline)

For 100% privacy and zero API costs:
- **Transformers.js** - Browser-based ML models (Xenova/all-MiniLM-L6-v2)
- **Zero setup** - Works completely offline
- **Fast** - ~50ms per embedding on modern hardware
- **Privacy** - All processing happens locally in your vault

📖 **[Knowledge Base Setup →](docs/user-guides/knowledge-base.md)**

---

## 📖 Documentation

### 🎯 User Guides
- 🚀 **[Getting Started](docs/user-guides/getting-started.md)** - Installation and initial setup
- ✍️ **[Inline AI Features](docs/user-guides/inline-ai-features.md)** - Auto-completion, text actions, review modal
- 🤖 **[Agent Setup](docs/user-guides/agent-setup.md)** - Installing and configuring AI agents
- 🔑 **[LLM Providers](docs/user-guides/llm-providers.md)** - OpenAI, Anthropic, Ollama, L3Harris, Azure
- 📚 **[Knowledge Base](docs/user-guides/knowledge-base.md)** - Vector stores, embeddings, RAG system
- 📋 **[DataviewJS Integration](docs/user-guides/dataviewjs-integration.md)** - Using AI in forms and queries

### 🚀 Deployment Guides
- 🏢 **[Enterprise Deployment](docs/deployment/enterprise-deployment.md)** - L3Harris, Azure OpenAI, corporate LLMs
- 🐳 **[Docker Setup](docs/deployment/docker-setup.md)** - PostgreSQL + pgvector with Docker
- 🗄️ **[Vector Store Backends](docs/deployment/vector-store-backends.md)** - JSON, SQLite, PostgreSQL comparison

### 📋 Capabilities & Specifications
- 🏗️ **[Architecture Overview](docs/capabilities/architecture-overview.md)** - System design and components
- 🎭 **[Agent Orchestration](docs/capabilities/agent-orchestration.md)** - Master Agent (Archon) system
- 🧠 **[RAG System](docs/capabilities/rag-system.md)** - Retrieval Augmented Generation internals
- ✍️ **[Inline AI Specification](docs/capabilities/inline-ai.md)** - Technical architecture
- 🔧 **[MCP Tools](docs/capabilities/mcp-tools.md)** - Model Context Protocol tool system
- 🛡️ **[Security Architecture](docs/capabilities/security.md)** - Encryption and key management

### 🛠️ Developer Documentation
- 🤝 **[Contributing Guide](docs/developer/contributing.md)** - How to contribute to the project
- 🎭 **[Agent Development](docs/developer/agent-development.md)** - Creating custom agents
- 🗄️ **[Vector Store Implementation](docs/developer/vector-store-implementation.md)** - Backend development
- 🧪 **[Testing Guide](docs/developer/testing-guide.md)** - Testing strategies and frameworks

📚 **[Complete Documentation Hub →](docs/README.md)**

---

## 🎯 Use Cases

### 📝 **Research & Writing**
- **Academic Research** - Intelligent literature review and citation management
- **Content Creation** - AI-assisted writing with contextual knowledge retrieval
- **Note-Taking** - Automatic summarization and cross-referencing

### 💼 **Professional Work**
- **Project Management** - Risk analysis and decision support
- **Knowledge Management** - Team knowledge base with intelligent search
- **Documentation** - Automated documentation generation and maintenance

### 🎓 **Learning & Education**
- **Study Assistant** - Personalized tutoring based on your notes
- **Concept Mapping** - Visual knowledge connections and relationships
- **Exam Preparation** - Intelligent quiz generation and progress tracking

---

## 🔧 Development

### Tech Stack
- **Frontend**: React 18, TypeScript 5.3+, Tailwind CSS v4
- **AI/ML**: OpenAI API, Anthropic API, Ollama, Transformers.js
- **Backend**: Node.js 18+, Vector similarity search
- **Build**: ESBuild, Hot reload development
- **Testing**: Jest, React Testing Library
- **Quality**: ESLint, Prettier, Husky pre-commit hooks

### Development Commands
```bash
npm run dev          # Development mode with hot reload
npm run build        # Production build
npm run test         # Run test suite
npm run lint         # Code quality checks
npm run type-check   # TypeScript validation
```

---

## 🔧 Troubleshooting

### Vector Store Issues

#### "SQLite backend configuration missing" Error

**Cause**: Backend was switched to SQLite but configuration wasn't created.

**Solution**:
1. Open Settings → Mnemosyne → Vector Store
2. Switch to a different backend, then back to SQLite
3. The plugin will auto-create the configuration
4. Restart Obsidian

Alternatively, manually create the config by clicking **Save Configuration** after selecting SQLite.

#### PostgreSQL Connection Fails

**Common Issues:**

1. **"Connection timeout after 10 seconds"**
   - Verify PostgreSQL is running: `pg_isready`
   - Check firewall allows port 5432
   - Verify host/port are correct

2. **"password authentication failed"**
   - Double-check username and password
   - Ensure user has necessary permissions
   - Try connecting with `psql` manually to verify credentials

3. **"Extension 'vector' does not exist"**
   - Install pgvector extension:
     ```bash
     psql -U postgres -d mnemosyne -c "CREATE EXTENSION vector;"
     ```

4. **SSL Required but disabled**
   - Enable SSL in Mnemosyne settings
   - Or disable SSL requirement in PostgreSQL: `ssl = off` in `postgresql.conf`

#### Migration Stuck or Failed

**If migration appears stuck:**
- Check console for errors (Ctrl+Shift+I / Cmd+Opt+I)
- Verify target backend is accessible
- Check available disk space

**If migration fails:**
- Source data is never deleted - it's safe to retry
- Check error messages in migration progress
- Verify both backends are properly configured
- Try migrating in smaller batches (restart migration)

#### Performance Issues

**JSON backend slow:**
- Consider upgrading to SQLite for 2-3x speed improvement
- Reduce vault size by excluding folders in RAG settings

**SQLite backend slow:**
- Enable WAL mode in settings (improves concurrent access)
- Run VACUUM: Delete `.db` file and re-ingest (or run maintenance in UI)
- Consider PostgreSQL for vaults >100K chunks

**PostgreSQL slow searches:**
- Verify HNSW index exists:
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'embeddings';
  ```
- Increase `work_mem` in PostgreSQL config
- Check query performance with `EXPLAIN ANALYZE`

#### Memory Issues

**"Out of memory" during ingestion:**
- Use batch processing (enabled by default)
- Reduce batch size in RAG settings
- Close other memory-intensive applications
- For large vaults, use PostgreSQL instead of JSON

---

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- 🐛 Bug reports and feature requests
- 🔧 Development setup and workflow
- 📝 Documentation improvements
- 🧪 Testing guidelines
- 📋 Code style and standards

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Obsidian Team** - For creating an incredible knowledge management platform
- **Open Source Community** - For the amazing tools and libraries that make this possible
- **Beta Testers** - For invaluable feedback and bug reports
- **Mnemosyne** - The Greek goddess of memory who inspired this project

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](../../issues)
- 💬 **Discussions**: [GitHub Discussions](../../discussions)
- 📧 **Security Issues**: See [SECURITY.md](SECURITY.md)
- 💡 **Feature Requests**: [GitHub Issues](../../issues) with `enhancement` label

---

<div align="center">
  <strong>Transform your knowledge. Amplify your intelligence. Remember everything.</strong>
  
  <br><br>
  
  Made with ❤️ for the Obsidian community
</div>
