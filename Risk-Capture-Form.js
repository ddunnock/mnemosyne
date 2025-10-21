(() => {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENHANCED RISK REGISTER FORM v3.0 - Mnemosyne Integration
    // Integrated with Program Configuration + RAG Agent Manager
    // ═══════════════════════════════════════════════════════════════════════════

    const NS = "riskFormV3_" + String(Date.now());
    dv.container.innerHTML = "";
    dv.container.setAttribute("data-ns", NS);

    // ═══════════════════════════════════════════════════════════════════════════
    // LOAD PROGRAM CONFIG
    // ═══════════════════════════════════════════════════════════════════════════

    let programConfig = null;
    const configPaths = [
        "00_ProgramInfo/ProgramSetup",
        "ProgramSetup",
        "Program Config",
        "00_Setup/ProgramConfig",
        "Setup/ProgramConfig"
    ];

    for (const path of configPaths) {
        try {
            const config = dv.page(path);
            if (config && config.file) {
                programConfig = config;
                console.log(`[Risk Form] Found ProgramConfig at: ${path}`);
                break;
            }
        } catch (e) {
            continue;
        }
    }

    // Extract config values
    const programName = programConfig?.programName || "Program";
    const contractValueK = programConfig?.contractValueK || 0;
    const currency = programConfig?.currency || "USD";
    const riskMethod = programConfig?.riskMethod || "5x5 (L×I)";
    const reviewCadence = programConfig?.reviewCadence || "Monthly";
    const pm = programConfig?.pm || "";
    const cse = programConfig?.cse || "";
    const pe = programConfig?.pe || "";
    const org = programConfig?.org || "";
    const contractNumber = programConfig?.contractNumber || "";
    const popStart = programConfig?.popStart || "";
    const popEnd = programConfig?.popEnd || "";

    // ═══════════════════════════════════════════════════════════════════════════
    // STYLES - Enhanced with better UX indicators
    // ═══════════════════════════════════════════════════════════════════════════
    const root = dv.el("div", "", { cls: "risk-form-root" });
    const style = document.createElement("style");
    style.textContent = `
    .risk-form-root * { box-sizing: border-box; }
    .session-status {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }
    .program-context-banner {
      background: var(--background-primary-alt);
      border: 1px solid var(--background-modifier-border);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9em;
    }
    .program-context-left {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .program-context-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .program-context-label {
      font-size: 0.85em;
      opacity: 0.7;
      font-weight: 500;
    }
    .program-context-value {
      font-weight: 600;
      color: var(--text-accent);
    }
    .config-warning {
      background: rgba(255, 193, 7, 0.15);
      border: 1px solid rgba(255, 193, 7, 0.4);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 0.9em;
      color: var(--text-warning);
    }
    .risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .risk-field { display: flex; flex-direction: column; gap: 6px; }
    .risk-field label { font-weight: 600; font-size: 0.95em; }
    .risk-field label.required::after { content: " *"; color: var(--text-error); }
    .hint { font-size: 0.85em; opacity: 0.75; line-height: 1.3; }
    .hint.warn { color: var(--text-warning); opacity: 1; }
    .hint.info { color: var(--text-accent); opacity: 1; }
    .card {
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: var(--shadow-s);
    }
    .card h3 { margin: 0 0 12px 0; font-size: 1.1em; color: var(--text-accent); }
    .status-card {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 16px;
      align-items: center;
    }
    .pill {
      border-radius: 999px;
      padding: 10px 14px;
      color: white;
      font-weight: 700;
      text-align: center;
      font-size: 0.95em;
    }
    .row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
    .row-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
    .row-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
    .btn-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; align-items: center; }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid var(--background-modifier-border);
      cursor: pointer;
      background: var(--background-primary);
      transition: all 0.2s;
    }
    .btn:hover:not(:disabled) {
      background: var(--background-modifier-hover);
      transform: translateY(-1px);
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.primary { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }
    .btn.primary:hover:not(:disabled) { background: var(--interactive-accent-hover); }
    .output { width: 100%; height: 280px; font-family: var(--font-monospace); font-size: 0.85em; }
    .kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .kpi-item {
      background: var(--background-primary-alt);
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      border: 1px solid var(--background-modifier-border);
    }
    .kpi-item .label { font-size: 0.85em; opacity: 0.8; margin-bottom: 4px; }
    .kpi-item .val { font-size: 1.4em; font-weight: 800; color: var(--text-accent); }
    .miti-table { width:100%; border-collapse: collapse; margin-top: 12px; font-size: 0.9em; }
    .miti-table th, .miti-table td {
      border:1px solid var(--background-modifier-border);
      padding:8px 10px;
      text-align:left;
    }
    .miti-table th {
      background: var(--background-primary-alt);
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    .miti-table tbody tr:hover { background: var(--background-modifier-hover); }
    .del { color: var(--text-error); cursor: pointer; font-weight:700; font-size: 1.1em; }
    .del:hover { opacity: 0.7; }
    .muted { opacity: .7; }
    .section-header {
      font-size: 1.05em;
      font-weight: 700;
      margin: 16px 0 8px 0;
      color: var(--text-normal);
      border-bottom: 2px solid var(--background-modifier-border);
      padding-bottom: 4px;
    }
    .validation-msg {
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 8px;
      font-size: 0.9em;
    }
    .validation-msg.error {
      background: rgba(220, 53, 69, 0.15);
      color: #dc3545;
      border: 1px solid #dc3545;
    }
    .validation-msg.warn {
      background: rgba(255, 193, 7, 0.15);
      color: #ff9800;
      border: 1px solid #ff9800;
    }
    .impact-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 8px;
    }
    @media (max-width: 920px) {
      .risk-grid { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
      .row-2 { grid-template-columns: 1fr; }
      .row-4 { grid-template-columns: repeat(2, 1fr); }
      .program-context-banner { flex-direction: column; align-items: flex-start; }
    }
  `;
    root.appendChild(style);

    // ═══════════════════════════════════════════════════════════════════════════
    // PROGRAM CONTEXT BANNER
    // ═══════════════════════════════════════════════════════════════════════════

    if (!programConfig) {
        const warning = document.createElement("div");
        warning.className = "config-warning";
        warning.innerHTML = `
      ⚠️ <strong>ProgramConfig not found.</strong> Some features will use default values.
      Create a note called "ProgramConfig" to enable full program integration.
    `;
        root.appendChild(warning);
    } else {
        const banner = document.createElement("div");
        banner.className = "program-context-banner";

        const left = document.createElement("div");
        left.className = "program-context-left";

        const createItem = (label, value) => {
            const item = document.createElement("div");
            item.className = "program-context-item";
            item.innerHTML = `
        <div class="program-context-label">${label}</div>
        <div class="program-context-value">${value}</div>
      `;
            return item;
        };

        left.appendChild(createItem("Program", programName));
        left.appendChild(createItem("Contract", `${currency} ${contractValueK.toLocaleString()}K`));
        left.appendChild(createItem("Method", riskMethod));
        left.appendChild(createItem("Review Cycle", reviewCadence));

        banner.appendChild(left);
        root.appendChild(banner);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SESSION STATUS BANNER
    // ═══════════════════════════════════════════════════════════════════════════

    const sessionStatus = document.createElement("div");
    sessionStatus.className = "session-status";
    sessionStatus.innerHTML = `
    📊 <strong>Session Stats:</strong> 0 AI interactions | 0 risk(s) in form
  `;
    root.appendChild(sessionStatus);

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    const el = (tag, cls, text, attrs = {}) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
        return n;
    };

    const mkField = (labelText, inputEl, hint, required = false) => {
        const wrap = el("div", "risk-field");
        const label = el("label", required ? "required" : null, labelText);
        wrap.appendChild(label);
        wrap.appendChild(inputEl);
        if (hint) {
            const hintEl = el("div", "hint", hint);
            wrap.appendChild(hintEl);
        }
        return wrap;
    };

    const mkInput = (type, placeholder = "", value = "") => {
        const i = document.createElement("input");
        i.type = type;
        i.placeholder = placeholder;
        if (value) i.value = value;
        i.className = "input";
        return i;
    };

    const mkText = (rows = 3, placeholder = "") => {
        const t = document.createElement("textarea");
        t.rows = rows;
        t.placeholder = placeholder;
        return t;
    };

    const mkSelect = (values, defVal) => {
        const s = document.createElement("select");
        values.forEach(v => {
            const o = document.createElement("option");
            o.value = v;
            o.textContent = v;
            s.appendChild(o);
        });
        if (defVal != null && values.includes(defVal)) s.value = defVal;
        return s;
    };

    const mkLabeledSelect = (opts, def) => {
        const s = document.createElement("select");
        for (const o of opts) {
            const op = document.createElement("option");
            op.value = String(o.value);
            op.textContent = o.label;
            s.appendChild(op);
        }
        s.value = String(def);
        return s;
    };

    const numVal = (node) => Math.max(1, Math.min(5, parseInt(node.value || "1", 10)));
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const fileSafe = (s) => (s || "").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
    const today = () => new Date().toISOString().slice(0, 10);

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA SOURCES - Categories & Owners
    // ═══════════════════════════════════════════════════════════════════════════
    const RISK_CAT_DIR = "99_Assets/Fields/RiskCategories";
    const CATEGORY_VALUES = (() => {
        try {
            return dv.pages("#Risk-Category")
                .where(p => String(p.file?.path || "").startsWith(RISK_CAT_DIR + "/"))
                .map(p => p.file.name)
                .array()
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
        } catch { return []; }
    })();
    const CATEGORY_DEFAULT = CATEGORY_VALUES[0] ?? "Supply Chain";

    const PERSONNEL_DIR = "99_Assets/Personnel";
    const OWNER_FILECLASS = "Employee/Profile";
    const OWNER_VALUES = (() => {
        try {
            return dv.pages("#Employee")
                .where(p =>
                    String(p?.file_class || "").toLowerCase() === OWNER_FILECLASS.toLowerCase() &&
                    String(p?.file?.path || "").startsWith(PERSONNEL_DIR + "/")
                )
                .map(p => p.file.name)
                .array()
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
        } catch { return []; }
    })();
    const OWNER_DEFAULT = OWNER_VALUES[0] ?? "";

    // ═══════════════════════════════════════════════════════════════════════════
    // RISK SCORING CONFIGURATION (From Program Config)
    // ═══════════════════════════════════════════════════════════════════════════

    // Use contract value for impact thresholds
    const impactThresholds = contractValueK > 0 ? {
        negligible: Math.round(contractValueK * 0.01), // 1%
        minor: Math.round(contractValueK * 0.025),     // 2.5%
        moderate: Math.round(contractValueK * 0.05),   // 5%
        major: Math.round(contractValueK * 0.10),      // 10%
        severe: Math.round(contractValueK * 0.15)      // 15%+
    } : {
        negligible: 10,
        minor: 50,
        moderate: 250,
        major: 1000,
        severe: 5000
    };

    const RAG = [
        { max: 6,  color: "#2e7d32", label: "Low" },
        { max: 12, color: "#f9a825", label: "Medium" },
        { max: 25, color: "#c62828", label: "High" }
    ];
    const ragFor = (score) => {
        for (const band of RAG) if (score <= band.max) return band;
        return RAG[RAG.length - 1];
    };

    const HANDLING_SUGGEST = {
        Low: `Consider: Accept with monitoring, or Watch. Lightweight triggers and ${reviewCadence.toLowerCase()} reviews.`,
        Medium: `Consider: Mitigate or Transfer. Define concrete actions, assign owners, set ${reviewCadence.toLowerCase()} reviews.`,
        High: `Consider: Avoid or Mitigate immediately. Fund mitigation actions now, set weekly reviews, escalate if needed.`
    };

    const LIKELIHOOD_OPTS = [
        { value: 1, label: "1 - Rare (0-10%)", pct: 5 },
        { value: 2, label: "2 - Unlikely (10-30%)", pct: 20 },
        { value: 3, label: "3 - Possible (30-50%)", pct: 40 },
        { value: 4, label: "4 - Likely (50-70%)", pct: 60 },
        { value: 5, label: "5 - Almost Certain (70-100%)", pct: 85 }
    ];

    const IMPACT_OPTS = [
        { value: 1, label: `1 - Negligible (<${currency}${impactThresholds.negligible}K, <1wk)` },
        { value: 2, label: `2 - Minor (${currency}${impactThresholds.negligible}-${impactThresholds.minor}K, 1-2wks)` },
        { value: 3, label: `3 - Moderate (${currency}${impactThresholds.minor}-${impactThresholds.moderate}K, 2-8wks)` },
        { value: 4, label: `4 - Major (${currency}${impactThresholds.moderate}-${impactThresholds.major}K, 8-16wks)` },
        { value: 5, label: `5 - Severe (>${currency}${impactThresholds.major}K, >16wks)` }
    ];

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT - Enhanced with Conversation Tracking
    // ═══════════════════════════════════════════════════════════════════════════
    const state = {
        mitigations: [],
        reviews: [],
        relatedRisks: [],
        affectedWBS: [],
        collapsedSections: {}
    };

    // Conversation state for AI interactions
    const conversationState = {
        polishTitle: [],
        ifThenSo: [],
        mitigations: []
    };

    // Update session status
    function updateSessionStatus() {
        const totalInteractions =
            conversationState.polishTitle.length +
            conversationState.ifThenSo.length +
            conversationState.mitigations.length;

        const riskCount = 1; // This form handles one risk at a time

        sessionStatus.innerHTML = `
      📊 <strong>Session Stats:</strong>
      ${totalInteractions} AI interaction(s) |
      ${riskCount} risk in form |
      ${state.mitigations.length} mitigation(s) planned
    `;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FORM SECTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 1: Identification & Classification
    // ─────────────────────────────────────────────────────────────────────────
    const identCard = el("div", "card");
    identCard.appendChild(el("h3", null, "📋 Risk Identification & Classification"));

    const title = mkInput("text", "Concise, specific title describing the risk event");
    const categorySel = mkSelect(
        CATEGORY_VALUES.length ? CATEGORY_VALUES : ["Supply Chain", "Technical", "Schedule", "Budget", "Quality"],
        CATEGORY_DEFAULT
    );
    const ownerSel = mkSelect(
        OWNER_VALUES.length ? [...OWNER_VALUES, "Unassigned"] : ["Unassigned"],
        OWNER_DEFAULT || "Unassigned"
    );
    const altOwnerSel = mkSelect(
        OWNER_VALUES.length ? ["None", ...OWNER_VALUES] : ["None"],
        "None"
    );
    const statusSel = mkSelect(["Open", "Monitoring", "Closed", "Realized"], "Open");
    const dateIdentified = mkInput("date", "", today());

    const identGrid = el("div", "risk-grid");
    const identLeft = el("div");
    const identRight = el("div");

    // Title with Polish button
    const titleField = el("div", "risk-field");
    const titleLabel = el("label", "required", "Risk Title");
    titleField.appendChild(titleLabel);
    titleField.appendChild(title);
    const titleBtnRow = el("div", "btn-row");
    const btnPolishTitle = el("button", "btn", "✨ Polish Title");
    titleBtnRow.appendChild(btnPolishTitle);
    titleField.appendChild(titleBtnRow);
    titleField.appendChild(el("div", "hint", "State the core threat/opportunity. Be specific and outcome-focused."));
    identLeft.appendChild(titleField);

    identLeft.appendChild(mkField("Category", categorySel, CATEGORY_VALUES.length ? "From #Risk-Category" : "Default categories", true));
    identLeft.appendChild(mkField("Primary Owner", ownerSel, "Person accountable for monitoring and response", true));
    identLeft.appendChild(mkField("Alternate Owner", altOwnerSel, "Backup if primary unavailable"));

    identRight.appendChild(mkField("Status", statusSel, "", true));
    identRight.appendChild(mkField("Date Identified", dateIdentified, "", true));

    const inScopeSel = mkSelect(["true", "false"], "true");
    identRight.appendChild(mkField("In Scope", inScopeSel, "Is this risk within program scope?"));

    const watchListSel = mkSelect(["false", "true"], "false");
    identRight.appendChild(mkField("Watch List", watchListSel, "Track closely without active mitigation"));

    identGrid.appendChild(identLeft);
    identGrid.appendChild(identRight);
    identCard.appendChild(identGrid);

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 2: Risk Description & Statement
    // ─────────────────────────────────────────────────────────────────────────
    const descCard = el("div", "card");
    descCard.appendChild(el("h3", null, "📝 Risk Description & Statement"));

    const description = mkText(3, "Detailed description: What is the risk? What is the context? What assumptions might change?");
    const causeList = mkText(3, "List specific root causes, drivers, or preconditions (one per line or comma-separated)");
    const consequenceText = mkText(3, "Describe what happens if risk occurs: schedule delays, cost increases, performance degradation, etc.");

    descCard.appendChild(mkField("Description", description, "Provide context and background. What conditions create this risk?", true));
    descCard.appendChild(mkField("Causes", causeList, "Root causes, drivers, preconditions. Be specific.", true));
    descCard.appendChild(mkField("Consequences", consequenceText, "Impact on schedule, cost, performance, technical baseline", true));

    // If-Then-So Statement
    const ifThenSo = mkText(3, "IF [causes/conditions], THEN [risk event occurs], SO [consequences/impacts]");
    const ifThenField = el("div", "risk-field");
    const ifThenLabel = el("label", "required", "If–Then–So Statement");
    ifThenField.appendChild(ifThenLabel);
    ifThenField.appendChild(ifThenSo);

    const ifThenBtnRow = el("div", "btn-row");
    const btnGenIfThen = el("button", "btn", "🤖 Generate If–Then–So");
    const statusBadge = el("span", "hint", "RAG Agent: checking…", {
        style: "padding:4px 8px;border:1px solid var(--background-modifier-border);border-radius:6px;"
    });
    ifThenBtnRow.appendChild(btnGenIfThen);
    ifThenBtnRow.appendChild(statusBadge);
    ifThenField.appendChild(ifThenBtnRow);
    ifThenField.appendChild(el("div", "hint", "Structured risk statement. Use AI generation or write manually."));

    descCard.appendChild(ifThenField);

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 3: Risk Assessment (5x5 Matrix) - Enhanced with Program Context
    // ─────────────────────────────────────────────────────────────────────────
    const assessCard = el("div", "card");
    assessCard.appendChild(el("h3", null, `📊 Risk Assessment (${riskMethod})`));

    if (contractValueK > 0) {
        const contextHint = el("div", "hint info");
        contextHint.innerHTML = `Impact thresholds scaled to ${currency}${contractValueK.toLocaleString()}K contract value`;
        assessCard.appendChild(contextHint);
    }

    const likeSel = mkLabeledSelect(LIKELIHOOD_OPTS, 3);
    const impSel = mkLabeledSelect(IMPACT_OPTS, 3);
    const probPctInput = mkInput("number", "Auto-calculated", "40");
    probPctInput.disabled = true;
    probPctInput.style.opacity = "0.7";

    const assessGrid = el("div", "row");
    assessGrid.appendChild(mkField("Probability (Likelihood)", likeSel, "1=Rare to 5=Almost Certain", true));
    assessGrid.appendChild(mkField("Impact (Severity)", impSel, "1=Negligible to 5=Severe", true));
    assessGrid.appendChild(mkField("Probability %", probPctInput, "Auto-calculated from likelihood"));
    assessCard.appendChild(assessGrid);

    // Impact dimensions
    assessCard.appendChild(el("div", "section-header", "Impact Details"));
    const impactGrid = el("div", "impact-grid");

    const schedWeeks = mkInput("number", "0"); schedWeeks.min = "0"; schedWeeks.step = "1";
    const costK = mkInput("number", "0"); costK.min = "0"; costK.step = "1";
    const perfSev = mkSelect(["None", "Low", "Medium", "High", "Critical"], "None");
    const techSev = mkSelect(["None", "Low", "Medium", "High", "Critical"], "None");

    impactGrid.appendChild(mkField("Schedule Impact (weeks)", schedWeeks, "Delay to critical path"));
    impactGrid.appendChild(mkField(`Cost Impact (${currency}K)`, costK, "Additional cost if realized"));
    impactGrid.appendChild(mkField("Performance Impact", perfSev, "Effect on product/service quality"));
    impactGrid.appendChild(mkField("Technical Impact", techSev, "Design or technical baseline changes"));
    assessCard.appendChild(impactGrid);

    assessCard.appendChild(el("div", "section-header", "Target Assessment (After Mitigation)"));
    const targetGrid = el("div", "row");
    const targetLikeSel = mkLabeledSelect(LIKELIHOOD_OPTS, 2);
    const targetImpSel = mkLabeledSelect(IMPACT_OPTS, 2);
    targetGrid.appendChild(mkField("Target Probability", targetLikeSel, "Goal after mitigations"));
    targetGrid.appendChild(mkField("Target Impact", targetImpSel, "Goal after mitigations"));
    assessCard.appendChild(targetGrid);

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 4: Proximity & Triggers
    // ─────────────────────────────────────────────────────────────────────────
    const proxCard = el("div", "card");
    proxCard.appendChild(el("h3", null, "⏰ Proximity & Triggers"));

    // Calculate proximity options based on PoP
    let proximityOpts = ["Immediate (<3 months)", "Near-term (3-6 months)", "Far-term (>6 months)"];
    if (popEnd) {
        const endDate = new Date(popEnd);
        const nowDate = new Date();
        const monthsRemaining = Math.round((endDate - nowDate) / (1000 * 60 * 60 * 24 * 30));

        if (monthsRemaining > 0 && monthsRemaining <= 12) {
            const proximityHint = el("div", "hint info");
            proximityHint.textContent = `Program ends in ${monthsRemaining} month(s) - Consider proximity relative to PoP end`;
            proxCard.appendChild(proximityHint);
        }
    }

    const proximitySel = mkSelect(proximityOpts, "Immediate (<3 months)");
    const probOfOccur = mkInput("text", "e.g., 'Within next sprint', 'Q2 2025'");
    const triggers = mkText(3, "List specific, measurable indicators that signal risk is materializing (one per line)");

    const proxGrid = el("div", "row-2");
    proxGrid.appendChild(mkField("Proximity", proximitySel, "How soon could this occur?", true));
    proxGrid.appendChild(mkField("Probability of Occurrence", probOfOccur, "Timeframe estimate"));
    proxCard.appendChild(proxGrid);
    proxCard.appendChild(mkField("Triggers / Early Warning Indicators", triggers, "Leading indicators to watch for", true));

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 5: Risk Handling Strategy
    // ─────────────────────────────────────────────────────────────────────────
    const handlingCard = el("div", "card");
    handlingCard.appendChild(el("h3", null, "🎯 Risk Handling Strategy"));

    const handlingSel = mkSelect([
        "Avoid", "Mitigate", "Transfer", "Accept", "Watch",
        "Exploit (opportunity)", "Enhance (opportunity)", "Share (opportunity)"
    ], "Mitigate");

    const detectionMethods = mkText(2, "How will we detect this risk early? (e.g., weekly supplier check-ins, monitoring dashboards)");
    const primaryStrategy = mkText(2, "Primary response plan: concrete actions to address the risk");
    const contingencyTriggers = mkText(2, "Specific thresholds that trigger contingency actions");
    const contingencyPlan = mkText(2, "Contingency plan: what we do if triggers are hit");
    const fallbackPlan = mkText(2, "Fallback plan: last resort if all else fails");

    handlingCard.appendChild(mkField("Handling Strategy", handlingSel, "Primary approach to manage this risk", true));
    handlingCard.appendChild(mkField("Detection Methods", detectionMethods, "How will we know if risk is materializing?"));
    handlingCard.appendChild(mkField("Primary Response Plan", primaryStrategy, "Main actions, owners, dates"));
    handlingCard.appendChild(mkField("Contingency Triggers", contingencyTriggers, "Thresholds that activate contingency"));
    handlingCard.appendChild(mkField("Contingency Plan", contingencyPlan, "Actions if triggers are met"));
    handlingCard.appendChild(mkField("Fallback Plan", fallbackPlan, "Last resort options"));

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 6: Mitigation Steps Planner
    // ─────────────────────────────────────────────────────────────────────────
    const mitiCard = el("div", "card");
    mitiCard.appendChild(el("h3", null, "🛠️ Mitigation Steps Planner"));
    mitiCard.appendChild(el("div", "hint", "Add specific, actionable mitigation steps. Each step should have an owner, due date, and expected risk reduction."));

    const mitiGrid = el("div", "risk-grid");
    const mitiLeft = el("div");
    const mitiRight = el("div");

    const mitiId = mkInput("text", "MIT-001", "MIT-" + String(Date.now()).slice(-3));
    const mitiDesc = mkInput("text", "Specific mitigation action");
    const mitiOwner = mkSelect(
        OWNER_VALUES.length ? OWNER_VALUES : ["Unassigned"],
        OWNER_VALUES[0] || "Unassigned"
    );
    const mitiDue = mkInput("date", "");
    const mitiPriority = mkSelect(["High", "Medium", "Low"], "High");
    const mitiStatus = mkSelect(["Not Started", "In Progress", "Complete", "Blocked", "Cancelled"], "Not Started");

    mitiLeft.appendChild(mkField("Mitigation ID", mitiId, "Unique identifier"));
    mitiLeft.appendChild(mkField("Description", mitiDesc, "What action will be taken?"));
    mitiLeft.appendChild(mkField("Owner", mitiOwner, "Who is responsible?"));
    mitiLeft.appendChild(mkField("Due Date", mitiDue, "Target completion"));

    const mitiDim = mkSelect(["Probability", "Impact", "Both"], "Probability");
    const mitiRedProb = mkInput("number", "1"); mitiRedProb.min = "0"; mitiRedProb.max = "5"; mitiRedProb.step = "1";
    const mitiRedImp = mkInput("number", "0"); mitiRedImp.min = "0"; mitiRedImp.max = "5"; mitiRedImp.step = "1";
    const mitiCost = mkInput("number", "0"); mitiCost.min = "0"; mitiCost.step = "1";
    const mitiEffort = mkInput("number", "0"); mitiEffort.min = "0"; mitiEffort.step = "1";

    mitiRight.appendChild(mkField("Priority", mitiPriority, "Urgency level"));
    mitiRight.appendChild(mkField("Status", mitiStatus, "Current state"));
    mitiRight.appendChild(mkField("Target Dimension", mitiDim, "What does this reduce?"));
    mitiRight.appendChild(mkField("Probability Reduction", mitiRedProb, "Points reduced (0-5)"));
    mitiRight.appendChild(mkField("Impact Reduction", mitiRedImp, "Points reduced (0-5)"));

    const costEffortRow = el("div", "row-2");
    costEffortRow.appendChild(mkField(`Cost (${currency}K)`, mitiCost, "Implementation cost"));
    costEffortRow.appendChild(mkField("Effort (hours)", mitiEffort, "Estimated effort"));
    mitiRight.appendChild(costEffortRow);

    mitiGrid.appendChild(mitiLeft);
    mitiGrid.appendChild(mitiRight);
    mitiCard.appendChild(mitiGrid);

    const mitiNotes = mkText(2, "Additional notes, dependencies, or context for this mitigation");
    mitiCard.appendChild(mkField("Notes", mitiNotes, "Any additional context"));

    const addMitiBtnRow = el("div", "btn-row");
    const btnAddMiti = el("button", "btn primary", "+ Add Mitigation Step");
    const btnSuggestMiti = el("button", "btn", "💡 Suggest Mitigations");
    addMitiBtnRow.appendChild(btnAddMiti);
    addMitiBtnRow.appendChild(btnSuggestMiti);
    mitiCard.appendChild(addMitiBtnRow);

    // Mitigation table
    const mitiTable = document.createElement("table");
    mitiTable.className = "miti-table";
    mitiTable.innerHTML = `
    <thead>
      <tr>
        <th>ID</th><th>Description</th><th>Owner</th><th>Due</th>
        <th>Priority</th><th>Status</th><th>Target</th>
        <th>Prob↓</th><th>Imp↓</th><th>Cost</th><th>ROI</th><th></th>
      </tr>
    </thead>
    <tbody></tbody>`;
    const mitiTbody = mitiTable.querySelector("tbody");
    mitiCard.appendChild(mitiTable);

    const mitiSummary = el("div", "hint", "No mitigation steps added yet.");
    mitiCard.appendChild(mitiSummary);

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 7: Review & Tracking (Using Program Config)
    // ─────────────────────────────────────────────────────────────────────────
    const reviewCard = el("div", "card");
    reviewCard.appendChild(el("h3", null, "📅 Review & Tracking"));

    if (reviewCadence) {
        const reviewHint = el("div", "hint info");
        reviewHint.textContent = `Program review cadence: ${reviewCadence}`;
        reviewCard.appendChild(reviewHint);
    }

    const reviewCycleSel = mkSelect([
        "Weekly", "Bi-weekly", "Monthly", "Quarterly", "As-needed"
    ], reviewCadence || "Bi-weekly");
    const nextReview = mkInput("date", "");
    const projectedClose = mkInput("date", "");

    const reviewGrid = el("div", "row");
    reviewGrid.appendChild(mkField("Review Cycle", reviewCycleSel, "How often to review"));
    reviewGrid.appendChild(mkField("Next Review Date", nextReview, "Schedule next review"));
    reviewGrid.appendChild(mkField("Projected Close Date", projectedClose, "When do we expect to close this?"));
    reviewCard.appendChild(reviewGrid);

    // Escalation
    reviewCard.appendChild(el("div", "section-header", "Escalation"));
    const escalatedSel = mkSelect(["false", "true"], "false");
    const escalatedTo = mkInput("text", pm ? `e.g., ${pm}` : "e.g., Program Director, Customer");
    const escalationDate = mkInput("date", "");

    const escGrid = el("div", "row");
    escGrid.appendChild(mkField("Escalated", escalatedSel, "Has this been escalated?"));
    escGrid.appendChild(mkField("Escalated To", escalatedTo, pm ? `Program PM: ${pm}` : "Who was it escalated to?"));
    escGrid.appendChild(mkField("Escalation Date", escalationDate, "When was it escalated?"));
    reviewCard.appendChild(escGrid);

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 8: Relationships & Context
    // ─────────────────────────────────────────────────────────────────────────
    const relCard = el("div", "card");
    relCard.appendChild(el("h3", null, "🔗 Relationships & Context"));

    const relatedRisks = mkInput("text", "Comma-separated risk IDs (e.g., RISK-001, RISK-002)");
    const affectedWBS = mkInput("text", "Comma-separated WBS elements (e.g., 3.2.1, 3.2.3)");
    const affectedMilestones = mkInput("text", "Comma-separated milestone IDs (e.g., MS-4, MS-5)");

    relCard.appendChild(mkField("Related Risks", relatedRisks, "Other risks that are connected"));
    relCard.appendChild(mkField("Affected WBS Elements", affectedWBS, "Work breakdown structure items at risk"));
    relCard.appendChild(mkField("Affected Milestones", affectedMilestones, "Milestones that could be impacted"));

    // Customer/Stakeholder
    relCard.appendChild(el("div", "section-header", "Customer & Stakeholder"));
    const custVisSel = mkSelect(["true", "false"], "false");
    const custConcern = mkSelect(["None", "Low", "Medium", "High", "Critical"], "None");
    const custPMR = mkInput("text", "PMR reference number");

    const custGrid = el("div", "row");
    custGrid.appendChild(mkField("Customer Visibility", custVisSel, "Is customer aware?"));
    custGrid.appendChild(mkField("Customer Concern Level", custConcern, "Customer's concern"));
    custGrid.appendChild(mkField("Customer PMR Reference", custPMR, "PMR tracking number"));
    relCard.appendChild(custGrid);

    // ─────────────────────────────────────────────────────────────────────────
    // KPI Status Card (Enhanced with Contract Context)
    // ─────────────────────────────────────────────────────────────────────────
    const statusCard = el("div", "card status-card");
    const ragPill = el("div", "pill", "—", { style: "background:#777" });
    const kpiWrap = el("div");
    const kpiGrid = el("div", "kpi");

    const k1 = el("div", "kpi-item");
    k1.innerHTML = `<div class="label">Risk Score</div><div class="val">—</div>`;
    const k2 = el("div", "kpi-item");
    k2.innerHTML = `<div class="label">Target Score</div><div class="val">—</div>`;
    const k3 = el("div", "kpi-item");
    k3.innerHTML = `<div class="label">Exposure (${currency}K)</div><div class="val">—</div>`;
    const k4 = el("div", "kpi-item");
    k4.innerHTML = `<div class="label">Miti Cost (${currency}K)</div><div class="val">—</div>`;

    kpiGrid.appendChild(k1);
    kpiGrid.appendChild(k2);
    kpiGrid.appendChild(k3);
    kpiGrid.appendChild(k4);

    const suggestion = el("div", "hint", "");

    // Add contract exposure percentage if contract value available
    const exposurePercent = el("div", "hint", "");
    kpiWrap.appendChild(kpiGrid);
    kpiWrap.appendChild(suggestion);
    if (contractValueK > 0) {
        kpiWrap.appendChild(exposurePercent);
    }
    statusCard.appendChild(ragPill);
    statusCard.appendChild(kpiWrap);

    // ─────────────────────────────────────────────────────────────────────────
    // Validation Messages
    // ─────────────────────────────────────────────────────────────────────────
    const validationDiv = el("div");

    // ─────────────────────────────────────────────────────────────────────────
    // Output & Actions
    // ─────────────────────────────────────────────────────────────────────────
    const outCard = el("div", "card");
    outCard.appendChild(el("h3", null, "📄 YAML Preview & Actions"));

    const outArea = mkText(12);
    outArea.classList.add("output");
    outCard.appendChild(outArea);

    const actionRow = el("div", "btn-row");
    const btnGenYAML = el("button", "btn", "🔄 Refresh YAML");
    const btnCopyYAML = el("button", "btn", "📋 Copy YAML");
    const btnCreate = el("button", "btn primary", "✅ Create Risk Note");
    actionRow.appendChild(btnGenYAML);
    actionRow.appendChild(btnCopyYAML);
    actionRow.appendChild(btnCreate);
    outCard.appendChild(actionRow);

    // ═══════════════════════════════════════════════════════════════════════════
    // ASSEMBLE FORM
    // ═══════════════════════════════════════════════════════════════════════════
    root.appendChild(identCard);
    root.appendChild(descCard);
    root.appendChild(assessCard);
    root.appendChild(proxCard);
    root.appendChild(handlingCard);
    root.appendChild(mitiCard);
    root.appendChild(reviewCard);
    root.appendChild(relCard);
    root.appendChild(statusCard);
    root.appendChild(validationDiv);
    root.appendChild(outCard);

    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULATION FUNCTIONS (Enhanced with Program Context)
    // ═══════════════════════════════════════════════════════════════════════════

    const calcMetrics = () => {
        const L = numVal(likeSel);
        const I = numVal(impSel);
        const score = L * I;
        const band = ragFor(score);

        const targetL = numVal(targetLikeSel);
        const targetI = numVal(targetImpSel);
        const targetScore = targetL * targetI;

        // Update probability percentage
        const likeOpt = LIKELIHOOD_OPTS.find(o => o.value === L);
        probPctInput.value = likeOpt ? likeOpt.pct : 40;

        // Calculate exposure
        const probPct = parseFloat(probPctInput.value) / 100;
        const impactCost = parseFloat(costK.value) || 0;
        const exposure = Math.round(probPct * impactCost);

        // Calculate exposure as % of contract if available
        let exposurePct = 0;
        if (contractValueK > 0 && exposure > 0) {
            exposurePct = ((exposure / contractValueK) * 100).toFixed(2);
        }

        // Calculate total mitigation cost
        const totalMitiCost = state.mitigations.reduce((sum, m) =>
            sum + (parseFloat(m.costK) || 0), 0
        );

        // Update UI
        ragPill.style.background = band.color;
        ragPill.textContent = band.label;

        k1.querySelector(".val").textContent = `${L}×${I} = ${score}`;
        k2.querySelector(".val").textContent = `${targetL}×${targetI} = ${targetScore}`;
        k3.querySelector(".val").textContent = `${currency}${exposure}K`;
        k4.querySelector(".val").textContent = `${currency}${totalMitiCost}K`;

        suggestion.textContent = HANDLING_SUGGEST[band.label] || "";

        // Update exposure percentage display
        if (contractValueK > 0 && exposurePercent) {
            if (exposure > 0) {
                exposurePercent.textContent = `Exposure is ${exposurePct}% of ${currency}${contractValueK.toLocaleString()}K contract value`;
                exposurePercent.style.marginTop = "8px";

                // Warn if exposure is high relative to contract
                if (exposurePct > 10) {
                    exposurePercent.style.color = "var(--text-error)";
                } else if (exposurePct > 5) {
                    exposurePercent.style.color = "var(--text-warning)";
                } else {
                    exposurePercent.style.color = "var(--text-success)";
                }
            } else {
                exposurePercent.textContent = "";
            }
        }

        return { score, targetScore, exposure, totalMitiCost, band, exposurePct };
    };

    const renderMitigationTable = () => {
        mitiTbody.innerHTML = "";

        if (state.mitigations.length === 0) {
            mitiSummary.textContent = "No mitigation steps added yet. Add steps above to build your mitigation plan.";
            return;
        }

        const L = numVal(likeSel);
        const I = numVal(impSel);
        let currentL = L;
        let currentI = I;
        let totalCost = 0;
        let totalDelta = 0;

        state.mitigations.forEach((m, idx) => {
            const priorScore = currentL * currentI;

            // Apply reductions
            if (m.targetDimension === "Probability" || m.targetDimension === "Both") {
                currentL = Math.max(1, currentL - parseInt(m.plannedReduction.probability || 0));
            }
            if (m.targetDimension === "Impact" || m.targetDimension === "Both") {
                currentI = Math.max(1, currentI - parseInt(m.plannedReduction.impact || 0));
            }

            const postScore = currentL * currentI;
            const delta = priorScore - postScore;
            const cost = parseFloat(m.costK) || 0;
            const roi = cost > 0 ? (delta / cost).toFixed(2) : (delta > 0 ? "∞" : "0");

            totalCost += cost;
            totalDelta += delta;

            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${m.id}</td>
        <td style="max-width:200px;">${m.description}</td>
        <td>${m.owner}</td>
        <td>${m.dueDate || "—"}</td>
        <td>${m.priority}</td>
        <td>${m.status}</td>
        <td>${m.targetDimension}</td>
        <td>${m.plannedReduction.probability}</td>
        <td>${m.plannedReduction.impact}</td>
        <td>${currency}${cost}K</td>
        <td>${roi}</td>
        <td class="del" data-idx="${idx}">✕</td>
      `;
            mitiTbody.appendChild(tr);
        });

        mitiSummary.innerHTML = `
      <strong>Summary:</strong> ${state.mitigations.length} mitigation(s) planned.
      Projected residual: ${currentL}×${currentI} = ${currentL * currentI}.
      Total risk reduction: ${totalDelta} points.
      Total investment: ${currency}${totalCost}K.
      Overall ROI: ${totalCost > 0 ? (totalDelta / totalCost).toFixed(2) : "∞"}
    `;

        // Attach delete handlers
        mitiTbody.querySelectorAll(".del").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-idx"));
                if (!isNaN(idx)) {
                    state.mitigations.splice(idx, 1);
                    renderMitigationTable();
                    calcMetrics();
                }
            });
        });
    };

    const validateForm = () => {
        const errors = [];
        const warnings = [];

        if (!(title.value || "").trim()) {
            errors.push("Risk Title is required");
        }
        if ((ownerSel.value || "").trim() === "Unassigned" || !ownerSel.value) {
            warnings.push("No owner assigned - risk may not be actively managed");
        }
        if (!(description.value || "").trim()) {
            errors.push("Description is required");
        }
        if (!(causeList.value || "").trim()) {
            errors.push("Causes are required");
        }
        if (!(consequenceText.value || "").trim()) {
            errors.push("Consequences are required");
        }
        if (!(ifThenSo.value || "").trim()) {
            warnings.push("If-Then-So statement helps clarify risk - consider generating one");
        }
        if (!(triggers.value || "").trim()) {
            warnings.push("Early warning triggers help detect risks before they materialize");
        }
        if (state.mitigations.length === 0 && handlingSel.value === "Mitigate") {
            warnings.push("Handling strategy is 'Mitigate' but no mitigation steps defined");
        }

        const { score, exposurePct } = calcMetrics();
        if (score >= 12 && state.mitigations.length === 0) {
            warnings.push("High risk score with no mitigation plan - immediate action recommended");
        }

        // Add contract-specific warnings
        if (contractValueK > 0 && exposurePct > 10) {
            warnings.push(`⚠️ Risk exposure exceeds 10% of contract value (${exposurePct}%) - consider escalation`);
        }

        validationDiv.innerHTML = "";
        if (errors.length > 0) {
            const errDiv = el("div", "validation-msg error");
            errDiv.innerHTML = "<strong>Required fields missing:</strong><ul>" +
                errors.map(e => `<li>${e}</li>`).join("") + "</ul>";
            validationDiv.appendChild(errDiv);
        }
        if (warnings.length > 0) {
            const warnDiv = el("div", "validation-msg warn");
            warnDiv.innerHTML = "<strong>Recommendations:</strong><ul>" +
                warnings.map(w => `<li>${w}</li>`).join("") + "</ul>";
            validationDiv.appendChild(warnDiv);
        }

        return errors.length === 0;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // YAML GENERATION (Enhanced with Program Context)
    // ═══════════════════════════════════════════════════════════════════════════

    const genYAML = () => {
        const L = numVal(likeSel);
        const I = numVal(impSel);
        const targetL = numVal(targetLikeSel);
        const targetI = numVal(targetImpSel);

        const probPct = parseFloat(probPctInput.value);
        const impactCost = parseFloat(costK.value) || 0;
        const exposure = Math.round((probPct / 100) * impactCost);

        const id = "RISK-" + new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
        const dateId = dateIdentified.value || today();
        const dateNow = today();

        const esc = (s) => (s ?? "").replace(/"/g, '\\"').replace(/\n/g, "\\n");
        const yamlStr = (s) => s ? `"${esc(s)}"` : '""';
        const yamlBool = (s) => s === "true" || s === true ? "true" : "false";
        const yamlList = (s) => {
            if (!s || !s.trim()) return "[]";
            return "[" + s.split(",").map(x => `"${x.trim()}"`).join(", ") + "]";
        };

        // Parse causes and consequences into arrays
        const causesArray = (causeList.value || "").split(/\n|,/).filter(c => c.trim()).map(c => `  - "${esc(c.trim())}"`);
        const causesYAML = causesArray.length > 0 ? "\ncause:\n" + causesArray.join("\n") : 'cause: ""';

        let yaml = `---
# === IDENTIFICATION ===
fileClass: Risks
id: ${id}
dateIdentified: ${dateId}
dateModified: ${dateNow}
title: ${yamlStr(title.value)}
status: ${yamlStr(statusSel.value)}
owner: ${yamlStr(ownerSel.value)}
alternateOwner: ${yamlStr(altOwnerSel.value === "None" ? "" : altOwnerSel.value)}
category: ${yamlStr(categorySel.value)}
tags: [risk, ${categorySel.value.toLowerCase().replace(/\s+/g, "-")}]

# === PROGRAM CONTEXT ===
program: "[[${programConfig ? programConfig.file.name : "ProgramConfig"}]]"
programName: ${yamlStr(programName)}
contractNumber: ${yamlStr(contractNumber)}
contractValueK: ${contractValueK}

# === RISK STATEMENT ===
impactStatement: ${yamlStr(ifThenSo.value)}

# === DETAILED DESCRIPTION ===
description: ${yamlStr(description.value)}
${causesYAML}
consequence:
  impacts:
    schedule:
      value: ${parseInt(schedWeeks.value) || 0}
      unit: "weeks"
      description: "Schedule delay impact"
    cost:
      value: ${impactCost}
      unit: "${currency}K"
      description: "Cost impact"
    performance:
      severity: "${perfSev.value}"
      description: "Performance impact"
    technical:
      severity: "${techSev.value}"
      description: "Technical impact"

# === TRIGGERS & PROXIMITY ===
triggers: ${yamlStr(triggers.value)}
proximity: "${proximitySel.value}"
probabilityOfOccurrence: ${yamlStr(probOfOccur.value)}

# === RISK ASSESSMENT (${riskMethod}) ===
riskMatrix: "${riskMethod}"

initial:
  probability: ${L}
  probabilityPct: ${probPct}
  impact: ${I}
  riskScore: ${L * I}
  exposureK: ${exposure}
  exposurePctOfContract: ${contractValueK > 0 ? ((exposure / contractValueK) * 100).toFixed(2) : 0}
  assessmentDate: ${dateId}
  assessmentRationale: ""

current:
  probability: ${L}
  probabilityPct: ${probPct}
  impact: ${I}
  riskScore: ${L * I}
  exposureK: ${exposure}
  exposurePctOfContract: ${contractValueK > 0 ? ((exposure / contractValueK) * 100).toFixed(2) : 0}
  trend: "Stable"
  assessmentDate: ${dateNow}

target:
  probability: ${targetL}
  impact: ${targetI}
  riskScore: ${targetL * targetI}
  exposureK: ${Math.round((targetL * 20 / 100) * impactCost)}

# === RISK HANDLING ===
handlingStrategy: ${yamlStr(handlingSel.value)}
inScope: ${yamlBool(inScopeSel.value)}
watchList: ${yamlBool(watchListSel.value)}
escalated: ${yamlBool(escalatedSel.value)}
escalatedTo: ${yamlStr(escalatedTo.value)}
escalationDate: ${yamlStr(escalationDate.value)}

# === RESPONSE PLAN ===
response:
  primaryStrategy: ${yamlStr(primaryStrategy.value)}
  detectionMethods: ${yamlStr(detectionMethods.value)}
  contingencyTriggers: ${yamlStr(contingencyTriggers.value)}
  contingencyPlan: ${yamlStr(contingencyPlan.value)}
  fallbackPlan: ${yamlStr(fallbackPlan.value)}

# === MITIGATIONS ===`;

        if (state.mitigations.length > 0) {
            yaml += "\nmitigations:\n";
            state.mitigations.forEach(m => {
                yaml += `  - id: ${m.id}\n`;
                yaml += `    description: ${yamlStr(m.description)}\n`;
                yaml += `    owner: ${yamlStr(m.owner)}\n`;
                yaml += `    status: "${m.status}"\n`;
                yaml += `    dueDate: ${m.dueDate || '""'}\n`;
                yaml += `    priority: "${m.priority}"\n`;
                yaml += `    targetDimension: "${m.targetDimension}"\n`;
                yaml += `    plannedReduction:\n`;
                yaml += `      probability: ${m.plannedReduction.probability}\n`;
                yaml += `      impact: ${m.plannedReduction.impact}\n`;
                yaml += `    actualReduction:\n`;
                yaml += `      probability: 0\n`;
                yaml += `      impact: 0\n`;
                yaml += `    costK: ${m.costK}\n`;
                yaml += `    effortHours: ${m.effortHours}\n`;
                yaml += `    dependencies: []\n`;
                yaml += `    taskLink: ""\n`;
                yaml += `    notes: ${yamlStr(m.notes)}\n`;
            });
        } else {
            yaml += "\nmitigations: []\n";
        }

        yaml += `
# === REVIEW & TRACKING ===
reviews: []
reviewCycle: "${reviewCycleSel.value}"
nextReviewDate: ${yamlStr(nextReview.value)}
lastReviewDate: ${dateNow}
programReviewCadence: "${reviewCadence}"

# === RELATIONSHIPS ===
relatedRisks: ${yamlList(relatedRisks.value)}
affectedWBS: ${yamlList(affectedWBS.value)}
affectedMilestones: ${yamlList(affectedMilestones.value)}

# === CUSTOMER/STAKEHOLDER ===
customerVisibility: ${yamlBool(custVisSel.value)}
customerConcernLevel: "${custConcern.value}"
customerPMRReference: ${yamlStr(custPMR.value)}
stakeholderComms: []

# === METRICS & REPORTING ===
metrics:
  timeOpen: 0
  mitigationEffectiveness: 0
  costAvoidedK: 0
  actualCostK: 0

# === CLOSURE ===
dateClosed: ""
closureReason: ""
closureNotes: ""
lessonsLearned: ""

# === AUDIT TRAIL ===
createdBy: "[[User Name]]"
modifiedBy: "[[User Name]]"
changeLog:
  - date: ${dateNow}
    user: "[[User Name]]"
    change: "Risk created"
---`;

        return { id, yaml };
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    // Update metrics on any input change
    root.querySelectorAll("input, select, textarea").forEach(el => {
        el.addEventListener("input", () => {
            calcMetrics();
            validateForm();
        });
    });

    // Add mitigation step
    btnAddMiti.addEventListener("click", () => {
        const desc = (mitiDesc.value || "").trim();
        if (!desc) {
            new Notice("⚠️ Mitigation description is required");
            return;
        }

        const miti = {
            id: mitiId.value || "MIT-" + String(Date.now()).slice(-3),
            description: desc,
            owner: mitiOwner.value,
            status: mitiStatus.value,
            dueDate: mitiDue.value,
            priority: mitiPriority.value,
            targetDimension: mitiDim.value,
            plannedReduction: {
                probability: parseInt(mitiRedProb.value) || 0,
                impact: parseInt(mitiRedImp.value) || 0
            },
            actualReduction: {
                probability: 0,
                impact: 0
            },
            costK: parseFloat(mitiCost.value) || 0,
            effortHours: parseFloat(mitiEffort.value) || 0,
            dependencies: [],
            taskLink: "",
            notes: mitiNotes.value || ""
        };

        state.mitigations.push(miti);

        // Clear form
        mitiId.value = "MIT-" + String(Date.now()).slice(-3);
        mitiDesc.value = "";
        mitiDue.value = "";
        mitiRedProb.value = "1";
        mitiRedImp.value = "0";
        mitiCost.value = "0";
        mitiEffort.value = "0";
        mitiNotes.value = "";

        renderMitigationTable();
        calcMetrics();
        validateForm();
        new Notice("✅ Mitigation step added");
    });

    // Generate YAML
    btnGenYAML.addEventListener("click", () => {
        const { yaml } = genYAML();
        outArea.value = yaml;
        new Notice("✅ YAML generated");
    });

    // Copy YAML
    btnCopyYAML.addEventListener("click", async () => {
        try {
            if (!outArea.value) {
                const { yaml } = genYAML();
                outArea.value = yaml;
            }
            await navigator.clipboard.writeText(outArea.value);
            btnCopyYAML.textContent = "✅ Copied!";
            setTimeout(() => (btnCopyYAML.textContent = "📋 Copy YAML"), 1500);
            new Notice("✅ YAML copied to clipboard");
        } catch (e) {
            console.error(e);
            new Notice("❌ Failed to copy YAML");
        }
    });

    // Create risk note
    btnCreate.addEventListener("click", async () => {
        const ttl = (title.value || "").trim();
        if (!ttl) { new Notice("❌ Title is required."); return; }
        if (!(ownerSel.value || "").trim() || ownerSel.value === "Unassigned") {
            new Notice("❌ Valid Owner is required."); return;
        }

        const progName = fileSafe(programName);
        const dateStr = dateIdentified.value || today();
        const filename = `${progName}-${dateStr}-${fileSafe(ttl)}.md`;

        const { id, yaml } = genYAML();

        const year = String(new Date().getFullYear());
        const dir = `01_Risks/${year}`;
        const path = `${dir}/${filename}`;

        if (!app.vault.getAbstractFileByPath(dir)) {
            try { await app.vault.createFolder(dir); } catch (_) {}
        }

        // Build note body with management console
        const noteContent = yaml + `

---
# ${ttl}

> **Program:** ${programName} | **Contract:** ${contractNumber} | **Value:** ${currency}${contractValueK.toLocaleString()}K

## 📋 Risk Statement
> **IF**: ${(causeList.value || "").trim()}
> **THEN**: ${(description.value || "").trim()}
> **SO**: ${(consequenceText.value || "").trim()}

---

## 🎛️ Risk Management Console
\`\`\`dataviewjs
await dv.view("99_Assets/Templates/RiskManagementForm")
\`\`\`

---

## 📊 Current Assessment

| Metric | Value |
|--------|-------|
| **Status** | \`= this.status\` |
| **Risk Score** | \`= this.current.riskScore\` (P: \`= this.current.probability\` × I: \`= this.current.impact\`) |
| **Trend** | \`= this.current.trend\` |
| **Exposure** | ${currency}\`= this.current.exposureK\`K (\`= this.current.exposurePctOfContract\`% of contract) |
| **Owner** | \`= this.owner\` |
| **Days Open** | \`= date(today) - date(this.dateIdentified)\` |
| **Next Review** | \`= this.nextReviewDate\` |
| **Review Cadence** | \`= this.programReviewCadence\` |

---

## 🛠️ Active Mitigations

\`\`\`dataviewjs
const mitigations = dv.current().mitigations || [];
const active = mitigations.filter(m =>
    m.status !== "Complete" && m.status !== "Cancelled"
);

if (active.length === 0) {
    dv.paragraph("⚠️ **No active mitigations**");
} else {
    dv.table(
        ["ID", "Description", "Owner", "Status", "Due", "Priority", "Target"],
        active.map(m => [
            m.id,
            m.description,
            m.owner,
            m.status,
            m.dueDate || "—",
            m.priority,
            m.targetDimension
        ])
    );

    const total = mitigations.length;
    const complete = mitigations.filter(m => m.status === "Complete").length;
    dv.paragraph(\`**Progress**: \${complete}/\${total} mitigations complete (\${Math.round(complete/total*100)}%)\`);
}
\`\`\`

---

## ✅ Mitigation Tasks

\`\`\`tasks
not done
path includes ${dir}
description includes ${id}
sort by due
group by status
\`\`\`

---

## 🔗 Relationships & Context

**Program**: [[${programConfig ? programConfig.file.name : "ProgramConfig"}]]
**Related Risks**: \`= this.relatedRisks\`
**Affected WBS**: \`= this.affectedWBS\`
**Milestones at Risk**: \`= this.affectedMilestones\`

### Customer Visibility
- **Visible to Customer**: \`= this.customerVisibility\`
- **Concern Level**: \`= this.customerConcernLevel\`
- **PMR Reference**: \`= this.customerPMRReference\`

---

*Last Updated: \`= this.dateModified\` | Created: \`= this.dateIdentified\` | Risk ID: \`= this.id\`*
`;

        try {
            await app.vault.create(path, noteContent);
            new Notice(`✅ Created ${path}`);
            const f = app.vault.getAbstractFileByPath(path);
            if (f) app.workspace.getLeaf(true).openFile(f);
        } catch (e) {
            console.error(e);
            new Notice("❌ Failed to create the risk note. See console.");
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // RAG AGENT MANAGER INTEGRATION - v3.0
    // ═══════════════════════════════════════════════════════════════════════════

    // Agent status tracking
    const agentStatus = {
        apiReady: false,
        availableAgents: {
            polishTitle: false,
            ifThenSo: false,
            mitigationSuggester: false
        }
    };

    // Required agent patterns - flexible matching
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

    // Status badge updater
    function setBadge(state, details) {
        let color = "#888", text = "";
        if (state === "ok") {
            color = "var(--text-success)";
            text = "✓ AI Helpers Ready";
        } else if (state === "missing") {
            color = "#888";
            text = "ℹ️ Optional AI helpers not configured";
        } else if (state === "partial") {
            color = "var(--text-warning)";
            text = "⚠ Some AI helpers available";
        } else {
            text = "? Checking";
        }
        statusBadge.style.color = color;
        statusBadge.style.fontSize = "0.85em";
        statusBadge.textContent = text;
    }

    // Check agents with flexible matching
    async function checkAgents() {
        console.log("[Risk Form] ========== AGENT CHECK START ==========");

        try {
            // Check if API exists
            if (!window.RAGAgentManager) {
                console.error("[Risk Form] window.RAGAgentManager is NOT available");
                setBadge("missing", "plugin not loaded");
                btnPolishTitle.disabled = true;
                btnGenIfThen.disabled = true;
                btnSuggestMiti.disabled = true;
                return;
            }

            console.log("[Risk Form] ✓ window.RAGAgentManager is available");

            // Check if listAgents method exists
            if (typeof window.RAGAgentManager.listAgents !== 'function') {
                console.error("[Risk Form] listAgents method not available");
                setBadge("missing", "API error");
                btnPolishTitle.disabled = true;
                btnGenIfThen.disabled = true;
                btnSuggestMiti.disabled = true;
                return;
            }

            console.log("[Risk Form] ✓ listAgents method is available");

            // Get agents
            const agents = window.RAGAgentManager.listAgents();
            console.log("[Risk Form] Retrieved", agents.length, "agent(s)");
            console.log("[Risk Form] Agent list:", agents.map(a => ({
                id: a.id,
                name: a.name,
                enabled: a.enabled
            })));

            if (!agents || agents.length === 0) {
                console.warn("[Risk Form] No agents found");
                setBadge("missing", "no agents found");
                btnPolishTitle.disabled = true;
                btnGenIfThen.disabled = true;
                btnSuggestMiti.disabled = true;
                return;
            }

            // Check patterns
            console.log("[Risk Form] Checking agent patterns...");
            console.log("[Risk Form] Polish pattern:", REQUIRED_AGENTS['polish-title'].pattern);
            console.log("[Risk Form] If-Then-So pattern:", REQUIRED_AGENTS['if-then-so'].pattern);
            console.log("[Risk Form] Mitigation pattern:", REQUIRED_AGENTS['suggest-miti'].pattern);

            // Flexible agent matching function
            const findAgent = (patterns) => {
                console.log("[Risk Form] Looking for agent matching fallback:", patterns.fallback);

                const found = agents.find(a => {
                    const name = (a.name || "").toLowerCase();
                    const id = (a.id || "").toLowerCase();

                    const nameMatch = patterns.pattern.test(name);
                    const idMatch = patterns.pattern.test(id);
                    const fallbackMatch = id === patterns.fallback.toLowerCase();

                    console.log(`[Risk Form]   Checking "${a.name || a.id}": name=${nameMatch}, id=${idMatch}, fallback=${fallbackMatch}`);

                    return nameMatch || idMatch || fallbackMatch;
                });

                if (found) {
                    console.log("[Risk Form]   ✓ FOUND:", found.name || found.id);
                } else {
                    console.log("[Risk Form]   ✗ NOT FOUND");
                }

                return found;
            };

            // Check each required agent
            console.log("[Risk Form] --- Checking Polish Title Agent ---");
            const polishAgent = findAgent(REQUIRED_AGENTS['polish-title']);

            console.log("[Risk Form] --- Checking If-Then-So Agent ---");
            const ifThenAgent = findAgent(REQUIRED_AGENTS['if-then-so']);

            console.log("[Risk Form] --- Checking Mitigation Suggester Agent ---");
            const mitiAgent = findAgent(REQUIRED_AGENTS['suggest-miti']);

            console.log("[Risk Form] FINAL RESULTS:", {
                polishTitle: polishAgent ? `${polishAgent.name} (${polishAgent.id})` : "NOT FOUND",
                ifThenSo: ifThenAgent ? `${ifThenAgent.name} (${ifThenAgent.id})` : "NOT FOUND",
                mitigationSuggester: mitiAgent ? `${mitiAgent.name} (${mitiAgent.id})` : "NOT FOUND"
            });

            agentStatus.apiReady = true;
            agentStatus.availableAgents.polishTitle = !!polishAgent;
            agentStatus.availableAgents.ifThenSo = !!ifThenAgent;
            agentStatus.availableAgents.mitigationSuggester = !!mitiAgent;

            // Update button states
            btnPolishTitle.disabled = !agentStatus.availableAgents.polishTitle;
            btnGenIfThen.disabled = !agentStatus.availableAgents.ifThenSo;
            btnSuggestMiti.disabled = !agentStatus.availableAgents.mitigationSuggester;

            // Update badge
            const available = Object.values(agentStatus.availableAgents).filter(Boolean).length;
            console.log("[Risk Form] Available agents count:", available, "/ 3");

            if (available === 3) {
                setBadge("ok", "all agents ready");
            } else if (available > 0) {
                const missing = [];
                if (!polishAgent) missing.push("polish");
                if (!ifThenAgent) missing.push("if-then");
                if (!mitiAgent) missing.push("suggester");
                setBadge("partial", `missing: ${missing.join(", ")}`);
            } else {
                setBadge("missing", "no agents found");
            }

            console.log("[Risk Form] ========== AGENT CHECK COMPLETE ==========");

        } catch (e) {
            console.error("[Risk Form] ========== AGENT CHECK FAILED ==========");
            console.error("[Risk Form] Error:", e);
            setBadge("missing", "error");
            btnPolishTitle.disabled = true;
            btnGenIfThen.disabled = true;
            btnSuggestMiti.disabled = true;
        }
    }

    // Run agent check immediately (no delay)
    console.log("[Risk Form] Form loaded, will check agents now...");
    checkAgents();

    // ═══════════════════════════════════════════════════════════════════════════
    // ENHANCED AGENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    // Enhanced Polish Title Handler
    btnPolishTitle.addEventListener("click", async () => {
        const api = window.RAGAgentManager || window.claudeAgent;

        if (!api || typeof api.executeAgent !== 'function') {
            new Notice("❌ RAG Agent Manager not ready. Check plugin status.");
            return;
        }

        const titleText = (title.value || "").trim();
        if (!titleText) {
            new Notice("⚠️ Enter a risk title first.");
            return;
        }

        try {
            // Find agent using flexible matching
            const agents = api.listAgents();
            const agent = agents.find(a => {
                const name = (a.name || "").toLowerCase();
                const id = (a.id || "").toLowerCase();
                return REQUIRED_AGENTS['polish-title'].pattern.test(name) ||
                       REQUIRED_AGENTS['polish-title'].pattern.test(id) ||
                       id === REQUIRED_AGENTS['polish-title'].fallback;
            });

            if (!agent) {
                new Notice("❌ Title polish agent not found. Configure in plugin settings.");
                return;
            }

            btnPolishTitle.disabled = true;
            btnPolishTitle.textContent = "Polishing...";

            const payload = {
                title: titleText,
                description: (description.value || "").trim(),
                category: categorySel.value,
                causes: (causeList.value || "").trim(),
                consequences: (consequenceText.value || "").trim(),
                programContext: {
                    programName: programName,
                    contractValueK: contractValueK,
                    currency: currency
                }
            };

            console.log("[Risk Form] Polishing title with agent:", agent.id);

            // Use executeAgent with conversation history
            const context = {
                conversationHistory: conversationState.polishTitle.slice(-3).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            };

            const result = await api.executeAgent(agent.id, JSON.stringify(payload), context);

            // Extract polished title from response
            let polished = result.answer || result.response || result;
            if (typeof polished !== 'string') {
                polished = String(polished);
            }
            polished = polished.trim();

            // Try to extract just the title if response is verbose
            const titleMatch = polished.match(/(?:title:|polished title:)\s*["']?([^"'\n]+)["']?/i);
            if (titleMatch) {
                polished = titleMatch[1].trim();
            }

            if (!polished) {
                throw new Error("Agent returned empty response");
            }

            // Track conversation
            conversationState.polishTitle.push(
                { role: 'user', content: `Polish this title: "${titleText}"` },
                { role: 'assistant', content: polished }
            );
            updateSessionStatus();

            if (polished !== titleText) {
                title.value = polished;
                new Notice("✅ Title polished");
                console.log("[Risk Form] Title updated:", polished);
            } else {
                new Notice("✓ Title already meets standards");
            }

        } catch (e) {
            console.error("[Risk Form] Polish failed:", e);
            new Notice(`⚠️ Polish failed: ${e.message || "Unknown error"}`);
        } finally {
            btnPolishTitle.disabled = !agentStatus.availableAgents.polishTitle;
            btnPolishTitle.textContent = "✨ Polish Title";
        }
    });

    // Enhanced If-Then-So Generator
    btnGenIfThen.addEventListener("click", async () => {
        const api = window.RAGAgentManager || window.claudeAgent;

        if (!api) {
            new Notice("❌ RAG Agent Manager not available. Enable plugin.");
            return;
        }

        // Find agent using flexible matching
        const agents = api.listAgents();
        const agent = agents.find(a => {
            const name = (a.name || "").toLowerCase();
            const id = (a.id || "").toLowerCase();
            return REQUIRED_AGENTS['if-then-so'].pattern.test(name) ||
                   REQUIRED_AGENTS['if-then-so'].pattern.test(id) ||
                   id === REQUIRED_AGENTS['if-then-so'].fallback;
        });

        if (!agent) {
            new Notice("❌ If-Then-So agent not found. Configure in plugin settings.");
            return;
        }

        const payload = {
            title: (title.value || "").trim(),
            description: (description.value || "").trim(),
            causes: (causeList.value || "").trim(),
            consequences: (consequenceText.value || "").trim(),
            category: categorySel.value,
            programContext: {
                programName: programName,
                contractValueK: contractValueK,
                currency: currency,
                riskMethod: riskMethod
            }
        };

        // Fallback composition
        const localCompose = () => {
            const t = s => (s || "").trim().replace(/\s+/g, " ");
            const causes = t(payload.causes).split(/\n|,/).filter(c => c.trim());
            const causeClause = causes.length > 0
                ? causes.map(c => c.replace(/^[-*]\s*/, "").trim()).join(", or ")
                : "key preconditions persist";
            const event = t(payload.description) || "the risk event occurs";
            const consText = t(payload.consequences);
            const consequences = consText.split(/\n|,/).filter(c => c.trim());
            const consClause = consequences.length > 0
                ? consequences.map(c => c.replace(/^[-*]\s*/, "").trim()).join("; ")
                : "adverse impacts on schedule, cost, or performance";

            return `IF ${causeClause}, THEN ${event}, SO ${consClause}.`;
        };

        try {
            btnGenIfThen.disabled = true;
            btnGenIfThen.textContent = "Generating...";

            console.log("[Risk Form] Generating If-Then-So with agent:", agent.id);

            // Use executeAgent with conversation history
            const context = {
                conversationHistory: conversationState.ifThenSo.slice(-3).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            };

            const result = await api.executeAgent(agent.id, JSON.stringify(payload), context);
            let statement = result.answer || result.response || result;
            if (typeof statement !== 'string') {
                statement = String(statement);
            }
            statement = statement.trim();

            // Try to extract IF...THEN...SO pattern if response is verbose
            const patternMatch = statement.match(/IF\s+.+?\s+THEN\s+.+?\s+SO\s+.+?\./i);
            if (patternMatch) {
                statement = patternMatch[0];
            }

            // Track conversation
            conversationState.ifThenSo.push(
                { role: 'user', content: 'Generate If-Then-So statement' },
                { role: 'assistant', content: statement || localCompose() }
            );
            updateSessionStatus();

            ifThenSo.value = statement || localCompose();
            new Notice("✅ If–Then–So generated");

        } catch (e) {
            console.error("[Risk Form] If-Then-So generation error:", e);
            new Notice(`⚠️ Generation failed: ${e.message}. Using fallback.`);
            ifThenSo.value = localCompose();
        } finally {
            btnGenIfThen.disabled = !agentStatus.availableAgents.ifThenSo;
            btnGenIfThen.textContent = "🤖 Generate If–Then–So";
        }
    });

    // Enhanced Mitigation Suggester with Robust JSON Parsing
    btnSuggestMiti.addEventListener("click", async () => {
        const api = window.RAGAgentManager || window.claudeAgent;

        if (!api) {
            new Notice("❌ RAG Agent Manager not available. Enable plugin.");
            return;
        }

        // Find agent using flexible matching
        const agents = api.listAgents();
        const agent = agents.find(a => {
            const name = (a.name || "").toLowerCase();
            const id = (a.id || "").toLowerCase();
            return REQUIRED_AGENTS['suggest-miti'].pattern.test(name) ||
                   REQUIRED_AGENTS['suggest-miti'].pattern.test(id) ||
                   id === REQUIRED_AGENTS['suggest-miti'].fallback;
        });

        if (!agent) {
            new Notice("❌ Mitigation suggester agent not found. Configure in plugin settings.");
            return;
        }

        const L = numVal(likeSel);
        const I = numVal(impSel);

        const payload = {
            title: (title.value || "").trim(),
            description: (description.value || "").trim(),
            causes: (causeList.value || "").trim(),
            consequences: (consequenceText.value || "").trim(),
            category: categorySel.value,
            currentLikelihood: L,
            currentImpact: I,
            riskScore: L * I,
            existingMitigations: state.mitigations.map(m => ({
                description: m.description,
                targetDimension: m.targetDimension
            })),
            programContext: {
                programName: programName,
                contractValueK: contractValueK,
                currency: currency,
                riskMethod: riskMethod,
                reviewCadence: reviewCadence,
                org: org,
                impactThresholds: impactThresholds
            }
        };

        try {
            btnSuggestMiti.disabled = true;
            btnSuggestMiti.textContent = "Thinking...";

            console.log("[Risk Form] Requesting mitigation suggestions with agent:", agent.id);

            // Use executeAgent with conversation history
            const context = {
                conversationHistory: conversationState.mitigations.slice(-3).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            };

            const result = await api.executeAgent(agent.id, JSON.stringify(payload), context);
            const responseText = result.answer || result.response || result;

            console.log("[Risk Form] Raw result:", responseText);

            // ✨ ROBUST JSON PARSING ✨
            let suggestions = [];

            if (typeof responseText === "string") {
                let jsonText = responseText.trim();

                // Remove markdown code blocks
                jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();

                // Try to find JSON array in the text using regex
                const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    jsonText = arrayMatch[0];
                }

                try {
                    const parsed = JSON.parse(jsonText);
                    suggestions = Array.isArray(parsed) ? parsed : [parsed];
                } catch (parseError) {
                    console.warn("[Risk Form] JSON parse failed, trying pattern extraction:", parseError);

                    // Fallback: extract individual suggestion objects using pattern matching
                    const suggestionPattern = /{[^}]*"description"[^}]*}/g;
                    const matches = jsonText.match(suggestionPattern);
                    if (matches) {
                        suggestions = matches.map(m => {
                            try { return JSON.parse(m); }
                            catch { return null; }
                        }).filter(Boolean);
                    }
                }
            } else if (Array.isArray(responseText)) {
                suggestions = responseText;
            } else if (typeof responseText === 'object') {
                suggestions = [responseText];
            }

            // Validate and normalize structure
            suggestions = suggestions.map((s, idx) => ({
                description: s.description || `Suggested mitigation ${idx + 1}`,
                priority: s.priority || "Medium",
                dimension: s.dimension || s.targetDimension || "Both",
                reduction: {
                    probability: parseInt(s.reduction?.probability || 0),
                    impact: parseInt(s.reduction?.impact || 0)
                },
                estimatedCost: parseFloat(s.estimatedCost || 0),
                estimatedEffort: parseFloat(s.estimatedEffort || 0),
                rationale: s.rationale || "AI-suggested mitigation"
            }));

            if (suggestions.length === 0) {
                new Notice("⚠️ No suggestions generated");
                return;
            }

            console.log("[Risk Form] Parsed suggestions:", suggestions);

            // Track conversation
            conversationState.mitigations.push(
                { role: 'user', content: 'Suggest mitigations' },
                { role: 'assistant', content: JSON.stringify(suggestions) }
            );
            updateSessionStatus();

            // ✨ ENHANCED MODAL WITH "ADD ALL" BUTTON ✨
            const modal = document.createElement("div");
            modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 24px;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      `;

            const overlay = document.createElement("div");
            overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999;
      `;

            const closeModal = () => {
                document.body.removeChild(modal);
                document.body.removeChild(overlay);
            };

            overlay.addEventListener("click", closeModal);

            modal.innerHTML = `
        <h2 style="margin-top: 0; color: var(--text-accent);">💡 Suggested Mitigations (${suggestions.length})</h2>
        <p style="opacity: 0.8; margin-bottom: 20px;">Review these AI-generated suggestions and click "Add" to include them in your mitigation plan.</p>
      `;

            // Track which suggestions have been added
            const addedSuggestions = new Set();

            suggestions.forEach((s, idx) => {
                const card = document.createElement("div");
                card.style.cssText = `
          border: 1px solid var(--background-modifier-border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background: var(--background-primary-alt);
          transition: all 0.2s;
        `;

                card.addEventListener('mouseenter', () => {
                    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.boxShadow = 'none';
                });

                const priorityColor = s.priority === "High" ? "#dc3545" : s.priority === "Medium" ? "#ff9800" : "#4caf50";

                // Calculate ROI
                const delta = s.reduction.probability + s.reduction.impact;
                const roi = s.estimatedCost > 0 ? (delta / s.estimatedCost).toFixed(2) : (delta > 0 ? "∞" : "0");

                card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 1em;">Suggestion ${idx + 1}</h3>
            <span style="background: ${priorityColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600;">
              ${s.priority}
            </span>
          </div>
          <p style="margin: 8px 0; line-height: 1.5;"><strong>Action:</strong> ${s.description}</p>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 12px 0; font-size: 0.9em;">
            <div><strong>Target:</strong> ${s.dimension}</div>
            <div><strong>Reduction:</strong> P↓${s.reduction.probability}, I↓${s.reduction.impact}</div>
            <div><strong>Cost:</strong> ${currency}${s.estimatedCost}K</div>
            <div><strong>Effort:</strong> ${s.estimatedEffort}hrs</div>
            <div><strong>ROI:</strong> ${roi}</div>
            <div></div>
          </div>
          <p style="margin: 8px 0; font-size: 0.9em; opacity: 0.8;"><strong>Rationale:</strong> ${s.rationale}</p>
          <button class="add-suggestion-btn" data-idx="${idx}" style="
            padding: 6px 16px;
            border-radius: 6px;
            border: 1px solid var(--interactive-accent);
            background: var(--interactive-accent);
            color: white;
            cursor: pointer;
            font-weight: 600;
            margin-top: 8px;
            transition: all 0.2s;
          ">➕ Add This Mitigation</button>
        `;

                modal.appendChild(card);
            });

            // Add All button
            const actionButtons = document.createElement("div");
            actionButtons.style.cssText = "display: flex; gap: 12px; margin-top: 20px;";

            const addAllBtn = document.createElement("button");
            addAllBtn.textContent = `➕ Add All ${suggestions.length} Mitigations`;
            addAllBtn.style.cssText = `
        padding: 10px 20px;
        border-radius: 6px;
        border: 1px solid var(--interactive-accent);
        background: var(--interactive-accent);
        color: white;
        cursor: pointer;
        font-weight: 600;
        flex: 1;
      `;
            addAllBtn.addEventListener("click", () => {
                suggestions.forEach((s, idx) => {
                    if (!addedSuggestions.has(idx)) {
                        addSuggestion(s, idx);
                    }
                });
                new Notice(`✅ Added all ${suggestions.length} mitigations`);
                closeModal();
            });

            const closeBtn = document.createElement("button");
            closeBtn.textContent = "Close";
            closeBtn.style.cssText = `
        padding: 10px 20px;
        border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
        cursor: pointer;
        flex: 1;
      `;
            closeBtn.addEventListener("click", closeModal);

            actionButtons.appendChild(addAllBtn);
            actionButtons.appendChild(closeBtn);
            modal.appendChild(actionButtons);

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            // Helper function to add a suggestion
            function addSuggestion(s, idx) {
                const newId = "MIT-" + String(Date.now()).slice(-6) + "-" + idx;

                const miti = {
                    id: newId,
                    description: s.description,
                    owner: OWNER_VALUES[0] || "Unassigned",
                    status: "Not Started",
                    dueDate: "",
                    priority: s.priority,
                    targetDimension: s.dimension,
                    plannedReduction: {
                        probability: s.reduction.probability || 0,
                        impact: s.reduction.impact || 0
                    },
                    actualReduction: { probability: 0, impact: 0 },
                    costK: s.estimatedCost || 0,
                    effortHours: s.estimatedEffort || 0,
                    dependencies: [],
                    taskLink: "",
                    notes: s.rationale || ""
                };

                state.mitigations.push(miti);
                addedSuggestions.add(idx);
                renderMitigationTable();
                calcMetrics();
                validateForm();
            }

            // Add click handlers for individual add buttons
            modal.querySelectorAll(".add-suggestion-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const idx = parseInt(btn.getAttribute("data-idx"));
                    const s = suggestions[idx];

                    addSuggestion(s, idx);

                    btn.textContent = "✅ Added";
                    btn.disabled = true;
                    btn.style.opacity = "0.6";
                    btn.style.cursor = "not-allowed";

                    new Notice(`✅ Added: ${s.description.substring(0, 50)}...`);
                });
            });

            new Notice(`💡 ${suggestions.length} mitigation suggestion(s) received`);

        } catch (e) {
            console.error("[Risk Form] Suggestion failed:", e);
            new Notice(`⚠️ Suggestion failed: ${e.message || "Unknown error"}`);
        } finally {
            btnSuggestMiti.disabled = !agentStatus.availableAgents.mitigationSuggester;
            btnSuggestMiti.textContent = "💡 Suggest Mitigations";
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    calcMetrics();
    renderMitigationTable();
    validateForm();
    updateSessionStatus();

    // Generate initial YAML preview
    const { yaml } = genYAML();
    outArea.value = yaml;

    dv.container.appendChild(root);
})();
