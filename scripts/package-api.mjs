import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { versionProyecto } from "./version-proyecto.mjs";

export function empaquetarApi(raiz = process.cwd(), publicar = spawnSync) {
  const proyecto = join(raiz, "api/FlujoEfectivo.Api/FlujoEfectivo.Api.csproj");
  if (!existsSync(proyecto)) throw new Error("Falta api/FlujoEfectivo.Api/FlujoEfectivo.Api.csproj. Ejecute desde la raíz del proyecto.");
  const version = versionProyecto(proyecto);
  const nombre = `cashflow-api-${version}.zip`;
  const temporal = mkdtempSync(join(tmpdir(), "cashflow-api-package-"));
  const salida = join(temporal, "publicado");
  const contenido = join(temporal, "contenido");
  const archivoZip = join(temporal, nombre);
  try {
    // Una carpeta nueva evita incluir DLL obsoletas o configuración de compilaciones anteriores.
    const compilacion = publicar("dotnet", ["publish", proyecto, "-c", "Release", "-o", salida], { cwd: raiz, stdio: "inherit" });
    if (compilacion.error || compilacion.status !== 0) throw new Error(`No se pudo compilar la API. Instale el SDK de .NET 8 y revise los errores de dotnet publish. ${compilacion.error?.message ?? ""}`);
    for (const archivo of ["FlujoEfectivo.Api.dll", "FlujoEfectivo.Api.deps.json", "FlujoEfectivo.Api.runtimeconfig.json", "web.config"]) {
      if (!existsSync(join(salida, archivo))) throw new Error(`Publicación incompleta: falta ${archivo}. No se creó un ZIP nuevo.`);
    }
    mkdirSync(contenido);
    cpSync(salida, contenido, {
      recursive: true, dereference: true,
      filter: (ruta) => {
        const archivo = basename(ruta).toLowerCase();
        return archivo !== ".git" && archivo !== ".env" && !archivo.startsWith(".env.") &&
          !/^appsettings(?:\..+)?\.json$/.test(archivo) &&
          !["logs", "bin", "obj"].includes(archivo) &&
          !/\.(?:pfx|p12|pem|key|lic|sql)$/.test(archivo);
      },
    });
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
    console.log(`[package:api] Paquete creado: ${empaquetarApi()}`);
    console.log("Solo API; sin web ni SQL. Conserve los appsettings y el web.config existentes en IIS. El paquete no incluye configuración, credenciales ni certificados.");
  } catch (error) {
    console.error(`[package:api] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}