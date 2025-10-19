#!/bin/bash

# Preserve Data Script for Mnemosyne Development
# This script preserves data.json and vector-store-index.json during development

PLUGIN_DATA_DIR="/Users/dunnock/projects/test-vault/.obsidian/plugins/mnemosyne"
BACKUP_DIR="/Users/dunnock/projects/mnemosyne/data-backup"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to backup data files
backup_data() {
    echo "📦 Backing up data files..."
    
    if [ -f "$PLUGIN_DATA_DIR/data.json" ]; then
        cp "$PLUGIN_DATA_DIR/data.json" "$BACKUP_DIR/data.json"
        echo "✅ Backed up data.json"
    fi
    
    if [ -f "$PLUGIN_DATA_DIR/vector-store-index.json" ]; then
        cp "$PLUGIN_DATA_DIR/vector-store-index.json" "$BACKUP_DIR/vector-store-index.json"
        echo "✅ Backed up vector-store-index.json"
    fi
}

# Function to restore data files
restore_data() {
    echo "🔄 Restoring data files..."
    
    if [ -f "$BACKUP_DIR/data.json" ]; then
        cp "$BACKUP_DIR/data.json" "$PLUGIN_DATA_DIR/data.json"
        echo "✅ Restored data.json"
    fi
    
    if [ -f "$BACKUP_DIR/vector-store-index.json" ]; then
        cp "$BACKUP_DIR/vector-store-index.json" "$PLUGIN_DATA_DIR/vector-store-index.json"
        echo "✅ Restored vector-store-index.json"
    fi
}

# Function to clean up old data files
cleanup_old_data() {
    echo "🧹 Cleaning up old data files..."
    
    # Remove any existing data files that might be stale
    rm -f "$PLUGIN_DATA_DIR/data.json"
    rm -f "$PLUGIN_DATA_DIR/vector-store-index.json"
    
    # Restore from backup
    restore_data
}

case "$1" in
    "backup")
        backup_data
        ;;
    "restore")
        restore_data
        ;;
    "cleanup")
        cleanup_old_data
        ;;
    *)
        echo "Usage: $0 {backup|restore|cleanup}"
        echo "  backup  - Backup current data files"
        echo "  restore - Restore data files from backup"
        echo "  cleanup - Clean up and restore data files"
        exit 1
        ;;
esac
