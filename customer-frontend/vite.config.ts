// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
//
// ISOLATED APPLICATION
// --------------------
// The Customer app is self-contained: every module it compiles lives under
// ./src (API clients in ./src/api, shared UI/types in ./src/shared). It does
// NOT read from ../shared, ../backend or any other frontend, so this directory
// alone is enough for `npm run build` and for an independent deployment.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const resolvePath = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

// Production deploy target.
// Lovable's sandbox/preview always builds the Cloudflare worker target; that is
// forced by @lovable.dev/vite-tanstack-config and is left untouched.
// Outside the sandbox (e.g. Render), set NITRO_PRESET=node-server to emit a
// plain Node.js server build. Unset => unchanged default behaviour.
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
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
