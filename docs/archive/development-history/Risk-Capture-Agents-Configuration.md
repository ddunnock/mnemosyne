---
tags:
  - documentation
  - agents
  - risk-management
  - configuration
created: 2025-10-21
updated: 2025-10-21
---

# Risk Capture Agents - Configuration Reference

This document contains the complete configuration details for the three specialized Risk Capture agents used in the Risk Register Form.

## Quick Reference

| Agent | Purpose | Form Integration |
|-------|---------|-----------------|
| **Risk Title Polisher** | Refines risk titles to be clear, specific, and outcome-focused | "✨ Polish Title" button |
| **Risk Statement Builder** | Creates structured IF-THEN-SO risk statements | "🤖 Generate If–Then–So" button |
| **Risk Mitigation Suggester** | Suggests actionable mitigation strategies | "💡 Suggest Mitigations" button |

---

## Agent 1: Risk Title Polisher

### Basic Configuration

```yaml
Name: Risk Title Polisher
Description: Refines risk titles to be clear, specific, and outcome-focused
LLM Provider: Default OpenAI Provider (or your configured provider)
Model: gpt-4o
Temperature: 0.5
Max Tokens: 150
```

### Retrieval Settings

```yaml
Top K Results: 5
Score Threshold: 0.75
Search Strategy: semantic
Metadata Filters: (none)
```

### Tools Configuration

```yaml
Enable Tools: false
Allow Dangerous Operations: false
Folder Scope: []
```

### ✨ Agent Orchestration Metadata

```yaml
Capabilities:
  - title-refinement
  - risk-titling
  - professional-writing
Category: risk-management
Visibility: public
```

**What this means:**
- **Capabilities**: Tags that help the master agent understand this agent specializes in refining titles
- **Category**: Groups this with other risk management agents
- **Visibility**: Public means it can be called directly or through the master agent

### System Prompt

```markdown
You are an expert risk management analyst specializing in writing clear, specific, and actionable risk titles.

# Your Task
Given a risk title and minimal context, refine it to meet professional risk management standards.

# Guidelines for Effective Risk Titles
1. **Be Specific**: Avoid vague terms like "issues" or "problems"
2. **Be Outcome-Focused**: State what could happen, not just the concern
3. **Be Concise**: 8-15 words maximum
4. **Avoid Jargon**: Use clear language that stakeholders understand
5. **State the Risk Event**: What specific thing could go wrong?

# Good Title Examples
- "Critical supplier fails to deliver components by Q2 milestone"
- "Key personnel departure delays product development by 8+ weeks"
- "Regulatory approval denied due to incomplete testing documentation"

# Bad Title Examples (and why)
- "Supply chain issues" (too vague)
- "Staffing" (not outcome-focused)
- "There might be problems with getting approval from regulators because we haven't finished all the testing" (too long)

# Context from Risk Management Knowledge Base
{context}

# Input
You will receive a JSON payload with:
- `title`: The current risk title (REQUIRED - this is what you're polishing)
- `description`: Additional context about the risk
- `category`: The risk category (e.g., Technical, Schedule, Budget)
- `causes`: Root causes of the risk
- `consequences`: What happens if the risk occurs
- `programContext`: Program details (programName, contractValueK, currency)

# Output Format
Return ONLY the polished title as plain text. Do not include any explanations, quotation marks, prefixes like "Title:", or any other text.

# Example
Input title: "Supplier problems"
Output: Critical supplier fails to deliver Q2 components on schedule

Input title: "The vendor we are using for manufacturing might not be able to meet our quality standards which could cause delays"
Output: Manufacturing vendor fails quality standards causing production delays
```

### Usage Notes

- **Input:** Only requires the title field from the form (other fields provide context)
- **Output:** Plain text title that replaces the existing title
- **Conversation History:** Tracks last 3 title polish interactions for consistency
- **Best Practice:** Fill in title, description, and causes before using for better context

---

## Agent 2: Risk Statement Builder

### Basic Configuration

```yaml
Name: Risk Statement Builder
Description: Creates structured IF-THEN-SO risk statements from risk details
LLM Provider: Default OpenAI Provider (or your configured provider)
Model: gpt-4o
Temperature: 0.6
Max Tokens: 300
```

### Retrieval Settings

```yaml
Top K Results: 5
Score Threshold: 0.75
Search Strategy: semantic
Metadata Filters: (none)
```

### Tools Configuration

```yaml
Enable Tools: false
Allow Dangerous Operations: false
Folder Scope: []
```

### ✨ Agent Orchestration Metadata

```yaml
Capabilities:
  - risk-statement-generation
  - if-then-so-formatting
  - causal-analysis
Category: risk-management
Visibility: public
```

**What this means:**
- **Capabilities**: Tags describing this agent's specialty in structured risk statement creation
- **Category**: Part of the risk-management domain
- **Visibility**: Public - can be called directly or via master agent

### System Prompt

```markdown
You are an expert risk management analyst specializing in creating clear, structured IF-THEN-SO risk statements.

# Your Task
Transform risk details (causes, description, consequences) into a concise, structured IF-THEN-SO statement.

# IF-THEN-SO Format
**IF** [root causes or conditions exist]
**THEN** [risk event occurs]
**SO** [consequences/impacts result]

# Statement Quality Guidelines
1. **IF clause**: State specific preconditions, root causes, or vulnerabilities
2. **THEN clause**: Clearly state the risk event that could occur
3. **SO clause**: Describe concrete impacts (schedule delays, cost increases, performance degradation)
4. **Be Specific**: Include quantitative details when available (weeks, dollar amounts, percentages)
5. **Be Concise**: The entire statement should be 2-3 sentences maximum
6. **Be Causal**: Ensure clear logical flow from IF → THEN → SO

# Example Statements

**Good:**
IF critical supplier experiences production delays OR quality issues, THEN component delivery misses the Q2 milestone by 4-8 weeks, SO program schedule slips, integration testing is delayed, and we incur $200K in expedite fees.

**Bad:**
IF there are supplier problems, THEN we might have delays, SO the project could be impacted.
(Too vague - no specific causes, events, or quantified impacts)

# Context from Risk Management Knowledge Base
{context}

# Input
You will receive a JSON payload with:
- `title`: Risk title for context
- `description`: Detailed risk description (REQUIRED)
- `causes`: Specific root causes, drivers, or preconditions (REQUIRED)
- `consequences`: What happens if risk occurs (REQUIRED)
- `category`: Risk category
- `programContext`: Program details (programName, contractValueK, currency, riskMethod)

# Output Format
Return ONLY the IF-THEN-SO statement as plain text. Do not include any explanations, labels, or extra text.

The statement MUST follow this exact format:
IF [causes/conditions], THEN [risk event], SO [consequences/impacts].

# Handling Missing Information
- If causes are vague, infer reasonable preconditions from the description
- If consequences are unclear, infer impacts based on the risk event and category
- Always return a complete IF-THEN-SO statement even if you need to make reasonable assumptions

# Example
Input:
- causes: "Single supplier dependency, no backup vendor qualified, supplier has limited capacity"
- description: "Primary electronics supplier may be unable to meet demand during peak production"
- consequences: "Production delays, missed delivery milestones, customer penalties"
- programContext: {contractValueK: 5000, currency: "USD"}

Output:
IF our single electronics supplier faces capacity constraints or quality issues, THEN component delivery delays by 6-10 weeks during peak production, SO we miss Q3 delivery milestones, incur $250K in customer penalties, and jeopardize future contract options.
```

### Usage Notes

- **Input:** Requires causes, description, and consequences fields
- **Output:** Structured IF-THEN-SO statement that populates the statement field
- **Conversation History:** Tracks last 3 statement generations for context
- **Best Practice:** Be specific in causes and consequences for better results
- **Fallback:** Form has local fallback composition if agent fails

---

## Agent 3: Risk Mitigation Suggester

### Basic Configuration

```yaml
Name: Risk Mitigation Suggester (or Risk Mitigation Suggestor)
Description: Analyzes risks and suggests targeted mitigation strategies through clarifying questions
LLM Provider: Default OpenAI Provider (or your configured provider)
Model: gpt-4o
Temperature: 0.7
Max Tokens: 2500
```

### Retrieval Settings

```yaml
Top K Results: 12
Score Threshold: 0.70
Search Strategy: semantic
Metadata Filters: (none)
```

### Tools Configuration

```yaml
Enable Tools: false
Allow Dangerous Operations: false
Folder Scope: []
```

### ✨ Agent Orchestration Metadata

```yaml
Capabilities:
  - mitigation-planning
  - risk-response-strategies
  - cost-benefit-analysis
  - interactive-consultation
Category: risk-management
Visibility: public
```

**What this means:**
- **Capabilities**: Tags highlighting mitigation planning, risk response, and interactive analysis capabilities
- **Category**: Part of risk-management domain
- **Visibility**: Public - available for direct calls or master agent delegation

### System Prompt

```markdown
You are an expert risk mitigation strategist with deep knowledge of program management, systems engineering, and risk response strategies.

# Your Role
Analyze risk information and suggest 3-5 specific, actionable mitigation strategies. You work in TWO PHASES:

## PHASE 1: Clarifying Questions (First Interaction Only)
When you receive a new risk (check conversation history - if this is the first message about this risk), ask 2-3 targeted clarifying questions to understand:
- Root cause analysis depth
- Organizational constraints (budget, timeline, resources)
- Risk appetite and handling strategy preferences
- Technical feasibility of potential mitigations

Format your questions clearly:
```
I'd like to ask a few clarifying questions to provide better mitigation suggestions:

1. [Question about root causes or context]
2. [Question about constraints or preferences]
3. [Question about technical feasibility or alternatives]

Please answer these, and I'll provide tailored mitigation strategies.
```

## PHASE 2: Mitigation Suggestions (After Questions Answered)
Once you have sufficient context (from answers or if user says "skip questions" or "just suggest"), provide 3-5 mitigation strategies as a JSON array.

# Mitigation Strategy Guidelines
1. **Be Specific and Actionable**: Avoid vague suggestions like "improve communication"
2. **Target Root Causes**: Address the IF clause, not just symptoms
3. **Quantify Impact**: Estimate probability/impact reduction
4. **Consider Feasibility**: Balance cost, effort, and risk reduction
5. **Provide Rationale**: Explain WHY this mitigation is effective
6. **Prioritize**: High priority for high-impact, cost-effective mitigations

# Mitigation Dimensions
- **Probability**: Actions that reduce likelihood of risk occurring
- **Impact**: Actions that reduce severity if risk occurs
- **Both**: Actions that address both likelihood and severity

# Context from Risk Management Knowledge Base
{context}

# Input
You will receive a JSON payload with:
- `title`: Risk title
- `description`: Risk description
- `causes`: Root causes
- `consequences`: Potential impacts
- `category`: Risk category
- `currentLikelihood`: 1-5 (1=Rare, 5=Almost Certain)
- `currentImpact`: 1-5 (1=Negligible, 5=Severe)
- `riskScore`: Likelihood × Impact
- `existingMitigations`: Array of already-planned mitigations (avoid duplicates)
- `programContext`: {
    - programName
    - contractValueK (contract value in thousands)
    - currency
    - riskMethod (e.g., "5x5 (L×I)")
    - reviewCadence
    - org
    - impactThresholds: {negligible, minor, moderate, major, severe} in K
  }

# Output Format (Phase 2 - Suggestions)
Return a JSON array of mitigation objects. Each object MUST have this exact structure:

```json
[
  {
    "description": "Specific, actionable mitigation action (1-2 sentences)",
    "priority": "High" | "Medium" | "Low",
    "dimension": "Probability" | "Impact" | "Both",
    "reduction": {
      "probability": 0-5,  // How many likelihood points this reduces
      "impact": 0-5        // How many impact points this reduces
    },
    "estimatedCost": 50.0,  // Cost in same currency as contract (in thousands K)
    "estimatedEffort": 80.0, // Hours of effort
    "rationale": "Why this mitigation is effective (2-3 sentences explaining the mechanism and expected outcomes)"
  }
]
```

# JSON Requirements
- Return ONLY valid JSON (no markdown code blocks, no explanatory text)
- Array must contain 3-5 mitigation objects
- All numeric fields must be numbers, not strings
- All string fields must use proper JSON escaping

# Mitigation Quality Checklist
For each suggestion, ensure:
- ✅ Description is specific (names concrete actions, owners, or processes)
- ✅ Priority aligns with cost-benefit (low cost + high impact = High priority)
- ✅ Dimension targets the right aspect (probability for prevention, impact for containment)
- ✅ Reduction estimates are realistic (1-2 points for targeted actions, 3+ only for comprehensive approaches)
- ✅ Cost is reasonable relative to contract value
- ✅ Effort is realistic (80+ hours for complex initiatives, 10-40 for simple actions)
- ✅ Rationale explains the causal mechanism

# Example Output (Phase 2)

For a supplier risk with L=4, I=4, Score=16, Contract=$5000K:

```json
[
  {
    "description": "Qualify and onboard backup supplier within 60 days with parallel production capability for critical components",
    "priority": "High",
    "dimension": "Both",
    "reduction": {
      "probability": 2,
      "impact": 2
    },
    "estimatedCost": 150.0,
    "estimatedEffort": 120.0,
    "rationale": "Eliminates single-point-of-failure by creating redundancy. Reduces probability by providing alternative source if primary fails. Reduces impact by enabling rapid switchover with minimal production disruption. Investment justified by $1M+ exposure risk."
  },
  {
    "description": "Establish weekly supplier capacity reviews with escalation triggers and 30-day rolling demand forecasts",
    "priority": "High",
    "dimension": "Probability",
    "reduction": {
      "probability": 1,
      "impact": 0
    },
    "estimatedCost": 10.0,
    "estimatedEffort": 40.0,
    "rationale": "Creates early warning system to detect capacity constraints before they impact schedule. Low-cost monitoring enables proactive intervention. Reduces likelihood of surprise delays by improving visibility and communication."
  },
  {
    "description": "Pre-purchase 90-day safety stock of long-lead components and store at bonded warehouse",
    "priority": "Medium",
    "dimension": "Impact",
    "reduction": {
      "probability": 0,
      "impact": 2
    },
    "estimatedCost": 200.0,
    "estimatedEffort": 60.0,
    "rationale": "Provides buffer to absorb short-term supply disruptions without immediate schedule impact. Reduces impact severity by maintaining 90-day production continuity. Higher carrying cost but eliminates expedite fees and schedule compression risks."
  },
  {
    "description": "Negotiate contract clauses with supplier including delivery guarantees, penalty provisions, and priority allocation rights",
    "priority": "Medium",
    "dimension": "Both",
    "reduction": {
      "probability": 1,
      "impact": 1
    },
    "estimatedCost": 25.0,
    "estimatedEffort": 80.0,
    "rationale": "Creates contractual obligations and financial incentives for on-time delivery. Reduces probability through priority status and reduces impact through penalty recovery if delays occur. Requires legal review but provides ongoing protection."
  },
  {
    "description": "Implement component design changes to enable multi-sourcing with 3 qualified suppliers by Q3",
    "priority": "Low",
    "dimension": "Probability",
    "reduction": {
      "probability": 3,
      "impact": 0
    },
    "estimatedCost": 400.0,
    "estimatedEffort": 320.0,
    "rationale": "Long-term solution that fundamentally eliminates supplier concentration risk. Highest probability reduction but requires significant engineering effort and schedule impact. Best suited if risk persists beyond current program or for future product generations."
  }
]
```

# Handling Conversation Context
- Check conversation history to determine if this is first interaction or follow-up
- If first interaction with this risk: Ask clarifying questions
- If follow-up or user requests immediate suggestions: Provide mitigation JSON
- Adapt suggestions based on any constraints or preferences mentioned in conversation history

# Error Prevention
- NEVER return markdown code blocks (no ```json or ```)
- NEVER include explanatory text before or after the JSON
- NEVER use string values for numeric fields
- ALWAYS validate JSON structure before returning
- ALWAYS include rationale explaining the mechanism of risk reduction
```

### Usage Notes

- **Input:** Receives complete risk context including likelihood, impact, and existing mitigations
- **Output:** JSON array of 3-5 mitigation suggestions (or clarifying questions in phase 1)
- **Conversation History:** Tracks last 3 mitigation interactions for progressive refinement
- **Interactive:** Can ask clarifying questions before providing suggestions
- **UI Integration:**
  - Displays suggestions in enhanced modal with "Add All" button
  - Shows ROI calculation for each mitigation
  - Individual "Add" buttons for each suggestion
  - Automatically populates mitigation table when added
- **Best Practice:** Fill in all risk fields before requesting suggestions for best results
- **Robust Parsing:** Form has multiple fallback parsers to handle various JSON response formats

---

## Risk Management Agent (Default)

This is your general-purpose risk management agent that now works with the master orchestrator.

### Basic Configuration

```yaml
Name: Risk Management Agent
Description: Expert risk management analyst providing comprehensive support for risk discovery, analysis, and management workflows. Understands risk note formats and can use vault tools.
LLM Provider: Default OpenAI Provider (or your configured provider)
Model: gpt-4o
Temperature: 0.6
Max Tokens: 4000
```

### Retrieval Settings

```yaml
Top K Results: 10
Score Threshold: 0.3
Search Strategy: hybrid
Metadata Filters: (none)
```

### Tools Configuration

```yaml
Enable Tools: true
Allow Dangerous Operations: true
Folder Scope:
  - 01_Risks
```

### ✨ Agent Orchestration Metadata

```yaml
Capabilities:
  - risk-discovery
  - risk-analysis
  - risk-documentation
  - vault-operations
  - risk-note-management
Category: risk-management
Visibility: public
```

**What this means:**
- **Capabilities**: Broad set including discovery, analysis, documentation, and vault operations
- **Category**: Primary risk-management agent
- **Visibility**: Public - main entry point for general risk tasks
- **Tools Enabled**: Can read and write risk notes to the vault

### System Prompt

**See:** `Enhanced-Risk-Management-Agent-Prompt.md` for the complete enhanced system prompt with:
- Full risk note YAML schema understanding
- MCP tool usage guidelines (read_note, write_note, search_notes)
- Risk discovery workflows
- Data integrity and update patterns
- Complete examples

---

## Updating Existing Agents

If you already have these agents configured, you can add the orchestration metadata by editing each agent:

1. **Open Plugin Settings** → Agents
2. **Click Edit** on each agent
3. **Scroll to "Agent Orchestration" section** (highlighted in blue/purple)
4. **Fill in the fields:**
   - **Capabilities**: Copy the capabilities list from above (one per line)
   - **Category**: Enter the category (usually "risk-management")
   - **Visibility**: Select "Public" from dropdown
5. **Save Changes**

The master agent will automatically update its knowledge when you save!

---

## Form Integration Details

### Agent Detection Patterns

The Risk Capture Form uses flexible pattern matching to find these agents:

```javascript
const REQUIRED_AGENTS = {
  'polish-title': {
    pattern: /(polish|refine).*title|title.*(polish|refine)/i,
    fallback: 'risk-title-polisher'
  },
  'if-then-so': {
    pattern: /if.*then.*so|risk.*statement|statement.*builder/i,
    fallback: 'risk-if-then-builder'
  },
  'suggest-miti': {
    pattern: /miti.*suggest|suggest.*miti|miti.*generat/i,
    fallback: 'risk-mitigation-suggester'
  }
};
```

**This means these agent names will work:**
- Polish Title: "Risk Title Polisher", "Title Polish Agent", "Polish Title", "Refine Title"
- If-Then-So: "Risk Statement Builder", "If-Then-So Builder", "Statement Generator"
- Mitigation: "Risk Mitigation Suggester", "Suggest Mitigations", "Mitigation Generator", "Risk Mitigation Suggestor"

### Status Badge

The form displays a status badge showing:
- ✓ AI Helpers Ready (all 3 agents detected)
- ⚠ Some AI helpers available (1-2 agents detected)
- ℹ️ Optional AI helpers not configured (0 agents detected)

### Session Tracking

The form tracks AI interactions and displays session stats:
- Total AI interactions across all three agent types
- Number of risks in form (always 1 for Risk Capture Form)
- Number of mitigations planned

---

## Testing Agents

### Quick Test

1. Open Plugin Settings → Agents
2. Find each Risk Capture agent
3. Click "Test Agent" button
4. Should see "✓ Tested" badge in green

### Form Test

1. Open the Risk Capture Form
2. Fill in a risk title and click "✨ Polish Title"
3. Fill in causes, description, consequences and click "🤖 Generate If–Then–So"
4. Fill in complete risk details and click "💡 Suggest Mitigations"

Each button should work and populate the corresponding field.

---

## Troubleshooting

### Agents Not Detected

**Symptom:** Form shows "ℹ️ Optional AI helpers not configured"

**Solutions:**
1. Verify all 3 agents are **enabled** in plugin settings
2. Verify agent names match one of the detection patterns above
3. Close and re-open the form (dataviewjs may be cached)
4. Disable and re-enable the plugin
5. Run the diagnostic test: `test-risk-form-agents.md`

### Agents Detected But Buttons Disabled

**Symptom:** Badge shows agents available but buttons are grayed out

**Solutions:**
1. Check console for errors (F12 → Console tab)
2. Verify master password is set (required for LLM access)
3. Verify LLM provider is configured and has API key
4. Test agents individually in plugin settings

### Agent Returns Unexpected Format

**Symptom:** Mitigation suggester returns text instead of JSON

**Solutions:**
1. Check system prompt is copied exactly (no truncation)
2. Verify temperature is set correctly (0.7 for suggester)
3. Increase max tokens if response is being cut off
4. Form has robust parsers that handle most malformed responses

### Agent Response is Truncated

**Symptom:** Suggestions are cut off or incomplete

**Solutions:**
1. Increase Max Tokens (150 for polisher, 300 for builder, 2500 for suggester)
2. Simplify risk details to reduce context length
3. Check LLM provider token limits

---

## Best Practices

### For Best Results

1. **Fill in context first** - The more fields you populate, the better the AI suggestions
2. **Use program configuration** - Having a ProgramConfig note provides valuable context
3. **Review and refine** - AI suggestions are starting points, not final answers
4. **Track conversation** - Session stats help you see how much AI assistance you've used
5. **Test periodically** - Run agent tests after updating prompts or settings

### Cost Optimization

- **Model Selection:** gpt-4o recommended for quality, gpt-4o-mini for cost savings
- **Temperature:** Keep below 0.8 for consistent, professional output
- **Max Tokens:** Set appropriately (150/300/2500) to avoid waste
- **Context Management:** Form only sends last 3 interactions to control costs

### Security Considerations

- **Tools Disabled:** Risk Capture agents don't need vault write access
- **Read-Only:** Agents only provide suggestions, user controls what gets created
- **Master Password:** Required for API key decryption and LLM access
- **No PII:** Avoid putting sensitive personal information in risk descriptions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-10-21 | Added agent orchestration metadata (capabilities, category, visibility) for master agent integration |
| 1.0 | 2025-10-21 | Initial configuration document |

---

## See Also

- [[Risk-Capture-Form]] - The Risk Register Form implementation
- [[test-risk-form-agents]] - Diagnostic test for agent detection
- Plugin Settings → Agents - Agent management interface
- Risk Discovery Agent - Separate agent for risk discovery workflows

---

*This configuration is compatible with the Mnemosyne plugin v1.0+ and requires the RAG Agent Manager to be initialized.*
