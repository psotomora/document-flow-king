import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { empaquetarAgente } from "./package-agente.mjs";

function fixture(t) {
  const raiz = mkdtempSync(join(tmpdir(), "cashflow-agente-test-"));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  const escribir = (ruta, texto = "fixture") => {
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, texto);
  };
  escribir(join(raiz, "package.json"), JSON.stringify({ version: "1.38.46" }));
  escribir(join(raiz, "agente/AplixCashFlowAgente/AplixCashFlowAgente.csproj"));
  let salida;
  const publicar = (comando, args, opciones) => {
    assert.equal(comando, "dotnet");
    assert.deepEqual(args.slice(0, 4), ["publish", join(raiz, "agente/AplixCashFlowAgente/AplixCashFlowAgente.csproj"), "-c", "Release"]);
    assert.deepEqual(args.slice(4, 8), ["-r", "win-x64", "--self-contained"]);
    assert.equal(args[8], "true");
    assert.equal(args[9], "-o");
    assert.equal(opciones.cwd, raiz);
    salida = args[10];
    assert.equal(existsSync(salida), false);
    for (const ruta of ["AplixCashFlowAgente.exe", "AplixCashFlowAgente.dll", "AplixCashFlowAgente.runtimeconfig.json", "appsettings.json", "Microsoft.Data.SqlClient.dll"]) escribir(join(salida, ruta));
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

test("compila win-x64 autocontenido y crea ZIP versionado con el ejecutable y la plantilla de configuración", t => {
  const f = fixture(t);
  const zip = empaquetarAgente(f.raiz, f.publicar);
  assert.equal(zip, join(f.raiz, "cashflow-agente-1.38.46.zip"));
  const archivos = entradas(zip);
  for (const ruta of ["AplixCashFlowAgente.exe", "AplixCashFlowAgente.dll", "AplixCashFlowAgente.runtimeconfig.json", "appsettings.json", "Microsoft.Data.SqlClient.dll"]) assert.ok(archivos.includes(ruta), ruta);
  assert.equal(existsSync(f.salida()), false);
});

test("excluye configuraciones privadas, certificados, logs, SQL y Git a cualquier profundidad", t => {
  const f = fixture(t);
  const zip = empaquetarAgente(f.raiz, (...args) => {
    const resultado = f.publicar(...args);
    for (const ruta of ["appsettings.Development.json", "appsettings.Production.json", "sub/appsettings.custom.json", ".env", "sub/.env.local", "sub/.git/config", "logs/latido.txt", "cert.pfx", "cert.pem", "secret.key", "license.lic", "19_script.sql"]) f.escribir(join(f.salida(), ruta));
    return resultado;
  });
  const archivos = entradas(zip).filter(x => x && !x.endsWith("/"));
  assert.equal(archivos.length, 5);
  assert.ok(archivos.includes("appsettings.json"));
});

test("si falla dotnet conserva el ZIP anterior y limpia los temporales", t => {
  const f = fixture(t);
  const previo = join(f.raiz, "cashflow-agente-1.38.46.zip");
  f.escribir(previo, "ZIP anterior");
  assert.throws(() => empaquetarAgente(f.raiz, (...args) => { f.publicar(...args); return { status: 1 }; }), /No se pudo compilar/);
  assert.equal(readFileSync(previo, "utf8"), "ZIP anterior");
  assert.equal(existsSync(f.salida()), false);
});

test("rechaza publicación incompleta antes de crear ZIP", t => {
  const f = fixture(t);
  assert.throws(() => empaquetarAgente(f.raiz, (...args) => {
    const resultado = f.publicar(...args);
    rmSync(join(f.salida(), "AplixCashFlowAgente.runtimeconfig.json"));
    return resultado;
  }), /falta AplixCashFlowAgente.runtimeconfig.json/);
  assert.equal(existsSync(join(f.raiz, "cashflow-agente-1.38.46.zip")), false);
});

test("explica SDK ausente y no crea ZIP", t => {
  const f = fixture(t);
  assert.throws(() => empaquetarAgente(f.raiz, () => ({ status: null, error: new Error("ENOENT") })), /SDK de .NET 8/);
  assert.equal(existsSync(join(f.raiz, "cashflow-agente-1.38.46.zip")), false);
});
