---
Test Risk Form Agent Detection
---

```dataviewjs
// Quick test to see what agents the Risk Capture Form can detect

const output = [];

// Check API
if (window.RAGAgentManager) {
    output.push("✅ **window.RAGAgentManager exists**\n");

    // List all agents
    const agents = window.RAGAgentManager.listAgents();
    output.push(`📊 **Found ${agents.length} total agent(s)**\n`);

    if (agents.length > 0) {
        output.push("\n**All Agents:**");
        agents.forEach((a, idx) => {
            output.push(`${idx + 1}. **${a.name}** (ID: \`${a.id}\`, Enabled: ${a.enabled ? '✅' : '❌'})`);
        });
    }

    // Test the patterns from Risk Capture Form
    output.push("\n---\n\n**Testing Risk Capture Form Patterns:**\n");

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

    const findAgent = (patterns) => {
        return agents.find(a => {
            const name = (a.name || "").toLowerCase();
            const id = (a.id || "").toLowerCase();
            return patterns.pattern.test(name) ||
                   patterns.pattern.test(id) ||
                   id === patterns.fallback.toLowerCase();
        });
    };

    // Check polish agent
    const polishAgent = findAgent(REQUIRED_AGENTS['polish-title']);
    if (polishAgent) {
        output.push(`✅ **Polish Title Agent:** Found - "${polishAgent.name}" (${polishAgent.id})`);
    } else {
        output.push(`❌ **Polish Title Agent:** Not found`);
        output.push(`   Looking for pattern: \`${REQUIRED_AGENTS['polish-title'].pattern}\``);
        output.push(`   Or exact ID: \`${REQUIRED_AGENTS['polish-title'].fallback}\``);
    }

    // Check if-then-so agent
    const ifThenAgent = findAgent(REQUIRED_AGENTS['if-then-so']);
    if (ifThenAgent) {
        output.push(`✅ **If-Then-So Agent:** Found - "${ifThenAgent.name}" (${ifThenAgent.id})`);
    } else {
        output.push(`❌ **If-Then-So Agent:** Not found`);
        output.push(`   Looking for pattern: \`${REQUIRED_AGENTS['if-then-so'].pattern}\``);
        output.push(`   Or exact ID: \`${REQUIRED_AGENTS['if-then-so'].fallback}\``);
    }

    // Check mitigation agent
    const mitiAgent = findAgent(REQUIRED_AGENTS['suggest-miti']);
    if (mitiAgent) {
        output.push(`✅ **Mitigation Suggester:** Found - "${mitiAgent.name}" (${mitiAgent.id})`);
    } else {
        output.push(`❌ **Mitigation Suggester:** Not found`);
        output.push(`   Looking for pattern: \`${REQUIRED_AGENTS['suggest-miti'].pattern}\``);
        output.push(`   Or exact ID: \`${REQUIRED_AGENTS['suggest-miti'].fallback}\``);
    }

    output.push("\n---\n");

    const foundCount = [polishAgent, ifThenAgent, mitiAgent].filter(Boolean).length;
    if (foundCount === 3) {
        output.push("✅ **Result:** All 3 Risk Capture agents detected - Form should show 'AI Helpers Ready'");
    } else if (foundCount > 0) {
        output.push(`⚠️ **Result:** ${foundCount}/3 agents detected - Form should show 'Some AI helpers available'`);
    } else {
        output.push("ℹ️ **Result:** No Risk Capture agents detected - Form should show 'Optional AI helpers not configured'");
        output.push("\n**To fix:** Create agents in plugin settings with names matching the patterns above");
    }

} else {
    output.push("❌ **window.RAGAgentManager does NOT exist**");
    output.push("\nPlugin may not be loaded or initialized yet.");
}

dv.paragraph(output.join("\n"));
```
