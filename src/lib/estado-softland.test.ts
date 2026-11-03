import { test } from "node:test";
import { strict as assert } from "node:assert";
import { estadoSoftland } from "./estado-softland";

const ultima = "2026-11-03T16:48:00";
const inicio = Date.parse(`${ultima}Z`);
test("verde tras éxito antes de cinco minutos", () => {
  assert.equal(estadoSoftland(ultima, true, inicio + 299999), "exito");
});
test("roja exactamente a los cinco minutos sin verificación", () => {
  assert.equal(estadoSoftland(ultima, true, inicio + 300000), "error");
  assert.equal(estadoSoftland(ultima, true, inicio + 600000), "error");
});
test("roja tras una conexión fallida aunque sea reciente", () => {
  assert.equal(estadoSoftland(ultima, false, inicio), "error");
});
test("sin verificación no comunica éxito", () => {
  assert.equal(estadoSoftland(null, null, inicio), "pendiente");
  assert.equal(estadoSoftland("inválida", true, inicio), "error");
});