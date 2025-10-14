/**
 * CollabCanvas - AuthModal Component
 * Modal for collecting user's display name before accessing canvas
 */

"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

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

  const handleGoogleSignIn = async (): Promise<void> => {
    setLocalError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to sign in with Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const displayError = error ?? localError;
  const isLoading = loading || googleLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Logo and Subtitle */}
        <div className="mb-6 text-center">
          <div className="mb-2 flex justify-center">
            <img 
              src="/JellyBoardBanner.png" 
              alt="JellyBoard Logo" 
              className="h-16 w-auto"
            />
          </div>
          <p className="text-gray-600">Meet the new way to collaborate.</p>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isLoading}
          className="w-full mb-4 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or enter your name</span>
          </div>
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
              disabled={isLoading}
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
            disabled={isLoading || !name.trim()}
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

