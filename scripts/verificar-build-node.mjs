// Verifica que la compilación generó un servidor Node autónomo para IIS/Windows
// y no un artefacto de Cloudflare Workers.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const raiz = process.cwd();
const servidor = resolve(raiz, ".output/server/index.mjs");
const wrangler = resolve(raiz, ".output/server/wrangler.json");

function fallar(mensaje) {
  console.error("\n[verificar-build-node] " + mensaje);
  console.error(
    "Borre la carpeta .output y vuelva a compilar con: npm run build:node\n",
  );
  process.exit(1);
}

if (!existsSync(servidor)) {
  fallar("No se encontró .output/server/index.mjs.");
}

if (existsSync(wrangler)) {
  fallar(
    "Se encontró .output/server/wrangler.json: la compilación quedó destinada a Cloudflare Workers.",
  );
}

const contenido = readFileSync(servidor, "utf8");
const pareceWorker = /export\s+default\s*\{[\s\S]{0,200}fetch\s*\(/.test(contenido);
const pareceNode = /listen\s*\(/.test(contenido) || contenido.includes("node-server");

if (pareceWorker && !pareceNode) {
  fallar(
    "El servidor generado exporta un handler fetch() de Workers y no abre un puerto.",
  );
}

console.log(
  "[verificar-build-node] OK: .output/server/index.mjs es un servidor Node autónomo.",
);
