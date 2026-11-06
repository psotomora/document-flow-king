import { test } from "node:test";
import assert from "node:assert/strict";
import { marcarSaldada, quitarMarcaSaldada } from "./saldada-cash-flow";
import { montoPorCobrar } from "./calculos";
import type { Factura } from "@/data/tipos";

const base: Factura = {
  id: "1", companiaId: "1", numero: "F-10", cliente: "ACME", fechaEmision: "2026-10-01",
  plazoDias: 30, moneda: "USD", monto: 500, saldoErp: 500, cobrada: false,
};

test("marcar saldada deja el monto por cobrar en cero", () => {
  const f = marcarSaldada(base, "2026-11-06", "N/C 33", "pedro");
  assert.equal(montoPorCobrar(f), 0);
  assert.equal(f.saldoErpOrigen, 500);
});

test("quitar la marca restaura el saldo del ERP", () => {
  const f = quitarMarcaSaldada(marcarSaldada(base, "2026-11-06", null, "pedro"));
  assert.equal(montoPorCobrar(f), 500);
  assert.equal(f.cobrada, false);
});
