/**
 * Global type declarations for Jest test environment
 */

declare global {
    const app: any;
    const Plugin: any;
    const Modal: any;
    const Notice: any;
    const require: jest.MockedFunction<any>;
}

export {};