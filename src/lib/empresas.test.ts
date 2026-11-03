import { test } from "node:test";
import { strict as assert } from "node:assert";
import { nivelCupo, porcentajeCupo } from "./empresas";

test("3 de 5 activos es normal (60 %)", () => {
  assert.equal(nivelCupo(3, 5), "normal");
  assert.equal(porcentajeCupo(3, 5), 60);
});

test("5 de 5 activos se marca como lleno", () => {
  assert.equal(nivelCupo(5, 5), "lleno");
  assert.equal(porcentajeCupo(5, 5), 100);
});

test("sin cupo propio no tiene límite", () => {
  assert.equal(nivelCupo(40, null), "sinLimite");
});
