/**
 * ErrorBoundary Component
 * React error boundary for catching and displaying errors gracefully
 */

"use client";

import React from "react";

/**
 * State for ErrorBoundary component
 */
type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 * 
 * Features:
 * - Catches errors in child components
 * - Displays user-friendly error message
 * - Provides reload button to recover
 * - Logs errors to console (can be extended for monitoring services)
 * 
 * Usage: Wrap your component tree with <ErrorBoundary>...</ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: null };

  /**
   * Static method called when an error is thrown in a child component
   * Updates state to trigger fallback UI
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message ?? "Unknown error" };
  }

  /**
   * Lifecycle method called after an error is caught
   * Used for error logging and reporting
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    // In production, forward to monitoring service (e.g., Sentry)
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught error", { error, errorInfo });
  }

  /**
   * Reloads the page to recover from error state
   */
  handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
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


