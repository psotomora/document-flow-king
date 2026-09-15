// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Despliegue propio (IIS/Windows): fuera del entorno de Lovable la compilación
// SIEMPRE debe producir un servidor Node autónomo (.output/server/index.mjs con
// listen), nunca un artefacto de Cloudflare Workers. Por eso fijamos el preset
// explícitamente; dentro del entorno de Lovable el plugin lo sobreescribe solo.
// Se puede forzar otro destino con NITRO_PRESET.
const preset = process.env["NITRO_PRESET"] || "node-server";

// Publicación bajo subcarpeta (por ejemplo http://servidor/cashflow): defina
// APP_BASE_PATH="/cashflow" antes de compilar. Vite sirve los estáticos desde
// ese prefijo y el router usa el mismo valor (import.meta.env.BASE_URL).
// Sin la variable, la aplicación se publica en la raíz del sitio.
// Alternativa sin variables de entorno: escriba la subcarpeta en el archivo
// ruta-base.txt en la raíz del proyecto (una sola línea, por ejemplo /cashflow).
function leerRutaBaseDeArchivo(): string {
  try {
    const archivo = resolve(process.cwd(), "ruta-base.txt");
    if (!existsSync(archivo)) return "";
    return readFileSync(archivo, "utf8").split("\n")[0]?.trim() ?? "";
  } catch {
    return "";
  }
}

const rutaBase = (() => {
  const valor = (process.env["APP_BASE_PATH"] || leerRutaBaseDeArchivo() || "/").trim();
  if (valor === "" || valor === "/" || valor.startsWith("#")) return "/";
  return `/${valor.replace(/^\/+|\/+$/g, "")}/`;
})();

console.log(`[vite] Ruta base de la aplicación: ${rutaBase}`);

export default defineConfig({
  vite: {
    base: rutaBase,
    build: {
      // La hoja principal usa un nombre estable para que SSR pueda incluirla
      // explícitamente aun cuando la aplicación se publique en una subcarpeta.
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) =>
            assetInfo.names.some((nombre) => nombre.endsWith(".css"))
              ? "assets/app.css"
              : "assets/[name]-[hash][extname]",
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Nitro conserva sus archivos físicos en /assets. El wrapper de src/server.ts
  // traduce solo las solicitudes /<subcarpeta>/assets sin afectar las páginas.
  nitro: { preset },
});

