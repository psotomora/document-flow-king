import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const [nombre, ruta] of [
  ["API", "../api/FlujoEfectivo.Api/FlujoEfectivo.Api.csproj"],
  ["agente", "../agente/AplixCashFlowAgente/AplixCashFlowAgente.csproj"],
]) {
  test(`${nombre}: el SDK deriva la versión interna de la misma Version usada por el ZIP`, () => {
    const proyecto = readFileSync(new URL(ruta, import.meta.url), "utf8");
    const versiones = [...proyecto.matchAll(/<Version>([^<]+)<\/Version>/g)];
    assert.equal(versiones.length, 1);
    assert.match(versiones[0]?.[1] ?? "", /^\d+\.\d+\.\d+$/);
    assert.doesNotMatch(proyecto, /<(?:AssemblyVersion|FileVersion|InformationalVersion|GenerateAssemblyInfo|GenerateAssemblyVersionAttribute|GenerateAssemblyFileVersionAttribute)>/);
  });
}