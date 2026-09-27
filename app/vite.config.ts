import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";

// `npm run dev` starts the renderer and launches Electron; `npm run dev:web` runs the renderer alone.
const withElectron = process.env.ELECTRON !== "false";

const nativeExternals = ["node-pty", "tree-kill"];

export default defineConfig({
  base: "./",
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
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-context-menu",
          ],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
  server: {
    port: Number(process.env.RENDERER_PORT) || 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./electron/shared"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
