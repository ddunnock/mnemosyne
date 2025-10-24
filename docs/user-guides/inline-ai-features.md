# Inline AI Features

**Audience**: 👤 User
**Difficulty**: 🟢 Beginner

Mnemosyne provides powerful inline AI assistance that works as you write, offering auto-completion, text transformations, and intelligent editing suggestions.

## Overview

Inline AI features bring AI assistance directly into your writing flow without needing to open separate chat interfaces or command palettes. The system includes:

1. **Auto-Completion** - Ghost text suggestions as you type
2. **Selection Toolbar** - Quick AI actions for selected text (in editor)
3. **Universal Context Menu** - AI actions anywhere you select text (even in DataviewJS forms!)
4. **Review Modal** - Accept, reject, or regenerate AI suggestions

## Features

### 1. Auto-Completion

Get intelligent text suggestions as you type, similar to GitHub Copilot.

**How it works:**
- Start typing in any note
- After a brief pause, ghost text appears showing a suggested completion
- **Press Tab** to accept the suggestion
- **Press Escape** to dismiss it

**Example:**
```
You type: "The main risk identified is..."
Ghost text appears: " that the supplier may fail to deliver components on time due to supply chain constraints."
Press Tab to accept →
```

**Configuration:**
- Go to **Settings → Mnemosyne → Advanced → Inline AI Features**
- **Enable Auto-Completion**: Toggle on/off
- **Completion Delay**: How long to wait before suggesting (default: 500ms)
- **Max Completion Length**: Maximum words in suggestion (default: 200)
- **Agent**: Choose which agent generates completions

**Tips:**
- The AI uses context from your current note and previous 5 lines
- Works best for continuing sentences or thoughts
- If suggestions are too aggressive, increase the delay
- If suggestions are too long, reduce max length

---

### 2. Selection Toolbar (Editor)

A floating toolbar with quick AI actions appears when you select text in the markdown editor.

**How it works:**
1. Select any text in your note
2. A toolbar appears above the selection
3. Click a quick action button or "More..." for all options
4. Review modal opens for you to accept/reject changes

**Quick Actions:**
- ✨ **Rewrite** - Improve clarity and flow
- ✅ **Fix Grammar** - Correct spelling, grammar, punctuation
- 🎯 **Make Concise** - Shorten while keeping meaning
- 📝 **Expand** - Add more detail and elaboration
- ➕ **More...** - Access all AI text actions

**All Available Actions:**
- ✨ Rewrite
- 📝 Expand
- 📄 Summarize
- ✅ Fix Grammar
- 🎯 Make Concise
- 📖 Make Detailed
- 💡 Simplify
- 👔 Professional Tone
- 😊 Casual Tone
- 🔧 Custom Prompt...

**Example Workflow:**
```
1. Select: "vendor problems might cause delays"
2. Click "✨ Rewrite" button
3. Review modal shows:
   Original: "vendor problems might cause delays"
   AI Generated: "Supplier delivery failures may result in schedule delays"
4. Click "✓ Accept" to replace text
```

**Configuration:**
- **Settings → Advanced → Inline AI → Show Selection Toolbar**
- Toggle on/off
- Choose which agent to use

---

### 3. Universal Context Menu (Works Everywhere!)

Right-click AI actions that work **anywhere** you can select text, including:
- ✅ DataviewJS form inputs
- ✅ Text areas
- ✅ ContentEditable elements
- ✅ Regular markdown editor
- ✅ HTML input fields

**How it works:**
1. Select text **anywhere** in Obsidian (even in forms!)
2. **Right-click** on the selection
3. Choose an AI action from the context menu
4. Review modal opens for accept/reject

**Why This Matters:**
The Selection Toolbar only works in CodeMirror editors (regular markdown notes). But DataviewJS forms, task lists, and other interactive elements use HTML inputs. The Universal Context Menu works in **all of these**!

**Example - DataviewJS Form:**
```dataviewjs
// Risk capture form with input field
dv.el('input', '', {
  placeholder: 'Enter risk description...',
  style: 'width: 100%; padding: 8px;'
})
```

**Usage:**
1. Type in the form input field
2. Select your text
3. Right-click → Choose AI action
4. Text is replaced in place!

**Configuration:**
- **Settings → Advanced → Inline AI → Context Menu Enabled**
- Same AI actions as Selection Toolbar
- Automatically disabled in CodeMirror (to avoid conflicts)

---

### 4. Review Modal

All inline AI actions open a review modal where you can:
- ✓ **Accept** - Apply the changes
- ✗ **Reject** - Keep original text
- 🔄 **Try Again** - Regenerate with the same action

**Features:**

**Side-by-Side Comparison:**
- Left panel: Your original text
- Right panel: AI-generated version
- Easy visual comparison

**Word Count Tracking:**
```
Word count: 15 → 23 (+8)
```
- Shows before/after word counts
- Indicates expansion or reduction
- Helps you decide if length is appropriate

**Dynamic Sizing:**
- Small selection (few words) → Compact modal (~500px)
- Medium selection (sentence) → Medium modal (~700px)
- Large selection (paragraph) → Large modal (~1200px)
- Adapts automatically to your content

**Regeneration:**
- Click "Try Again" if you don't like the result
- AI generates a new version with the same action
- Can try multiple times until satisfied
- No limit on regenerations

**Keyboard Shortcuts:**
- **Enter** - Accept changes
- **Escape** - Reject and close

**Example Flow:**
```
1. Select "supplier issues" → Right-click → "Expand"
2. Modal shows:
   Original: "supplier issues" (2 words)
   AI: "The primary supplier has experienced capacity constraints and delivery delays, raising concerns about their ability to meet Q2 commitments." (21 words)
   Word count: 2 → 21 (+19)
3. Too long? Click "Try Again"
4. New version: "Supplier capacity issues and recent delivery delays create risk to Q2 schedule." (13 words)
5. Better! Click "✓ Accept"
```

---

## Configuration

Access all inline AI settings at:
**Settings → Mnemosyne → Advanced → Inline AI Features**

### Master Toggle
- **Enable Inline AI**: Turn all inline features on/off
- When disabled, no inline AI features appear

### Auto-Completion Settings
- **Enable Auto-Completion**: Toggle ghost text on/off
- **Completion Delay**: Time to wait before suggesting (ms)
  - Lower = more responsive but more intrusive
  - Higher = less intrusive but slower
  - Recommended: 500-1000ms
- **Max Completion Length**: Maximum words in completion
  - Lower = shorter, focused suggestions
  - Higher = longer, more expansive suggestions
  - Recommended: 50-200 words

### Inline Menu Settings
- **Show Selection Toolbar**: Enable floating toolbar
- **Show Context Menu**: Enable right-click AI actions

### Agent Selection
- **Auto-Completion Agent**: Choose which agent generates completions
- **Text Actions Agent**: Choose which agent handles transformations
- Default: Uses your default agent if not specified

---

## Use Cases

### Writing Assistance
**Scenario**: Drafting a risk description

```
1. Type initial thought: "vendor late"
2. Auto-complete suggests: "vendor late deliveries may impact Q2 schedule"
3. Accept with Tab
4. Select the completed sentence
5. Click "✨ Rewrite" for professional version
6. Accept: "Supplier delivery delays pose risk to Q2 milestone achievement"
```

### Form Filling (DataviewJS)
**Scenario**: Filling out a structured form

```
1. Form has "Risk Title" input field
2. Type: "supplier problems"
3. Select the text → Right-click → "Rewrite"
4. Get: "Critical supplier fails to deliver components by Q2"
5. Accept and continue to next field
```

### Document Polishing
**Scenario**: Improving a draft document

```
1. Select each paragraph
2. Use different actions:
   - First paragraph: "Professional Tone"
   - Second paragraph: "Make Concise"
   - Third paragraph: "Fix Grammar"
3. Review each change before accepting
4. Polish entire document section by section
```

### Quick Edits
**Scenario**: Fast corrections while writing

```
1. Write rough draft quickly without worrying about perfection
2. Select unclear sentences → "Simplify"
3. Select jargon-heavy text → "Simplify"
4. Select verbose sections → "Make Concise"
5. Final pass: Select all → "Fix Grammar"
```

---

## Prompt Engineering

All AI text actions use carefully crafted prompts with explicit constraints:

### Length Control
```
- Expand: Adds 2-3x original word count
- Summarize: Reduces to ~1/3 original word count
- Make Concise: Removes unnecessary words only
- Make Detailed: Adds relevant context and examples
```

### Output Format
```
All prompts include:
"IMPORTANT: Return ONLY the modified text.
Do not include explanations, preambles, or phrases
like 'Here is...' or 'The revised text is...'.
Just return the improved text directly."
```

### Quality Guidelines
- **Rewrite**: Maintain original meaning, improve clarity
- **Fix Grammar**: Minimal changes, only correct errors
- **Professional Tone**: Formal, businesslike language
- **Casual Tone**: Conversational, friendly language
- **Simplify**: Use simpler words and shorter sentences

---

## Troubleshooting

### Auto-Completion Not Appearing

**Symptoms**: No ghost text when typing

**Solutions**:
1. Check Settings → Advanced → Inline AI → **Enable Auto-Completion** is checked
2. Verify you have an LLM provider configured and enabled
3. Check agent is selected in settings
4. Try increasing Completion Delay (might be triggering too fast)
5. Reload Obsidian

### Selection Toolbar Not Showing

**Symptoms**: No toolbar when selecting text in editor

**Solutions**:
1. Check Settings → Advanced → Inline AI → **Show Selection Toolbar** is checked
2. Ensure Inline AI is enabled (master toggle)
3. Try selecting text in a regular markdown note (not canvas, PDF, etc.)
4. Reload Obsidian

### Context Menu Not Working in Forms

**Symptoms**: Right-click doesn't show AI actions in DataviewJS forms

**Solutions**:
1. Check Settings → Advanced → Inline AI → **Context Menu Enabled** is checked
2. Verify text is actually selected (highlighted)
3. Right-click **on the selected text** (not nearby)
4. Check browser console (Ctrl+Shift+I) for errors
5. Ensure DataviewJS plugin is installed and enabled

### AI Responses Too Long/Short

**Symptoms**: Expand creates a full page, or Concise barely changes text

**Solutions**:
1. The AI tries to be proportional to input length
2. For Expand: Select more text to give AI more context
3. For Concise: The text might already be concise
4. Use "Try Again" button to regenerate
5. Adjust Max Completion Length in settings

### Modal Too Small/Large

**Symptoms**: Content cut off or excessive white space

**Solutions**:
- Modal size adapts automatically based on content
- If issue persists, report as bug with:
  - Original text length
  - Generated text length
  - Screenshot of modal

### Review Modal Disappears

**Symptoms**: Modal closes unexpectedly

**Solutions**:
1. Don't click outside the modal (closes it)
2. Use buttons (Accept/Reject/Try Again) to close properly
3. Press Escape to cancel intentionally
4. Check for JavaScript errors in console

---

## Performance Tips

### Faster Responses
- Use local LLM (Ollama) for instant completions
- Reduce Max Completion Length
- Use smaller AI models (gpt-4o-mini vs gpt-4o)

### Lower Costs
- Disable auto-completion (most token-heavy)
- Use local embeddings (Settings → Knowledge Base)
- Use local LLM for text actions
- Set higher completion delay (fewer trigger events)

### Better Quality
- Use GPT-4 or Claude Opus for critical text
- Provide more context (select surrounding text)
- Use "Try Again" if first result isn't good
- Combine actions (Expand, then Professional Tone)

---

## Advanced

### Custom Prompts

Use the "Custom Prompt..." action for any transformation:

```
1. Select text
2. Choose "🔧 Custom Prompt..."
3. Enter instruction: "Translate to Spanish"
4. Review and accept result
```

**Example Custom Prompts:**
- "Translate to [language]"
- "Add technical details about [topic]"
- "Convert to bullet points"
- "Make this sound urgent"
- "Add specific metrics and data"
- "Convert to passive voice"
- "Add transitions between ideas"

### Agent Selection

Different agents have different styles:
- **Default Agent**: General-purpose, balanced
- **Risk Management Agent**: Formal, precise, risk-focused
- **Custom Agents**: Your own specialized agents

Experiment with different agents for different text types!

### Chaining Actions

You can apply multiple actions sequentially:

```
Original: "supplier issues"
↓ Expand
"The supplier has been experiencing capacity issues and delivery delays"
↓ Professional Tone
"The primary supplier has demonstrated capacity constraints and schedule adherence challenges"
↓ Fix Grammar
"The primary supplier has demonstrated capacity constraints and schedule-adherence challenges"
```

---

## FAQ

**Q: Will this work offline?**
A: Yes, if you use local LLM (Ollama). Otherwise, internet required for cloud APIs.

**Q: Can I disable specific features?**
A: Yes! Toggle each feature independently in settings.

**Q: Does this work in all notes?**
A: Auto-completion and Selection Toolbar work in markdown editors. Context Menu works everywhere.

**Q: How much does this cost?**
A: Depends on your LLM provider. Auto-completion is most expensive (many API calls). Use local LLM for zero cost.

**Q: Is my text sent to OpenAI/Anthropic?**
A: Only if you use cloud providers. Local LLM keeps everything on your machine.

**Q: Can I use different agents for different actions?**
A: Currently, one agent for auto-completion, one for text actions. Per-action agent selection coming soon!

**Q: What if I don't like a suggestion?**
A: Click "Try Again" in the review modal, or just reject it. No changes until you accept.

---

## Related Documentation

- **[LLM Providers Guide](./llm-providers.md)** - Configure OpenAI, local LLM, etc.
- **[Agent Setup](./agent-setup.md)** - Create agents for inline AI
- **[DataviewJS Integration](./dataviewjs-integration.md)** - Using AI in forms
- **[Inline AI Technical Spec](../capabilities/inline-ai.md)** - Architecture and implementation

---

**Version**: 1.0+
**Last Updated**: 2025-10-24
**Features**: Auto-completion, Selection Toolbar, Universal Context Menu, Review Modal
