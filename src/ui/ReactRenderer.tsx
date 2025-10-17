import React from 'react';
import { createRoot, Root } from 'react-dom/client';

export interface ReactRendererOptions {
    strictMode?: boolean;
    errorBoundary?: boolean;
}

export class ReactRenderer {
    private root: Root | null = null;
    private container: HTMLElement | null = null;
    private options: ReactRendererOptions;

    constructor(options: ReactRendererOptions = {}) {
        this.options = {
            strictMode: true,
            errorBoundary: true,
            ...options
        };
    }

    mount(container: HTMLElement, component: React.ReactElement): void {
        if (this.root && this.container !== container) {
            this.unmount();
        }

        this.container = container;

        if (!this.root) {
            // Clear container
            container.innerHTML = '';
            this.root = createRoot(container);
        }

        const wrappedComponent = this.wrapComponent(component);
        this.root.render(wrappedComponent);
    }

    unmount(): void {
        if (this.root) {
            this.root.unmount();
            this.root = null;
            this.container = null;
        }
    }

    update(component: React.ReactElement): void {
        if (this.root) {
            const wrappedComponent = this.wrapComponent(component);
            this.root.render(wrappedComponent);
        } else {
            console.warn('ReactRenderer: Cannot update without mounting first');
        }
    }

    private wrapComponent(component: React.ReactElement): React.ReactElement {
        let wrappedComponent = component;

        if (this.options.errorBoundary) {
            wrappedComponent = (
                <ErrorBoundary>
                    {wrappedComponent}
                </ErrorBoundary>
            );
        }

        if (this.options.strictMode) {
            wrappedComponent = (
                <React.StrictMode>
                    {wrappedComponent}
                </React.StrictMode>
            );
        }

        return wrappedComponent;
    }

    isActive(): boolean {
        return this.root !== null;
    }
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('React component error:', error);
        console.error('Error info:', errorInfo);

        this.setState({
            hasError: true,
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="mnemosyne-container p-6 text-center">
                    <div className="mnemosyne-card p-6">
                        <h2 className="text-lg font-semibold text-ob-error mb-4">
                            Something went wrong
                        </h2>
                        <p className="text-ob-text-muted mb-4">
                            An unexpected error occurred in the Mnemosyne interface.
                        </p>
                        <details className="text-left">
                            <summary className="cursor-pointer text-ob-text-muted text-sm mb-2">
                                Error Details
                            </summary>
                            <pre className="bg-ob-background-secondary p-3 rounded text-xs overflow-x-auto">
                {this.state.error?.message}
              </pre>
                        </details>
                        <button
                            className="mnemosyne-button mnemosyne-button-secondary mt-4"
                            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}