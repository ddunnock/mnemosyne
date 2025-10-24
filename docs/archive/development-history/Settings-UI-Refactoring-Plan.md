# Settings UI Refactoring Plan

## Overview
Refactor the monolithic `SettingsController.ts` (3500+ lines) into a modern tabbed interface with logical workflow organization and separation of concerns.

---

## Goals

### User Experience Goals
1. **Intuitive Workflow** - Guide users through setup in logical order
2. **Quick Start** - Get running in 3 simple steps
3. **Progressive Disclosure** - Easy defaults with advanced options hidden
4. **Clear Organization** - Group related settings by purpose
5. **Responsive Design** - Clean, modern UI that works well

### Technical Goals
1. **Separation of Concerns** - Each tab in its own file
2. **Maintainability** - < 300 lines per file
3. **Reusability** - Shared components for common UI patterns
4. **Type Safety** - Strong typing throughout
5. **Testability** - Easy to test individual tabs

---

## Tab Structure

### Tab 1: Quick Start 🚀
**Purpose:** Get users up and running in 3 steps
**File:** `src/ui/settings/tabs/QuickStartTab.ts`

**Content:**
- **Step 1: Add LLM Provider**
  - Simple button to add provider
  - Status: Show configured providers
  - Visual indicator: ✓ if complete, number if not

- **Step 2: Create/Select Agent**
  - Quick agent creation
  - Show existing agents
  - Disabled until Step 1 complete

- **Step 3: Index Vault**
  - One-click ingestion
  - Show chunk count if indexed
  - Disabled until Step 1 complete

- **Quick Tips Section**
  - Best practices
  - Links to relevant tabs
  - Common pitfalls to avoid

**Layout:**
```
┌─────────────────────────────────────┐
│ 👋 Welcome to Mnemosyne             │
│ Get started in 3 steps...           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [1] Add LLM Provider          [+ Add]│
│ ✓ 2 providers configured            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [2] Create Agent           [Create] │
│ ✓ 4 agents configured               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [3] Index Vault            [Index]  │
│ ✓ 1,234 chunks indexed              │
└─────────────────────────────────────┘

💡 Quick Tips
• Start with OpenAI or Claude
• Use local LLMs for privacy
...
```

---

### Tab 2: LLM Providers 🤖
**Purpose:** Configure AI providers (cloud, local, enterprise)
**File:** `src/ui/settings/tabs/ProvidersTab.ts`

**Sections:**

#### 2.1 Provider List
- Table/Cards of configured providers
- Enable/disable toggles
- Edit/Delete/Test actions
- Set default provider

#### 2.2 Add Provider (Simple)
**Collapsible "Quick Add" section:**
- Provider Type dropdown: OpenAI / Claude / Local
- API Key input (with show/hide)
- Model selection (recommended models)
- [+ Add Provider] button

#### 2.3 Advanced Options (Collapsed by default)
**Expandable "Advanced Configuration":**
- Base URL (for local/enterprise)
- Temperature slider (0-1, default 0.7)
- Max Tokens (default 4096)
- Custom headers
- Timeout settings

**Layout:**
```
┌─────────────────────────────────────┐
│ Configured Providers                 │
├─────────────────────────────────────┤
│ ● OpenAI GPT-4      [Edit] [Test]  │
│ ○ Ollama Mistral    [Edit] [Test]  │
│ ● Claude Sonnet     [Edit] [Test]  │
└─────────────────────────────────────┘

▼ Add New Provider
  Provider: [OpenAI ▼]
  API Key:  [••••••••] [👁]
  Model:    [gpt-4 ▼]
  [+ Add Provider]

▶ Advanced Configuration
  (collapsed)
```

---

### Tab 3: Agents 🎭
**Purpose:** Manage AI agents
**File:** `src/ui/settings/tabs/AgentsTab.ts`

**Sections:**

#### 3.1 Agent List
- Cards/Table of agents
- Show: Name, Provider, Category, Capabilities
- Quick actions: Edit, Delete, Test, Set Default
- Visual indicator for master agent

#### 3.2 Create Agent (Simple)
**Collapsible "Quick Create":**
- Name
- Select Provider (dropdown)
- Select Template (Risk Discovery / Custom)
- [Create Agent] button

#### 3.3 Advanced Options (Collapsed)
**Expandable "Advanced Agent Settings":**
- System Prompt (textarea)
- Retrieval Settings (toggle)
  - Max chunks
  - Score threshold
- Orchestration Metadata
  - Capabilities (tags)
  - Category
  - Visibility (public/specialist)
- Tool Access (checkboxes)

**Layout:**
```
┌─────────────────────────────────────┐
│ Your Agents                          │
├─────────────────────────────────────┤
│ 🎯 Master Agent (orchestrator)      │
│    └─ Delegates to specialized      │
│                                      │
│ 🎭 Risk Discovery                   │
│    Provider: OpenAI GPT-4           │
│    [Edit] [Test] [Set Default]      │
│                                      │
│ 📝 Risk Title Polisher              │
│    Provider: Claude Sonnet          │
│    [Edit] [Test]                    │
└─────────────────────────────────────┘

▼ Create New Agent
  Name:     [_________]
  Provider: [OpenAI GPT-4 ▼]
  Template: [Risk Discovery ▼]
  [Create Agent]

▶ Advanced Configuration
  (collapsed)
```

---

### Tab 4: Knowledge Base 📚
**Purpose:** Vector store, embeddings, ingestion
**File:** `src/ui/settings/tabs/KnowledgeTab.ts`

**Sections:**

#### 4.1 Quick Status
- Current Status Card
  - Chunks indexed
  - Vector store backend
  - Embedding provider
  - Last updated
- [Index Vault] button

#### 4.2 Embedding Provider (Simple)
**Collapsible "Embedding Settings":**
- Provider: [OpenAI ▼] or [Local ▼]
- Model: Auto-selected based on provider
- Info box about re-indexing if changed

#### 4.3 Vector Store (Simple)
**Collapsible "Storage Backend":**
- Backend: [JSON / SQLite / PostgreSQL] cards
- Visual comparison: "Best for X chunks"
- Auto-selected based on vault size
- [Change Backend] button

#### 4.4 Advanced Options (Collapsed)
**Expandable "Advanced Settings":**

**Chunking:**
- Chunk size (default 500)
- Chunk overlap (default 50)

**Vector Store Config:**
- JSON: Index path
- SQLite: DB path, WAL mode
- PostgreSQL: Connection settings

**Auto-Ingestion:**
- Enable toggle
- Debounce delay
- File type filters
- Folder exclusions
- Batch size

**Layout:**
```
┌─────────────────────────────────────┐
│ 📊 Index Status                     │
│ • 1,234 chunks indexed              │
│ • Backend: SQLite                   │
│ • Embeddings: OpenAI (1536 dim)     │
│ • Updated: 5 minutes ago            │
│                                      │
│ [📚 Index Vault Now]                │
└─────────────────────────────────────┘

▼ Embedding Provider
  ○ OpenAI (Cloud, high quality)
  ● Local (Privacy-first, offline)

  Model: Xenova/all-MiniLM-L6-v2
  ⚠️ Changing provider requires re-indexing

▼ Storage Backend
  [JSON]    [SQLite]    [PostgreSQL]
  0-10K     10-100K     100K+
  ✓ Selected

▶ Advanced Settings
  ▶ Chunking Options
  ▶ Vector Store Configuration
  ▶ Auto-Ingestion
```

---

### Tab 5: Advanced ⚙️
**Purpose:** Power user features, experimental, security
**File:** `src/ui/settings/tabs/AdvancedTab.ts`

**Sections:**

#### 5.1 Security
- Master Password
  - Change password
  - Password strength indicator
  - Last changed date
- API Key Encryption
  - Status indicator
  - Re-encrypt button

#### 5.2 Memory Management
- Conversation Memory
  - Max messages slider
  - Auto-compression toggle
  - Compression settings (collapsed)
- Vector Store Integration
  - Store memories toggle

#### 5.3 MCP Tools
- Master Toggle: Enable MCP
- Tool Categories (collapsible)
  - File Operations
  - Obsidian Integration
  - System Commands
- Dangerous Operations
  - Require confirmation toggle
  - Default allow/deny

#### 5.4 Goddess Persona
- Enable Persona toggle
- Intensity: [Subtle / Moderate / Full]
- Custom Prompt (textarea)
- Speech Patterns (checkboxes)
- Knowledge Areas (checkboxes)

#### 5.5 Debug & Diagnostics
- Enable Debug Logging
- Export Settings
- Import Settings
- Clear Cache
- Reset to Defaults (dangerous)

**Layout:**
```
▼ Security
  Master Password: Last changed 2 days ago
  [Change Password]

  API Keys: ✓ Encrypted

▼ Memory Management
  Max Messages: [30 ───○─────] 50
  □ Auto-compress old messages
  ✓ Store in vector database

▼ MCP Tools
  ✓ Enable MCP Tools

  ▶ File Operations (3 tools)
  ▶ Obsidian Integration (5 tools)
  ▶ System Commands (2 tools)

  ✓ Confirm dangerous operations

▶ Goddess Persona
  (collapsed)

▶ Debug & Diagnostics
  (collapsed)
```

---

## File Structure

```
src/ui/settings/
├── SettingsController.ts          # Main controller (< 500 lines)
│
├── tabs/
│   ├── BaseTab.ts                 # Interface definition
│   ├── QuickStartTab.ts           # Tab 1 (~200 lines)
│   ├── ProvidersTab.ts            # Tab 2 (~300 lines)
│   ├── AgentsTab.ts               # Tab 3 (~300 lines)
│   ├── KnowledgeTab.ts            # Tab 4 (~400 lines)
│   └── AdvancedTab.ts             # Tab 5 (~400 lines)
│
├── components/                     # Existing components (keep)
│   ├── AgentManagement.ts
│   ├── ProviderManagement.ts
│   ├── GoddessPersonaManagement.ts
│   └── MemoryManagement.ts
│
└── shared/                         # New shared components
    ├── CollapsibleSection.ts      # Reusable collapsible UI
    ├── ProviderCard.ts            # Provider display card
    ├── AgentCard.ts               # Agent display card
    ├── StatusIndicator.ts         # Status badges/indicators
    └── ProgressBar.ts             # Progress/slider components
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 hours)
**Goal:** Set up tab infrastructure

**Tasks:**
1. ✅ Create `tabs/` directory
2. ✅ Create `BaseTab.ts` interface
3. Create `TabManager.ts` helper
4. Add tab styles to `injectCardStyles()`
5. Update `SettingsController` with tab navigation
6. Add tab switching logic

**Files Changed:**
- `tabs/BaseTab.ts` (new)
- `tabs/TabManager.ts` (new)
- `SettingsController.ts` (modify renderUI method)

**Testing:**
- Tab navigation works
- Active tab highlights
- Content area updates

---

### Phase 2: Quick Start Tab (1 hour)
**Goal:** Complete Tab 1

**Tasks:**
1. ✅ Create `QuickStartTab.ts` (already done)
2. Implement 3-step workflow UI
3. Add event handlers for buttons
4. Add status indicators
5. Add quick tips section

**Files Changed:**
- `tabs/QuickStartTab.ts` (complete)

**Testing:**
- All 3 steps render correctly
- Buttons trigger correct modals
- Status updates on reload
- Step dependencies work (disable until prerequisite)

---

### Phase 3: Providers Tab (2 hours)
**Goal:** Complete Tab 2

**Tasks:**
1. Extract provider list rendering from current code
2. Create simplified "Add Provider" section
3. Create collapsible advanced section
4. Move provider management logic from existing component
5. Add edit/delete/test actions

**Files Changed:**
- `tabs/ProvidersTab.ts` (new)
- `components/ProviderManagement.ts` (refactor to be called by tab)

**Testing:**
- Provider CRUD operations work
- Test provider connection works
- Advanced options save correctly
- Modal integration works

---

### Phase 4: Agents Tab (2 hours)
**Goal:** Complete Tab 3

**Tasks:**
1. Extract agent list from current code
2. Create simplified agent creation
3. Create collapsible orchestration section
4. Show master agent prominently
5. Add quick actions

**Files Changed:**
- `tabs/AgentsTab.ts` (new)
- `components/AgentManagement.ts` (refactor)

**Testing:**
- Agent CRUD works
- Master agent indicator shows
- Template selection works
- Orchestration metadata saves

---

### Phase 5: Knowledge Tab (3 hours)
**Goal:** Complete Tab 4

**Tasks:**
1. Create status dashboard
2. Simplify embedding provider selection
3. Simplify vector store selection
4. Move advanced settings to collapsible sections
5. Add auto-ingestion UI

**Files Changed:**
- `tabs/KnowledgeTab.ts` (new)
- Extract from `SettingsController` vector store methods

**Testing:**
- Status shows correct data
- Embedding provider switch works
- Vector store migration works
- Auto-ingestion settings save
- Ingestion modal launches

---

### Phase 6: Advanced Tab (2 hours)
**Goal:** Complete Tab 5

**Tasks:**
1. Move security settings
2. Move memory management
3. Move MCP tools
4. Move goddess persona
5. Add debug/diagnostics section

**Files Changed:**
- `tabs/AdvancedTab.ts` (new)
- Reuse existing components

**Testing:**
- All subsections work
- Toggles save correctly
- Password change works
- Export/import settings work

---

### Phase 7: Shared Components (2 hours)
**Goal:** Extract reusable UI patterns

**Tasks:**
1. Create `CollapsibleSection.ts`
2. Create card components
3. Create status indicators
4. Update tabs to use shared components

**Files Changed:**
- `shared/CollapsibleSection.ts` (new)
- `shared/ProviderCard.ts` (new)
- `shared/AgentCard.ts` (new)
- `shared/StatusIndicator.ts` (new)
- All tab files (refactor to use shared)

**Testing:**
- Shared components render correctly
- Collapsible sections animate
- Cards are consistent

---

### Phase 8: Polish & Testing (2 hours)
**Goal:** Make it production-ready

**Tasks:**
1. Add loading states
2. Add error handling
3. Add keyboard navigation
4. Add accessibility labels
5. Test all workflows end-to-end
6. Update documentation

**Files Changed:**
- All tabs (add error handling)
- `SettingsController.ts` (add loading states)

**Testing:**
- Complete user journey testing
- Test error scenarios
- Test with no providers
- Test with no agents
- Test switching tabs rapidly

---

## CSS/Styling Updates

### Tab Navigation Styles
```css
.settings-tabs {
  display: flex;
  gap: 8px;
  padding: 0 20px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
}

.settings-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-muted);
}

.settings-tab:hover {
  color: var(--text-normal);
  background: var(--background-modifier-hover);
}

.settings-tab.active {
  color: var(--interactive-accent);
  border-bottom-color: var(--interactive-accent);
}

.tab-icon {
  font-size: 18px;
}

.tab-label {
  font-weight: 500;
  font-size: 14px;
}
```

### Collapsible Section Styles
```css
.collapsible-section {
  margin-bottom: 16px;
}

.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapsible-header:hover {
  background: var(--background-modifier-hover);
}

.collapsible-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.collapsible-content.expanded {
  max-height: 2000px;
  padding: 16px;
  border: 1px solid var(--background-modifier-border);
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.collapsible-arrow {
  transition: transform 0.3s ease;
}

.collapsible-arrow.expanded {
  transform: rotate(90deg);
}
```

### Card Component Styles
```css
.provider-card,
.agent-card {
  padding: 16px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.provider-card:hover,
.agent-card:hover {
  border-color: var(--interactive-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-normal);
}

.card-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.active {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.status-indicator.inactive {
  background: rgba(156, 163, 175, 0.1);
  color: rgb(156, 163, 175);
}
```

---

## Migration Strategy

### Backward Compatibility
- Keep old render methods initially
- Add feature flag for new UI: `useTabsUI`
- Allow users to switch between old/new
- Remove old code after 2 releases

### Data Migration
- No settings schema changes needed
- All existing settings compatible
- No user action required

### Testing Strategy
1. **Unit Tests** - Each tab in isolation
2. **Integration Tests** - Tab switching, data flow
3. **E2E Tests** - Complete user workflows
4. **Manual Testing** - All combinations

---

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Keep existing code initially
- Feature flag for new UI
- Extensive testing before removing old code

### Risk 2: Performance Issues with Large Settings
**Mitigation:**
- Lazy load tab content
- Only render active tab
- Virtual scrolling for large lists

### Risk 3: User Confusion with New UI
**Mitigation:**
- In-app tutorial on first load
- Tooltips for all sections
- Help documentation
- Smooth transition period

---

## Success Metrics

### User Experience
- ✅ < 3 minutes to complete Quick Start
- ✅ < 5 clicks to add a provider
- ✅ < 3 clicks to create an agent
- ✅ Zero confusion about where to find settings

### Technical
- ✅ All files < 500 lines
- ✅ Tab switching < 100ms
- ✅ Zero regression bugs
- ✅ 90%+ code coverage

### Maintainability
- ✅ New developer can add a tab in < 1 hour
- ✅ Settings changes take < 30 minutes
- ✅ Clear file organization

---

## Timeline Estimate

**Total Time:** ~15-20 hours

- Phase 1: 2 hours
- Phase 2: 1 hour
- Phase 3: 2 hours
- Phase 4: 2 hours
- Phase 5: 3 hours
- Phase 6: 2 hours
- Phase 7: 2 hours
- Phase 8: 2 hours

**Recommended Approach:**
- Break into 3-4 hour work sessions
- Complete 1-2 phases per session
- Test thoroughly between phases
- Can be done over 4-5 sessions

---

## Next Steps

1. **Review this plan** - Get approval on approach
2. **Set up branch** - `feature/settings-ui-refactor`
3. **Start Phase 1** - Tab infrastructure
4. **Iterate through phases** - One at a time
5. **Test & Polish** - Make it production-ready
6. **Merge & Deploy** - Ship to users

---

## Notes

- This refactoring is **non-breaking**
- Can be done **incrementally**
- Improves **both UX and DX** (developer experience)
- Sets foundation for **future enhancements**
- Makes settings **actually enjoyable to use** 🎉

---

**Version:** 1.0
**Created:** 2025-10-21
**Status:** Ready for Implementation
