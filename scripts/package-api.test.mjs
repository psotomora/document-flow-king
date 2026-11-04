import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { empaquetarApi } from "./package-api.mjs";

function fixture(t) {
  const raiz = mkdtempSync(join(tmpdir(), "cashflow-api-test-"));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  const escribir = (ruta, texto = "fixture") => {
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, texto);
  };
  escribir(join(raiz, "package.json"), JSON.stringify({ version: "1.38.68" }));
  escribir(join(raiz, "api/FlujoEfectivo.Api/FlujoEfectivo.Api.csproj"), "<Project><PropertyGroup><Version>1.38.64</Version></PropertyGroup></Project>");
  let salida;
  const publicar = (comando, args, opciones) => {
    assert.equal(comando, "dotnet");
    assert.deepEqual(args.slice(0, 4), ["publish", join(raiz, "api/FlujoEfectivo.Api/FlujoEfectivo.Api.csproj"), "-c", "Release"]);
    assert.equal(args[4], "-o");
    assert.equal(opciones.cwd, raiz);
    salida = args[5];
    assert.equal(existsSync(salida), false);
    for (const ruta of ["FlujoEfectivo.Api.dll", "FlujoEfectivo.Api.deps.json", "FlujoEfectivo.Api.runtimeconfig.json", "web.config", "Dapper.dll"]) escribir(join(salida, ruta));
    return { status: 0 };
  };
  return { raiz, escribir, publicar, salida: () => salida };
}

function entradas(zip) {
  const resultado = process.platform === "win32"
    ? spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead($env:CASHFLOW_TEST_ZIP); try { $zip.Entries.FullName } finally { $zip.Dispose() }"], { encoding: "utf8", env: { ...process.env, CASHFLOW_TEST_ZIP: zip } })
    : spawnSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  assert.equal(resultado.status, 0, resultado.stderr);
  return resultado.stdout.replaceAll("\\", "/").split(/\r?\n/).map(ruta => ruta.replace(/^\.\//, ""));
}

test("compila Release y crea ZIP versionado con DLL, dependencias e IIS en la raíz", t => {
  const f = fixture(t);
  const zip = empaquetarApi(f.raiz, f.publicar);
  assert.equal(zip, join(f.raiz, "cashflow-api-1.38.64.zip"));
  const archivos = entradas(zip);
  for (const ruta of ["FlujoEfectivo.Api.dll", "FlujoEfectivo.Api.deps.json", "FlujoEfectivo.Api.runtimeconfig.json", "web.config", "Dapper.dll"]) assert.ok(archivos.includes(ruta), ruta);
  assert.equal(existsSync(f.salida()), false);
});

test("excluye configuraciones privadas, certificados, logs, SQL y Git a cualquier profundidad", t => {
  const f = fixture(t);
  const zip = empaquetarApi(f.raiz, (...args) => {
    const resultado = f.publicar(...args);
    for (const ruta of ["appsettings.json", "appsettings.Production.json", "appsettings.Development.json", "sub/AppSettings.Custom.JSON", ".env", "sub/.env.local", "sub/.git/config", "logs/error.txt", "cert.pfx", "cert.pem", "secret.key", "license.lic", "18_script.sql"]) f.escribir(join(f.salida(), ruta));
    return resultado;
  });
  const archivos = entradas(zip).filter(x => x && !x.endsWith("/"));
  assert.equal(archivos.length, 5);
  assert.ok(archivos.includes("Dapper.dll"));
});

test("si falla dotnet conserva el ZIP anterior y limpia los temporales", t => {
  const f = fixture(t);
  const previo = join(f.raiz, "cashflow-api-1.38.64.zip");
  f.escribir(previo, "ZIP anterior");
  assert.throws(() => empaquetarApi(f.raiz, (...args) => { f.publicar(...args); return { status: 1 }; }), /No se pudo compilar/);
  assert.equal(readFileSync(previo, "utf8"), "ZIP anterior");
  assert.equal(existsSync(f.salida()), false);
});

test("rechaza publicación incompleta antes de crear ZIP", t => {
  const f = fixture(t);
  assert.throws(() => empaquetarApi(f.raiz, (...args) => {
    const resultado = f.publicar(...args);
    rmSync(join(f.salida(), "FlujoEfectivo.Api.runtimeconfig.json"));
    return resultado;
  }), /falta FlujoEfectivo.Api.runtimeconfig.json/);
  assert.equal(existsSync(join(f.raiz, "cashflow-api-1.38.64.zip")), false);
});

test("explica SDK ausente y no crea ZIP", t => {
  const f = fixture(t);
  assert.throws(() => empaquetarApi(f.raiz, () => ({ status: null, error: new Error("ENOENT") })), /SDK de .NET 8/);
  assert.equal(existsSync(join(f.raiz, "cashflow-api-1.38.64.zip")), false);
});

test("rechaza versión ausente o inválida de API sin usar la versión web ni compilar", t => {
  const f = fixture(t);
  for (const contenido of ["<Project />", "<Version>$(VersionWeb)</Version>", "<Version>1.38</Version>"]) {
    f.escribir(join(f.raiz, "api/FlujoEfectivo.Api/FlujoEfectivo.Api.csproj"), contenido);
    assert.throws(() => empaquetarApi(f.raiz, () => assert.fail("No debe compilar")), /única <Version>/);
  }
});