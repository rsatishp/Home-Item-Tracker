import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from 'vite-plugin-pwa';

const isBuildMode = process.argv.includes("build");

const rawPort = process.env.PORT;
if (!isBuildMode && !rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}
const port = rawPort ? Number(rawPort) : 3000;
if (!isBuildMode && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Home Tracker',
        short_name: 'HomeTracker',
        description: 'Track where things are around your home',
        theme_color: '#5e8a71',
        background_color: '#f9f8f5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: basePath,
        scope: basePath,
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
