# Feature Specification: RAG Agent System Refactor

**Feature Branch**: `002-rag-agent-refactor`
**Created**: 2025-10-18
**Status**: Draft
**Input**: User description: "Create me a specify based on what you read in WARP.md and RAG-Agent-Refactor-Plan.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - General-Purpose Agent Interaction (Priority: P1)

As an Obsidian user, I want to interact with specialized AI agents (Research Analyst, Strategic Consultant, etc.) that understand my vault content, so that I can get expert-level assistance across different domains without needing to manually configure domain-specific settings.

**Why this priority**: This is the core value proposition of Mnemosyne - transforming from a risk management tool to a multi-purpose AI assistant platform. Without general-purpose agent functionality, users cannot leverage the plugin for their diverse use cases.

**Independent Test**: Can be fully tested by creating a general knowledge vault (notes on various topics), configuring an agent from the template library, and querying it. Success is demonstrated when agents provide relevant, context-aware responses based on vault content across different domains (not just risk management).

**Acceptance Scenarios**:

1. **Given** a vault with notes about cooking recipes, **When** I query the Research Analyst agent about "What baking techniques have I documented?", **Then** the agent returns relevant excerpts from my cooking notes with citations
2. **Given** I have created a custom agent using the Creative Director template, **When** I ask for brainstorming ideas related to my project notes, **Then** the agent provides creative suggestions based on my vault's content
3. **Given** a vault with academic research notes, **When** I switch between Research Analyst and Learning Facilitator agents in the same conversation, **Then** each agent responds with their specialized perspective using the same vault context

---

### User Story 2 - Local AI Privacy-First Experience (Priority: P2)

As a privacy-conscious user, I want to use local AI models (via Ollama) for all AI processing and embeddings, so that my personal knowledge never leaves my computer while still benefiting from intelligent assistance.

**Why this priority**: Privacy is a major differentiator for Mnemosyne vs. cloud-only solutions. This enables users with sensitive data (medical notes, legal research, personal journals) to leverage AI capabilities without data exposure concerns.

**Independent Test**: Can be tested independently by installing Ollama, configuring Mnemosyne to use local models exclusively, and verifying that all AI interactions work without internet connectivity. Success means full functionality (chat, search, embeddings) works offline.

**Acceptance Scenarios**:

1. **Given** Ollama is running locally with llama2 installed, **When** I configure an agent to use the local model, **Then** the agent responds to queries using the local model without any cloud API calls
2. **Given** I have selected nomic-embed-text for local embeddings, **When** I ingest my vault notes, **Then** embeddings are generated locally and queries work without requiring OpenAI embedding API
3. **Given** I am disconnected from the internet, **When** I query my local-only configured agent, **Then** I receive intelligent responses based on my vault content

---

### User Story 3 - Professional Agent Template Library (Priority: P2)

As a new user exploring Mnemosyne, I want to browse and apply pre-configured professional agent templates (Research Analyst, Strategic Consultant, Technical Writer, etc.), so that I can quickly get value from the plugin without needing to understand system prompts or RAG configuration.

**Why this priority**: This is a key differentiator from generic chat assistants like "Smart Second Brain". Professional templates provide immediate, specialized value and help users discover use cases they hadn't considered.

**Independent Test**: Can be tested by opening the agent template browser, previewing different templates with their descriptions and example queries, and applying a template to create an agent. Success is demonstrable when the created agent behaves according to the template's specialty.

**Acceptance Scenarios**:

1. **Given** I open the agent creation modal, **When** I browse the template library, **Then** I see 10+ professional templates with clear descriptions, use cases, and example queries
2. **Given** I select the "Meeting Facilitator" template, **When** I apply it and ask "What action items are in my meeting notes?", **Then** the agent analyzes my vault and provides a structured list of action items
3. **Given** I want a specialized agent, **When** I customize a template by modifying the system prompt and retrieval settings, **Then** the changes are saved and the agent behavior reflects my customizations

---

### User Story 4 - Native Vault Integration Without Dependencies (Priority: P3)

As an Obsidian user, I want Mnemosyne to work seamlessly with my vault's native features (frontmatter, tags, internal links, folders) without requiring external plugins like DataviewJS, so that I have a simplified, reliable setup.

**Why this priority**: Reduces friction for new users, eliminates dependency conflicts, and makes the plugin more maintainable. This is important for community plugin store approval and long-term reliability.

**Independent Test**: Can be tested by installing Mnemosyne in a fresh Obsidian vault without any other plugins, creating notes with frontmatter, tags, and links, and verifying that RAG retrieval and queries respect these native Obsidian features.

**Acceptance Scenarios**:

1. **Given** my notes have frontmatter tags like `category: research`, **When** I query an agent with folder-aware context, **Then** retrieval prioritizes notes matching the relevant category
2. **Given** I have notes organized in project folders, **When** I configure an agent to scope to a specific folder, **Then** the agent only retrieves context from that folder hierarchy
3. **Given** I have internal links between notes, **When** the agent cites a source, **Then** I can click the citation to navigate to the source note using Obsidian's native link handling

---

### User Story 5 - Vault-Wide Intelligent Ingestion (Priority: P3)

As a user with a large existing vault, I want to automatically ingest and process my notes into the RAG system with intelligent chunking and quality scoring, so that I can query my entire knowledge base without manual file-by-file configuration.

**Why this priority**: This enables the plugin to scale to real-world vaults with thousands of notes. Without automated ingestion, the plugin would require tedious manual setup and wouldn't be practical for power users.

**Independent Test**: Can be tested by pointing Mnemosyne at a large vault (500+ notes), configuring ingestion settings (folders to include/exclude), and running the ingestion process. Success is measured by completion time, quality of chunking (sentences aren't cut mid-thought), and query relevance.

**Acceptance Scenarios**:

1. **Given** I have a vault with 1000 markdown files, **When** I configure Mnemosyne to ingest the entire vault with default settings, **Then** ingestion completes in under 30 minutes with progress indicators
2. **Given** I want to exclude certain folders (private journal), **When** I set exclude patterns in settings, **Then** those folders are skipped during ingestion and queries don't retrieve content from them
3. **Given** my notes have varying quality and length, **When** chunking occurs, **Then** high-quality chunks (complete thoughts, proper context) are prioritized in retrieval over low-quality fragments

---

### Edge Cases

- What happens when a user queries an agent before any vault content has been ingested? (Should provide helpful error message explaining ingestion is required)
- How does the system handle vault notes with unusual markdown syntax or malformed frontmatter? (Should gracefully skip or clean malformed content rather than crashing)
- What happens when Ollama is configured but the model specified isn't installed locally? (Should detect this and provide clear instructions to install the model)
- How does the system behave when switching from cloud to local AI mid-conversation? (Should handle gracefully with a notice that the conversation context may change)
- What happens when embeddings fail for a subset of notes during ingestion? (Should continue processing, log errors, and allow users to retry failed notes)
- How does the system handle very large notes (>50,000 words)? (Should chunk intelligently and warn users about token limits)

## Requirements *(mandatory)*

### Functional Requirements

**Domain Generalization:**
- **FR-001**: System MUST remove all risk management-specific terminology, types, and constants from the codebase
- **FR-002**: System MUST support generic content categorization based on standard Obsidian metadata (tags, frontmatter, folders)
- **FR-003**: Chunk metadata MUST include standard Obsidian properties (file path, folder hierarchy, creation date, modification date, tags, links)
- **FR-004**: Agent templates MUST be domain-agnostic and configurable for any knowledge domain

**Local AI Integration:**
- **FR-005**: System MUST support Ollama as a local LLM provider for chat and completion
- **FR-006**: System MUST support local embedding generation using Transformers.js or Ollama embedding models
- **FR-007**: Users MUST be able to configure a hybrid approach (local embeddings + cloud LLM or vice versa)
- **FR-008**: System MUST detect Ollama availability and display clear setup instructions when not available
- **FR-009**: System MUST support multiple local models and allow users to select preferred models per agent

**Professional Agent System:**
- **FR-010**: System MUST provide at least 10 professional agent templates covering diverse domains (Research, Strategy, Writing, Coding, etc.)
- **FR-011**: Users MUST be able to browse agent templates with descriptions, example queries, and use cases
- **FR-012**: Users MUST be able to apply templates to create agents with one click
- **FR-013**: Users MUST be able to customize template-based agents (modify system prompt, adjust retrieval settings, change model selection)
- **FR-014**: Agent templates MUST include domain-specific system prompts that guide LLM behavior appropriately

**Native Vault Integration:**
- **FR-015**: System MUST parse and respect Obsidian frontmatter metadata during ingestion
- **FR-016**: System MUST extract and index Obsidian tags for context-aware retrieval
- **FR-017**: System MUST handle Obsidian internal links (wikilinks and markdown links)
- **FR-018**: System MUST NOT require external plugins (DataviewJS, CustomJS) for core functionality
- **FR-019**: System MUST provide folder-scoped queries (allow agents to focus on specific vault sections)

**Intelligent Ingestion:**
- **FR-020**: System MUST automatically watch configured folders for file changes and update embeddings incrementally
- **FR-021**: System MUST support exclude patterns (glob syntax) to skip folders or file types
- **FR-022**: System MUST perform intelligent chunking that preserves semantic boundaries (paragraphs, sections, complete thoughts)
- **FR-023**: System MUST assign quality scores to chunks based on coherence, length, and content type
- **FR-024**: System MUST provide progress indicators during vault ingestion
- **FR-025**: System MUST support batch processing limits to avoid memory exhaustion on large vaults

**User Experience:**
- **FR-026**: System MUST provide a setup wizard for first-time configuration (API keys, vault selection, first agent creation)
- **FR-027**: System MUST display clear error messages with actionable next steps when configuration is incomplete
- **FR-028**: System MUST persist conversation history and allow users to resume previous conversations
- **FR-029**: System MUST provide source citations for all RAG-based responses with clickable vault links
- **FR-030**: System MUST support agent switching within a conversation without losing context

### Key Entities

- **Agent**: Represents a specialized AI assistant with a system prompt, LLM provider configuration, retrieval settings, and optional folder scope. Attributes include name, description, template source, model selection, and customization parameters.

- **Agent Template**: Pre-configured agent blueprint with domain-specific system prompt, recommended retrieval settings, example queries, and specialization description. Serves as starting point for creating agents.

- **Chunk**: A semantically meaningful segment of vault content with metadata. Attributes include content text, source file path, quality score, embedding vector, frontmatter data, extracted tags, and position within source file.

- **Ingestion Job**: Represents a vault processing task. Attributes include folder paths to process, exclude patterns, progress status, processed file count, failed file count, and completion timestamp.

- **LLM Provider Configuration**: Settings for AI model access. Attributes include provider type (OpenAI, Anthropic, Ollama), model name, API endpoint, authentication details, and local/cloud designation.

- **Conversation**: A persistent chat session with an agent. Attributes include message history, agent reference, timestamp, vault scope at creation, and user annotations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create and use a general-purpose agent on any knowledge domain within 5 minutes of installation (measured by setup wizard completion time)

- **SC-002**: System supports 100% offline operation when configured with local AI, with query response times under 5 seconds for typical vault queries (measured in test environments with 500-note vaults)

- **SC-003**: 90% of new users successfully create their first agent using the template library without consulting documentation (measured via onboarding telemetry if enabled)

- **SC-004**: Vault ingestion processes 100+ notes per minute with intelligent chunking maintaining semantic boundaries in 95%+ of chunks (measured via automated chunk quality scoring)

- **SC-005**: Plugin operates reliably without requiring external plugin dependencies, achieving zero DataviewJS/CustomJS-related support tickets post-refactor

- **SC-006**: Query responses cite relevant vault sources with 85%+ accuracy (user confirms cited content is actually relevant to their query)

- **SC-007**: Users can switch between cloud and local AI providers without data loss or configuration corruption (tested via QA scenarios)

- **SC-008**: System handles vaults with 5,000+ notes without memory crashes, keeping memory usage under 500MB during active querying (measured via performance monitoring)

- **SC-009**: Professional agent templates produce domain-appropriate responses 90%+ of the time when tested with domain-specific queries (measured via expert evaluation)

- **SC-010**: Code refactor reduces risk management-specific terminology to zero occurrences (verified via codebase search)

## Assumptions

- Users have Obsidian 1.4.0+ installed
- Users understand basic Obsidian concepts (vaults, notes, folders)
- For local AI features, users are willing to install Ollama separately (not bundled with plugin)
- Vault notes are primarily markdown format (other formats may have limited support)
- Users have sufficient disk space for embeddings storage (approximately 1MB per 100 notes)
- Internet connectivity is available for cloud AI providers (optional for local-only configurations)
- Users have valid API keys for cloud providers they wish to use (OpenAI, Anthropic, Claude)