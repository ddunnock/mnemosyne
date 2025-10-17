import '@testing-library/jest-dom';

// Mock Obsidian API
(global as any).require = jest.fn();

// Mock Obsidian classes and objects
const mockApp = {
    vault: {
        adapter: {
            fs: {
                promises: {
                    readdir: jest.fn(),
                    readFile: jest.fn(),
                    writeFile: jest.fn()
                }
            }
        },
        getFiles: jest.fn(() => []),
        read: jest.fn(),
        modify: jest.fn()
    },
    workspace: {
        getLeftLeaf: jest.fn(),
        getRightLeaf: jest.fn(),
        on: jest.fn()
    },
    metadataCache: {
        getFileCache: jest.fn(),
        on: jest.fn()
    }
};

(global as any).app = mockApp;

// Mock Plugin class with proper inheritance
class MockPlugin {
    app: typeof mockApp;
    manifest: Record<string, unknown>;
    
    // Plugin properties
    description = 'Mock Plugin';
    filename = 'mock-plugin';
    length = 0;
    name = 'MockPlugin';
    
    constructor(app: typeof mockApp, manifest: Record<string, unknown>) {
        this.app = app;
        this.manifest = manifest;
    }

    // Plugin lifecycle methods
    onload(): void | Promise<void> { return Promise.resolve(); }
    onunload(): void | Promise<void> { return Promise.resolve(); }
    
    // Plugin utility methods
    addCommand(): void {}
    addSettingTab(): void {}
    addRibbonIcon(): void {}
    addStatusBarItem(): HTMLElement { return document.createElement('div'); }
    registerView(): void {}
    registerHoverLinkSource(): void {}
    registerMarkdownCodeBlockProcessor(): void {}
    registerMarkdownPostProcessor(): void {}
    registerObsidianProtocolHandler(): void {}
    registerEditorExtension(): void {}
    registerEvent(): void {}
    registerDomEvent(): void {}
    registerInterval(): number { return 0; }
    
    // Data methods
    loadData(): Promise<unknown> { return Promise.resolve({}); }
    saveData(): Promise<void> { return Promise.resolve(); }
}

// Type assertion to satisfy TypeScript
(global as any).Plugin = MockPlugin;

// Mock Modal class
class MockModal {
    constructor() {}
    open(): void {}
    close(): void {}
}

(global as any).Modal = MockModal;

// Mock Notice
(global as any).Notice = jest.fn();
