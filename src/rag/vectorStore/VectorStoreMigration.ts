/**
 * Vector Store Migration Utility
 *
 * Migrates vector store data between backends:
 * - JSON → PostgreSQL
 * - PostgreSQL → JSON
 *
 * Provides progress tracking and error handling
 */

import { Notice } from 'obsidian';
import { IVectorStore } from './IVectorStore';
import { JSONVectorStore } from './JSONVectorStore';
import { SQLiteVectorStore } from './SQLiteVectorStore';
import { PgVectorStore } from './PgVectorStore';
import type { VectorEntry, VectorStoreStats } from './types';

export interface MigrationProgress {
    phase: 'preparing' | 'migrating' | 'verifying' | 'complete' | 'failed';
    totalChunks: number;
    migratedChunks: number;
    percentage: number;
    currentChunk?: string;
    error?: string;
}

export interface MigrationResult {
    success: boolean;
    migratedChunks: number;
    totalChunks: number;
    duration: number;
    errors: Array<{ chunkId: string; error: string }>;
    sourceStats: VectorStoreStats;
    targetStats: VectorStoreStats;
}

export type MigrationProgressCallback = (progress: MigrationProgress) => void;

export class VectorStoreMigration {
    private source: IVectorStore;
    private target: IVectorStore;
    private onProgress?: MigrationProgressCallback;

    constructor(
        source: IVectorStore,
        target: IVectorStore,
        onProgress?: MigrationProgressCallback
    ) {
        this.source = source;
        this.target = target;
        this.onProgress = onProgress;
    }

    /**
     * Execute the migration
     */
    async migrate(clearTarget: boolean = false): Promise<MigrationResult> {
        const startTime = Date.now();
        const errors: Array<{ chunkId: string; error: string }> = [];

        try {
            // Phase 1: Prepare
            this.reportProgress({
                phase: 'preparing',
                totalChunks: 0,
                migratedChunks: 0,
                percentage: 0
            });

            // Get source statistics
            const sourceStats = await this.source.getStats();
            console.log(`Migration: Source has ${sourceStats.totalChunks} chunks`);

            if (sourceStats.totalChunks === 0) {
                throw new Error('Source vector store is empty, nothing to migrate');
            }

            // Clear target if requested
            if (clearTarget) {
                console.log('Clearing target vector store...');
                await this.target.clear();
            }

            // Check target is ready
            if (!this.target.isReady()) {
                await this.target.initialize();
            }

            // Phase 2: Migrate chunks
            this.reportProgress({
                phase: 'migrating',
                totalChunks: sourceStats.totalChunks,
                migratedChunks: 0,
                percentage: 0
            });

            const migratedChunks = await this.migrateChunks(sourceStats.totalChunks, errors);

            // Phase 3: Verify
            this.reportProgress({
                phase: 'verifying',
                totalChunks: sourceStats.totalChunks,
                migratedChunks,
                percentage: 95
            });

            // Save target
            await this.target.save();

            // Get final stats
            const targetStats = await this.target.getStats();
            console.log(`Migration: Target now has ${targetStats.totalChunks} chunks`);

            // Phase 4: Complete
            this.reportProgress({
                phase: 'complete',
                totalChunks: sourceStats.totalChunks,
                migratedChunks,
                percentage: 100
            });

            const duration = Date.now() - startTime;

            return {
                success: errors.length === 0,
                migratedChunks,
                totalChunks: sourceStats.totalChunks,
                duration,
                errors,
                sourceStats,
                targetStats
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Migration failed:', error);

            this.reportProgress({
                phase: 'failed',
                totalChunks: 0,
                migratedChunks: 0,
                percentage: 0,
                error: errorMessage
            });

            throw error;
        }
    }

    /**
     * Migrate chunks from source to target
     */
    private async migrateChunks(
        totalChunks: number,
        errors: Array<{ chunkId: string; error: string }>
    ): Promise<number> {
        let migratedCount = 0;

        // Export all entries from source
        const exportData = await this.source.export();
        const sourceData = JSON.parse(exportData);

        // Handle different export formats
        const entries: VectorEntry[] = Array.isArray(sourceData)
            ? sourceData
            : sourceData.entries || [];

        if (entries.length === 0) {
            throw new Error('No entries found in source export');
        }

        console.log(`Migrating ${entries.length} entries...`);

        // Migrate in batches
        const batchSize = 100;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);

            for (const entry of batch) {
                try {
                    await this.target.upsert(entry);
                    migratedCount++;

                    // Report progress every 10 chunks
                    if (migratedCount % 10 === 0 || migratedCount === entries.length) {
                        this.reportProgress({
                            phase: 'migrating',
                            totalChunks,
                            migratedChunks: migratedCount,
                            percentage: Math.round((migratedCount / totalChunks) * 90),
                            currentChunk: entry.id
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Error migrating chunk ${entry.id}:`, error);
                    errors.push({
                        chunkId: entry.id,
                        error: errorMessage
                    });
                }
            }

            // Small delay between batches to avoid overwhelming the target
            await this.delay(50);
        }

        return migratedCount;
    }

    /**
     * Report migration progress
     */
    private reportProgress(progress: MigrationProgress): void {
        if (this.onProgress) {
            this.onProgress(progress);
        }
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Static helper: Create migration from JSON to PostgreSQL
     */
    static createJSONtoPgVector(
        jsonStore: JSONVectorStore,
        pgStore: PgVectorStore,
        onProgress?: MigrationProgressCallback
    ): VectorStoreMigration {
        return new VectorStoreMigration(jsonStore, pgStore, onProgress);
    }

    /**
     * Static helper: Create migration from PostgreSQL to JSON
     */
    static createPgVectorToJSON(
        pgStore: PgVectorStore,
        jsonStore: JSONVectorStore,
        onProgress?: MigrationProgressCallback
    ): VectorStoreMigration {
        return new VectorStoreMigration(pgStore, jsonStore, onProgress);
    }

    /**
     * Static helper: Create migration from JSON to SQLite
     */
    static createJSONtoSQLite(
        jsonStore: JSONVectorStore,
        sqliteStore: SQLiteVectorStore,
        onProgress?: MigrationProgressCallback
    ): VectorStoreMigration {
        return new VectorStoreMigration(jsonStore, sqliteStore, onProgress);
    }

    /**
     * Static helper: Create migration from SQLite to JSON
     */
    static createSQLiteToJSON(
        sqliteStore: SQLiteVectorStore,
        jsonStore: JSONVectorStore,
        onProgress?: MigrationProgressCallback
    ): VectorStoreMigration {
        return new VectorStoreMigration(sqliteStore, jsonStore, onProgress);
    }

    /**
     * Static helper: Create migration from SQLite to PostgreSQL
     */
    static createSQLiteToPgVector(
        sqliteStore: SQLiteVectorStore,
        pgStore: PgVectorStore,
        onProgress?: MigrationProgressCallback
    ): VectorStoreMigration {
        return new VectorStoreMigration(sqliteStore, pgStore, onProgress);
    }

    /**
     * Static helper: Create migration from PostgreSQL to SQLite
     */
    static createPgVectorToSQLite(
        pgStore: PgVectorStore,
        sqliteStore: SQLiteVectorStore,
        onProgress?: MigrationProgressCallback
    ): VectorStoreMigration {
        return new VectorStoreMigration(pgStore, sqliteStore, onProgress);
    }

    /**
     * Verify migration integrity
     */
    async verify(): Promise<{ valid: boolean; differences: string[] }> {
        const differences: string[] = [];

        try {
            const sourceStats = await this.source.getStats();
            const targetStats = await this.target.getStats();

            // Check chunk counts
            if (sourceStats.totalChunks !== targetStats.totalChunks) {
                differences.push(
                    `Chunk count mismatch: source=${sourceStats.totalChunks}, target=${targetStats.totalChunks}`
                );
            }

            // Check dimensions
            if (sourceStats.dimension !== targetStats.dimension) {
                differences.push(
                    `Embedding dimension mismatch: source=${sourceStats.dimension}, target=${targetStats.dimension}`
                );
            }

            // Check embedding models
            if (sourceStats.embeddingModel !== targetStats.embeddingModel) {
                differences.push(
                    `Embedding model mismatch: source=${sourceStats.embeddingModel}, target=${targetStats.embeddingModel}`
                );
            }

            return {
                valid: differences.length === 0,
                differences
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            differences.push(`Verification failed: ${errorMessage}`);
            return {
                valid: false,
                differences
            };
        }
    }
}
