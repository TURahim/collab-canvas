import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Next.js dev indicator position
  devIndicators: {
    position: 'bottom-right',
  },
  // Transpile tldraw packages to fix multiple instance warning
  // This ensures tldraw libraries are bundled consistently as ES modules
  // and prevents the "multiple instances" error in the browser
  transpilePackages: [
    '@tldraw/tldraw',
    '@tldraw/editor',
    '@tldraw/store',
    '@tldraw/state',
    '@tldraw/state-react',
    '@tldraw/tlschema',
    '@tldraw/utils',
    '@tldraw/validate',
  ],
};

export default nextConfig;
