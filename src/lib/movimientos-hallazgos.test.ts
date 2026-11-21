import { test } from "node:test";
import { strict as assert } from "node:assert";
import { filtrarTiposMovimiento, hallazgosMovimiento, type MovimientoParaHallazgos } from "./movimientos-hallazgos";
import type { DocumentoPorPagar, Factura, Pago } from "../data/tipos";

const movimiento: MovimientoParaHallazgos = { registroId: "e1", companiaId: "c1", bancoId: "b1", fecha: "2026-11-21", moneda: "USD", monto: -100, tipo: "Débito", referencia: "485921" };
const documento: DocumentoPorPagar = { id: "d1", companiaId: "c1", proveedor: "Proveedor", numero: "FAC1", tipo: "FAC", fecha: "2026-11-01", fechaVence: "2026-11-30", moneda: "USD", monto: 100, saldo: 100 };
const factura: Factura = { id: "f1", companiaId: "c1", numero: "F1", cliente: "Cliente", fechaEmision: "2026-11-01", plazoDias: 30, moneda: "USD", monto: 100 };
const pago: Pago = { id: "p1", facturaId: "f1", bancoId: "b1", fecha: "2026-11-01", moneda: "USD", monto: 100, metodo: "Transferencia", referencia: "485921-2" };
const credito: MovimientoParaHallazgos = { ...movimiento, tipo: "Crédito", monto: 100, registroId: "p0" };

test("selección múltiple incluye ambos tipos, uno o ninguno", () => {
  const filas = [{ tipo: "Crédito" as const }, { tipo: "Débito" as const }];
  assert.equal(filtrarTiposMovimiento(filas, ["Crédito", "Débito"]).length, 2);
  assert.deepEqual(filtrarTiposMovimiento(filas, ["Débito"]), [filas[1]]);
  assert.equal(filtrarTiposMovimiento(filas, []).length, 0);
});
test("débitos sugieren saldo exacto en la misma compañía y moneda", () => {
  assert.equal(hallazgosMovimiento(movimiento, [documento], [], []).length, 1);
  for (const cambio of [{ companiaId: "c2" }, { moneda: "CRC" as const }, { saldo: 90 }, { pagadoCashFlow: true }, { fecha: "2026-12-01" }]) {
    assert.equal(hallazgosMovimiento(movimiento, [{ ...documento, ...cambio }], [], []).length, 0);
  }
});
test("documento vinculado pagado permanece identificado sin sugerir otro pago", () => {
  const h = hallazgosMovimiento(movimiento, [{ ...documento, saldo: 0, pagadoCashFlow: true, erogacionPagoId: "e1" }], [], []);
  assert.equal(h[0]?.vinculado, true);
});
test("créditos buscan pagos del mismo banco, moneda, importe y mes; respetan compañía", () => {
  assert.equal(hallazgosMovimiento(credito, [], [pago], [factura]).length, 1);
  for (const cambio of [{ bancoId: "b2" }, { moneda: "CRC" as const }, { monto: 90 }, { fecha: "2026-10-01" }]) {
    assert.equal(hallazgosMovimiento(credito, [], [{ ...pago, ...cambio }], [factura]).length, 0);
  }
  assert.equal(hallazgosMovimiento(credito, [], [pago], [{ ...factura, companiaId: "c2" }]).length, 0);
});
test("referencias con sufijo y vínculo existente se distinguen de sugerencias", () => {
  assert.equal(hallazgosMovimiento(credito, [], [pago], [factura])[0]?.motivo, "Referencia, monto y mes coinciden");
  assert.equal(hallazgosMovimiento({ ...credito, registroId: "p1" }, [], [pago], [factura])[0]?.vinculado, true);
});