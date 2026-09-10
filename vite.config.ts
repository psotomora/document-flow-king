// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Despliegue propio (IIS/Windows): fuera del entorno de Lovable la compilación
// SIEMPRE debe producir un servidor Node autónomo (.output/server/index.mjs con
// listen), nunca un artefacto de Cloudflare Workers. Por eso fijamos el preset
// explícitamente; dentro del entorno de Lovable el plugin lo sobreescribe solo.
// Se puede forzar otro destino con NITRO_PRESET.
const preset = process.env["NITRO_PRESET"] || "node-server";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: { preset },
});

