import { test } from "node:test";
import assert from "node:assert/strict";
import { configuracionCompaniasAgente } from "./configuracion-companias-agente";

test("configuración conserva el ID numérico y permite confirmar el esquema GSIT", () => {
  assert.deepEqual(JSON.parse(configuracionCompaniasAgente([{ id: "3", codigo: "GSIT", nombre: "GSIT" }], { "3": " GSIT " }) ?? "null"), { Companias: [{ CompaniaId: 3, Esquema: "GSIT" }] });
});
test("incluye todas las compañías visibles sin aplicar el filtro global", () => {
  assert.deepEqual(JSON.parse(configuracionCompaniasAgente([{ id: "3", codigo: "GSIT", nombre: "GSIT" }, { id: "4", codigo: "AX", nombre: "Aplix" }], { "4": "SOFTLAND_AX" }) ?? "null"), { Companias: [{ CompaniaId: 3, Esquema: "GSIT" }, { CompaniaId: 4, Esquema: "SOFTLAND_AX" }] });
});
test("no exporta IDs de demostración ni esquemas vacíos", () => {
  assert.equal(configuracionCompaniasAgente([{ id: "demo-1", codigo: "AX", nombre: "Aplix" }], {}), null);
  assert.equal(configuracionCompaniasAgente([{ id: "3", codigo: "GSIT", nombre: "GSIT" }], { "3": " " }), null);
  assert.equal(configuracionCompaniasAgente([], {}), null);
});