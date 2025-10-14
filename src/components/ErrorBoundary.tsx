"use client";

import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Minimal reporting; in production, forward to monitoring service
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught error", { error, errorInfo });
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl">
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Something went wrong</h2>
            <p className="mb-4 text-center text-gray-600">
              {this.state.errorMessage}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


