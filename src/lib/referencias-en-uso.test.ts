import { test } from "node:test";
import assert from "node:assert/strict";
import { referenciasEnUso } from "./referencias-en-uso";

const reg = (id: string, ref: string) => ({ id, referencias: [ref], fecha: "2026-11-01", monto: 10, moneda: "CRC", descripcion: "" });

test("ignora espacios, guiones y mayúsculas", () => {
  assert.deepEqual(referenciasEnUso("tr 12-345", [reg("1", "TR12345")]).map((r) => r.id), ["1"]);
});
test("no compara referencias de menos de 4 caracteres", () => {
  assert.deepEqual(referenciasEnUso("A-1", [reg("1", "A1")]), []);
});
test("no marca referencias distintas", () => {
  assert.deepEqual(referenciasEnUso("TR999", [reg("1", "TR12345")]), []);
});

import { siguienteReferenciaConSufijo } from "./referencias-en-uso";
test("sufijo: primera repetición sugiere -2", () => {
  assert.equal(siguienteReferenciaConSufijo("123456", ["123456"]), "123456-2");
});
test("sufijo: salta los sufijos ya usados", () => {
  assert.equal(siguienteReferenciaConSufijo("123456", ["123456", "123456-2", "123456-3"]), "123456-4");
});
