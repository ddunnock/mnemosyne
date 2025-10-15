.
├── README.md
├── data
│   └── rag_chunks
│       ├── rag_chunks_assessment.json
│       ├── rag_chunks_complete.json
│       ├── rag_chunks_definitions.json
│       ├── rag_chunks_figures.json
│       ├── rag_chunks_handling.json
│       ├── rag_chunks_roles.json
│       └── rag_migration_schema.json
├── docs
│   ├── API.md
│   ├── SETUP.md
│   ├── TESTING.md
│   └── USAGE.md
├── esbuild.config.mjs
├── main.js
├── package-lock.json
├── package.json
├── quickStart.sh
├── rag-agent-manager.iml
├── src
│   ├── agents
│   │   ├── agentExecutor.ts
│   │   ├── agentManager.ts
│   │   ├── templates.ts
│   │   └── types.ts
│   ├── constants.ts
│   ├── encryption
│   │   └── keyManager.ts
│   ├── integration
│   │   ├── dataviewAPI.ts
│   │   └── publicAPI.ts
│   ├── llm
│   │   ├── anthropic.ts
│   │   ├── base.ts
│   │   ├── llmManager.ts
│   │   └── openai.ts
│   ├── main.ts
│   ├── manifest.json
│   ├── rag
│   │   ├── embeddings.ts
│   │   ├── ingestor.ts
│   │   ├── retriever.ts
│   │   ├── types.ts
│   │   └── vectorStore.ts
│   ├── settings.ts
│   ├── types
│   │   └── index.ts
│   └── ui
│       ├── agentBuilderModal.ts
│       ├── components.ts
│       └── settingsTab.ts
├── styles
│   └── main.css
├── tsconfig.json
├── version-bump.mjs
└── versions.json

13 directories, 46 files