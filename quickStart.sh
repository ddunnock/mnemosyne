#!/bin/bash

# Risk Management RAG Plugin - Quick Start Script
# This script sets up the entire Phase 0 and Phase 1 environment

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Risk Management RAG Plugin - Quick Start Setup         ║${NC}"
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${BLUE}[1/8] Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js v16+${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js version must be 16 or higher. Current: $(node --version)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ git not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ git $(git --version | cut -d' ' -f3) found${NC}"

echo ""

# Step 2: Initialize project
echo -e "${BLUE}[2/8] Initializing project...${NC}"

if [ ! -f "package.json" ]; then
    npm init -y > /dev/null 2>&1
    echo -e "${GREEN}✓ package.json created${NC}"
else
    echo -e "${GREEN}✓ package.json already exists${NC}"
fi

if [ ! -d ".git" ]; then
    git init > /dev/null 2>&1
    echo -e "${GREEN}✓ Git repository initialized${NC}"
else
    echo -e "${GREEN}✓ Git repository already exists${NC}"
fi

echo ""

# Step 3: Create project structure
echo -e "${BLUE}[3/8] Creating project structure...${NC}"

mkdir -p src/{encryption,llm,rag,agents,ui,integration,types}
mkdir -p data/rag_chunks
mkdir -p styles
mkdir -p docs

touch src/main.ts src/settings.ts src/constants.ts
touch src/encryption/keyManager.ts
touch src/llm/{base.ts,anthropic.ts,openai.ts,factory.ts}
touch src/rag/{vectorStore.ts,embeddings.ts,retriever.ts,ingestor.ts,types.ts}
touch src/agents/{agentManager.ts,agentExecutor.ts,templates.ts,types.ts}
touch src/ui/{settingsTab.ts,agentBuilderModal.ts,components.ts}
touch src/integration/{dataviewAPI.ts,publicAPI.ts}
touch src/types/index.ts
touch styles/main.css
touch docs/{SETUP.md,USAGE.md,API.md}

echo -e "${GREEN}✓ Project structure created${NC}"
echo ""

# Step 4: Install dependencies
echo -e "${BLUE}[4/8] Installing dependencies...${NC}"
echo -e "${BLUE}This may take a few minutes...${NC}"

npm install --save-dev \
  @types/node \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  builtin-modules \
  esbuild \
  eslint \
  obsidian \
  prettier \
  tslib \
  typescript > /dev/null 2>&1

npm install \
  @anthropic-ai/sdk \
  @xenova/transformers \
  crypto-js \
  openai > /dev/null 2>&1

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 5: Copy configuration files
echo -e "${BLUE}[5/8] Setting up configuration files...${NC}"

# Note: In real usage, these files would need to be created from the artifacts above
# For this script, we're assuming they exist

if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json configured${NC}"
fi

if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✓ tsconfig.json configured${NC}"
fi

if [ -f "manifest.json" ]; then
    echo -e "${GREEN}✓ manifest.json configured${NC}"
fi

if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✓ .gitignore configured${NC}"
fi

echo ""

# Step 6: Build project
echo -e "${BLUE}[6/8] Building project...${NC}"

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"

    if [ -f "main.js" ]; then
        FILE_SIZE=$(wc -c < "main.js")
        echo -e "${GREEN}✓ main.js created (${FILE_SIZE} bytes)${NC}"
    fi
else
    echo -e "${RED}❌ Build failed. Check for errors.${NC}"
    exit 1
fi

echo ""

# Step 7: Verify setup
echo -e "${BLUE}[7/8] Verifying setup...${NC}"

ERRORS=0

# Check essential files
for file in "src/main.ts" "src/settings.ts" "src/constants.ts" "src/types/index.ts" "manifest.json" "main.js"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check directories
for dir in "src/llm" "src/rag" "src/agents" "src/ui" "data/rag_chunks"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ $dir directory exists${NC}"
    else
        echo -e "${RED}❌ $dir directory missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Setup verification failed with $ERRORS errors${NC}"
    exit 1
fi

echo ""

# Step 8: Display next steps
echo -e "${BLUE}[8/8] Setup complete!${NC}"
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   ✓ Setup Successful!                     ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Start development server:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. Copy your RAG chunks to:"
echo "   ${GREEN}data/rag_chunks/${NC}"
echo ""
echo "3. Link plugin to Obsidian test vault:"
echo "   ${GREEN}cd /path/to/vault/.obsidian/plugins/${NC}"
echo "   ${GREEN}ln -s $(pwd) risk-management-rag${NC}"
echo ""
echo "4. Enable plugin in Obsidian:"
echo "   Settings → Community Plugins → Enable 'Risk Management RAG Assistant'"
echo ""
echo "5. Check developer console for success messages"
echo ""
echo "6. Read the testing guide:"
echo "   ${GREEN}docs/TESTING.md${NC}"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "   - README.md - Project overview"
echo "   - docs/TESTING.md - Testing guide"
echo "   - docs/SETUP.md - Detailed setup instructions"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"