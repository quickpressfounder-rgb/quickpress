// QuickPress Laundry Partner App Vite Configuration
// Bundles TanStack Start, React 19, Tailwind CSS v4, Nitro, and TypeScript path aliases.
//
// ISOLATED APPLICATION
// --------------------
// The Partner app is self-contained: every module it compiles lives under
// ./src (API clients in ./src/api, shared UI/types in ./src/shared).
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const resolvePath = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

// Production deploy target: set NITRO_PRESET=node-server to emit a Node.js server build.
const nitroPreset = process.env["NITRO_PRESET"];

export default defineConfig({
  ...(nitroPreset ? { nitro: { preset: nitroPreset } } : {}),
  tanstackStart: {
    srcDirectory: "src",
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Environment files live at the repository root so one .env can configure
    // every app during local development.
    envDir: resolvePath("../"),
  },
});
