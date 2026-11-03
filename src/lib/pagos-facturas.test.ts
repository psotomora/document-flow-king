import { test } from "node:test";
import { strict as assert } from "node:assert";
import { calcularFactura } from "./calculos";
import { facturasParaPago, montoReferenciaPago } from "./pagos-facturas";

const base = { companiaId: "aplix", numero: "FAC-001", cliente: "Cliente ERP", fechaEmision: "2026-10-05", plazoDias: 30, moneda: "USD" as const, monto: 150 };
const pagadaErp = calcularFactura({ ...base, id: "pagada", saldoErp: 0 }, [], "2026-11-03");
const pendiente = calcularFactura({ ...base, id: "pendiente", saldoErp: 75 }, [], "2026-11-03");

test("la casilla habilitada incluye facturas pagadas en el ERP junto con pendientes", () => {
  assert.deepEqual(facturasParaPago([pendiente, pagadaErp], true).map((f) => f.id), ["pendiente", "pagada"]);
});

test("la casilla deshabilitada excluye facturas pagadas en el ERP", () => {
  assert.deepEqual(facturasParaPago([pendiente, pagadaErp], false).map((f) => f.id), ["pendiente"]);
});

test("una factura pagada usa su monto original y el ingreso no cambia su saldo ni estado", () => {
  assert.equal(montoReferenciaPago(pagadaErp), 150);
  const resultado = calcularFactura(pagadaErp, [{ id: "pago", facturaId: "pagada", fecha: "2026-11-03", bancoId: "banco", monto: 150, moneda: "USD", metodo: "Transferencia", aplicaFactura: false }], "2026-11-03");
  assert.equal(resultado.saldoPendiente, 0);
  assert.equal(resultado.estado, "Pagada");
});

test("el registro de una factura pendiente sugiere su saldo restante", () => {
  assert.equal(montoReferenciaPago(pendiente), 75);
});