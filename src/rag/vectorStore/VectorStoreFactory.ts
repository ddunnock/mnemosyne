/**
 * Vector Store Factory
 *
 * Creates the appropriate vector store implementation based on configuration
 */

import { App } from 'obsidian';
import { IVectorStore } from './IVectorStore';
import { JSONVectorStore } from './JSONVectorStore';
import { SQLiteVectorStore } from './SQLiteVectorStore';
import { VectorStoreConfig } from './types';

export class VectorStoreFactory {
    /**
     * Create a vector store instance based on configuration
     */
    static async create(app: App, config: VectorStoreConfig): Promise<IVectorStore> {
        switch (config.backend) {
            case 'json':
                if (!config.json) {
                    console.warn('JSON backend selected but config missing, using defaults');
                    config.json = { indexPath: 'vector-store-index.json' };
                }
                return new JSONVectorStore(
                    app,
                    config.json,
                    config.embeddingModel
                );

            case 'sqlite':
                if (!config.sqlite) {
                    console.warn('SQLite backend selected but config missing, using defaults');
                    config.sqlite = {
                        dbPath: 'vector-store.db',
                        enableWAL: true,
                        cacheSize: 10000
                    };
                }
                return new SQLiteVectorStore(
                    app,
                    config.sqlite,
                    config.embeddingModel,
                    config.dimension
                );

            case 'pgvector':
                if (!config.pgvector) {
                    throw new Error('PgVector backend configuration missing');
                }
                // Dynamic import to avoid loading pg module unless needed
                const { PgVectorStore } = await import('./PgVectorStore');
                return new PgVectorStore(
                    config.pgvector,
                    config.embeddingModel,
                    config.dimension
                );

            default:
                throw new Error(`Unknown vector store backend: ${config.backend}`);
        }
    }

    /**
     * Get recommended configuration for small vaults (0-10K chunks)
     */
    static getSmallVaultConfig(indexPath: string = 'vector-store-index.json'): VectorStoreConfig {
        return {
            backend: 'json',
            embeddingModel: 'text-embedding-3-small',
            dimension: 1536,
            json: {
                indexPath
            }
        };
    }

    /**
     * Get recommended configuration for medium vaults (10K-100K chunks)
     */
    static getMediumVaultConfig(dbPath: string = 'vector-store.db'): VectorStoreConfig {
        return {
            backend: 'sqlite',
            embeddingModel: 'text-embedding-3-small',
            dimension: 1536,
            sqlite: {
                dbPath,
                enableWAL: true,
                cacheSize: 10000 // 10MB cache
            }
        };
    }

    /**
     * Get recommended configuration for large vaults (100K+ chunks)
     */
    static getLargeVaultConfig(pgConfig: {
        host: string;
        port: number;
        database: string;
        user: string;
        encryptedPassword: string;
    }): VectorStoreConfig {
        return {
            backend: 'pgvector',
            embeddingModel: 'text-embedding-3-small',
            dimension: 1536,
            pgvector: {
                ...pgConfig,
                ssl: true,
                poolSize: 10,
                connectionTimeout: 5000
            }
        };
    }
}
