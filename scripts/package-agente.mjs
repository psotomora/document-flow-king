// Empaqueta el agente local (AplixCashFlowAgente) en un ZIP versionado listo para
// copiar al servidor del cliente. Patrón equivalente a package-api.mjs.
import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { versionProyecto } from "./version-proyecto.mjs";

export function empaquetarAgente(raiz = process.cwd(), publicar = spawnSync) {
  const proyecto = join(raiz, "agente/AplixCashFlowAgente/AplixCashFlowAgente.csproj");
  if (!existsSync(proyecto)) throw new Error("Falta agente/AplixCashFlowAgente/AplixCashFlowAgente.csproj. Ejecute desde la raíz del proyecto.");
  const version = versionProyecto(proyecto);
  const nombre = `cashflow-agente-${version}.zip`;
  const temporal = mkdtempSync(join(tmpdir(), "cashflow-agente-package-"));
  const salida = join(temporal, "publicado");
  const contenido = join(temporal, "contenido");
  const archivoZip = join(temporal, nombre);
  try {
    // Una carpeta nueva evita incluir binarios obsoletos de compilaciones anteriores.
    // win-x64 autocontenido: el servidor del cliente no necesita instalar .NET.
    const compilacion = publicar("dotnet", ["publish", proyecto, "-c", "Release", "-r", "win-x64", "--self-contained", "true", "-p:PublishSingleFile=true", "-p:IncludeNativeLibrariesForSelfExtract=true", "-p:DebugType=None", "-o", salida], { cwd: raiz, stdio: "inherit" });
    if (compilacion.error || compilacion.status !== 0) throw new Error(`No se pudo compilar el agente. Instale el SDK de .NET 8 y revise los errores de dotnet publish. ${compilacion.error?.message ?? ""}`);
    for (const archivo of ["AplixCashFlowAgente.exe", "appsettings.json"]) {
      if (!existsSync(join(salida, archivo))) throw new Error(`Publicación incompleta: falta ${archivo}. No se creó un ZIP nuevo.`);
    }
    mkdirSync(contenido);
    // Ejecutable único + plantilla de configuración; nada más del publish (sin cientos de DLL).
    for (const archivo of ["AplixCashFlowAgente.exe", "appsettings.json"]) cpSync(join(salida, archivo), join(contenido, archivo));
    const distribucion = join(raiz, "agente/AplixCashFlowAgente/distribucion");
    for (const archivo of ["instalar-servicio.bat", "desinstalar-servicio.bat", "probar-consola.bat", "LEAME.txt"]) {
      if (!existsSync(join(distribucion, archivo))) throw new Error(`Falta agente/AplixCashFlowAgente/distribucion/${archivo}.`);
      cpSync(join(distribucion, archivo), join(contenido, archivo));
    }
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
    console.log(`[package:agente] Paquete creado: ${empaquetarAgente()}`);
    console.log("Solo agente. Copie el contenido al servidor del cliente, edite appsettings.json (ApiUrl, Token, cadena Softland) y pruebe con AplixCashFlowAgente.exe. Si ya existe un appsettings.json configurado, consérvelo.");
  } catch (error) {
    console.error(`[package:agente] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
