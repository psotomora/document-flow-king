import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { empaquetarNode } from "./package-node.mjs";

function fixture(t) {
  const raiz = mkdtempSync(join(tmpdir(), "cashflow-package-test-"));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  const escribir = (ruta, texto = "fixture") => {
    const destino = join(raiz, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, texto);
  };
  escribir("package.json", JSON.stringify({ version: "1.38.39" }));
  for (const ruta of ["server/index.mjs", "public/assets/app.css", "public/favicon.png", "public/favicon.ico", "public/apple-touch-icon.png"]) escribir(`.output/${ruta}`);
  escribir("public/web.config", "<configuration />");
  return { raiz, escribir };
}

test("genera ZIP versionado con estructura desplegable y sin configuración privada", (t) => {
  const { raiz, escribir } = fixture(t);
  escribir(".output/server/node_modules/tslib/index.js");
  escribir(".output/.env", "PRIVATE_FIXTURE");
  escribir(".output/.git/config");
  escribir("src/no-incluir.ts");
  const zip = empaquetarNode(raiz);
  assert.equal(zip, join(raiz, "cashflow-deploy-1.38.39.zip"));
  assert.equal(existsSync(zip), true);
  const lectura = process.platform === "win32"
    ? spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead($env:CASHFLOW_TEST_ZIP); try { $zip.Entries.FullName } finally { $zip.Dispose() }"], { encoding: "utf8", env: { ...process.env, CASHFLOW_TEST_ZIP: zip } })
    : spawnSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  assert.equal(lectura.status, 0, lectura.stderr);
  const entradas = lectura.stdout.replaceAll("\\", "/").split(/\r?\n/).map((ruta) => ruta.replace(/^\.\//, ""));
  for (const ruta of ["server/index.mjs", "server/node_modules/tslib/index.js", "public/assets/app.css", "public/apple-touch-icon.png", "web.config"]) assert.ok(entradas.includes(ruta), ruta);
  assert.ok(!entradas.some((ruta) => ruta.startsWith("src/") || ruta.startsWith(".git/") || ruta === ".env"));
});

test("rechaza una salida incompleta antes de crear el ZIP", (t) => {
  const { raiz } = fixture(t);
  rmSync(join(raiz, ".output/public/assets/app.css"));
  assert.throws(() => empaquetarNode(raiz), /Falta .output\/public\/assets\/app.css/);
  assert.equal(existsSync(join(raiz, "cashflow-deploy-1.38.39.zip")), false);
});

test("rechaza artefactos Worker en lugar de empaquetarlos para IIS", (t) => {
  const { raiz, escribir } = fixture(t);
  escribir(".output/server/wrangler.json", "{}");
  assert.throws(() => empaquetarNode(raiz), /Cloudflare Workers/);
});