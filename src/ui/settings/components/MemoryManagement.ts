/**
 * Memory Management Component
 * 
 * Handles conversation memory configuration and management
 */

import { Notice } from 'obsidian';
import { MemoryConfig } from '../../../types';

export interface MemoryManagementState {
    enabled: boolean;
    maxMessages: number;
    compressionThreshold: number;
    compressionRatio: number;
    autoCompress: boolean;
    addToVectorStore: boolean;
    compressionPrompt: string;
}

export class MemoryManagement {
    private plugin: any;
    private container: HTMLElement | null = null;
    private settings: MemoryConfig;
    private onUpdate: (memory: MemoryConfig) => void;

    constructor(plugin: any, settings: MemoryConfig, onUpdate: (memory: MemoryConfig) => void) {
        this.plugin = plugin;
        this.settings = settings;
        this.onUpdate = onUpdate;
    }

    render(container: HTMLElement): void {
        this.container = container;
        container.empty();

        const header = container.createEl('div', { cls: 'memory-management-header' });
        header.innerHTML = `
            <h3>💭 Conversation Memory</h3>
            <p class="description">Configure how the system manages conversation history and memory compression.</p>
        `;

        // Enable/Disable Toggle
        const enableSection = container.createEl('div', { cls: 'setting-item' });
        enableSection.innerHTML = `
            <div class="setting-item-info">
                <div class="setting-item-name">Enable Conversation Memory</div>
                <div class="setting-item-description">Track and manage conversation history with automatic compression</div>
            </div>
            <div class="setting-item-control">
                <input type="checkbox" id="memory-enabled" ${this.settings.enabled ? 'checked' : ''}>
            </div>
        `;

        const enabledCheckbox = enableSection.querySelector('#memory-enabled') as HTMLInputElement;
        enabledCheckbox.addEventListener('change', () => {
            this.settings.enabled = enabledCheckbox.checked;
            this.onUpdate(this.settings);
            this.render(container); // Re-render to show/hide options
        });

        if (!this.settings.enabled) {
            return; // Don't show other options if disabled
        }

        // Max Messages
        const maxMessagesSection = container.createEl('div', { cls: 'setting-item' });
        maxMessagesSection.innerHTML = `
            <div class="setting-item-info">
                <div class="setting-item-name">Maximum Messages</div>
                <div class="setting-item-description">Number of messages before compression is triggered</div>
            </div>
            <div class="setting-item-control">
                <input type="number" id="max-messages" min="5" max="100" value="${this.settings.maxMessages}">
            </div>
        `;

        const maxMessagesInput = maxMessagesSection.querySelector('#max-messages') as HTMLInputElement;
        maxMessagesInput.addEventListener('change', () => {
            this.settings.maxMessages = parseInt(maxMessagesInput.value) || 20;
            this.onUpdate(this.settings);
        });

        // Compression Threshold
        const thresholdSection = container.createEl('div', { cls: 'setting-item' });
        thresholdSection.innerHTML = `
            <div class="setting-item-info">
                <div class="setting-item-name">Compression Warning Threshold</div>
                <div class="setting-item-description">When to start showing compression warnings</div>
            </div>
            <div class="setting-item-control">
                <input type="number" id="compression-threshold" min="5" max="95" value="${this.settings.compressionThreshold}">
            </div>
        `;

        const thresholdInput = thresholdSection.querySelector('#compression-threshold') as HTMLInputElement;
        thresholdInput.addEventListener('change', () => {
            this.settings.compressionThreshold = parseInt(thresholdInput.value) || 15;
            this.onUpdate(this.settings);
        });

        // Compression Ratio
        const ratioSection = container.createEl('div', { cls: 'setting-item' });
        ratioSection.innerHTML = `
            <div class="setting-item-info">
                <div class="setting-item-name">Compression Ratio</div>
                <div class="setting-item-description">Percentage of messages to keep after compression (0.1 = 10%)</div>
            </div>
            <div class="setting-item-control">
                <input type="number" id="compression-ratio" min="0.1" max="0.9" step="0.1" value="${this.settings.compressionRatio}">
            </div>
        `;

        const ratioInput = ratioSection.querySelector('#compression-ratio') as HTMLInputElement;
        ratioInput.addEventListener('change', () => {
            this.settings.compressionRatio = parseFloat(ratioInput.value) || 0.3;
            this.onUpdate(this.settings);
        });

        // Auto Compress
        const autoCompressSection = container.createEl('div', { cls: 'setting-item' });
        autoCompressSection.innerHTML = `
            <div class="setting-item-info">
                <div class="setting-item-name">Automatic Compression</div>
                <div class="setting-item-description">Automatically compress when message limit is reached</div>
            </div>
            <div class="setting-item-control">
                <input type="checkbox" id="auto-compress" ${this.settings.autoCompress ? 'checked' : ''}>
            </div>
        `;

        const autoCompressCheckbox = autoCompressSection.querySelector('#auto-compress') as HTMLInputElement;
        autoCompressCheckbox.addEventListener('change', () => {
            this.settings.autoCompress = autoCompressCheckbox.checked;
            this.onUpdate(this.settings);
        });

        // Add to Vector Store
        const vectorStoreSection = container.createEl('div', { cls: 'setting-item' });
        vectorStoreSection.innerHTML = `
            <div class="setting-item-info">
                <div class="setting-item-name">Add to Vector Store</div>
                <div class="setting-item-description">Store compressed memories in the knowledge base for future retrieval</div>
            </div>
            <div class="setting-item-control">
                <input type="checkbox" id="add-to-vector-store" ${this.settings.addToVectorStore ? 'checked' : ''}>
            </div>
        `;

        const vectorStoreCheckbox = vectorStoreSection.querySelector('#add-to-vector-store') as HTMLInputElement;
        vectorStoreCheckbox.addEventListener('change', () => {
            this.settings.addToVectorStore = vectorStoreCheckbox.checked;
            this.onUpdate(this.settings);
        });

        // Compression Prompt
        const promptSection = container.createEl('div', { cls: 'setting-item' });
        promptSection.innerHTML = `
            <div class="setting-item-info">
                <div class="setting-item-name">Compression Prompt</div>
                <div class="setting-item-description">Custom prompt for how to compress conversations</div>
            </div>
            <div class="setting-item-control">
                <textarea id="compression-prompt" rows="3" style="width: 100%;">${this.settings.compressionPrompt}</textarea>
            </div>
        `;

        const promptTextarea = promptSection.querySelector('#compression-prompt') as HTMLTextAreaElement;
        promptTextarea.addEventListener('input', () => {
            this.settings.compressionPrompt = promptTextarea.value;
            this.onUpdate(this.settings);
        });

        // Memory Statistics
        this.renderMemoryStats(container);
    }

    private renderMemoryStats(container: HTMLElement): void {
        const statsSection = container.createEl('div', { cls: 'memory-stats-section' });
        statsSection.innerHTML = `
            <h4>📊 Memory Statistics</h4>
            <div class="memory-stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Current Messages:</span>
                    <span class="stat-value" id="current-messages">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Compressed Chunks:</span>
                    <span class="stat-value" id="compressed-chunks">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Memory Usage:</span>
                    <span class="stat-value" id="memory-usage">-</span>
                </div>
            </div>
            <div class="memory-actions">
                <button id="clear-memory" class="btn btn-outline">Clear Memory</button>
                <button id="refresh-stats" class="btn btn-outline">Refresh Stats</button>
            </div>
        `;

        // Clear Memory Button
        const clearButton = statsSection.querySelector('#clear-memory') as HTMLButtonElement;
        clearButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all conversation memory? This cannot be undone.')) {
                if (this.plugin.memoryManager) {
                    this.plugin.memoryManager.clearMemory();
                    new Notice('Conversation memory cleared');
                    this.updateStats();
                }
            }
        });

        // Refresh Stats Button
        const refreshButton = statsSection.querySelector('#refresh-stats') as HTMLButtonElement;
        refreshButton.addEventListener('click', () => {
            this.updateStats();
        });

        // Initial stats update
        this.updateStats();
    }

    private updateStats(): void {
        if (!this.plugin.memoryManager) return;

        const stats = this.plugin.memoryManager.getMemoryStats();
        const status = this.plugin.memoryManager.getMemoryStatus();

        const currentMessagesEl = this.container?.querySelector('#current-messages');
        const compressedChunksEl = this.container?.querySelector('#compressed-chunks');
        const memoryUsageEl = this.container?.querySelector('#memory-usage');

        if (currentMessagesEl) {
            currentMessagesEl.textContent = `${stats.totalMessages}/${this.settings.maxMessages}`;
        }

        if (compressedChunksEl) {
            compressedChunksEl.textContent = stats.compressedChunks.toString();
        }

        if (memoryUsageEl) {
            const percentage = Math.round(stats.memoryUsage * 100);
            memoryUsageEl.textContent = `${percentage}%`;
            (memoryUsageEl as HTMLElement).style.color = percentage > 80 ? '#f59e0b' : percentage > 60 ? '#3b82f6' : '#10b981';
        }
    }
}
