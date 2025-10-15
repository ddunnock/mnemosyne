# Testing Guide - Phase 0 & 1

This guide will help you verify that Phase 0 and Phase 1 are set up correctly.

## Phase 0: Prerequisites Verification

### 1. Check Node.js and npm

```bash
node --version
# Expected: v16.0.0 or higher

npm --version
# Expected: 8.0.0 or higher
```

### 2. Verify Git

```bash
git --version
# Expected: Any recent version
```

### 3. Confirm Obsidian Installation

- Open Obsidian
- Check version: Settings → About → App version
- Expected: 1.4.0 or higher

## Phase 1: Project Setup Verification

### 1. Verify Project Structure

Run this command in your project root:

```bash
ls -la
```

**Expected files and folders:**
- ✅ `src/` directory with subdirectories
- ✅ `data/rag_chunks/` directory
- ✅ `styles/` directory
- ✅ `docs/` directory
- ✅ `package.json`
- ✅ `tsconfig.json`
- ✅ `manifest.json`
- ✅ `esbuild.config.mjs`
- ✅ `.gitignore`
- ✅ `README.md`

### 2. Verify Dependencies Installed

```bash
npm list --depth=0
```

**Expected key packages:**
- ✅ `obsidian`
- ✅ `typescript`
- ✅ `esbuild`
- ✅ `@anthropic-ai/sdk`
- ✅ `openai`
- ✅ `crypto-js`
- ✅ `@xenova/transformers`

### 3. Test TypeScript Compilation

```bash
npm run build
```

**Expected output:**
```
✓ src/main.ts compiled successfully
✓ main.js created
✓ manifest.json valid
```

**Expected result:**
- ✅ `main.js` file created in project root
- ✅ No TypeScript compilation errors
- ✅ File size > 0 bytes

### 4. Verify main.js Content

```bash
head -20 main.js
```

**Expected:**
- Should see the banner comment at the top
- Should see compiled JavaScript code
- No error messages

### 5. Test Development Mode

```bash
npm run dev
```

**Expected output:**
```
[watch] build finished, watching for changes...
```

- ✅ No errors in console
- ✅ Build watches for file changes
- ✅ Press Ctrl+C to stop

### 6. Verify Plugin Manifest

```bash
cat manifest.json
```

**Expected content:**
```json
{
  "id": "risk-management-rag",
  "name": "Risk Management RAG Assistant",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  ...
}
```

## Testing in Obsidian

### 1. Create Test Vault

1. Open Obsidian
2. Create a new vault named "RAG-Test-Vault"
3. Close Obsidian

### 2. Create Symlink

**On Mac/Linux:**
```bash
cd /path/to/RAG-Test-Vault/.obsidian/plugins/
ln -s /path/to/obsidian-risk-management-rag risk-management-rag
```

**On Windows (Run as Administrator):**
```powershell
cd C:\path\to\RAG-Test-Vault\.obsidian\plugins\
mklink /D risk-management-rag C:\path\to\obsidian-risk-management-rag
```

### 3. Verify Symlink

```bash
ls -la
```

**Expected:**
- ✅ `risk-management-rag` appears as a link/shortcut

### 4. Enable Plugin in Obsidian

1. Open Obsidian
2. Open your RAG-Test-Vault
3. Go to Settings → Community Plugins
4. Turn OFF "Restricted Mode" (if on)
5. Click "Reload Plugins" button
6. Find "Risk Management RAG Assistant" in the list
7. Toggle it ON

**Expected results:**
- ✅ Plugin appears in the list
- ✅ No error notifications
- ✅ Notice appears: "Risk Management RAG Assistant loaded! Open settings to configure your first agent."

### 5. Check Developer Console

1. In Obsidian, press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. Go to Console tab

**Expected output:**
```
Loading Risk Management RAG Assistant
Managers initialized
Public API exposed to window.riskManagementRAG
Risk Management RAG Assistant loaded successfully
```

**Should NOT see:**
- ❌ Any error messages in red
- ❌ "Failed to load plugin" messages

### 6. Test Plugin Commands

1. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (Mac)
2. Type "Risk Management"

**Expected:**
- ✅ See commands like:
    - "Risk Management RAG Assistant: Open Settings"
    - "Risk Management RAG Assistant: Quick Query"
    - "Risk Management RAG Assistant: Ingest RAG Chunks"
    - "Risk Management RAG Assistant: Test Agent"

3. Try the "Open Settings" command

**Expected:**
- ✅ Opens Settings window
- ✅ Plugin should appear in Community Plugins section

### 7. Verify Public API

In the Developer Console, type:

```javascript
window.riskManagementRAG
```

**Expected output:**
```javascript
{
  version: "0.1.0",
  getAgent: ƒ,
  listAgents: ƒ,
  query: ƒ,
  isReady: ƒ,
  getVersion: ƒ
}
```

Try these commands:

```javascript
// Should return version
window.riskManagementRAG.getVersion()
// Expected: "0.1.0"

// Should return empty array (no agents yet)
window.riskManagementRAG.listAgents()
// Expected: []

// Should return false (not fully implemented yet)
window.riskManagementRAG.isReady()
// Expected: false
```

### 8. Test Hot Reload

1. Keep Obsidian open
2. Keep `npm run dev` running
3. Edit `src/constants.ts` and change `PLUGIN_NAME`:

```typescript
export const PLUGIN_NAME = 'Risk Management RAG Assistant [DEV]';
```

4. Save the file
5. In Obsidian:
    - Disable the plugin
    - Re-enable the plugin
    - Check the notice message

**Expected:**
- ✅ Notice shows updated name with "[DEV]"
- ✅ No need to restart Obsidian

## Troubleshooting

### Plugin Doesn't Appear

**Problem:** Plugin doesn't show up in Community Plugins list

**Solutions:**
1. Verify symlink is correct: `ls -la .obsidian/plugins/`
2. Check manifest.json is present in plugin folder
3. Check main.js is present and not empty
4. Click "Reload Plugins" in Settings
5. Restart Obsidian

### Build Errors

**Problem:** `npm run build` fails with errors

**Solutions:**
1. Delete `node_modules/` and run `npm install` again
2. Check Node.js version: `node --version`
3. Clear npm cache: `npm cache clean --force`
4. Check for TypeScript errors in your code

### TypeScript Errors

**Problem:** Red squiggly lines in VS Code

**Solutions:**
1. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
2. Check `tsconfig.json` is valid JSON
3. Ensure Obsidian types are installed: `npm install obsidian`
4. Install VS Code TypeScript extension if not present

### Symlink Fails on Windows

**Problem:** `mklink` command fails

**Solutions:**
1. Run PowerShell or Command Prompt as Administrator
2. Enable Developer Mode in Windows Settings
3. Alternative: Copy files instead of symlink (will need to rebuild each time)

### Plugin Loads but Shows Errors

**Problem:** Plugin loads but console shows errors

**Solutions:**
1. Check all import paths are correct
2. Ensure all dependencies are installed
3. Verify TypeScript compilation succeeded
4. Check for typos in file names

## Verification Checklist

Before proceeding to Phase 2, confirm:

- [ ] ✅ All dependencies installed without errors
- [ ] ✅ TypeScript compiles without errors
- [ ] ✅ main.js is generated and not empty
- [ ] ✅ Plugin appears in Obsidian
- [ ] ✅ Plugin can be enabled/disabled
- [ ] ✅ No errors in developer console
- [ ] ✅ Plugin commands are accessible
- [ ] ✅ Public API is exposed to window
- [ ] ✅ Hot reload works with npm run dev
- [ ] ✅ .gitignore is configured correctly

## Success Criteria

Your Phase 0 and Phase 1 setup is complete when:

1. **✅ Plugin loads in Obsidian** without errors
2. **✅ Developer console shows** success messages
3. **✅ Commands are accessible** via Command Palette
4. **✅ Public API is exposed** and callable from console
5. **✅ Hot reload works** during development
6. **✅ Git is configured** to ignore sensitive files

## Next Steps

Once all verification steps pass:

1. Commit your work:
```bash
git add .
git commit -m "Complete Phase 0 and Phase 1 setup"
```

2. Proceed to Phase 2: API Key Encryption

3. Refer to the main README for the full roadmap

## Getting Help

If you encounter issues:

1. Check the console for detailed error messages
2. Review the error in context of what you just changed
3. Consult the Obsidian Plugin API documentation
4. Check TypeScript documentation for type errors
5. Review the project's GitHub issues

---

**Remember:** The goal of Phase 1 is to establish a solid foundation. Take time to understand how the pieces fit together before moving to Phase 2.