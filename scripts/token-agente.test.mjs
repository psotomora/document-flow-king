import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const inquilinos = read("api/FlujoEfectivo.Api/Endpoints/InquilinosEndpoints.cs");
const agente = read("api/FlujoEfectivo.Api/Endpoints/AgenteEndpoints.cs");

// Source regressions for the production handlers; no real credentials or SQL changes.
for (const [name, source, route] of [
  ["Empresas", inquilinos, "/inquilinos/{id:int}/token-agente"],
  ["Parámetros", agente, "/agente/token"],
]) {
  const start = source.indexOf(`g.MapPost("${route}"`);
  assert.ok(start >= 0);
  const end = source.indexOf("return Results.Ok(new { token });", start);
  assert.ok(end > start);
  const handler = source.slice(start, end);
  test(`${name}: token usa Modificación y nunca audita el secreto`, () => {
    assert.match(handler, /Db\.Auditar\([\s\S]*?"Modificación",\s*valorNuevo: "Token de agente: se generó un token nuevo; el anterior quedó invalidado\."/);
    assert.doesNotMatch(handler, /valor(?:Nuevo|Anterior):\s*(?:token|\$".*\{token\})/);
  });
  test(`${name}: hash y bitácora participan en la transacción antes de devolver el token`, () => {
    assert.match(handler, /using var tx = cn\.BeginTransaction\(\);[\s\S]*cn\.Execute\("UPDATE flujo\.Inquilino SET TokenAgenteHash[\s\S]*?\}, tx\);[\s\S]*Db\.Auditar\([\s\S]*?tx: tx\);\s*tx\.Commit\(\);/);
  });
}

test("administración SaaS no envía las operaciones incompatibles conocidas", () => {
  assert.match(inquilinos, /"Usuarios", u\.Value\.NombreUsuario,\s*"Modificación", valorNuevo: d\.Valor \? "Asignar Súper Administrador" : "Retirar Súper Administrador"/);
  assert.match(inquilinos, /"Empresas", inq\.Codigo, "Creación",\s*valorNuevo: \$"Usuario:/);
});

test("las operaciones elegidas existen en la restricción SQL vigente", () => {
  const schema = read("database/01_esquema.sql");
  const allowed = schema.match(/CK_Bitacora_Operacion CHECK \(Operacion IN \(([^)]+)\)\)/)?.[1];
  assert.ok(allowed);
  assert.ok(allowed.includes("'Modificación'"));
  assert.ok(allowed.includes("'Creación'"));
});