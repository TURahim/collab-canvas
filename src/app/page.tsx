/**
 * Home Page
 * Main entry point - redirects to rooms list
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoomsPath } from "../lib/paths";
import LoadingSpinner from "../components/LoadingSpinner";

/**
 * Page - Home page component
 * 
 * Redirects to /rooms for multi-room support
 * 
 * @returns Loading state while redirecting
 */
export default function Page(): React.JSX.Element {
  const router = useRouter();

  useEffect(() => {
    // Redirect to rooms page
    router.push(getRoomsPath());
  }, [router]);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Redirecting to rooms...</p>
      </div>
    </main>
  );
}

