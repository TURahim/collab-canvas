import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Fix tldraw duplicate module imports
    // This ensures tldraw packages are only loaded once
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tldraw/utils": require.resolve("@tldraw/utils"),
      "@tldraw/state": require.resolve("@tldraw/state"),
      "@tldraw/state-react": require.resolve("@tldraw/state-react"),
      "@tldraw/store": require.resolve("@tldraw/store"),
      "@tldraw/validate": require.resolve("@tldraw/validate"),
      "@tldraw/tlschema": require.resolve("@tldraw/tlschema"),
      "@tldraw/editor": require.resolve("@tldraw/editor"),
      "@tldraw/tldraw": require.resolve("@tldraw/tldraw"),
      "tldraw": require.resolve("tldraw"),
    };
    return config;
  },
};

export default nextConfig;
