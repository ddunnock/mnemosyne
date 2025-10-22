/**
 * Knowledge Base Tab
 *
 * Manage vector store, embeddings, and vault indexing
 * - Quick indexing status and stats
 * - Embedding provider selection
 * - Vector store backend selection
 * - Advanced vector store configuration
 */

import { BaseTab } from './BaseTab';
import { Notice } from 'obsidian';
import { VaultIngestionModal } from '../../vaultIngestionModal';

export class KnowledgeBaseTab implements BaseTab {
    constructor(
        private plugin: any,
        private settings: any,
        private saveSettings: () => Promise<void>,
        private updateComponents: () => void,
        private chunkCount: number,
        private vectorStoreBackend: string,
        private handleRefreshStats: () => Promise<void>
    ) {}

    render(): string {
        const hasProviders = (this.settings.providers || []).length > 0;
        const hasChunks = this.chunkCount > 0;
        const backendDisplay = this.vectorStoreBackend === 'unknown' ? 'Not configured' : this.vectorStoreBackend.toUpperCase();

        const vectorStoreConfig = this.settings.vectorStore || this.plugin.settings.vectorStore || {
            backend: 'json',
            embeddingModel: 'text-embedding-3-small',
            dimension: 1536
        };

        const embeddingProvider = this.settings.embeddingProvider || this.plugin.settings.embeddingProvider || {
            provider: 'openai',
            model: 'text-embedding-3-small'
        };

        return `
            <div class="knowledge-base-tab">
                <!-- Header Section -->
                <div class="settings-section">
                    <div style="padding: 16px; background: var(--background-secondary); border-radius: 8px; border-left: 4px solid var(--interactive-accent);">
                        <h2 style="margin-top: 0; margin-bottom: 8px;">📚 Knowledge Base</h2>
                        <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                            Index your vault to enable semantic search and AI-powered retrieval across your notes.
                        </p>
                    </div>
                </div>

                <!-- Index Status Dashboard -->
                <div class="settings-section">
                    <div class="settings-card" style="${hasChunks ? 'border: 2px solid var(--interactive-success);' : ''}">
                        <h3 style="margin-top: 0; margin-bottom: 16px;">📊 Index Status</h3>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
                            <!-- Chunks Count -->
                            <div style="padding: 16px; background: var(--background-primary-alt); border-radius: 6px; text-align: center;">
                                <div style="font-size: 32px; font-weight: 700; color: var(--interactive-accent);">${this.chunkCount.toLocaleString()}</div>
                                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Indexed Chunks</div>
                            </div>

                            <!-- Vector Store Backend -->
                            <div style="padding: 16px; background: var(--background-primary-alt); border-radius: 6px; text-align: center;">
                                <div style="font-size: 18px; font-weight: 600; color: var(--text-normal); margin-top: 8px;">${backendDisplay}</div>
                                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Vector Store</div>
                            </div>

                            <!-- Embedding Model -->
                            <div style="padding: 16px; background: var(--background-primary-alt); border-radius: 6px; text-align: center;">
                                <div style="font-size: 14px; font-weight: 600; color: var(--text-normal); margin-top: 12px;">${vectorStoreConfig.embeddingModel || 'text-embedding-3-small'}</div>
                                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Embedding Model</div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button id="index-vault-btn" class="btn btn-primary" ${!hasProviders ? 'disabled' : ''}>
                                ${hasChunks ? '🔄 Re-index Vault' : '📚 Index Vault'}
                            </button>
                            <button id="refresh-stats-btn" class="btn">
                                🔃 Refresh Stats
                            </button>
                        </div>

                        ${!hasProviders ? `
                            <div style="margin-top: 16px; padding: 12px; background: var(--background-modifier-error-hover); border-radius: 4px; border-left: 3px solid var(--text-error);">
                                <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                                    ⚠️ Add an AI provider first before indexing your vault
                                </p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Embedding Provider Selection -->
                <div class="settings-section">
                    <div class="settings-card">
                        <h3 style="margin-top: 0; margin-bottom: 16px;">🔤 Embedding Provider</h3>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                            Choose how to generate embeddings for semantic search. OpenAI provides best quality, while local embeddings offer complete privacy.
                        </p>

                        <div style="display: grid; gap: 12px;">
                            <!-- OpenAI Embeddings -->
                            <label class="embedding-provider-option" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--background-primary-alt); border: 2px solid ${embeddingProvider.provider === 'openai' ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                <input type="radio" name="embedding-provider" value="openai" ${embeddingProvider.provider === 'openai' ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">OpenAI Embeddings</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">High quality embeddings via OpenAI API (requires API key)</div>
                                </div>
                                ${embeddingProvider.provider === 'openai' ? '<span style="color: var(--interactive-accent); font-size: 18px;">✓</span>' : ''}
                            </label>

                            <!-- Local Embeddings -->
                            <label class="embedding-provider-option" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--background-primary-alt); border: 2px solid ${embeddingProvider.provider === 'local' ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                <input type="radio" name="embedding-provider" value="local" ${embeddingProvider.provider === 'local' ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">Local Embeddings (Transformers.js)</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">Run embeddings locally in your browser - complete privacy, no API costs</div>
                                </div>
                                ${embeddingProvider.provider === 'local' ? '<span style="color: var(--interactive-accent); font-size: 18px;">✓</span>' : ''}
                            </label>
                        </div>

                        ${embeddingProvider.provider === 'local' ? `
                            <div style="margin-top: 12px; padding: 12px; background: var(--background-modifier-hover); border-radius: 4px;">
                                <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">Local Model:</label>
                                <select id="local-embedding-model" style="width: 100%; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);">
                                    <option value="Xenova/all-MiniLM-L6-v2" ${embeddingProvider.model === 'Xenova/all-MiniLM-L6-v2' ? 'selected' : ''}>all-MiniLM-L6-v2 (Fast, 384 dims)</option>
                                    <option value="Xenova/paraphrase-multilingual-MiniLM-L12-v2" ${embeddingProvider.model === 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' ? 'selected' : ''}>paraphrase-multilingual-MiniLM-L12-v2 (Multilingual, 384 dims)</option>
                                </select>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Vector Store Backend Selection -->
                <div class="settings-section">
                    <div class="settings-card">
                        <h3 style="margin-top: 0; margin-bottom: 16px;">💾 Vector Store Backend</h3>
                        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                            Choose where to store vector embeddings. JSON for simplicity, SQLite for better performance, or PostgreSQL for production deployments.
                        </p>

                        <div style="display: grid; gap: 12px; margin-bottom: 16px;">
                            <!-- JSON -->
                            <label class="vector-store-option" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--background-primary-alt); border: 2px solid ${vectorStoreConfig.backend === 'json' ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                <input type="radio" name="vector-store-backend" value="json" ${vectorStoreConfig.backend === 'json' ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">JSON (Default)</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">Simple file-based storage - best for small vaults</div>
                                </div>
                                ${vectorStoreConfig.backend === 'json' ? '<span style="color: var(--interactive-accent); font-size: 18px;">✓</span>' : ''}
                            </label>

                            <!-- SQLite -->
                            <label class="vector-store-option" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--background-primary-alt); border: 2px solid ${vectorStoreConfig.backend === 'sqlite' ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                <input type="radio" name="vector-store-backend" value="sqlite" ${vectorStoreConfig.backend === 'sqlite' ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">SQLite (Recommended)</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">Embedded database with better performance - perfect for medium vaults</div>
                                </div>
                                ${vectorStoreConfig.backend === 'sqlite' ? '<span style="color: var(--interactive-accent); font-size: 18px;">✓</span>' : ''}
                            </label>

                            <!-- PostgreSQL -->
                            <label class="vector-store-option" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--background-primary-alt); border: 2px solid ${vectorStoreConfig.backend === 'pgvector' ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                <input type="radio" name="vector-store-backend" value="pgvector" ${vectorStoreConfig.backend === 'pgvector' ? 'checked' : ''} style="width: 18px; height: 18px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">PostgreSQL with pgvector (Advanced)</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">Production-grade database - best for large vaults and teams</div>
                                </div>
                                ${vectorStoreConfig.backend === 'pgvector' ? '<span style="color: var(--interactive-accent); font-size: 18px;">✓</span>' : ''}
                            </label>
                        </div>

                        <!-- Advanced Configuration (Collapsible) -->
                        <details id="vector-store-config-details">
                            <summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: var(--text-muted); padding: 12px; background: var(--background-modifier-border); border-radius: 4px;">
                                ⚙️ Advanced Configuration
                            </summary>
                            <div id="vector-store-config-content" style="padding: 16px; margin-top: 12px; background: var(--background-primary); border-radius: 4px; border: 1px solid var(--background-modifier-border);">
                                <!-- Config will be inserted here dynamically -->
                            </div>
                        </details>
                    </div>
                </div>

                <!-- Tips Section -->
                <div class="settings-section">
                    <div style="padding: 16px; background: var(--background-modifier-hover); border-radius: 6px; border-left: 3px solid var(--text-accent);">
                        <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 14px;">💡 Knowledge Base Tips</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: var(--text-muted);">
                            <li><strong>Indexing:</strong> Index your vault to enable AI-powered semantic search across all your notes</li>
                            <li><strong>Embeddings:</strong> Local embeddings are free and private, OpenAI embeddings provide better quality</li>
                            <li><strong>SQLite:</strong> Recommended for most users - zero setup, better performance than JSON</li>
                            <li><strong>PostgreSQL:</strong> Only needed for very large vaults (10k+ notes) or team deployments</li>
                            <li><strong>Re-indexing:</strong> Re-index if you change embedding provider or vector store backend</li>
                        </ul>
                    </div>
                </div>

                <style>
                    .embedding-provider-option:hover,
                    .vector-store-option:hover {
                        border-color: var(--interactive-accent);
                        background: var(--background-modifier-hover);
                    }
                </style>
            </div>
        `;
    }

    attachEventListeners(container: HTMLElement): void {
        // Index Vault Button
        const indexVaultBtn = container.querySelector('#index-vault-btn');
        if (indexVaultBtn) {
            indexVaultBtn.addEventListener('click', () => {
                this.handleIndexVault();
            });
        }

        // Refresh Stats Button
        const refreshStatsBtn = container.querySelector('#refresh-stats-btn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', async () => {
                await this.handleRefreshStats();
            });
        }

        // Embedding Provider Radio Buttons
        const embeddingProviderRadios = container.querySelectorAll('input[name="embedding-provider"]');
        embeddingProviderRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const provider = (e.target as HTMLInputElement).value;
                await this.handleEmbeddingProviderChange(provider as 'openai' | 'local');
            });
        });

        // Local Embedding Model Select
        const localModelSelect = container.querySelector('#local-embedding-model');
        if (localModelSelect) {
            localModelSelect.addEventListener('change', async (e) => {
                const model = (e.target as HTMLSelectElement).value;
                await this.handleLocalEmbeddingModelChange(model);
            });
        }

        // Vector Store Backend Radio Buttons
        const vectorStoreRadios = container.querySelectorAll('input[name="vector-store-backend"]');
        vectorStoreRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const backend = (e.target as HTMLInputElement).value;
                await this.handleVectorStoreBackendChange(backend as 'json' | 'sqlite' | 'pgvector');
            });
        });
    }

    private handleIndexVault(): void {
        // Open the vault ingestion modal
        const modal = new VaultIngestionModal(this.plugin.app, this.plugin);

        // Override the onClose method to refresh state after modal closes
        const originalOnClose = modal.onClose.bind(modal);
        modal.onClose = () => {
            originalOnClose();
            // Refresh stats after modal closes
            this.handleRefreshStats().then(() => {
                this.updateComponents();
            });
        };

        modal.open();
    }

    private async handleEmbeddingProviderChange(provider: 'openai' | 'local'): Promise<void> {
        try {
            // Ensure embeddingProvider is an object (it might be a string from old settings)
            if (!this.plugin.settings.embeddingProvider || typeof this.plugin.settings.embeddingProvider === 'string') {
                this.plugin.settings.embeddingProvider = {
                    provider: 'openai',
                    model: 'text-embedding-3-small',
                    dimension: 1536
                };
            }

            // Update provider
            this.plugin.settings.embeddingProvider.provider = provider;

            // Set default model based on provider
            if (provider === 'local') {
                this.plugin.settings.embeddingProvider.model = 'Xenova/all-MiniLM-L6-v2';
                this.plugin.settings.embeddingProvider.dimension = 384;
            } else {
                this.plugin.settings.embeddingProvider.model = 'text-embedding-3-small';
                this.plugin.settings.embeddingProvider.dimension = 1536;
            }

            await this.plugin.saveSettings();
            this.updateComponents();

            new Notice(`Embedding provider changed to ${provider}. Re-index your vault for changes to take effect.`);
        } catch (error: any) {
            console.error('Failed to change embedding provider:', error);
            new Notice(`Failed to change embedding provider: ${error.message}`);
        }
    }

    private async handleLocalEmbeddingModelChange(model: string): Promise<void> {
        try {
            // Ensure embeddingProvider is an object (it might be a string from old settings)
            if (!this.plugin.settings.embeddingProvider || typeof this.plugin.settings.embeddingProvider === 'string') {
                this.plugin.settings.embeddingProvider = {
                    provider: 'local',
                    model: 'Xenova/all-MiniLM-L6-v2',
                    dimension: 384
                };
            }

            this.plugin.settings.embeddingProvider.model = model;

            await this.plugin.saveSettings();
            this.updateComponents();

            new Notice(`Local embedding model changed to ${model}. Re-index your vault for changes to take effect.`);
        } catch (error: any) {
            console.error('Failed to change local embedding model:', error);
            new Notice(`Failed to change model: ${error.message}`);
        }
    }

    private async handleVectorStoreBackendChange(backend: 'json' | 'sqlite' | 'pgvector'): Promise<void> {
        try {
            // Update settings
            if (!this.plugin.settings.vectorStore) {
                this.plugin.settings.vectorStore = {
                    backend: 'json',
                    embeddingModel: 'text-embedding-3-small',
                    dimension: 1536,
                    embeddingProvider: 'openai'
                };
            }

            this.plugin.settings.vectorStore.backend = backend;

            // Ensure backend-specific config exists
            if (backend === 'json' && !this.plugin.settings.vectorStore.json) {
                this.plugin.settings.vectorStore.json = { indexPath: 'vector-store-index.json' };
            } else if (backend === 'sqlite' && !this.plugin.settings.vectorStore.sqlite) {
                this.plugin.settings.vectorStore.sqlite = {
                    dbPath: 'vector-store.db',
                    enableWAL: true,
                    cacheSize: 10000
                };
            } else if (backend === 'pgvector' && !this.plugin.settings.vectorStore.pgvector) {
                this.plugin.settings.vectorStore.pgvector = {
                    host: 'localhost',
                    port: 5432,
                    database: 'mnemosyne',
                    user: 'postgres',
                    ssl: false
                };
            }

            await this.plugin.saveSettings();
            this.updateComponents();

            new Notice(`Vector store backend changed to ${backend}. You may need to re-index your vault.`);
        } catch (error: any) {
            console.error('Failed to change vector store backend:', error);
            new Notice(`Failed to change backend: ${error.message}`);
        }
    }
}
