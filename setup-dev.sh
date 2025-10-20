#!/bin/bash

# Mnemosyne Development Setup Script
# This script sets up a symlink from dist/ to your Obsidian test vault

echo "🔧 Setting up Mnemosyne development environment..."

# Check if test vault path is provided
if [ -z "$1" ]; then
    echo "❌ Please provide the path to your Obsidian test vault plugins directory"
    echo "Usage: ./setup-dev.sh /path/to/your/test-vault/.obsidian/plugins"
    echo ""
    echo "Example:"
    echo "  ./setup-dev.sh ~/Documents/Obsidian-Vaults/test-vault/.obsidian/plugins"
    exit 1
fi

TEST_VAULT_PLUGINS="$1"
PLUGIN_NAME="mnemosyne"
CURRENT_DIR=$(pwd)
DIST_DIR="$CURRENT_DIR/dist"

# Check if test vault plugins directory exists
if [ ! -d "$TEST_VAULT_PLUGINS" ]; then
    echo "❌ Test vault plugins directory not found: $TEST_VAULT_PLUGINS"
    echo "Please create the directory first or check the path."
    exit 1
fi

# Create plugin directory in test vault
PLUGIN_DIR="$TEST_VAULT_PLUGINS/$PLUGIN_NAME"

# Backup existing data files if they exist
if [ -e "$PLUGIN_DIR" ]; then
    echo "📦 Backing up existing data files..."
    mkdir -p "$CURRENT_DIR/data-backup"
    
    if [ -f "$PLUGIN_DIR/data.json" ]; then
        cp "$PLUGIN_DIR/data.json" "$CURRENT_DIR/data-backup/data.json"
        echo "✅ Backed up data.json"
    fi
    
    if [ -f "$PLUGIN_DIR/vector-store-index.json" ]; then
        cp "$PLUGIN_DIR/vector-store-index.json" "$CURRENT_DIR/data-backup/vector-store-index.json"
        echo "✅ Backed up vector-store-index.json"
    fi
    
    echo "🗑️  Removing existing directory/symlink..."
    rm -rf "$PLUGIN_DIR"
fi

# Also clean up any potential conflicts in the parent directory
echo "🧹 Cleaning up any potential conflicts..."
find "$TEST_VAULT_PLUGINS" -name "*mnemosyne*" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true

# Create symlink
echo "🔗 Creating symlink from $DIST_DIR to $PLUGIN_DIR"
echo "   Source: $DIST_DIR"
echo "   Target: $PLUGIN_DIR"
echo "   Source exists: $([ -d "$DIST_DIR" ] && echo "✅ Yes" || echo "❌ No")"
echo "   Target parent exists: $([ -d "$TEST_VAULT_PLUGINS" ] && echo "✅ Yes" || echo "❌ No")"

ln -sf "$DIST_DIR" "$PLUGIN_DIR"

# Verify the symlink
if [ -L "$PLUGIN_DIR" ]; then
    echo "✅ Symlink created successfully!"
    
    # Restore data files if they were backed up
    if [ -f "$CURRENT_DIR/data-backup/data.json" ]; then
        cp "$CURRENT_DIR/data-backup/data.json" "$PLUGIN_DIR/data.json"
        echo "✅ Restored data.json"
    fi
    
    if [ -f "$CURRENT_DIR/data-backup/vector-store-index.json" ]; then
        cp "$CURRENT_DIR/data-backup/vector-store-index.json" "$PLUGIN_DIR/vector-store-index.json"
        echo "✅ Restored vector-store-index.json"
    fi
    
    echo "📁 Plugin files:"
    ls -la "$PLUGIN_DIR"
    echo ""
    echo "🚀 Development setup complete!"
    echo ""
    echo "Now you can:"
    echo "  1. Run 'npm run build' to build the plugin"
    echo "  2. Use Obsidian's hot reload plugin to automatically reload changes"
    echo "  3. Enable the Mnemosyne plugin in your test vault"
    echo ""
    echo "💡 Pro tip: Run 'npm run dev' for watch mode during development!"
    echo "💾 Data files are preserved across builds!"
else
    echo "❌ Failed to create symlink"
    exit 1
fi
