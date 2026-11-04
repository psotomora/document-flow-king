import { test } from "node:test";
import assert from "node:assert/strict";
import type { DocumentoPorPagar } from "@/data/tipos";
import { marcarPagado, puedeMarcarPagado, quitarMarcaPagado } from "./pago-cash-flow";

const doc: DocumentoPorPagar = {
  id: "1", companiaId: "1", proveedor: "ABC", numero: "F-1", tipo: "FAC",
  fecha: "2026-10-01", fechaVence: "2026-10-31", moneda: "USD", monto: 1500, saldo: 800,
};

test("marcar deja el saldo en 0 y conserva el saldo del origen", () => {
  const m = marcarPagado(doc, "2026-11-04", null, "pedro");
  assert.equal(m.saldo, 0);
  assert.equal(m.saldoOrigen, 800);
  assert.equal(m.pagadoCashFlow, true);
});

test("volver a marcar no pierde el saldo del origen", () => {
  const m = marcarPagado(marcarPagado(doc, "2026-11-04", null, "a"), "2026-11-05", "x", "b");
  assert.equal(m.saldoOrigen, 800);
});

test("quitar la marca restaura el saldo del origen", () => {
  assert.equal(quitarMarcaPagado(marcarPagado(doc, "2026-11-04", null, "p")).saldo, 800);
});

test("no se marca un documento ya cancelado en el origen", () => {
  assert.equal(puedeMarcarPagado({ ...doc, saldo: 0 }), false);
});
