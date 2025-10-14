/**
 * CollabCanvas - AuthModal Component
 * Modal for collecting user's display name before accessing canvas
 */

"use client";

import type { FormEvent } from "react";
import { useState } from "react";

/**
 * Props for AuthModal component
 */
interface AuthModalProps {
  onSubmit: (name: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

// Validation constants
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 30;

/**
 * AuthModal - Collects user's display name before entering the canvas
 * Features:
 * - Name validation (2-30 characters)
 * - Loading state with spinner
 * - Error display (local and prop-based)
 * - Accessible form with proper labels
 * 
 * @param props - Component props
 * @returns Modal dialog for name entry
 */
export default function AuthModal({ onSubmit, loading = false, error }: AuthModalProps): React.JSX.Element {
  const [name, setName] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLocalError(null);

    const trimmedName = name.trim();

    // Validation
    if (!trimmedName) {
      setLocalError("Please enter your name");
      return;
    }

    if (trimmedName.length < MIN_NAME_LENGTH) {
      setLocalError(`Name must be at least ${MIN_NAME_LENGTH} characters`);
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setLocalError(`Name must be less than ${MAX_NAME_LENGTH} characters`);
      return;
    }

    try {
      await onSubmit(trimmedName);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to set name");
    }
  };

  const displayError = error ?? localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome to CollabCanvas</h1>
          <p className="text-gray-600">Enter your name to start collaborating</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="displayName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              disabled={loading}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {displayError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading...</span>
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Your name will be visible to other users on the canvas
        </p>
      </div>
    </div>
  );
}

