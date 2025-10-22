/**
 * Base Tab Interface
 * All settings tabs should extend this
 */

export interface BaseTab {
    /**
     * Render the tab content
     */
    render(): string;

    /**
     * Attach event listeners after rendering
     * Called automatically after the tab content is inserted into the DOM
     */
    attachEventListeners(container: HTMLElement): void;

    /**
     * Cleanup when tab is switched away
     * Optional - override if needed
     */
    cleanup?(): void;
}

export type TabId = 'quick-start' | 'providers' | 'agents' | 'knowledge' | 'advanced';

export interface TabDefinition {
    id: TabId;
    label: string;
    icon: string;
    instance: BaseTab;
}
