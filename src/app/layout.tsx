/**
 * Root Layout
 * Next.js App Router root layout with fonts, error boundary, and global components
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import ConnectionStatus from "../components/ConnectionStatus";
import ErrorBoundary from "../components/ErrorBoundary";
import "./globals.css";

// Font configurations
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Application metadata
 * Used for SEO and browser display
 */
export const metadata: Metadata = {
  title: "CollabCanvas - Real-time Collaborative Whiteboard",
  description: "Collaborate in real-time with multiple users on an infinite canvas. Draw, create, and share ideas together.",
};

/**
 * RootLayout - Next.js root layout component
 * 
 * Features:
 * - Google Geist fonts loaded and configured
 * - ErrorBoundary wrapping entire app
 * - ConnectionStatus for offline detection
 * - Global CSS styles
 * 
 * @param props - Layout props containing children
 * @returns HTML document structure
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
          <ConnectionStatus />
        </ErrorBoundary>
      </body>
    </html>
  );
}
