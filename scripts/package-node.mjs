import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function empaquetarNode(raiz = process.cwd()) {
  const salida = join(raiz, ".output");
  for (const archivo of ["server/index.mjs", "public/assets/app.css", "public/favicon.png", "public/favicon.ico", "public/apple-touch-icon.png"]) {
    if (!existsSync(join(salida, archivo))) throw new Error(`Falta .output/${archivo}. Ejecute npm run build:node.`);
  }
  if (existsSync(join(salida, "server/wrangler.json"))) throw new Error("La salida es de Cloudflare Workers, no de Node para IIS.");
  const configuracionIis = join(raiz, "public/web.config");
  if (!existsSync(configuracionIis)) throw new Error("Falta public/web.config para IIS.");
  const { version } = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error("La versión debe tener el formato mayor.menor.parche.");
  const nombre = `cashflow-deploy-${version}.zip`;
  const temporal = mkdtempSync(join(tmpdir(), "cashflow-package-"));
  const contenido = join(temporal, "contenido");
  const archivoZip = join(temporal, nombre);
  try {
    mkdirSync(contenido);
    cpSync(salida, contenido, {
      recursive: true, dereference: true,
      filter: (ruta) => {
        const nombreArchivo = basename(ruta);
        return nombreArchivo !== ".git" && nombreArchivo !== ".env" &&
          !(nombreArchivo.startsWith(".env.") && nombreArchivo !== ".env.example");
      },
    });
    cpSync(configuracionIis, join(contenido, "web.config"));
    const windows = process.platform === "win32";
    const resultado = windows
      ? spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
          "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($env:CASHFLOW_PACKAGE_SOURCE, $env:CASHFLOW_PACKAGE_ZIP)"],
          { encoding: "utf8", env: { ...process.env, CASHFLOW_PACKAGE_SOURCE: contenido, CASHFLOW_PACKAGE_ZIP: archivoZip } })
      : spawnSync("zip", ["-q", "-r", archivoZip, "."], { cwd: contenido, encoding: "utf8" });
    if (resultado.error || resultado.status !== 0) throw new Error(`No se pudo crear el ZIP. ${windows ? "Revise PowerShell." : "Instale la utilidad zip."} ${resultado.error?.message ?? resultado.stderr ?? ""}`);
    const destino = join(raiz, nombre);
    const pendiente = `${destino}.tmp`;
    try {
      // La copia admite directorios temporales en otro disco.
      cpSync(archivoZip, pendiente);
      renameSync(pendiente, destino);
    } finally {
      rmSync(pendiente, { force: true });
    }
    return destino;
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(`[package:node] Paquete creado: ${empaquetarNode()}`);
    console.log("Reinicie FlujoEfectivoWeb después de copiar server/ y public/. No incluye API ni SQL; conserve la configuración IIS existente.");
  } catch (error) {
    console.error(`[package:node] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}