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

**Mnemosyne** (named after the Greek goddess of memory) is a professional AI agent platform that transforms your Obsidian vault into an intelligent knowledge assistant. With advanced RAG capabilities, multiple specialized AI agents, and hybrid local/cloud AI support, Mnemosyne represents the next evolution in personal knowledge management.

### ✨ Key Features

- 🤖 **Multi-Agent Platform** - Multiple specialized AI assistants for different domains and tasks
- 🧠 **Advanced RAG** - Intelligent chunking, semantic search, and contextual retrieval
- 🔒 **Hybrid AI Support** - Local privacy with Ollama + cloud power with OpenAI/Anthropic/Claude
- 🛡️ **Enterprise Security** - AES-256 encryption with vault-scoped key management
- 💎 **Modern UI** - Professional React + Tailwind interface with native Obsidian integration
- ⚡ **High Performance** - Optimized for speed and memory efficiency
- 🔧 **Zero Dependencies** - Works completely standalone within Obsidian

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
| **Ollama** | Llama, Mistral, CodeLlama | ✅ Chat, ✅ Embeddings, ✅ Streaming | ✅ |

---

## 📖 Documentation

- 📚 **[User Guide](docs/USER_GUIDE.md)** - Complete setup and usage instructions
- 🔧 **[API Documentation](docs/API.md)** - Public API reference for developers
- 🏗️ **[Development Guide](docs/CONTRIBUTING.md)** - Contributing to Mnemosyne
- 🛡️ **[Security Policy](SECURITY.md)** - Security guidelines and reporting
- 🗺️ **[Roadmap](docs/ROADMAP.md)** - Future development plans

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
