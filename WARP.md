# Mnemosyne - WARP Project Documentation

## 📋 Project Overview

**Mnemosyne** is a professional AI agent platform for Obsidian that transforms your knowledge vault into an intelligent assistant with multiple specialized AI agents, advanced RAG capabilities, and hybrid local/cloud AI support.

### 🎯 Core Purpose
Transform Obsidian into the ultimate knowledge management system by combining:
- **Multi-Agent Platform**: Specialized AI assistants for different domains and tasks
- **Advanced RAG**: Intelligent chunking, semantic search, and contextual retrieval
- **Hybrid AI**: Local privacy with Ollama + cloud power with OpenAI/Anthropic/Claude
- **Enterprise Security**: AES-256 encryption with vault-scoped key management
- **Modern UI**: Professional React + Tailwind interface with native Obsidian integration

### 📊 Project Status
**Current Version**: 0.1.0 (Pre-refactor)  
**Status**: Active Development - Major Refactor Phase  
**Target Version**: 1.0.0  
**Refactor Timeline**: 12-14 weeks  
**Last Updated**: October 17, 2024

---

## 🚀 Strategic Transformation

### Current State: Risk Management MVP → Target: Professional AI Agent Platform

**Previous Identity**: RAG Agent Manager (domain-specific risk management tool)  
**New Identity**: **Mnemosyne** (Greek goddess of memory - universal knowledge assistant)

### Key Differentiators vs. Competitors
- **Multiple Specialized Agents** vs. single general assistant (Smart Second Brain)
- **Local + Cloud AI Hybrid** for privacy and performance
- **Professional Enterprise UI** with React + Tailwind v4
- **Advanced RAG** with folder-aware intelligent chunking
- **Zero Dependencies** - works completely standalone
- **Enterprise Security** with military-grade encryption

---

## 🏗️ Architecture Overview

### Planned Architecture (Post-Refactor)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Tailwind)                 │
├─────────────────┬─────────────────┬─────────────────┬──────────┤
│ Agent Hub UI    │ Chat Interface  │ Settings Panel  │ Modals   │
│ • Agent Gallery │ • Conversations │ • AI Providers  │ • Setup  │
│ • Templates     │ • Streaming     │ • Vault Config  │ • Agent  │
│ • Customization │ • Citations     │ • Performance   │ • Help   │
└─────────────────┴─────────────────┴─────────────────┴──────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                      Core Plugin Layer                         │
├─────────────────┬─────────────────┬─────────────────┬──────────┤
│ Agent Manager   │ RAG Engine      │ LLM Providers   │ Security │
│ • Templates     │ • Vector Store  │ • OpenAI        │ • AES256 │
│ • Execution     │ • Embeddings    │ • Anthropic     │ • Vault  │
│ • Customization │ • Retrieval     │ • Ollama (Local)│   Keys   │
│ • Workflows     │ • Chunking      │ • Extensible    │ • Memory │
└─────────────────┴─────────────────┴─────────────────┴──────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                   Obsidian Integration Layer                   │
├─────────────────┬─────────────────┬─────────────────┬──────────┤
│ Vault Manager   │ UI Integration  │ API Layer       │ Storage  │
│ • File Watcher  │ • Views/Modals  │ • Public API    │ • Config │
│ • Metadata      │ • Commands      │ • Events        │ • Vector │
│ • Processing    │ • Ribbons       │ • Integration   │ • Cache  │
└─────────────────┴─────────────────┴─────────────────┴──────────┘
```

### 🔧 Technology Stack

**Frontend/UI**:
- React 18 with modern hooks and context
- Tailwind CSS v4 with Obsidian theme integration
- TypeScript 5.3+ with strict mode
- Professional component library

**AI/ML Integration**:
- OpenAI GPT models (3.5, 4, 4o, o1)
- Anthropic Claude (Sonnet, Opus, Haiku)
- Ollama local models (Llama, Mistral, CodeLlama)
- Transformers.js for local embeddings
- Vector similarity search with FAISS/HNSWlib

**Backend/Core**:
- Node.js 18+ with modern ESM
- Advanced chunking with quality scoring
- Streaming response support
- Memory-efficient processing
- Background task management

**Development Tools**:
- ESBuild with React/JSX support
- Jest testing framework with React Testing Library
- ESLint + Prettier with React rules
- Husky pre-commit hooks
- Hot reload development environment

---

## 📁 Planned Project Structure (Post-Refactor)

```
mnemosyne/
├── 📂 src/                             # Source code
│   ├── main.ts                         # Plugin entry point
│   ├── settings.ts                     # Configuration management
│   ├── constants.ts                    # App constants
│   │
│   ├── 📂 agents/                      # AI Agent System
│   │   ├── agentManager.ts             # CRUD operations
│   │   ├── agentExecutor.ts            # Execution engine
│   │   ├── professionalTemplates.ts    # 10+ specialist templates
│   │   └── types.ts                    # Agent type definitions
│   │
│   ├── 📂 ui/                          # React UI Components
│   │   ├── 📂 components/              # Reusable components
│   │   │   ├── Button.tsx              # Professional button component
│   │   │   ├── Card.tsx                # Card/panel component
│   │   │   ├── Modal.tsx               # Modal wrapper
│   │   │   ├── AgentGallery.tsx        # Agent template browser
│   │   │   └── ChatInterface.tsx       # Chat conversation UI
│   │   ├── 📂 views/                   # Obsidian views
│   │   │   ├── ChatView.tsx            # Right sidebar chat
│   │   │   ├── AgentHubView.tsx        # Main plugin interface
│   │   │   └── SetupWizard.tsx         # Onboarding flow
│   │   ├── 📂 hooks/                   # Custom React hooks
│   │   │   ├── useAgent.ts             # Agent management
│   │   │   ├── useChat.ts              # Chat state management
│   │   │   └── useSettings.ts          # Settings integration
│   │   └── ReactRenderer.tsx           # React integration layer
│   │
│   ├── 📂 llm/                         # Multi-LLM Support + Local AI
│   │   ├── base.ts                     # Provider interface
│   │   ├── openai.ts                   # OpenAI implementation
│   │   ├── anthropic.ts                # Anthropic implementation
│   │   ├── ollama.ts                   # 🆕 Local Ollama support
│   │   └── llmManager.ts               # Provider coordinator
│   │
│   ├── 📂 rag/                         # Enhanced RAG System
│   │   ├── vectorStore.ts              # Vector database
│   │   ├── embeddings.ts               # Cloud embeddings
│   │   ├── localEmbeddings.ts          # 🆕 Local embeddings (Transformers.js)
│   │   ├── retriever.ts                # Semantic search
│   │   ├── vaultIngestor.ts            # 🆕 Obsidian-native ingestion
│   │   └── intelligentChunker.ts       # 🆕 Advanced chunking
│   │
│   ├── 📂 encryption/                  # Security Layer
│   │   └── keyManager.ts               # API key encryption
│   │
│   ├── 📂 integration/                 # Obsidian Integration
│   │   ├── publicAPI.ts                # Public plugin API
│   │   ├── commands.ts                 # Command palette integration
│   │   ├── nativeQueries.ts            # 🆕 Replace DataviewJS dependency
│   │   └── templateEngine.ts           # 🆕 Query template system
│   │
│   └── 📂 utils/                       # Utilities
│       ├── initializationManager.ts    # Smart initialization
│       ├── performanceMonitor.ts       # 🆕 Performance tracking
│       └── errorHandler.ts             # 🆕 Comprehensive error handling
│
├── 📂 styles/                          # Styling
│   ├── main.css                        # Plugin styles + Tailwind
│   └── components.css                  # Component-specific styles
│
├── 📂 docs/                            # Documentation
│   ├── README.md                       # Marketing-ready overview
│   ├── USER_GUIDE.md                   # Comprehensive user guide
│   ├── API.md                          # Public API documentation
│   ├── SETUP.md                        # Installation instructions
│   └── CONTRIBUTING.md                 # Contribution guidelines
│
├── 📂 tests/                           # Test Suite
│   ├── 📂 unit/                        # Unit tests
│   ├── 📂 integration/                 # Integration tests
│   └── 📂 e2e/                         # End-to-end tests
│
├── 📄 Configuration Files
│   ├── package.json                    # Dependencies + React/Tailwind
│   ├── tsconfig.json                   # TypeScript config
│   ├── tailwind.config.js              # 🆕 Tailwind CSS configuration
│   ├── jest.config.js                  # 🆕 Jest testing configuration
│   ├── esbuild.config.mjs              # Build config + React support
│   ├── manifest.json                   # Plugin manifest (as Mnemosyne)
│   └── .eslintrc.json                  # ESLint + React rules
│
└── 📄 Project Files
    ├── WARP.md                         # This file
    ├── obsidian-plugin-roadmap.md      # Complete refactor roadmap
    ├── phase-0-1-execution-updated.md  # Phase 0-1 detailed guide
    └── CHANGELOG.md                     # Version history
```

---

## 🎯 Refactor Roadmap Summary

### Phase 0: Project Foundation (Week 1)
- ✅ Repository setup and rebranding to Mnemosyne
- ✅ Legal framework (MIT license, contributing guidelines)
- ✅ Enhanced development stack (React, Tailwind, local AI)
- ✅ Professional build system with testing

### Phase 1: Core Refactoring + Modern Foundation (Weeks 2-4)
- 🔄 Remove risk management specifics → generalize for all use cases
- 🔄 Local AI integration (Ollama + Transformers.js)
- 🔄 React UI foundation with Tailwind CSS
- 🔄 Eliminate external dependencies (DataviewJS, CustomJS)
- 🔄 Enhanced vault integration with native Obsidian APIs

### Phase 2: React UI + Professional Agent System (Weeks 5-7)
- 🔮 Complete React-based chat interface
- 🔮 Professional agent templates (10+ specialized assistants)
- 🔮 Agent customization and template system
- 🔮 Advanced command palette integration

### Phase 3: Testing & Quality Assurance (Week 6)
- 🔮 Comprehensive test suite (unit, integration, e2e)
- 🔮 Performance optimization and monitoring
- 🔮 Security audit and penetration testing
- 🔮 Cross-platform compatibility testing

### Phase 4: Professional Documentation (Week 7)
- 🔮 Marketing-ready README with screenshots
- 🔮 Comprehensive user guide
- 🔮 API documentation for developers
- 🔮 In-app help system and setup wizard

### Phase 5: User Experience Polish (Week 8)
- 🔮 Professional onboarding wizard
- 🔮 Enhanced error handling and recovery
- 🔮 Performance optimization
- 🔮 Settings redesign with professional UI

### Phase 6: Community Preparation (Week 9)
- 🔮 Beta testing program
- 🔮 Tutorial content creation (videos, blog posts)
- 🔮 Marketing asset development
- 🔮 Community engagement strategy

### Phase 7: Official Submission (Week 10)
- 🔮 Obsidian plugin store compliance
- 🔮 Repository cleanup and release preparation
- 🔮 Community plugins submission
- 🔮 Launch coordination

### Phase 8: Post-Launch Support (Weeks 11-12)
- 🔮 Community management and support
- 🔮 Bug fix workflow implementation
- 🔮 Feature roadmap development
- 🔮 Continuous improvement cycle

---

## 🔧 Development Setup

### Prerequisites
- **Node.js** 18.0+
- **npm** 9.0+
- **Obsidian** 1.4.0+
- **Git** (for version control)

### Quick Start (Current State)
```bash
# Clone repository
git clone https://github.com/dunnock/mnemosyne.git
cd mnemosyne

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
```

### Post-Refactor Quick Start (Planned)
```bash
# Install enhanced dependencies
npm install react react-dom @xenova/transformers tailwindcss

# Enhanced development
npm run dev        # Hot reload with React
npm run test       # Run test suite
npm run lint       # Code quality checks
npm run type-check # TypeScript validation
```

### Obsidian Installation
```bash
# Create symlink in test vault
ln -s $(pwd) ~/.obsidian/vaults/test-vault/.obsidian/plugins/mnemosyne
```

---

## 🎨 Key Features (Planned)

### 🤖 Professional Agent System
- **Template Gallery**: 10+ professional agent templates
- **Customization Studio**: Visual agent builder interface
- **Multi-Model Support**: Different LLMs per agent
- **Workflow Integration**: Agent chaining and automation
- **Performance Analytics**: Usage tracking and optimization

### 🧠 Advanced RAG Implementation
- **Intelligent Chunking**: Context-aware document processing
- **Semantic Search**: Vector-based content retrieval
- **Folder Awareness**: Contextual search within project hierarchies
- **Quality Scoring**: Content relevance and coherence metrics
- **Batch Processing**: Efficient vault-wide operations

### 🔒 Enterprise Security
- **AES-256 Encryption**: Military-grade API key protection
- **Vault-Scoped Keys**: Unique encryption per vault
- **Zero-Knowledge**: Master password never stored
- **Local Privacy**: Option for 100% local processing
- **Secure Memory**: Automatic sensitive data cleanup

### 🎯 Local AI Integration
- **Ollama Support**: Local LLM inference with popular models
- **Local Embeddings**: Browser-based embedding generation
- **Hybrid Architecture**: Seamless local/cloud switching
- **Privacy First**: Complete offline capability
- **Performance Optimized**: Intelligent model selection

### 🎨 Modern User Experience
- **React Interface**: Professional, responsive design
- **Tailwind Styling**: Modern, theme-aware components
- **Setup Wizard**: Guided onboarding experience
- **Chat Interface**: Persistent conversation management
- **Real-time Updates**: Live processing feedback

---

## 📈 Success Metrics & Goals

### Launch Targets (Month 1)
- **Downloads**: 1,000+ installs
- **GitHub Stars**: 100+ community recognition
- **User Retention**: 60%+ weekly retention
- **Bug Reports**: <5% of installations
- **Community Engagement**: 25+ active discussions

### Long-term Goals (6 Months)
- **Market Position**: Top 25 Obsidian plugins
- **User Base**: 10,000+ total downloads, 5,000+ active users
- **Community**: 1,000+ Discord/forum members
- **Quality**: 4.5+ star average rating
- **Recognition**: Official Obsidian team recognition

---

## 🔍 Current Development Environment

### MacOS Setup
- **Platform**: macOS
- **Shell**: zsh 5.9
- **Node.js**: Latest LTS
- **Development Path**: `/Users/dunnock/projects/mnemosyne`

### IDE Configuration
- **TypeScript**: Strict mode enabled
- **ESLint**: TypeScript + React rules
- **Prettier**: Automated formatting
- **Git Hooks**: Pre-commit linting and formatting

---

## 🤝 Contributing

### Development Workflow
1. **Fork & Clone**: Fork repository and clone locally
2. **Feature Branch**: Create feature branch (`feature/amazing-feature`)
3. **Development**: Implement changes with tests
4. **Quality Checks**: Run linting, tests, and type checking
5. **Pull Request**: Submit PR with detailed description

### Code Standards
- **TypeScript**: Strict typing required, no explicit `any`
- **React**: Modern hooks and functional components
- **Testing**: Unit tests for new features (Jest + RTL)
- **Documentation**: Update relevant docs and JSDoc comments
- **Accessibility**: WCAG compliance for UI components

---

## 🛣️ Future Vision

### Version 2.0+ Roadmap
- **Advanced Workflows**: Multi-step agent reasoning
- **Plugin Ecosystem**: Integration with popular Obsidian plugins
- **Mobile Support**: Touch-optimized interface
- **Team Features**: Shared agents and collaborative knowledge bases
- **Analytics Dashboard**: Usage insights and optimization recommendations
- **AI Model Marketplace**: Community-contributed specialized models

### Long-term Impact
**Mnemosyne** aims to establish the gold standard for AI-powered knowledge management in Obsidian, providing users with a professional-grade platform that respects privacy, delivers exceptional performance, and grows with their knowledge management needs.

---

## 📞 Contact & Support

**Maintainer**: David Dunnock  
**Project**: Mnemosyne (formerly RAG Agent Manager)  
**Repository**: [https://github.com/dunnock/mnemosyne](https://github.com/dunnock/mnemosyne)  
**Documentation**: [docs/](docs/)

---

*Named after Mnemosyne, the Greek goddess of memory and mother of the nine Muses, this plugin embodies the fusion of memory, knowledge, and creative inspiration.*

**Last Updated**: October 17, 2024  
**Document Version**: 2.0  
**Project Status**: Active Development - Refactor Phase