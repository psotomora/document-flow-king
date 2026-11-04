import { test } from "node:test";
import { strict as assert } from "node:assert";
import { cupoCompaniasLleno, mostrarConexionDirecta, nivelCupo, porcentajeCupo } from "./empresas";

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

test("empresa cliente no muestra conexión directa, incluso si su usuario es Súper Administrador", () => {
  for (const superAdministrador of [false, true]) {
    assert.equal(mostrarConexionDirecta(true, { disponible: true, superAdministrador, inquilino: { id: 2, codigo: "gsit", nombre: "GSTI" } }), false);
  }
});

test("instalación principal conserva conexión directa", () => {
  assert.equal(mostrarConexionDirecta(true, { disponible: true, superAdministrador: true, inquilino: { id: 1, codigo: "principal", nombre: "Aplix" } }), true);
});

test("sesión pendiente o sin empresa identificada no muestra conexión directa", () => {
  assert.equal(mostrarConexionDirecta(true, null), false);
  assert.equal(mostrarConexionDirecta(true, { disponible: true, superAdministrador: true }), false);
});

test("demostración e instalación sin SaaS conservan conexión directa", () => {
  assert.equal(mostrarConexionDirecta(false, null), true);
  assert.equal(mostrarConexionDirecta(true, { disponible: false, superAdministrador: false }), true);
});

test("cupo de compañías: lleno al alcanzar el máximo contratado", () => {
  assert.equal(cupoCompaniasLleno({ disponible: true, superAdministrador: false, maxCompanias: 2, companiasRegistradas: 2 }), true);
  assert.equal(cupoCompaniasLleno({ disponible: true, superAdministrador: false, maxCompanias: 2, companiasRegistradas: 1 }), false);
  assert.equal(cupoCompaniasLleno({ disponible: true, superAdministrador: false, maxCompanias: null, companiasRegistradas: 9 }), false);
});
