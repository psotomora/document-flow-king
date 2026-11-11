import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Contrato, Factura, Pago } from "../data/tipos";
import { contratosPorFacturarDelMes } from "./contratos";
import { facturacionContratosProximoMes, sugerirPagosContrato } from "./contratos-pagos";

const contrato: Contrato = { id: "c", companiaId: "a", numero: "CT1", cliente: "Cliente", periodicidad: "Mensual", proximaFacturacion: "2026-11-20", moneda: "USD", monto: 1200, plazoDias: 30, estado: "Activo", facturado: false, fechaCreacion: "2026-01-01" };
const factura: Factura = { id: "f", companiaId: "a", numero: "FAC1", cliente: " cliente ", fechaEmision: "2026-11-01", moneda: "USD", monto: 1200, plazoDias: 30 };
const pago: Pago = { id: "p", facturaId: "f", fecha: "2026-11-11", bancoId: "b", moneda: "USD", monto: 1200, metodo: "Transferencia" };
const linea = contratosPorFacturarDelMes([contrato], [], "2026-11")[0];
if (!linea) throw new Error("Falta contrato de prueba");

test("contratos del mes encuentra pagos del cliente por moneda e importe, incluso recibos bank-only", () => {
  const hallazgos = sugerirPagosContrato(linea, [{ ...pago, aplicaFactura: false }], [factura]);
  assert.equal(hallazgos.length, 1);
  assert.equal(hallazgos[0]?.monto, 1200);
  assert.equal(hallazgos[0]?.completo, true);
});
test("hallazgos no mezclan compañías aunque el cliente y monto sean iguales", () => {
  assert.equal(sugerirPagosContrato(linea, [pago], [{ ...factura, companiaId: "otra" }]).length, 0);
});
test("hallazgos exigen el mismo cliente", () => {
  assert.equal(sugerirPagosContrato(linea, [pago], [{ ...factura, cliente: "Otro" }]).length, 0);
});
test("hallazgos no toman pagos de otro mes o moneda", () => {
  assert.equal(sugerirPagosContrato(linea, [{ ...pago, fecha: "2026-10-11" }], [factura]).length, 0);
  assert.equal(sugerirPagosContrato(linea, [{ ...pago, moneda: "CRC" }], [factura]).length, 0);
});
test("pagos parciales de factura asociada se sugieren sin presentarse como completos", () => {
  assert.equal(sugerirPagosContrato(linea, [{ ...pago, monto: 600 }], [factura]).length, 0);
  const h = sugerirPagosContrato(linea, [{ ...pago, monto: 600 }], [factura], "FAC1");
  assert.equal(h[0]?.completo, false);
  assert.equal(h[0]?.monto, 600);
});
test("suma abonos del mismo mes de la misma factura", () => {
  const h = sugerirPagosContrato(linea, [{ ...pago, monto: 600 }, { ...pago, id: "p2", monto: 600 }], [factura]);
  assert.equal(h[0]?.monto, 1200);
  assert.equal(h[0]?.pagos.length, 2);
});
test("próximo mes respeta todas las recurrencias y contratos cancelados", () => {
  const contratos = [contrato, ...(["Bimestral", "Trimestral", "Semestral", "Anual"] as const).map((periodicidad) => ({ ...contrato, id: periodicidad, periodicidad, proximaFacturacion: "2026-12-20" })), { ...contrato, id: "no", estado: "Cancelado" as const }];
  const previsto = facturacionContratosProximoMes(contratos, "2026-11-11", 500);
  assert.equal(previsto.mes, "2026-12");
  assert.equal(previsto.cantidad, 5);
  assert.equal(previsto.equivalenteUsd, 6000);
  assert.deepEqual(previsto.grupos.map((g) => g.cantidad), [1, 1, 1, 1, 1]);
  assert.equal(facturacionContratosProximoMes([{ ...contrato, periodicidad: "Bimestral" }], "2026-11-11", 500).cantidad, 0);
});
test("próximo mes cambia de año y convierte CRC usando el tipo de cambio", () => {
  const previsto = facturacionContratosProximoMes([{ ...contrato, moneda: "CRC", monto: 500000 }], "2026-12-11", 500);
  assert.equal(previsto.mes, "2027-01");
  assert.equal(previsto.equivalenteUsd, 1000);
});