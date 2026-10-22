import { test } from "node:test";
import assert from "node:assert";
import { claveColumnas, permutacionColumnas } from "./columnas";

const et = ["Cliente", "Fecha", "Monto"];
test("sin preferencia conserva el orden", () => assert.deepStrictEqual(permutacionColumnas(et, null), [0, 1, 2]));
test("aplica orden y oculta columnas", () =>
  assert.deepStrictEqual(permutacionColumnas(et, { orden: ["Monto", "Cliente", "Fecha"], ocultas: ["Fecha"] }), [2, 0]));
test("la clave cabe en la tabla de preferencias", () =>
  assert.ok(claveColumnas("/documentos-cobrar/muy/larga/ruta/extra", et).length <= 60));
