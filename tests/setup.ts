import '@testing-library/jest-dom';

// Mock Obsidian API
global.require = jest.fn();

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

global.app = mockApp;

// Mock Plugin class
class MockPlugin {
    app: typeof mockApp;
    manifest: Record<string, unknown>;

    constructor(app: typeof mockApp, manifest: Record<string, unknown>) {
        this.app = app;
        this.manifest = manifest;
    }

    addCommand(): void {}
    addSettingTab(): void {}
    addRibbonIcon(): void {}
    loadData(): Promise<unknown> { return Promise.resolve({}); }
    saveData(): Promise<void> { return Promise.resolve(); }
}

global.Plugin = MockPlugin;

// Mock Modal class
class MockModal {
    constructor() {}
    open(): void {}
    close(): void {}
}

global.Modal = MockModal;

// Mock Notice
global.Notice = jest.fn();