"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  private handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <p className="mb-2 text-sm text-studio-400">{this.props.fallbackLabel ?? "Something went wrong"}</p>
            <button
              onClick={this.handleRetry}
              className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Top-level error boundary that wraps the entire app with a full-screen fallback. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-studio-950 text-studio-300">
          <div className="text-center">
            <h1 className="mb-2 text-lg font-semibold text-studio-100">Something went wrong</h1>
            <p className="mb-4 text-sm text-studio-400">The application encountered an unexpected error.</p>
            {this.state.errorMessage && (
              <p className="mb-4 rounded bg-studio-900 px-3 py-2 font-mono text-xs text-studio-500">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
