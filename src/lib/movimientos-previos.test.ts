import { test } from "node:test";
import assert from "node:assert/strict";
import { movimientosPrevios } from "./movimientos-previos";

const r = { id: "1", fecha: "2026-10-14", bancoId: "b", moneda: "CRC", monto: 150000, descripcion: "x" };

test("detecta mismo monto dentro de 15 días", () => {
  assert.equal(movimientosPrevios({ fecha: "2026-10-29", monto: 150000 }, "b", "CRC", [r]).length, 1);
});
test("ignora movimientos fuera de 15 días", () => {
  assert.equal(movimientosPrevios({ fecha: "2026-10-30", monto: 150000 }, "b", "CRC", [r]).length, 0);
});
test("ignora otro banco, moneda o monto", () => {
  assert.equal(movimientosPrevios({ fecha: "2026-10-14", monto: 150000 }, "c", "CRC", [r]).length, 0);
  assert.equal(movimientosPrevios({ fecha: "2026-10-14", monto: 150000 }, "b", "USD", [r]).length, 0);
  assert.equal(movimientosPrevios({ fecha: "2026-10-14", monto: 150001 }, "b", "CRC", [r]).length, 0);
});
