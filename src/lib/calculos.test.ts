import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Factura, Pago } from "../data/tipos";
import { calcularFacturas, calcularSaldoProyectado, indicadoresPorMoneda } from "./calculos";

const factura: Factura = {
  id: "f1", companiaId: "ax", numero: "FAC-001", cliente: "Cliente",
  fechaEmision: "2026-10-21", plazoDias: 30, moneda: "USD", monto: 10000,
  saldoErp: 10000, cobrada: true,
};

test("el consolidado suma los mismos 19000 USD aunque 10000 estén marcados como cobrados", () => {
  const facturas = calcularFacturas([
    factura,
    { ...factura, id: "f2", numero: "FAC-002", monto: 9000, saldoErp: 9000, cobrada: false },
  ], [], "2026-10-21");
  const proyectado = calcularSaldoProyectado([], [], facturas, [], 500);
  assert.equal(indicadoresPorMoneda(facturas, "USD").saldoPorCobrar, 19000);
  assert.equal(proyectado.porCobrarUSD, 19000);
  assert.equal(proyectado.saldoProyectadoTotalUSD, 19000);
});

test("un saldo cero o negativo no aporta al proyectado, independientemente de Cobrada", () => {
  const pago: Pago = {
    id: "p1", facturaId: "f2", fecha: "2026-10-21", bancoId: "b1",
    monto: 11000, moneda: "USD", metodo: "Transferencia",
  };
  const facturas = calcularFacturas([
    { ...factura, saldoErp: 0 },
    { ...factura, id: "f2", cobrada: false },
  ], [pago], "2026-10-21");
  assert.equal(facturas[1]?.saldoPendiente, -1000);
  assert.equal(calcularSaldoProyectado([], [], facturas, [], 500).porCobrarUSD, 0);
});

test("el consolidado conserva el saldo ERP menos pagos locales y convierte colones una sola vez", () => {
  const pago: Pago = {
    id: "p1", facturaId: "f1", fecha: "2026-10-21", bancoId: "b1",
    monto: 2000, moneda: "USD", metodo: "Transferencia",
  };
  const facturas = calcularFacturas([
    { ...factura, monto: 20000 },
    { ...factura, id: "f2", moneda: "CRC", monto: 600000, saldoErp: 500000 },
  ], [pago], "2026-10-21");
  const proyectado = calcularSaldoProyectado([], [], facturas, [], 500);
  assert.equal(proyectado.porCobrarUSD, 8000);
  assert.equal(proyectado.porCobrarCRC, 500000);
  assert.equal(proyectado.consolidadoUSD, 9000);
});