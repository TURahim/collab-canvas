import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Fix tldraw duplicate module imports
    // This ensures tldraw packages are only loaded once
    const originalResolve = config.resolve.alias || {};
    config.resolve.alias = {
      ...originalResolve,
      // Alias tldraw subpackages to ensure single instance
      "@tldraw/utils$": require.resolve("@tldraw/utils"),
      "@tldraw/state$": require.resolve("@tldraw/state"),
      "@tldraw/state-react$": require.resolve("@tldraw/state-react"),
      "@tldraw/store$": require.resolve("@tldraw/store"),
      "@tldraw/validate$": require.resolve("@tldraw/validate"),
      "@tldraw/tlschema$": require.resolve("@tldraw/tlschema"),
      "@tldraw/editor$": require.resolve("@tldraw/editor"),
      // Use $ to only match exact package names, not subpaths like /tldraw.css
    };
    return config;
  },
};

export default nextConfig;
