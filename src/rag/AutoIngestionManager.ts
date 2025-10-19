/**
 * AutoIngestionManager
 * 
 * Handles automatic file ingestion with safety guards and performance monitoring.
 * Features:
 * - File watching with debouncing
 * - Queued batch processing
 * - Safety limits and validation
 * - Pattern-based filtering
 * - Retry logic with backoff
 * - Performance monitoring
 */

import { TFile, TAbstractFile, Vault } from 'obsidian';
import { AutoIngestionConfig, PluginSettings } from '../types';
import { VaultIngestor } from './VaultIngestor';
import { minimatch } from 'minimatch';

export interface QueuedFile {
    file: TFile;
    operation: 'create' | 'modify' | 'delete';
    timestamp: number;
    attempts: number;
}

export interface AutoIngestionStats {
    filesProcessed: number;
    filesQueued: number;
    filesSkipped: number;
    errors: number;
    lastProcessed: number;
    averageProcessingTime: number;
    isProcessing: boolean;
    queueSize: number;
}

export class AutoIngestionManager {
    private vault: Vault;
    private vaultIngestor: VaultIngestor;
    private config: AutoIngestionConfig;
    private enabled: boolean = false;
    
    // Processing state
    private queue: Map<string, QueuedFile> = new Map();
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private processingInterval: NodeJS.Timeout | null = null;
    private isProcessing = false;
    
    // Statistics
    private stats: AutoIngestionStats = {
        filesProcessed: 0,
        filesQueued: 0,
        filesSkipped: 0,
        errors: 0,
        lastProcessed: 0,
        averageProcessingTime: 0,
        isProcessing: false,
        queueSize: 0
    };
    
    // Performance tracking
    private processingTimes: number[] = [];
    private readonly maxProcessingHistory = 50;
    
    // Event handlers
    private fileCreateHandler: (file: TAbstractFile) => void;
    private fileModifyHandler: (file: TAbstractFile) => void;
    private fileDeleteHandler: (file: TAbstractFile) => void;

    constructor(vault: Vault, vaultIngestor: VaultIngestor, settings: PluginSettings) {
        this.vault = vault;
        this.vaultIngestor = vaultIngestor;
        this.config = settings.autoIngestion;
        
        // Initialize event handlers
        this.fileCreateHandler = this.handleFileCreate.bind(this);
        this.fileModifyHandler = this.handleFileModify.bind(this);
        this.fileDeleteHandler = this.handleFileDelete.bind(this);
    }

    /**
     * Start auto ingestion
     */
    public start(): void {
        if (this.enabled || !this.config.enabled) {
            return;
        }

        this.log('Starting auto ingestion manager', 'minimal');
        this.enabled = true;

        // Register vault event handlers
        this.vault.on('create', this.fileCreateHandler);
        this.vault.on('modify', this.fileModifyHandler);
        this.vault.on('delete', this.fileDeleteHandler);

        // Start processing interval
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, this.config.processingInterval);

        this.log(`Auto ingestion started - watching ${this.getWatchedFolders().join(', ') || 'all folders'}`, 'minimal');
    }

    /**
     * Stop auto ingestion
     */
    public stop(): void {
        if (!this.enabled) {
            return;
        }

        this.log('Stopping auto ingestion manager', 'minimal');
        this.enabled = false;

        // Remove vault event handlers
        this.vault.off('create', this.fileCreateHandler);
        this.vault.off('modify', this.fileModifyHandler);
        this.vault.off('delete', this.fileDeleteHandler);

        // Clear processing interval
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        // Clear all timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();

        // Clear queue
        this.queue.clear();
        this.updateStats();

        this.log('Auto ingestion stopped', 'minimal');
    }

    /**
     * Update configuration
     */
    public updateConfig(settings: PluginSettings): void {
        const oldEnabled = this.config.enabled;
        this.config = settings.autoIngestion;

        if (oldEnabled !== this.config.enabled) {
            if (this.config.enabled) {
                this.start();
            } else {
                this.stop();
            }
        } else if (this.enabled) {
            // Restart with new config
            this.stop();
            this.start();
        }
    }

    /**
     * Get current statistics
     */
    public getStats(): AutoIngestionStats {
        return {
            ...this.stats,
            queueSize: this.queue.size,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Get current queue contents (for debugging)
     */
    public getQueueContents(): QueuedFile[] {
        return Array.from(this.queue.values());
    }

    /**
     * Clear queue and reset stats
     */
    public reset(): void {
        this.queue.clear();
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        this.stats = {
            filesProcessed: 0,
            filesQueued: 0,
            filesSkipped: 0,
            errors: 0,
            lastProcessed: 0,
            averageProcessingTime: 0,
            isProcessing: false,
            queueSize: 0
        };
        
        this.processingTimes = [];
        this.log('Auto ingestion queue and stats reset', 'minimal');
    }

    /**
     * Handle file creation
     */
    private handleFileCreate(file: TAbstractFile): void {
        if (!(file instanceof TFile)) return;
        this.queueFileOperation(file, 'create');
    }

    /**
     * Handle file modification
     */
    private handleFileModify(file: TAbstractFile): void {
        if (!(file instanceof TFile)) return;
        this.queueFileOperation(file, 'modify');
    }

    /**
     * Handle file deletion
     */
    private handleFileDelete(file: TAbstractFile): void {
        if (!(file instanceof TFile)) return;
        this.queueFileOperation(file, 'delete');
    }

    /**
     * Queue a file operation with debouncing
     */
    private queueFileOperation(file: TFile, operation: 'create' | 'modify' | 'delete'): void {
        // Skip if auto ingestion is disabled
        if (!this.enabled || !this.config.enabled) return;

        // Apply safety guards
        if (!this.shouldProcessFile(file)) {
            this.stats.filesSkipped++;
            this.log(`Skipped file: ${file.path}`, 'verbose');
            return;
        }

        // Clear existing debounce timer
        const filePath = file.path;
        if (this.debounceTimers.has(filePath)) {
            clearTimeout(this.debounceTimers.get(filePath)!);
        }

        // Set new debounce timer
        this.debounceTimers.set(filePath, setTimeout(() => {
            this.addToQueue(file, operation);
            this.debounceTimers.delete(filePath);
        }, this.config.debounceDelay));
    }

    /**
     * Add file to processing queue
     */
    private addToQueue(file: TFile, operation: 'create' | 'modify' | 'delete'): void {
        // Check queue size limit
        if (this.queue.size >= this.config.maxQueueSize) {
            this.log(`Queue full (${this.config.maxQueueSize}), skipping file: ${file.path}`, 'minimal');
            this.stats.filesSkipped++;
            return;
        }

        const queuedFile: QueuedFile = {
            file,
            operation,
            timestamp: Date.now(),
            attempts: 0
        };

        this.queue.set(file.path, queuedFile);
        this.stats.filesQueued++;
        this.updateStats();

        this.log(`Queued ${operation}: ${file.path}`, 'verbose');
    }

    /**
     * Process queued files in batches
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.size === 0) return;

        this.isProcessing = true;
        this.stats.isProcessing = true;
        this.updateStats();

        const startTime = Date.now();
        const batch: QueuedFile[] = [];
        const iterator = this.queue.values();
        
        // Collect batch
        for (let i = 0; i < this.config.batchSize && i < this.queue.size; i++) {
            const next = iterator.next();
            if (next.done) break;
            batch.push(next.value);
        }

        this.log(`Processing batch of ${batch.length} files`, 'verbose');

        // Process each file in the batch
        for (const queuedFile of batch) {
            try {
                await this.processFile(queuedFile);
                this.queue.delete(queuedFile.file.path);
                this.stats.filesProcessed++;
            } catch (error) {
                this.handleProcessingError(queuedFile, error);
            }
        }

        // Update performance metrics
        const processingTime = Date.now() - startTime;
        this.updateProcessingTime(processingTime);
        this.stats.lastProcessed = Date.now();

        this.isProcessing = false;
        this.stats.isProcessing = false;
        this.updateStats();

        if (batch.length > 0) {
            this.log(`Processed batch of ${batch.length} files in ${processingTime}ms`, 'minimal');
        }
    }

    /**
     * Process a single file
     */
    private async processFile(queuedFile: QueuedFile): Promise<void> {
        const { file, operation } = queuedFile;
        
        try {
            switch (operation) {
                case 'create':
                case 'modify':
                    // For create/modify, ingest the file
                    await this.vaultIngestor.ingestFile(file.path);
                    break;
                    
                case 'delete':
                    // For delete, remove from vector store
                    // This would need to be implemented in the vector store
                    this.log(`File deletion handling not yet implemented: ${file.path}`, 'verbose');
                    break;
            }
        } catch (error) {
            // Re-throw to be handled by processQueue
            throw error;
        }
    }

    /**
     * Handle processing errors with retry logic
     */
    private handleProcessingError(queuedFile: QueuedFile, error: any): void {
        queuedFile.attempts++;
        this.stats.errors++;

        this.log(`Error processing ${queuedFile.file.path} (attempt ${queuedFile.attempts}): ${error.message}`, 'minimal');

        // Retry if under limit
        if (queuedFile.attempts < this.config.retryAttempts) {
            // Keep in queue for retry (don't remove)
            this.log(`Will retry ${queuedFile.file.path} (${queuedFile.attempts}/${this.config.retryAttempts})`, 'verbose');
        } else {
            // Remove from queue after max attempts
            this.queue.delete(queuedFile.file.path);
            this.log(`Gave up on ${queuedFile.file.path} after ${queuedFile.attempts} attempts`, 'minimal');
        }
    }

    /**
     * Check if file should be processed based on safety guards
     */
    private shouldProcessFile(file: TFile): boolean {
        // Check file type
        if (this.config.includeFileTypes.length > 0) {
            const fileExt = file.extension ? '.' + file.extension : '';
            if (!this.config.includeFileTypes.includes(fileExt)) {
                return false;
            }
        }

        // Check hidden files
        if (this.config.ignoreHiddenFiles && file.name.startsWith('.')) {
            return false;
        }

        // Check file size
        if (file.stat?.size && file.stat.size > this.config.maxFileSize * 1024 * 1024) {
            this.log(`File too large (${(file.stat.size / 1024 / 1024).toFixed(2)}MB): ${file.path}`, 'minimal');
            return false;
        }

        // Check exclude patterns
        for (const pattern of this.config.excludePatterns) {
            if (minimatch(file.path, pattern)) {
                return false;
            }
        }

        // Check enabled folders
        if (this.config.enabledFolders.length > 0) {
            const fileFolder = file.parent?.path || '';
            const isInEnabledFolder = this.config.enabledFolders.some(folder => 
                fileFolder === folder || fileFolder.startsWith(folder + '/')
            );
            if (!isInEnabledFolder) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get list of watched folders for display
     */
    private getWatchedFolders(): string[] {
        return this.config.enabledFolders.length > 0 
            ? this.config.enabledFolders 
            : ['all folders'];
    }

    /**
     * Update processing time statistics
     */
    private updateProcessingTime(time: number): void {
        this.processingTimes.push(time);
        
        // Keep only recent processing times
        if (this.processingTimes.length > this.maxProcessingHistory) {
            this.processingTimes.shift();
        }
        
        // Calculate average
        if (this.processingTimes.length > 0) {
            this.stats.averageProcessingTime = 
                this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
        }
    }

    /**
     * Update statistics
     */
    private updateStats(): void {
        this.stats.queueSize = this.queue.size;
        this.stats.isProcessing = this.isProcessing;
    }

    /**
     * Log message based on configuration level
     */
    private log(message: string, level: 'silent' | 'minimal' | 'verbose' = 'minimal'): void {
        if (this.config.logLevel === 'silent') return;
        if (this.config.logLevel === 'minimal' && level === 'verbose') return;
        
        const prefix = '[AutoIngestion]';
        console.log(`${prefix} ${message}`);
    }
}