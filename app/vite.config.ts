import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";

// `npm run dev` starts the renderer and launches Electron; `npm run dev:web` runs the renderer alone.
const withElectron = process.env.ELECTRON !== "false";

const nativeExternals = ["node-pty", "tree-kill"];

export default defineConfig({
  // Electron loads the build via file://, so assets need relative paths ("./"). The web build
  // is served over http(s) with client-side routing (BrowserRouter) at nested paths like
  // /auth/sign-in, so it needs an absolute base — otherwise relative asset URLs resolve against
  // the current route path, 404, and the SPA fallback serves index.html for them instead of the
  // JS, which fails with "Expected a JavaScript-or-Wasm module script but the server responded
  // with a MIME type of text/html".
  base: withElectron ? "./" : "/",
  plugins: [
    react(),
    tailwindcss(),
    withElectron &&
      electron({
        main: {
          entry: "electron/main.ts",
          vite: {
            build: {
              outDir: "dist-electron",
              rollupOptions: { external: nativeExternals },
            },
          },
        },
        preload: {
          input: "electron/preload.ts",
          vite: {
            build: {
              outDir: "dist-electron",
              rollupOptions: {
                output: { format: "cjs", entryFileNames: "preload.cjs", inlineDynamicImports: true },
              },
            },
          },
        },
      }),
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Stable vendor chunks: faster startup and better caching between app updates.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query", "axios", "zustand"],
          xterm: ["@xterm/xterm", "@xterm/addon-fit", "@xterm/addon-web-links"],
          "base-ui": ["@base-ui/react"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["@dev-station/ui"],
  },
  server: {
    port: Number(process.env.RENDERER_PORT) || 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./electron/shared"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
