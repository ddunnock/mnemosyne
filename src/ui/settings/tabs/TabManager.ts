/**
 * Tab Manager
 * Handles tab switching and lifecycle
 */

import { BaseTab, TabId, TabDefinition } from './BaseTab';

export class TabManager {
    private tabs: Map<TabId, TabDefinition> = new Map();
    private activeTabId: TabId;
    private container: HTMLElement;

    constructor(container: HTMLElement, initialTab: TabId = 'quick-start') {
        this.container = container;
        this.activeTabId = initialTab;
    }

    /**
     * Register a tab
     */
    registerTab(definition: TabDefinition): void {
        this.tabs.set(definition.id, definition);
    }

    /**
     * Switch to a tab
     */
    switchTab(tabId: TabId): void {
        // Cleanup previous tab
        const previousTab = this.tabs.get(this.activeTabId);
        if (previousTab?.instance.cleanup) {
            previousTab.instance.cleanup();
        }

        // Update active tab
        this.activeTabId = tabId;

        // Render new tab
        this.renderActiveTab();
    }

    /**
     * Render the currently active tab
     */
    renderActiveTab(): void {
        const tabDef = this.tabs.get(this.activeTabId);
        if (!tabDef) {
            console.error(`Tab not found: ${this.activeTabId}`);
            return;
        }

        // Render tab content
        const contentContainer = this.container.querySelector('.settings-tab-content') as HTMLElement;
        if (!contentContainer) {
            console.error('Tab content container not found');
            return;
        }

        contentContainer.innerHTML = tabDef.instance.render();

        // Attach event listeners
        tabDef.instance.attachEventListeners(contentContainer);

        // Update active tab button
        this.updateTabButtons();
    }

    /**
     * Update tab button states
     */
    private updateTabButtons(): void {
        const tabButtons = this.container.querySelectorAll('.settings-tab');
        tabButtons.forEach(button => {
            const tabId = button.getAttribute('data-tab');
            if (tabId === this.activeTabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Attach click handlers to tab buttons
     */
    attachTabButtonHandlers(): void {
        const tabButtons = this.container.querySelectorAll('.settings-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab') as TabId;
                if (tabId && tabId !== this.activeTabId) {
                    this.switchTab(tabId);
                }
            });
        });
    }

    /**
     * Get all registered tabs
     */
    getTabs(): TabDefinition[] {
        return Array.from(this.tabs.values());
    }

    /**
     * Get active tab ID
     */
    getActiveTabId(): TabId {
        return this.activeTabId;
    }
}
