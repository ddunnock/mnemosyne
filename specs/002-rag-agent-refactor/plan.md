# Implementation Plan: RAG Agent System Refactor

**Branch**: `002-rag-agent-refactor` | **Date**: 2025-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-rag-agent-refactor/spec.md`

**Note**: This plan tracks with RAG-Agent-Refactor-Plan.md and acknowledges existing Phase 1 progress (Modern UI Foundation 90% complete).

## Summary

Transform Mnemosyne from a risk management-specific tool to a general-purpose AI agent platform for Obsidian. This refactor removes domain-specific code, adds local AI support via Ollama, implements a professional agent template library, eliminates external plugin dependencies, and provides intelligent vault-wide ingestion with semantic chunking.

**Current State**: Phase 1 (Modern UI Foundation) is 90% complete with SettingsController and AgentManagement components implemented in vanilla TypeScript.

**Technical Approach**:
1. Systematically remove risk management terminology from 11 identified source files
2. Generalize type system to support any knowledge domain
3. Integrate Ollama provider alongside existing OpenAI/Anthropic support
4. Create 10+ professional agent templates (Research, Strategy, Writing, etc.)
5. Replace DataviewJS dependency with native Obsidian API integration
6. Implement intelligent chunking with quality scoring for RAG retrieval

## Technical Context

**Language/Version**: TypeScript 5.3+ with strict mode enabled
**Primary Dependencies**:
  - Obsidian API 1.4.0+
  - Existing: OpenAI SDK, Anthropic SDK, crypto-js
  - New: @xenova/transformers (local embeddings), Ollama client library
**Storage**:
  - Vector embeddings: Local file-based storage in vault `.obsidian/plugins/mnemosyne/`
  - Configuration: Obsidian plugin data API
  - Encrypted API keys: AES-256 with vault-scoped salts
**Testing**: Jest 29+ with ts-jest, React Testing Library (for future UI tests)
**Target Platform**: Obsidian Desktop (Windows, macOS, Linux), mobile support planned
**Project Type**: Single Obsidian plugin with modular architecture
**Performance Goals**:
  - Vault ingestion: 100+ notes/minute
  - Query response: <5 seconds for 500-note vaults
  - Startup time: <2 seconds
  - Memory usage: <500MB for 5k note vaults
**Constraints**:
  - Must work without external plugin dependencies
  - No network calls for local-only configurations
  - Obsidian plugin size limits (~50MB total)
  - TypeScript strict mode compliance
**Scale/Scope**: Support vaults from 10 to 10,000 notes with graceful degradation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Refactor Status: ⚠️ PARTIAL COMPLIANCE

**Principle I: Clean Code First**
- ✅ PASS: Existing code follows clean code principles with descriptive names
- ⚠️ IMPROVEMENT NEEDED: Some files exceed 300 lines (will be addressed during refactor)
- ✅ PASS: No magic numbers, single responsibility observed

**Principle II: Professional Documentation & Comments**
- ⚠️ IMPROVEMENT NEEDED: Not all files have header comments (will be added during refactor)
- ⚠️ IMPROVEMENT NEEDED: Public API functions need JSDoc comments (systematic addition required)
- ✅ PASS: No commented-out code, inline comments explain "why"

**Principle III: Type Safety & Validation**
- ✅ PASS: TypeScript strict mode enabled, explicit types used
- ⚠️ VIOLATION TO ADDRESS: Some `any` types exist in risk management-specific code (will be removed during type generalization)
- ✅ PASS: Input validation at system boundaries

**Principle IV: Test Coverage**
- ⚠️ IMPROVEMENT NEEDED: Test suite exists but coverage is incomplete
- 🎯 PLAN: Add tests for new components during refactor

**Principle V: Code Review Standards**
- ✅ PASS: Feature branch workflow established
- ✅ PASS: Git hooks configured for linting/formatting

### Post-Design Target: ✅ FULL COMPLIANCE

All violations will be addressed during refactor with systematic:
1. File header comment addition
2. JSDoc comment generation for public APIs
3. `any` type elimination
4. Test coverage expansion
5. File splitting where >300 lines

## Current Progress Assessment

### ✅ Completed (Phase 0 & Phase 1 - 90%)

**Phase 0: Project Foundation (Week 1)**
- ✅ Repository rebranded to Mnemosyne
- ✅ MIT license and contributing guidelines
- ✅ Development stack: ESLint, Prettier, TypeScript strict mode
- ✅ Build system: esbuild with hot reload
- ✅ Jest testing framework configured

**Phase 1: Modern UI Foundation (Weeks 2-4 - 90% Complete)**
- ✅ Vanilla TypeScript architecture (NOT React - decision made)
- ✅ MnemosyneSettingsController with professional UI
- ✅ AgentManagement component with CRUD operations
- ✅ Status chips and modern card-based layout
- ✅ CSS custom properties with Obsidian theme integration
- ✅ Git workflow with feature branches

### 🔄 In Progress / Remaining Work

**Phase 1 Remaining (10%)**
- 🔄 Agent Template Integration - Connect UI to AgentBuilderModal
- 🔄 Provider Setup Modal - AI provider configuration interface
- 🔄 Settings Persistence - Complete save/load functionality
- 🔄 Professional Templates - 10+ specialized agent templates

**Phase 1 Core Refactoring (Not Yet Started)**
- ⏸️ Domain Generalization - Remove risk terminology from 11 source files
- ⏸️ Type System Refactoring - Generalize ChunkMetadata and related types
- ⏸️ Constants Cleanup - Remove ProcessPhase, HandlingStrategy enums
- ⏸️ Local AI Integration - Ollama provider implementation
- ⏸️ Vault Integration - Replace DataviewJS with native APIs
- ⏸️ Intelligent Chunking - Semantic boundary preservation

**Future Phases (Post-Refactor)**
- 📋 Phase 2: Professional Agent System (Weeks 5-7)
- 📋 Phase 3: Testing & QA (Week 6)
- 📋 Phase 4: Documentation (Week 7)
- 📋 Phase 5: UX Polish (Week 8)

## Project Structure

### Documentation (this feature)

```
specs/002-rag-agent-refactor/
├── spec.md                  # Feature specification (COMPLETED)
├── plan.md                  # This file (IN PROGRESS)
├── research.md              # Phase 0 output (TO BE GENERATED)
├── data-model.md            # Phase 1 output (TO BE GENERATED)
├── quickstart.md            # Phase 1 output (TO BE GENERATED)
├── contracts/               # Phase 1 output (TO BE GENERATED)
│   ├── agent-api.yaml       # Agent CRUD operations
│   ├── llm-provider.yaml    # LLM provider interface
│   └── ingestion-api.yaml   # Vault ingestion interface
└── tasks.md                 # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

**Current Structure** (Obsidian plugin - single project):

```
mnemosyne/
├── src/
│   ├── main.ts                          # Plugin entry point (HAS RISK REFS)
│   ├── settings.ts                      # Configuration management
│   ├── constants.ts                     # App constants (HAS RISK REFS - NEEDS CLEANUP)
│   ├── types/
│   │   └── index.ts                     # Type definitions (HAS RISK REFS - NEEDS REFACTOR)
│   │
│   ├── agents/                          # AI Agent System (NEEDS REFACTOR)
│   │   ├── agentManager.ts              # CRUD operations (HAS RISK REFS)
│   │   ├── agentExecutor.ts             # Execution engine (HAS RISK REFS)
│   │   ├── templates.ts                 # Templates (HAS RISK REFS - NEEDS 10+ GENERAL TEMPLATES)
│   │   └── types.ts                     # Agent types
│   │
│   ├── ui/                              # ✅ Modern UI (PHASE 1 COMPLETE)
│   │   ├── settingsTab.ts               # ✅ MnemosyneSettingTab
│   │   ├── agentBuilderModal.ts         # ✅ Agent creation modal (HAS RISK REFS)
│   │   └── settings/                    # ✅ Modern settings system
│   │       ├── SettingsController.ts    # ✅ Main controller (HAS RISK REFS)
│   │       └── components/
│   │           └── AgentManagement.ts   # ✅ Agent UI (HAS RISK REFS)
│   │
│   ├── llm/                             # Multi-LLM Support (NEEDS OLLAMA)
│   │   ├── base.ts                      # Provider interface
│   │   ├── openai.ts                    # ✅ OpenAI implementation
│   │   ├── anthropic.ts                 # ✅ Anthropic implementation
│   │   ├── ollama.ts                    # 🆕 TO CREATE - Local Ollama support
│   │   └── llmManager.ts                # Provider coordinator (HAS RISK REFS)
│   │
│   ├── rag/                             # RAG System (NEEDS ENHANCEMENT)
│   │   ├── vectorStore.ts               # Vector database
│   │   ├── embeddings.ts                # Cloud embeddings
│   │   ├── localEmbeddings.ts           # 🆕 TO CREATE - Transformers.js embeddings
│   │   ├── retriever.ts                 # Semantic search
│   │   ├── vaultIngestor.ts             # 🆕 TO CREATE - Native vault ingestion
│   │   └── intelligentChunker.ts        # 🆕 TO CREATE - Semantic chunking
│   │
│   ├── encryption/                      # ✅ Security Layer
│   │   └── keyManager.ts                # API key encryption
│   │
│   ├── integration/                     # Obsidian Integration (NEEDS WORK)
│   │   ├── publicAPI.ts                 # Public plugin API (HAS RISK REFS)
│   │   ├── commands.ts                  # Command palette
│   │   ├── nativeQueries.ts             # 🆕 TO CREATE - Replace DataviewJS
│   │   └── templateEngine.ts            # 🆕 TO CREATE - Query templates
│   │
│   └── utils/                           # Utilities
│       ├── initializationManager.ts     # Smart initialization (HAS RISK REFS)
│       ├── performanceMonitor.ts        # 🆕 TO CREATE - Performance tracking
│       └── errorHandler.ts              # 🆕 TO CREATE - Error handling
│
├── tests/                               # Test Suite (NEEDS EXPANSION)
│   ├── unit/                            # Unit tests
│   ├── integration/                     # Integration tests
│   └── e2e/                             # End-to-end tests (TO CREATE)
│
├── styles/                              # ✅ Styling
│   ├── main.css                         # Plugin styles
│   └── components.css                   # Component-specific
│
└── docs/                                # ✅ Documentation
    ├── README.md                        # Marketing overview
    ├── USER_GUIDE.md                    # User documentation
    ├── API.md                           # API reference
    └── CONTRIBUTING.md                  # ✅ With constitution reference
```

**Structure Decision**: Single Obsidian plugin architecture is appropriate. No web/mobile separation needed. Modular organization by concern (agents, llm, rag, ui, integration) allows for clear separation and testability. Existing structure is sound and will be preserved with targeted refactoring.

## Complexity Tracking

*No constitution violations requiring justification. All identified improvements are planned refactoring work, not architectural violations.*

## Phase 0: Research & Decision Making

### Research Tasks

1. **Local AI Integration Patterns**
   - Research Ollama client library options for TypeScript
   - Investigate Transformers.js browser embedding models
   - Best practices for hybrid cloud/local AI architectures
   - Model availability detection and user guidance UX

2. **Obsidian Native API Capabilities**
   - Research MetadataCache API for frontmatter parsing
   - Investigate Vault API for file watching and batch operations
   - Evaluate TFile/TFolder APIs for link extraction
   - Glob pattern support for exclude functionality

3. **Intelligent Chunking Algorithms**
   - Research semantic boundary detection techniques
   - Investigate quality scoring metrics for RAG chunks
   - Best practices for markdown-specific chunking
   - Token limit handling strategies

4. **Professional Agent Prompt Engineering**
   - Research system prompt patterns for specialist agents
   - Investigate domain-specific retrieval strategies
   - Best practices for agent personality consistency
   - Example queries for each professional template

5. **Risk Management Terminology Removal**
   - Audit all 11 files with risk references
   - Map risk-specific concepts to general equivalents
   - Plan type migration strategy
   - Backward compatibility considerations (if any data migration needed)

### Decisions to Make

1. **Ollama Integration Approach**
   - Options: Official Ollama JS client, custom HTTP wrapper, or fetch-based
   - Recommendation needed: Which provides best TypeScript support?

2. **Local Embedding Model Selection**
   - Options: Transformers.js (browser), Ollama embeddings, or both
   - Recommendation needed: Which balances performance vs. ease of use?

3. **Chunking Strategy**
   - Options: Fixed-size, paragraph-based, or heading-based
   - Recommendation needed: Best for Obsidian markdown structure?

4. **Agent Template Storage**
   - Options: Hardcoded in templates.ts, JSON files, or user-editable
   - Recommendation needed: Balance between ease of use and extensibility?

5. **DataviewJS Replacement**
   - Options: Custom query language, template-based, or command-driven
   - Recommendation needed: What provides simplest user experience?

## Phase 1: Design & Contracts

### Data Model (to be generated in data-model.md)

**Key Entities to Design**:
1. GeneralizedAgent (replaces risk-specific agent)
2. AgentTemplate (10+ professional templates)
3. GeneralizedChunk (replaces risk-specific chunk metadata)
4. IngestionJob (vault processing tracking)
5. LLMProviderConfig (including Ollama)
6. Conversation (chat session persistence)

### API Contracts (to be generated in contracts/)

**Required Contracts**:
1. `agent-api.yaml` - Agent CRUD, template application, customization
2. `llm-provider.yaml` - Unified interface for OpenAI/Anthropic/Ollama
3. `ingestion-api.yaml` - Vault ingestion, watching, progress tracking
4. `chat-api.yaml` - Conversation management, agent switching

### Quickstart Guide (to be generated in quickstart.md)

**User Journey**: First-time setup to first successful query in <5 minutes

## Next Steps

**Immediate Actions**:
1. ✅ Generate `research.md` to resolve all technical decisions
2. ✅ Generate `data-model.md` with generalized entity definitions
3. ✅ Generate API contracts in `contracts/`
4. ✅ Generate `quickstart.md` for user onboarding
5. ✅ Update agent context with new technology decisions

**Then Execute**:
- Run `/speckit.tasks` to generate task breakdown
- Begin implementation starting with US1 (General-Purpose Agents)
- Systematic refactor of 11 files with risk management references
- Professional agent template creation (10+)
- Local AI integration (Ollama + Transformers.js)
