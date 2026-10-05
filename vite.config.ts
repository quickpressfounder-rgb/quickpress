// QuickPress Multi-App Vite Configuration
// Bundles TanStack Start, React 19, Tailwind CSS v4, Nitro, and TypeScript path aliases.
//
// PRODUCTION PARTNER ENTRY POINT (default)
// ----------------------------------------
// The root build compiles the production Partner application in ./partner-frontend/src.
//
// APP SWITCH
// ----------
// Override target frontend explicitly via QUICKPRESS_APP:
//   QUICKPRESS_APP=partner  -> Partner App
//   QUICKPRESS_APP=customer -> Customer App
//   QUICKPRESS_APP=admin    -> Admin Console
//   QUICKPRESS_APP=rider    -> Delivery Captain App
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

const explicitApp = process.env["QUICKPRESS_APP"];
const isDevServer = process.argv.includes("dev") || process.argv.includes("serve");
const APP = ["customer", "partner", "rider", "admin"].includes(explicitApp ?? "")
  ? (explicitApp as "customer" | "partner" | "rider" | "admin")
  : isDevServer
    ? "customer"
    : "partner";
const APP_SRC_DIR = `${APP}-frontend/src`;
const PARTNER_SRC = resolvePath(`./${APP_SRC_DIR}/`);



export default defineConfig({
  tanstackStart: {
    // Build the selected application source instead of the legacy ./src app.
    srcDirectory: APP_SRC_DIR,
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },

  vite: {
    // Resolve bare package imports made from files under ./shared (and ./backend),
    // which are outside the app source directory.
    plugins: [
      {
        name: "quickpress-resolve-external-workspace-deps",
        enforce: "pre" as const,
        async resolveId(this: any, source: string, importer: string | undefined, options: any) {
          if (!importer) return null;
          const normalized = importer.split("\\").join("/");
          if (!/\/(shared|backend)\/src\//.test(normalized)) return null;
          if (
            source.startsWith(".") ||
            source.startsWith("/") ||
            source.startsWith("@shared/") ||
            source.startsWith("@backend/") ||
            source.startsWith("virtual:") ||
            source.startsWith("node:")
          ) {
            return null;
          }
          const resolved = await this.resolve(source, `${PARTNER_SRC}router.tsx`, {
            ...options,
            skipSelf: true,
          });
          return resolved ?? null;
        },
      },
    ],
    cacheDir: resolvePath(`./node_modules/.vite-${APP}`),
    optimizeDeps: {
      exclude: ["@capacitor/app", "@capacitor/core", "@capacitor/android"],
    },
    build: {
      target: "es2022",
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) {
                return "vendor-react";
              }
              if (id.includes("@tanstack")) {
                return "vendor-tanstack";
              }
              if (id.includes("lucide-react") || id.includes("@radix-ui")) {
                return "vendor-ui";
              }
              if (id.includes("socket.io-client")) {
                return "vendor-socket";
              }
              if (id.includes("recharts")) {
                return "vendor-charts";
              }
            }
          },
        },
      },
    },
    resolve: {
      alias: [
        // "@/..." must point at the Partner app source, not the legacy ./src app.
        { find: /^@\//, replacement: PARTNER_SRC },
        { find: /^@shared\//, replacement: `${resolvePath("./shared/src/")}` },
        { find: /^@backend\//, replacement: `${resolvePath("./backend/src/")}` },
      ],
    },
  },
});
