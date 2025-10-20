/**
 * Vault Ingestion Modal
 *
 * Provides a comprehensive interface for configuring and executing vault content ingestion.
 * Allows folder selection, chunking configuration, embedding options, and progress tracking.
 */

import { App, Modal, Notice, Setting, TFile, TFolder } from 'obsidian';
import RiskManagementPlugin from '../main';
import { VectorStore } from '../rag/vectorStore';
import { EmbeddingsGenerator } from '../rag/embeddings';
import { ChunkMetadata } from '../types';

export interface IngestionConfig {
    selectedFolders: string[];
    includeSubfolders: boolean;
    chunkSize: number;
    chunkOverlap: number;
    skipExistingChunks: boolean;
    filePattern: string; // regex pattern for file matching
    excludePattern: string; // regex pattern for exclusion
    batchSize: number;
}

export interface IngestionProgress {
    phase: 'scanning' | 'chunking' | 'embedding' | 'indexing' | 'complete' | 'error';
    totalFiles: number;
    processedFiles: number;
    totalChunks: number;
    processedChunks: number;
    currentFile?: string;
    currentChunk?: string;
    percentage: number;
    message: string;
    error?: string;
}

interface FileChunk {
    id: string;
    content: string;
    metadata: ChunkMetadata;
}

export class VaultIngestionModal extends Modal {
    private plugin: RiskManagementPlugin;
    private config: IngestionConfig;
    private isIngesting: boolean = false;
    private cancellationRequested: boolean = false;
    private progressCallback?: (progress: IngestionProgress) => void;
    
    // UI Elements
    private folderListContainer: HTMLElement;
    private progressContainer: HTMLElement;
    private progressBar: HTMLElement;
    private progressText: HTMLElement;
    private startButton: HTMLButtonElement;
    private cancelButton: HTMLButtonElement;
    private configContainer: HTMLElement;

    constructor(app: App, plugin: RiskManagementPlugin) {
        super(app);
        this.plugin = plugin;
        this.config = {
            selectedFolders: [''],  // Empty string means root folder
            includeSubfolders: true,
            chunkSize: 1000,
            chunkOverlap: 200,
            skipExistingChunks: true,
            filePattern: '*.md',
            excludePattern: '.obsidian/**',
            batchSize: 5
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Set modal dimensions - auto-size to fit content
        contentEl.style.width = 'auto';
        contentEl.style.minWidth = '500px';
        contentEl.style.maxWidth = '90vw';
        contentEl.style.maxHeight = '85vh';
        contentEl.style.overflow = 'auto';
        contentEl.style.padding = '20px';
        contentEl.style.boxSizing = 'border-box';
        
        // Center the modal properly
        contentEl.style.margin = 'auto';

        // Modal header
        contentEl.createEl('h2', { text: '📚 Index Vault Content', cls: 'modal-title' });
        contentEl.createEl('p', {
            text: 'Choose which folders to index for AI search and analysis. Your notes will be processed and made available to AI agents.',
            cls: 'modal-description'
        });
        
        // Add inline styles for better layout
        const style = document.createElement('style');
        style.textContent = `
            .vault-ingestion-modal {
                font-size: 13px;
                line-height: 1.4;
                width: max-content;
                min-width: 500px;
                max-width: 90vw;
            }
            
            .vault-ingestion-modal h2 {
                font-size: 20px;
                margin-bottom: 8px;
                font-weight: 600;
            }
            
            .vault-ingestion-modal h3 {
                font-size: 16px;
                margin-bottom: 12px;
                font-weight: 500;
            }
            
            .vault-ingestion-modal .setting-item {
                padding: 10px 0;
                border: none;
                margin: 0;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .vault-ingestion-modal .setting-item-info {
                flex: 1;
                min-width: 0;
            }
            
            .vault-ingestion-modal .setting-item-control {
                flex-shrink: 0;
                width: 220px;
                min-width: 220px;
            }
            
            .vault-ingestion-modal .slider {
                width: 100% !important;
                min-width: unset !important;
            }
            
            .vault-ingestion-modal .setting-item-name {
                font-weight: 500;
                margin-bottom: 4px;
                font-size: 13px;
            }
            
            .vault-ingestion-modal .setting-item-description {
                color: var(--text-muted);
                font-size: 12px;
                line-height: 1.3;
                margin-bottom: 0;
            }
            
            /* Stack on smaller screens */
            @media (max-width: 600px) {
                .vault-ingestion-modal .setting-item {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 8px;
                }
                
                .vault-ingestion-modal .setting-item-control {
                    width: 100%;
                    max-width: 100%;
                }
                
                .vault-ingestion-modal h2 {
                    font-size: 18px;
                }
                
                .vault-ingestion-modal h3 {
                    font-size: 14px;
                }
            }
            
            .vault-ingestion-modal .preset-buttons {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                margin-top: 10px;
            }
            
            .vault-ingestion-modal .preset-buttons button {
                font-size: 12px;
                padding: 6px 10px;
                flex: 1;
                min-width: 100px;
                white-space: nowrap;
            }
            
            .vault-ingestion-modal .folder-option {
                font-size: 12px;
                padding: 6px 8px;
                border-radius: 3px;
            }
            
            .vault-ingestion-modal .folder-option:hover {
                background-color: var(--background-modifier-hover);
            }
            
            .vault-ingestion-modal .modal-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .vault-ingestion-modal .modal-buttons button {
                font-size: 13px;
                padding: 8px 16px;
                white-space: nowrap;
            }
            
            @media (max-width: 500px) {
                .vault-ingestion-modal .modal-buttons {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .vault-ingestion-modal .modal-buttons button {
                    width: 100%;
                }
            }
            
            .vault-ingestion-modal .progress-bar-container {
                height: 18px;
                background-color: var(--background-modifier-border);
                border-radius: 9px;
                overflow: hidden;
            }
            
            .vault-ingestion-modal .progress-text {
                font-size: 12px;
                text-align: center;
                margin: 8px 0;
            }
            
            .vault-ingestion-modal .progress-details {
                font-size: 11px;
                max-height: 120px;
                overflow-y: auto;
                padding: 8px;
                background: var(--background-secondary);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            }
        `;
        contentEl.appendChild(style);
        contentEl.addClass('vault-ingestion-modal');

        this.createFolderSelectionSection(contentEl);
        this.createAdvancedConfigurationSection(contentEl);
        this.createProgressSection(contentEl);

        // Initially hide progress section completely
        this.progressContainer.style.display = 'none';
    }

    private createAdvancedConfigurationSection(container: HTMLElement) {
        const section = container.createDiv({ cls: 'advanced-config-section' });
        section.style.marginBottom = '20px';

        // Collapsible header
        const header = section.createDiv({ cls: 'advanced-config-header' });
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 0;
            cursor: pointer;
            border-bottom: 1px solid var(--background-modifier-border);
            margin-bottom: 16px;
        `;

        const chevron = header.createSpan({ text: '▶' });
        chevron.style.cssText = `
            transition: transform 0.2s ease;
            font-size: 12px;
            opacity: 0.7;
        `;

        const title = header.createEl('h3', { text: 'Advanced Settings' });
        title.style.cssText = `
            margin: 0;
            font-size: 14px;
            font-weight: 500;
        `;

        const subtitle = header.createSpan({ text: '(Optional - defaults work for most users)' });
        subtitle.style.cssText = `
            color: var(--text-muted);
            font-size: 12px;
            margin-left: auto;
        `;

        // Collapsible content
        this.configContainer = section.createDiv({ cls: 'advanced-config-content' });
        this.configContainer.style.cssText = `
            display: none;
            padding-top: 16px;
            width: 100%;
            box-sizing: border-box;
        `;

        // Toggle functionality
        let isExpanded = false;
        header.addEventListener('click', () => {
            isExpanded = !isExpanded;
            this.configContainer.style.display = isExpanded ? 'block' : 'none';
            chevron.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
        });

        // Advanced settings with better descriptions
        new Setting(this.configContainer)
            .setName('Chunk Size')
            .setDesc('How much text to include in each searchable piece. Larger chunks capture more context but may be less precise. Recommended: 800-1200 for most content.')
            .addSlider(slider => {
                slider.setLimits(100, 4000, 100);
                slider.setValue(this.config.chunkSize);
                slider.onChange(value => {
                    this.config.chunkSize = value;
                });
                slider.showTooltip();
            });

        new Setting(this.configContainer)
            .setName('Chunk Overlap')
            .setDesc('How much text overlaps between chunks to maintain context. Higher overlap improves search accuracy but increases processing time.')
            .addSlider(slider => {
                slider.setLimits(0, 500, 25);
                slider.setValue(this.config.chunkOverlap);
                slider.onChange(value => {
                    this.config.chunkOverlap = value;
                });
                slider.showTooltip();
            });

        // Batch size setting
        new Setting(this.configContainer)
            .setName('Batch Size')
            .setDesc('Number of chunks processed simultaneously (1-10)')
            .addSlider(slider => {
                slider.setLimits(1, 10, 1);
                slider.setValue(this.config.batchSize);
                slider.onChange(value => {
                    this.config.batchSize = value;
                });
                slider.showTooltip();
            });

        // Skip existing chunks toggle
        new Setting(this.configContainer)
            .setName('Skip Existing Chunks')
            .setDesc('Skip chunks that are already in the vector store')
            .addToggle(toggle => {
                toggle.setValue(this.config.skipExistingChunks);
                toggle.onChange(value => {
                    this.config.skipExistingChunks = value;
                });
            });

        // File pattern setting
        new Setting(this.configContainer)
            .setName('File Pattern')
            .setDesc('Pattern for files to include (glob pattern, e.g., *.md, **/*.txt)')
            .addText(text => {
                text.setValue(this.config.filePattern);
                text.onChange(value => {
                    this.config.filePattern = value;
                });
            });

        // Exclude pattern setting
        new Setting(this.configContainer)
            .setName('Exclude Pattern')
            .setDesc('Pattern for files/folders to exclude')
            .addText(text => {
                text.setValue(this.config.excludePattern);
                text.onChange(value => {
                    this.config.excludePattern = value;
                });
            });
    }

    private createFolderSelectionSection(container: HTMLElement) {
        const section = container.createDiv({ cls: 'folder-selection-section' });
        section.style.marginBottom = '24px';
        
        // Section header
        const header = section.createDiv();
        header.style.marginBottom = '16px';
        
        const title = header.createEl('h3', { text: 'Choose Content to Index' });
        title.style.cssText = `
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 500;
        `;
        
        const description = header.createEl('p', {
            text: 'Select which folders to include. All markdown files in selected folders will be processed for AI search.'
        });
        description.style.cssText = `
            margin: 0;
            color: var(--text-muted);
            font-size: 13px;
            line-height: 1.4;
        `;
        
        // Quick action buttons - more prominent
        const quickButtons = section.createDiv({ cls: 'folder-quick-buttons' });
        quickButtons.style.cssText = `
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        `;
        
        const selectEntireVaultBtn = quickButtons.createEl('button', {
            text: '📚 Index Entire Vault',
            cls: 'mod-cta'
        });
        selectEntireVaultBtn.style.cssText = `
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 500;
        `;
        selectEntireVaultBtn.onclick = () => {
            this.selectAllFolders();
            this.startIngestion();
        };
        
        const selectFoldersBtn = quickButtons.createEl('button', {
            text: '📁 Choose Specific Folders',
            cls: 'mod-muted'
        });
        selectFoldersBtn.style.cssText = `
            padding: 12px 20px;
            font-size: 14px;
        `;
        
        // Folder list container - initially hidden
        const folderListWrapper = section.createDiv();
        folderListWrapper.style.display = 'none';
        
        const folderInstructions = folderListWrapper.createEl('p', {
            text: 'Select the folders you want to index:'
        });
        folderInstructions.style.cssText = `
            margin: 16px 0 12px 0;
            font-size: 13px;
            font-weight: 500;
        `;
        
        // Include subfolders toggle - moved here
        const includeSubfoldersContainer = folderListWrapper.createDiv();
        includeSubfoldersContainer.style.marginBottom = '12px';
        
        new Setting(includeSubfoldersContainer)
            .setName('Include Subfolders')
            .setDesc('Process all subfolders within selected folders')
            .addToggle(toggle => {
                toggle.setValue(this.config.includeSubfolders);
                toggle.onChange(value => {
                    this.config.includeSubfolders = value;
                    this.updateFolderList(); // Refresh file counts
                });
            });
        
        // Folder selection controls
        const selectionControls = folderListWrapper.createDiv({ cls: 'folder-selection-controls' });
        selectionControls.style.cssText = `
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
        `;
        
        const selectAllBtn = selectionControls.createEl('button', {
            text: 'Select All',
            cls: 'mod-muted'
        });
        selectAllBtn.style.fontSize = '12px';
        selectAllBtn.onclick = () => this.selectAllFolders();
        
        const clearBtn = selectionControls.createEl('button', {
            text: 'Clear All',
            cls: 'mod-muted'
        });
        clearBtn.style.fontSize = '12px';
        clearBtn.onclick = () => this.clearFolderSelection();
        
        // Folder list container
        this.folderListContainer = folderListWrapper.createDiv({ cls: 'folder-list-container' });
        this.folderListContainer.style.cssText = `
            max-height: 180px;
            overflow-y: auto;
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            padding: 8px;
            background: var(--background-secondary);
            font-size: 12px;
        `;
        
        // Show selected folders action
        const selectedFoldersAction = folderListWrapper.createDiv();
        selectedFoldersAction.style.cssText = `
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--background-modifier-border);
        `;
        
        const indexSelectedBtn = selectedFoldersAction.createEl('button', {
            text: '✨ Index Selected Folders',
            cls: 'mod-cta'
        });
        indexSelectedBtn.style.cssText = `
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
        `;
        indexSelectedBtn.onclick = () => this.startIngestion();
        
        // Toggle folder list visibility
        let showingFolderList = false;
        selectFoldersBtn.onclick = () => {
            showingFolderList = !showingFolderList;
            folderListWrapper.style.display = showingFolderList ? 'block' : 'none';
            selectFoldersBtn.textContent = showingFolderList ? '🔼 Hide Folder Selection' : '📁 Choose Specific Folders';
            
            if (showingFolderList && !this.folderListContainer.hasChildNodes()) {
                this.updateFolderList();
            }
        };
    }

    private createProgressSection(container: HTMLElement) {
        this.progressContainer = container.createDiv({ cls: 'progress-section' });
        this.progressContainer.style.cssText = `
            display: none;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid var(--background-modifier-border);
        `;
        
        const progressHeader = this.progressContainer.createDiv();
        progressHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        `;
        
        const progressTitle = progressHeader.createEl('h3', { text: 'Indexing Progress' });
        progressTitle.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 500;
        `;
        
        // Cancel button - only shown during ingestion
        this.cancelButton = progressHeader.createEl('button', {
            text: '⏹️ Cancel',
            cls: 'mod-warning'
        });
        this.cancelButton.style.cssText = `
            padding: 6px 12px;
            font-size: 12px;
            display: none;
        `;
        this.cancelButton.onclick = () => this.cancelIngestion();

        // Progress bar
        const progressBarContainer = this.progressContainer.createDiv({ cls: 'progress-bar-container' });
        progressBarContainer.style.cssText = `
            background-color: var(--background-modifier-border);
            height: 24px;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 12px;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        `;

        this.progressBar = progressBarContainer.createDiv({ cls: 'progress-bar' });
        this.progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, var(--interactive-accent), var(--interactive-accent-hover));
            transition: width 0.3s ease;
            border-radius: 12px;
        `;

        // Progress text
        this.progressText = this.progressContainer.createDiv({ cls: 'progress-text' });
        this.progressText.style.cssText = `
            font-size: 14px;
            color: var(--text-normal);
            text-align: center;
            margin-bottom: 12px;
            font-weight: 500;
        `;

        // Progress details
        const progressDetails = this.progressContainer.createDiv({ cls: 'progress-details' });
        progressDetails.style.cssText = `
            font-size: 12px;
            color: var(--text-muted);
            background: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            padding: 12px;
            border-radius: 6px;
            max-height: 120px;
            overflow-y: auto;
            font-family: var(--font-monospace);
        `;
        
        this.progressCallback = (progress: IngestionProgress) => {
            this.updateProgress(progress, progressDetails);
        };
        
        // Create dummy buttons for the interface - they'll be created by the modal anyway
        this.startButton = container.createEl('button');
        this.startButton.style.display = 'none';
    }

    private updateFolderList() {
        this.folderListContainer.empty();

        const vault = this.app.vault;
        const rootFolder = vault.getRoot();

        // Add root folder option
        this.createFolderOption(this.folderListContainer, '', 'Root (entire vault)', 0);

        // Add all folders
        this.addFolderOptions(this.folderListContainer, rootFolder, 1);
    }

    private addFolderOptions(container: HTMLElement, folder: TFolder, depth: number) {
        const children = folder.children
            .filter(child => child instanceof TFolder)
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const child of children as TFolder[]) {
            // Skip .obsidian and other hidden folders
            if (child.name.startsWith('.')) continue;

            this.createFolderOption(container, child.path, child.name, depth);
            this.addFolderOptions(container, child, depth + 1);
        }
    }

    private createFolderOption(container: HTMLElement, path: string, displayName: string, depth: number) {
        const option = container.createDiv({ cls: 'folder-option' });
        option.style.display = 'flex';
        option.style.alignItems = 'center';
        option.style.padding = '8px';
        option.style.marginLeft = `${depth * 20}px`;
        option.style.cursor = 'pointer';
        option.style.borderRadius = '4px';

        const checkbox = option.createEl('input', { type: 'checkbox' });
        checkbox.checked = this.config.selectedFolders.includes(path);
        checkbox.style.marginRight = '8px';

        const folderIcon = option.createSpan({ text: '📁' });
        folderIcon.style.marginRight = '8px';

        const label = option.createSpan({ text: displayName });

        // Add file count
        const fileCount = this.getFileCount(path);
        const countSpan = option.createSpan({ text: `(${fileCount} files)` });
        countSpan.style.marginLeft = 'auto';
        countSpan.style.color = 'var(--text-muted)';
        countSpan.style.fontSize = '0.9em';

        // Event handlers
        option.onmouseover = () => {
            option.style.backgroundColor = 'var(--background-modifier-hover)';
        };
        option.onmouseout = () => {
            option.style.backgroundColor = '';
        };

        checkbox.onchange = () => {
            if (checkbox.checked) {
                if (!this.config.selectedFolders.includes(path)) {
                    this.config.selectedFolders.push(path);
                }
            } else {
                this.config.selectedFolders = this.config.selectedFolders.filter(p => p !== path);
            }
        };

        option.onclick = (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.onchange?.(e as any);
            }
        };
    }

    private getFileCount(folderPath: string): number {
        const vault = this.app.vault;
        
        if (folderPath === '') {
            // Root folder - count all markdown files
            return vault.getMarkdownFiles().length;
        }

        const folder = vault.getAbstractFileByPath(folderPath);
        if (!(folder instanceof TFolder)) return 0;

        let count = 0;
        
        const countFiles = (f: TFolder) => {
            for (const child of f.children) {
                if (child instanceof TFile && child.extension === 'md') {
                    count++;
                } else if (child instanceof TFolder && this.config.includeSubfolders) {
                    countFiles(child);
                }
            }
        };

        countFiles(folder);
        return count;
    }

    private selectAllFolders() {
        this.config.selectedFolders = [''];
        this.updateFolderList();
    }

    private clearFolderSelection() {
        this.config.selectedFolders = [];
        this.updateFolderList();
    }

    private async startIngestion() {
        if (this.isIngesting) return;

        // Validation
        if (this.config.selectedFolders.length === 0) {
            new Notice('Please select at least one folder to ingest');
            return;
        }

        try {
            this.isIngesting = true;
            this.cancellationRequested = false;
            
            // Update UI - show progress and hide main interface
            this.progressContainer.style.display = 'block';
            this.cancelButton.style.display = 'inline-block';
            
            // Hide the main selection interface during processing
            const folderSection = this.contentEl.querySelector('.folder-selection-section') as HTMLElement;
            const advancedSection = this.contentEl.querySelector('.advanced-config-section') as HTMLElement;
            if (folderSection) folderSection.style.display = 'none';
            if (advancedSection) advancedSection.style.display = 'none';

            await this.performIngestion();

        } catch (error: any) {
            console.error('Ingestion failed:', error);
            new Notice(`Ingestion failed: ${error.message}`);
            
            if (this.progressCallback) {
                this.progressCallback({
                    phase: 'error',
                    totalFiles: 0,
                    processedFiles: 0,
                    totalChunks: 0,
                    processedChunks: 0,
                    percentage: 0,
                    message: 'Ingestion failed',
                    error: error.message
                });
            }
        } finally {
            this.isIngesting = false;
            this.cancelButton.style.display = 'none';
            
            // Show the main interface again
            const folderSection = this.contentEl.querySelector('.folder-selection-section') as HTMLElement;
            const advancedSection = this.contentEl.querySelector('.advanced-config-section') as HTMLElement;
            if (folderSection) folderSection.style.display = 'block';
            if (advancedSection) advancedSection.style.display = 'block';
            
            // Hide progress section after a short delay to allow users to see completion message
            setTimeout(() => {
                if (this.progressContainer) {
                    this.progressContainer.style.display = 'none';
                }
            }, 2000); // Hide after 2 seconds
        }
    }

    private async performIngestion() {
        // Initialize vector store and embeddings
        const vectorStore = new VectorStore(this.app);
        await vectorStore.initialize();

        const embeddings = new EmbeddingsGenerator();
        
        // Initialize embeddings with API key from plugin settings
        const openAIConfig = this.plugin.settings.llmConfigs?.find(
            (config: any) => config.provider === 'openai' && config.enabled
        );
        
        if (!openAIConfig) {
            throw new Error('No OpenAI configuration found. Please configure an OpenAI provider for embeddings.');
        }
        
        // Ensure master password is loaded before decrypting API key
        if (this.plugin.settingsController) {
            const passwordLoaded = await this.plugin.settingsController.ensureMasterPasswordLoaded();
            if (!passwordLoaded) {
                throw new Error('Master password is required to decrypt API keys. Please set up your master password in settings.');
            }
        } else if (!this.plugin.keyManager.hasMasterPassword()) {
            throw new Error('Master password not loaded. Please check your settings.');
        }
        
        // Decrypt API key
        const encryptedData = JSON.parse(openAIConfig.encryptedApiKey);
        const apiKey = this.plugin.keyManager.decrypt(encryptedData);
        
        // Initialize embeddings
        embeddings.initialize(apiKey, {
            model: this.plugin.settings.embeddingModel || 'text-embedding-3-small'
        });

        // Phase 1: Scan files
        if (this.progressCallback) {
            this.progressCallback({
                phase: 'scanning',
                totalFiles: 0,
                processedFiles: 0,
                totalChunks: 0,
                processedChunks: 0,
                percentage: 0,
                message: 'Scanning vault for files...'
            });
        }

        const filesToProcess = await this.scanFiles();
        
        if (this.cancellationRequested) return;

        // Phase 2: Process files and create chunks
        if (this.progressCallback) {
            this.progressCallback({
                phase: 'chunking',
                totalFiles: filesToProcess.length,
                processedFiles: 0,
                totalChunks: 0,
                processedChunks: 0,
                percentage: 0,
                message: 'Creating content chunks...'
            });
        }

        const allChunks: FileChunk[] = [];
        
        for (let i = 0; i < filesToProcess.length; i++) {
            if (this.cancellationRequested) return;

            const file = filesToProcess[i];
            const chunks = await this.processFile(file);
            allChunks.push(...chunks);

            if (this.progressCallback) {
                this.progressCallback({
                    phase: 'chunking',
                    totalFiles: filesToProcess.length,
                    processedFiles: i + 1,
                    totalChunks: allChunks.length,
                    processedChunks: 0,
                    percentage: Math.round(((i + 1) / filesToProcess.length) * 30),
                    message: `Processing ${file.name}... (${allChunks.length} chunks created)`,
                    currentFile: file.name
                });
            }
        }

        if (this.cancellationRequested) return;

        // Phase 3: Generate embeddings and index
        if (this.progressCallback) {
            this.progressCallback({
                phase: 'embedding',
                totalFiles: filesToProcess.length,
                processedFiles: filesToProcess.length,
                totalChunks: allChunks.length,
                processedChunks: 0,
                percentage: 30,
                message: 'Generating embeddings and indexing chunks...'
            });
        }

        // Process chunks in batches
        for (let i = 0; i < allChunks.length; i += this.config.batchSize) {
            if (this.cancellationRequested) return;

            const batch = allChunks.slice(i, i + this.config.batchSize);
            
            // Generate embeddings for batch
            const texts = batch.map(chunk => chunk.content);
            const batchEmbeddings = await embeddings.generateEmbeddings(texts);

            // Insert into vector store
            for (let j = 0; j < batch.length; j++) {
                const chunk = batch[j];
                const embedding = batchEmbeddings[j];

                // Skip if already exists and configured to do so
                if (this.config.skipExistingChunks && vectorStore.get(chunk.id)) {
                    continue;
                }

                await vectorStore.insert(chunk.id, chunk.content, embedding, chunk.metadata);
            }

            if (this.progressCallback) {
                const processedChunks = Math.min(i + batch.length, allChunks.length);
                this.progressCallback({
                    phase: 'indexing',
                    totalFiles: filesToProcess.length,
                    processedFiles: filesToProcess.length,
                    totalChunks: allChunks.length,
                    processedChunks,
                    percentage: 30 + Math.round((processedChunks / allChunks.length) * 70),
                    message: `Indexing chunks... ${processedChunks}/${allChunks.length}`,
                    currentChunk: batch[0].id
                });
            }

            // Small delay to prevent UI blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Save vector store
        await vectorStore.save();

        // Complete
        if (this.progressCallback) {
            this.progressCallback({
                phase: 'complete',
                totalFiles: filesToProcess.length,
                processedFiles: filesToProcess.length,
                totalChunks: allChunks.length,
                processedChunks: allChunks.length,
                percentage: 100,
                message: `Ingestion complete! Processed ${allChunks.length} chunks from ${filesToProcess.length} files.`
            });
        }

        new Notice(`✅ Vault ingestion complete! Indexed ${allChunks.length} chunks from ${filesToProcess.length} files.`);
    }

    private async scanFiles(): Promise<TFile[]> {
        const vault = this.app.vault;
        const filesToProcess: TFile[] = [];

        for (const folderPath of this.config.selectedFolders) {
            if (folderPath === '') {
                // Root folder - get all markdown files
                filesToProcess.push(...vault.getMarkdownFiles());
            } else {
                const folder = vault.getAbstractFileByPath(folderPath);
                if (folder instanceof TFolder) {
                    const folderFiles = this.getFilesInFolder(folder);
                    filesToProcess.push(...folderFiles);
                }
            }
        }

        // Remove duplicates
        const uniqueFiles = Array.from(new Set(filesToProcess.map(f => f.path)))
            .map(path => vault.getAbstractFileByPath(path) as TFile);

        // Filter by pattern if specified
        return uniqueFiles.filter(file => this.matchesFilePattern(file));
    }

    private getFilesInFolder(folder: TFolder): TFile[] {
        const files: TFile[] = [];

        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            } else if (child instanceof TFolder && this.config.includeSubfolders) {
                files.push(...this.getFilesInFolder(child));
            }
        }

        return files;
    }

    private matchesFilePattern(file: TFile): boolean {
        // Simple pattern matching - could be enhanced with proper glob support
        if (this.config.filePattern === '*.md') {
            return file.extension === 'md';
        }
        
        // For now, just match markdown files
        return file.extension === 'md';
    }

    private async processFile(file: TFile): Promise<FileChunk[]> {
        const content = await this.app.vault.read(file);
        return this.createChunks(content, file);
    }

    private createChunks(content: string, file: TFile): FileChunk[] {
        // Simple text chunking - could be enhanced with semantic chunking
        const chunks: FileChunk[] = [];
        const chunkSize = this.config.chunkSize;
        const overlap = this.config.chunkOverlap;

        // Split by paragraphs first
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        let currentChunk = '';
        let chunkIndex = 0;

        for (const paragraph of paragraphs) {
            const potentialChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
            
            if (potentialChunk.length <= chunkSize) {
                currentChunk = potentialChunk;
            } else {
                // Save current chunk if it has content
                if (currentChunk.trim()) {
                    chunks.push(this.createChunkObject(currentChunk, file, chunkIndex++));
                }
                
                // Handle large paragraphs
                if (paragraph.length > chunkSize) {
                    // Split large paragraph
                    const subChunks = this.splitLargeParagraph(paragraph, chunkSize, overlap);
                    for (const subChunk of subChunks) {
                        chunks.push(this.createChunkObject(subChunk, file, chunkIndex++));
                    }
                    currentChunk = '';
                } else {
                    currentChunk = paragraph;
                }
            }
        }

        // Add final chunk
        if (currentChunk.trim()) {
            chunks.push(this.createChunkObject(currentChunk, file, chunkIndex));
        }

        return chunks;
    }

    private splitLargeParagraph(text: string, maxSize: number, overlap: number): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + maxSize, text.length);
            
            // Try to break at word boundary
            if (end < text.length) {
                const lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start + maxSize * 0.8) {
                    end = lastSpace;
                }
            }

            chunks.push(text.slice(start, end));
            start = end - overlap;
        }

        return chunks;
    }

    private createChunkObject(content: string, file: TFile, index: number): FileChunk {
        const chunkId = `${file.path}#chunk-${index}`;
        
        const metadata: ChunkMetadata = {
            document_id: file.path,
            document_title: file.name,
            section: `chunk-${index}`,
            content_type: 'markdown',
            keywords: [],
            page_reference: `${file.path}#chunk-${index}`,
            // Additional custom fields
            chunk_index: index,
            source_file: file.name,
            source_path: file.path,
            created_at: new Date().toISOString(),
            word_count: content.split(/\s+/).length,
            char_count: content.length
        };

        return {
            id: chunkId,
            content: content.trim(),
            metadata
        };
    }

    private cancelIngestion() {
        this.cancellationRequested = true;
        new Notice('Cancelling ingestion...');
    }

    private updateProgress(progress: IngestionProgress, detailsContainer: HTMLElement) {
        // Update progress bar
        this.progressBar.style.width = `${progress.percentage}%`;
        
        // Update progress text
        this.progressText.setText(`${progress.percentage}% - ${progress.message}`);
        
        // Add detail to details container
        const detail = detailsContainer.createDiv();
        detail.style.marginBottom = '4px';
        detail.style.fontSize = '0.8em';
        
        const timestamp = new Date().toLocaleTimeString();
        const phaseIcon = this.getPhaseIcon(progress.phase);
        
        if (progress.error) {
            detail.style.color = 'var(--text-error)';
            detail.setText(`${timestamp} ${phaseIcon} ERROR: ${progress.error}`);
        } else {
            detail.style.color = 'var(--text-muted)';
            detail.setText(`${timestamp} ${phaseIcon} ${progress.message}`);
        }
        
        // Scroll to bottom
        detailsContainer.scrollTop = detailsContainer.scrollHeight;
    }

    private getPhaseIcon(phase: IngestionProgress['phase']): string {
        switch (phase) {
            case 'scanning': return '🔍';
            case 'chunking': return '✂️';
            case 'embedding': return '🧠';
            case 'indexing': return '📇';
            case 'complete': return '✅';
            case 'error': return '❌';
            default: return '⚙️';
        }
    }

    onClose() {
        this.cancellationRequested = true;
    }
}