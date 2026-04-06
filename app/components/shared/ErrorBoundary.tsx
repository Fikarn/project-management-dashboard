"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <p className="mb-2 text-sm text-studio-400">{this.props.fallbackLabel ?? "Something went wrong"}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
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
