# Research: RAG Agent System Refactor

**Date**: 2025-10-18
**Feature**: RAG Agent System Refactor
**Purpose**: Resolve technical decisions and research best practices for implementation

## Executive Summary

This research document resolves all technical decisions needed for the RAG Agent System Refactor. Key decisions: Use Ollama's official npm package for local AI, support both Transformers.js and Ollama embeddings, implement heading-based chunking with quality scoring, hardcode initial templates with JSON export capability, and replace DataviewJS with command-driven native API integration.

---

## 1. Local AI Integration Patterns

### Decision: Ollama Integration Approach

**Chosen**: Official Ollama npm package (`ollama`)

**Rationale**:
- Official TypeScript support with full type definitions
- Active maintenance by Ollama team
- Simple HTTP-based API with automatic retries
- Built-in streaming support for chat responses
- Model management utilities (list, pull, delete)

**Alternatives Considered**:
1. **Custom HTTP wrapper using fetch**
   - Rejected: Requires maintaining custom types and retry logic
   - Would need to manually handle streaming responses
   - No benefit over official package

2. **Generic HTTP client (axios/got)**
   - Rejected: Overhead of generic client when official package exists
   - Still requires manual type definitions

**Implementation Notes**:
```typescript
// Installation
npm install ollama

// Usage pattern
import Ollama from 'ollama';

const client = new Ollama({ host: 'http://localhost:11434' });

// Check availability
const models = await client.list();

// Generate with streaming
const stream = await client.chat({
  model: 'llama2',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true
});
```

**Best Practices**:
- Implement connection health check on plugin startup
- Cache model list to avoid repeated API calls
- Provide clear user guidance when Ollama not running
- Support custom host/port configuration for advanced users
- Implement graceful fallback to cloud providers when offline

### Decision: Local Embedding Model Selection

**Chosen**: Support BOTH Transformers.js and Ollama embeddings

**Rationale**:
- Transformers.js: Zero-setup browser-based embeddings (good for simple use cases)
- Ollama embeddings: Better quality, more model options (good for power users)
- Hybrid approach provides flexibility based on user preferences

**Transformers.js Recommendation**:
- Model: `Xenova/all-MiniLM-L6-v2` (384-dimensional, fast, lightweight)
- ~50MB download, runs in browser/Node.js
- Good balance of quality vs. performance

**Ollama Embedding Recommendation**:
- Models: `nomic-embed-text` (primary), `mxbai-embed-large` (alternative)
- Higher quality than browser models
- Requires Ollama running locally

**Alternatives Considered**:
1. **Transformers.js only**
   - Rejected: Limited model quality, slower than Ollama for batch operations

2. **Ollama embeddings only**
   - Rejected: Requires Ollama setup, not as accessible for beginners

**Implementation Strategy**:
```typescript
interface EmbeddingProvider {
  type: 'transformers' | 'ollama' | 'openai';
  model: string;
}

// User can choose:
// - Transformers.js (easiest, zero setup)
// - Ollama (better quality, requires local setup)
// - OpenAI (best quality, requires API key + internet)
```

**Hybrid Architecture Pattern**:
- Detection: Check for Ollama availability on startup
- Recommendation: Suggest Ollama if available, fallback to Transformers.js
- Settings: Allow explicit user override
- Performance: Cache embeddings aggressively to minimize regeneration

---

## 2. Obsidian Native API Capabilities

### Research: MetadataCache API for Frontmatter

**Capability**: Full frontmatter parsing support

```typescript
// Obsidian provides MetadataCache
const metadata = this.app.metadataCache.getFileCache(file);

if (metadata?.frontmatter) {
  const tags = metadata.frontmatter.tags || [];
  const category = metadata.frontmatter.category;
  const customFields = Object.keys(metadata.frontmatter);
}
```

**Best Practices**:
- Use `getFileCache()` for cached metadata (fast)
- Listen to `metadata-cache:changed` event for updates
- Handle missing frontmatter gracefully
- Support both YAML and inline frontmatter

### Research: Vault API for File Watching

**Capability**: Comprehensive file watching with events

```typescript
// Watch for file changes
this.registerEvent(
  this.app.vault.on('modify', async (file: TFile) => {
    // Re-process file for RAG
    await this.reingestFile(file);
  })
);

// Watch for file creation
this.registerEvent(
  this.app.vault.on('create', async (file: TAbstractFile) => {
    if (file instanceof TFile && file.extension === 'md') {
      await this.ingestFile(file);
    }
  })
);

// Watch for deletion
this.registerEvent(
  this.app.vault.on('delete', async (file: TAbstractFile) => {
    await this.removeFromIndex(file.path);
  })
);
```

**Best Practices**:
- Debounce file modification events (avoid multiple rapid triggers)
- Batch process multiple changes for efficiency
- Respect exclude patterns before processing
- Use `registerEvent()` for automatic cleanup on plugin unload

### Research: TFile/TFolder APIs for Link Extraction

**Capability**: Full support for wikilinks and markdown links

```typescript
// Get all links from a file
const metadata = this.app.metadataCache.getFileCache(file);

// Outgoing links
const links = metadata?.links || [];
links.forEach(link => {
  console.log('Link to:', link.link);
});

// Backlinks (who links to this file)
const backlinks = this.app.metadataCache.getBacklinksForFile(file);
```

**Best Practices**:
- Include link context in chunk metadata for better retrieval
- Resolve links to actual file paths for navigation
- Support both `[[wikilinks]]` and `[markdown](links.md)`
- Track bidirectional links for graph-aware retrieval

### Research: Glob Pattern Support

**Capability**: Native glob pattern matching via `Vault.getAllFiles()`

```typescript
// Manual glob matching (Obsidian doesn't have built-in glob)
// Use micromatch library or implement simple wildcard matching

import { minimatch } from 'minimatch'; // Add as dependency

const excludePatterns = ['private/**', '*.excalidraw.md', 'Archive/**'];

function shouldExclude(filePath: string): boolean {
  return excludePatterns.some(pattern =>
    minimatch(filePath, pattern, { matchBase: true })
  );
}

// Apply during ingestion
const files = this.app.vault.getMarkdownFiles();
const filtered = files.filter(file => !shouldExclude(file.path));
```

**Best Practices**:
- Use `minimatch` library for glob pattern support
- Support both include and exclude patterns
- Match against full path, not just filename
- Provide pattern validation in settings UI

**Decision**: Add `minimatch` as dependency for glob pattern support

---

## 3. Intelligent Chunking Algorithms

### Decision: Chunking Strategy

**Chosen**: Heading-based chunking with semantic boundary detection

**Rationale**:
- Obsidian notes naturally organize by headings
- Preserves logical structure and context
- Better quality than fixed-size chunking
- Respects markdown hierarchy (H1 > H2 > H3)

**Algorithm**:
```
1. Split by headings (H1, H2, H3) to create sections
2. For each section:
   a. If section < max_chunk_size: Keep as single chunk
   b. If section > max_chunk_size: Split by paragraphs
   c. Preserve heading context in chunk metadata
3. Assign quality scores based on:
   - Length (prefer 200-500 tokens)
   - Coherence (complete sentences, no cut-offs)
   - Information density (not just lists/boilerplate)
```

**Quality Scoring Metrics**:
- **Length Score** (0-1): Penalty for too short (<100 tokens) or too long (>800 tokens)
- **Coherence Score** (0-1): Check for complete sentences, paragraph boundaries
- **Information Density** (0-1): Ratio of content words to function words
- **Final Score** = 0.4 × Length + 0.4 × Coherence + 0.2 × Density

**Alternatives Considered**:
1. **Fixed-size chunking (500 tokens)**
   - Rejected: Cuts across semantic boundaries, poor context

2. **Paragraph-based only**
   - Rejected: Paragraphs can be very long or very short, inconsistent

3. **Sentence-based**
   - Rejected: Too granular, loses context

**Implementation Notes**:
- Use existing markdown parser (Obsidian provides metadata)
- Max chunk size: 500 tokens (~2000 characters)
- Min chunk size: 50 tokens (~200 characters)
- Overlap: Include previous heading for context

**Token Limit Handling**:
- Truncate chunks >1000 tokens with warning in logs
- Provide user setting for max chunk size
- Display truncation warnings in ingestion progress

---

## 4. Professional Agent Prompt Engineering

### Decision: Agent Template Storage

**Chosen**: Hardcoded in `templates.ts` with JSON export/import capability

**Rationale**:
- Hardcoded: Ensures quality, prevents corruption, easy to update in releases
- JSON export: Power users can share/customize templates
- JSON import: Community can contribute templates
- Hybrid approach balances ease-of-use with extensibility

**Template Structure**:
```typescript
interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'business' | 'creative' | 'technical' | 'personal';
  systemPrompt: string;
  retrievalSettings: {
    maxResults: number;
    minRelevance: number;
    folderScope?: string[];
  };
  exampleQueries: string[];
  icon: string; // Lucide icon name
  tags: string[];
}
```

**10+ Professional Templates** (Summary):
1. **Research Analyst** - Academic research, citations, literature review
2. **Strategic Consultant** - Business analysis, frameworks, decision support
3. **Technical Writer** - Documentation, API guides, technical communication
4. **Project Manager** - Timeline analysis, risk assessment, resource planning
5. **Learning Facilitator** - Educational content, curriculum design, assessments
6. **Creative Director** - Brainstorming, concept development, creative strategy
7. **Knowledge Curator** - Information organization, taxonomy, content strategy
8. **Code Reviewer** - Programming best practices, architecture, debugging
9. **Meeting Facilitator** - Agenda planning, note synthesis, action items
10. **Personal Coach** - Goal setting, habit tracking, productivity optimization
11. **Legal Researcher** - Case analysis, precedent research, legal writing
12. **Medical Note Analyst** - Clinical note analysis, medical terminology, research

**System Prompt Best Practices**:
- 500-700 words for optimal balance
- Clear role definition in first paragraph
- Specific domain knowledge and terminology
- Communication style guidelines
- Output format expectations
- Example of good response structure

**Domain-Specific Retrieval Strategies**:
- Research Analyst: Higher max results (10), favor recent notes
- Creative Director: Lower relevance threshold (more exploratory)
- Code Reviewer: Scope to code/technical folders
- Personal Coach: Scope to journal/goals folders

**Alternatives Considered**:
1. **JSON files only**
   - Rejected: Risk of corruption, harder to maintain quality

2. **User-editable templates in vault**
   - Rejected: Too complex for average users, versioning issues

3. **Template marketplace/API**
   - Future consideration: Community template sharing in v2.0

**Implementation Notes**:
```typescript
// templates.ts
export const BUILTIN_TEMPLATES: AgentTemplate[] = [
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    systemPrompt: '...',
    // ... full template
  },
  // ... 11 more
];

// Export capability
function exportTemplate(template: AgentTemplate): string {
  return JSON.stringify(template, null, 2);
}

// Import capability (with validation)
function importTemplate(json: string): AgentTemplate {
  const template = JSON.parse(json);
  validateTemplate(template); // Check required fields
  return template;
}
```

---

## 5. Risk Management Terminology Removal

### Audit: Files with Risk References

**11 Files Identified** (from grep results):
1. `src/ui/settings/components/AgentManagement.ts`
2. `src/main.ts`
3. `src/ui/agentBuilderModal.ts`
4. `src/utils/initializationManager.ts`
5. `src/types/index.ts` ⚠️ CRITICAL - Type definitions
6. `src/llm/llmManager.ts`
7. `src/integration/publicAPI.ts`
8. `src/constants.ts` ⚠️ CRITICAL - Enums and constants
9. `src/agents/templates.ts` ⚠️ CRITICAL - Agent templates
10. `src/agents/agentManager.ts`
11. `src/agents/agentExecutor.ts`

### Mapping: Risk Concepts → General Equivalents

| Risk Management Term | General Equivalent | Notes |
|---------------------|-------------------|-------|
| `RiskAnalysis` | `Analysis` or `Insight` | Generic analysis concept |
| `ProcessPhase` enum | Remove entirely | No longer needed for general use |
| `HandlingStrategy` | `ProcessingStrategy` | More general term |
| `riskContext` | `context` or `domainContext` | Drop "risk" prefix |
| `riskAssessment` | `assessment` or `evaluation` | Generic evaluation |
| `mitigationPlan` | `actionPlan` or `strategy` | Not risk-specific |
| `threatLevel` | `priority` or `importance` | General priority concept |

### Type Migration Strategy

**Critical Types to Refactor** (in `src/types/index.ts`):
```typescript
// BEFORE (Risk-Specific)
interface ChunkMetadata {
  riskContext?: string;
  processPhase?: ProcessPhase;
  handlingStrategy?: HandlingStrategy;
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
}

enum ProcessPhase {
  IDENTIFICATION = 'identification',
  ASSESSMENT = 'assessment',
  MITIGATION = 'mitigation',
  MONITORING = 'monitoring'
}

// AFTER (General Purpose)
interface ChunkMetadata {
  // Standard Obsidian metadata
  filePath: string;
  folderPath: string;
  fileName: string;
  createdAt: number;
  modifiedAt: number;

  // Frontmatter-derived
  tags: string[];
  frontmatter: Record<string, any>;
  aliases: string[];

  // Link metadata
  outgoingLinks: string[];
  backlinks: string[];

  // Content metadata
  headingContext: string[];
  position: { start: number; end: number };

  // Chunk quality
  qualityScore: number;
  chunkType: 'heading' | 'paragraph' | 'list' | 'table';

  // Optional domain context (user can add custom fields)
  customMetadata?: Record<string, any>;
}

// Remove enums entirely
// ProcessPhase - DELETED
// HandlingStrategy - DELETED
```

### Backward Compatibility Considerations

**Decision**: No backward compatibility needed

**Rationale**:
- Plugin is in development (v0.2.0)
- Not yet released to community plugin store
- User base is limited (development/testing only)
- Breaking changes acceptable at this stage

**Migration Path** (if needed in future):
```typescript
// If we had existing users, would implement:
async function migrateOldData() {
  const oldSettings = await this.loadData();

  if (oldSettings.agents) {
    // Map old agent structure to new structure
    oldSettings.agents = oldSettings.agents.map(migrateAgent);
  }

  await this.saveData(oldSettings);
}
```

**Refactoring Checklist**:
- [ ] Update type definitions in `src/types/index.ts`
- [ ] Remove risk-specific enums from `src/constants.ts`
- [ ] Update agent templates in `src/agents/templates.ts`
- [ ] Refactor agent manager and executor
- [ ] Update UI components (AgentManagement, AgentBuilderModal)
- [ ] Update public API surface
- [ ] Update documentation and comments
- [ ] Search codebase for any remaining "risk" references
- [ ] Run tests to verify no breakages

---

## 6. DataviewJS Replacement

### Decision: Command-Driven Native API Integration

**Chosen**: Command palette integration with native Obsidian APIs

**Rationale**:
- Simplest user experience (no syntax to learn)
- Native Obsidian feel (command palette is familiar)
- No external dependencies
- Can add UI modals for complex queries

**Implementation Approach**:
```typescript
// Register commands
this.addCommand({
  id: 'quick-query',
  name: 'Quick Query',
  callback: () => {
    new QuickQueryModal(this.app, this).open();
  }
});

this.addCommand({
  id: 'ask-current-note',
  name: 'Ask About Current Note',
  callback: () => {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      this.queryCurrentNote(activeFile);
    }
  }
});

this.addCommand({
  id: 'summarize-folder',
  name: 'Summarize Folder',
  callback: async () => {
    const folder = await selectFolder();
    this.summarizeFolder(folder);
  }
});
```

**Query Template System** (Simplified):
- Predefined query templates accessible via command palette
- No custom syntax needed
- Templates use native Obsidian file pickers for folder selection

**Alternatives Considered**:
1. **Custom query language** (like DataviewJS)
   - Rejected: Adds complexity, learning curve, potential for errors

2. **Template-based code blocks** (like DataviewJS)
   - Rejected: Requires users to understand syntax, harder to debug

3. **Sidebar panel with form UI**
   - Considered for future: Good for power users, but command-driven is simpler for v1

**Integration Points**:
- Command palette (primary interface)
- Right-click context menu on folders/files
- Optional: Sidebar chat view for persistent queries

---

## Technology Stack Summary

### Core Dependencies
- ✅ **Existing**: Obsidian API, OpenAI SDK, Anthropic SDK, crypto-js
- 🆕 **New**:
  - `ollama` - Official Ollama client
  - `@xenova/transformers` - Local browser embeddings
  - `minimatch` - Glob pattern matching

### Development Dependencies
- ✅ **Existing**: TypeScript 5.3+, Jest, ESLint, Prettier
- ✅ **No changes needed**

### Architecture Decisions
- **UI**: Vanilla TypeScript (confirmed, not React)
- **Local AI**: Ollama + Transformers.js hybrid
- **Chunking**: Heading-based with quality scoring
- **Templates**: Hardcoded with JSON export/import
- **Vault Integration**: Command-driven with native APIs
- **Risk Removal**: Complete refactor, no backward compatibility

---

## Implementation Priority

Based on user story priorities:

1. **P1: General-Purpose Agents** (US1)
   - Remove risk terminology
   - Generalize type system
   - Create 10+ professional templates

2. **P2: Local AI** (US2)
   - Implement Ollama provider
   - Add Transformers.js embeddings
   - Hybrid configuration UI

3. **P2: Template Library** (US3)
   - Agent template browser UI
   - One-click application
   - Customization interface

4. **P3: Native Vault Integration** (US4)
   - Remove DataviewJS dependency
   - Implement command-driven queries
   - Frontmatter/tag indexing

5. **P3: Intelligent Ingestion** (US5)
   - Heading-based chunking
   - Quality scoring
   - File watching automation

---

## Next Steps

1. ✅ Decisions made for all technical unknowns
2. ✅ Ready to proceed to Phase 1: Design & Contracts
3. ✅ Generate `data-model.md` with generalized entities
4. ✅ Generate API contracts for agent, LLM, ingestion
5. ✅ Generate `quickstart.md` for user onboarding

**All research complete. No blockers for implementation.**
