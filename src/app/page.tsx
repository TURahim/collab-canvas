/**
 * Home Page
 * Main entry point for the collaborative canvas application
 */

"use client";

import CollabCanvas from "../components/CollabCanvas";

/**
 * Page - Home page component
 * 
 * Features:
 * - Full viewport height main container
 * - CollabCanvas as the primary UI
 * 
 * @returns Home page with collaborative canvas
 */
export default function Page(): React.JSX.Element {
  return (
    <main className="h-screen">
      <CollabCanvas />
    </main>
  );
}

