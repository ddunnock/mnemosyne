# Mnemosyne Documentation

Welcome to the Mnemosyne documentation hub! This directory contains comprehensive guides for users, developers, and administrators.

## 📚 Documentation Structure

### 🎯 [User Guides](./user-guides/)
End-user documentation for getting started and using Mnemosyne features:
- **[Getting Started](./user-guides/getting-started.md)** - Installation and initial setup
- **[LLM Providers](./user-guides/llm-providers.md)** - Configure OpenAI, Anthropic, Local LLMs, L3Harris, etc.
- **[Inline AI Features](./user-guides/inline-ai-features.md)** - Auto-completion, text actions, review modals
- **[Agent Setup](./user-guides/agent-setup.md)** - Installing and configuring AI agents
- **[Knowledge Base](./user-guides/knowledge-base.md)** - Vector stores, embeddings, RAG system
- **[DataviewJS Integration](./user-guides/dataviewjs-integration.md)** - Using AI in forms and queries

### 📋 [Capabilities & Specifications](./capabilities/)
Technical specifications and architecture documentation:
- **[Architecture Overview](./capabilities/architecture-overview.md)** - System design and components
- **[Agent Orchestration](./capabilities/agent-orchestration.md)** - How the Archon Agent system works
- **[RAG System](./capabilities/rag-system.md)** - Retrieval Augmented Generation internals
- **[Inline AI](./capabilities/inline-ai.md)** - Technical specification of inline features
- **[MCP Tools](./capabilities/mcp-tools.md)** - Model Context Protocol tool system
- **[Security](./capabilities/security.md)** - Security architecture and best practices

### 🚀 [Deployment](./deployment/)
Installation and deployment guides for different environments:
- **[Docker Setup](./deployment/docker-setup.md)** - PostgreSQL + pgvector with Docker
- **[Enterprise Deployment](./deployment/enterprise-deployment.md)** - L3Harris, Azure OpenAI, corporate LLMs
- **[Vector Store Backends](./deployment/vector-store-backends.md)** - JSON, SQLite, PostgreSQL comparison

### 🛠️ [Developer Documentation](./developer/)
For contributors and developers extending Mnemosyne:
- **[Contributing Guide](./developer/contributing.md)** - How to contribute to the project
- **[Agent Development](./developer/agent-development.md)** - Creating custom agents
- **[Vector Store Implementation](./developer/vector-store-implementation.md)** - Backend development
- **[MCP Tool Development](./developer/mcp-tool-development.md)** - Creating new tools
- **[Testing Guide](./developer/testing-guide.md)** - Testing strategies and frameworks

### 📦 [Archive](./archive/)
Historical documentation and implementation notes:
- **[Development History](./archive/development-history/)** - Implementation summaries and notes

## 🔍 Quick Links

### Common Tasks
- **New User?** Start with [Getting Started](./user-guides/getting-started.md)
- **Want inline AI?** See [Inline AI Features](./user-guides/inline-ai-features.md)
- **Corporate LLM?** Check [Enterprise Deployment](./deployment/enterprise-deployment.md)
- **Need local AI?** Read [LLM Providers](./user-guides/llm-providers.md) (Ollama section)
- **Want to contribute?** See [Contributing Guide](./developer/contributing.md)

### By Feature
- **Agents**: [Agent Setup](./user-guides/agent-setup.md) → [Agent Orchestration](./capabilities/agent-orchestration.md)
- **Embeddings**: [Knowledge Base](./user-guides/knowledge-base.md) → [RAG System](./capabilities/rag-system.md)
- **Text Actions**: [Inline AI Features](./user-guides/inline-ai-features.md) → [Inline AI Spec](./capabilities/inline-ai.md)
- **Corporate Setup**: [Enterprise Deployment](./deployment/enterprise-deployment.md) → [LLM Providers](./user-guides/llm-providers.md)

## 📖 Documentation Conventions

### Audience Tags
- 👤 **User** - End users of Mnemosyne in Obsidian
- 🏢 **Admin** - IT administrators deploying for teams
- 👨‍💻 **Developer** - Contributors and plugin developers

### Difficulty Levels
- 🟢 **Beginner** - No technical background needed
- 🟡 **Intermediate** - Some technical knowledge helpful
- 🔴 **Advanced** - Technical expertise required

## 🆘 Need Help?

1. **Check the docs** - Use the structure above to find relevant guides
2. **Search issues** - [GitHub Issues](https://github.com/anthropics/mnemosyne/issues)
3. **Ask questions** - [GitHub Discussions](https://github.com/anthropics/mnemosyne/discussions)
4. **Report bugs** - [New Issue](https://github.com/anthropics/mnemosyne/issues/new)

## 📝 Contributing to Documentation

Documentation contributions are welcome! See [Contributing Guide](./developer/contributing.md) for:
- Documentation standards
- How to add new pages
- Screenshot guidelines
- Review process

---

**Last Updated**: 2025-10-24
**Plugin Version**: 1.0+
