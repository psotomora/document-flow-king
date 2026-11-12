import { test } from "node:test";
import assert from "node:assert/strict";
import type { Banco, DocumentoPorPagar } from "@/data/tipos";
import { erogacionDeDocumento, validarPagoDocumento } from "./pago-documento-erogacion";

const doc: DocumentoPorPagar = { id: "sl:cp-F1", companiaId: "1", proveedor: "Proveedor", numero: "F1", tipo: "FAC", fecha: "2026-11-01", fechaVence: "2026-11-30", moneda: "USD", monto: 1500, saldo: 800 };
const banco: Banco = { id: "5", companiaId: "1", nombre: "Cuenta", activo: true, saldoInicialUSD: 2000, saldoInicialCRC: 0 };
const pago = { bancoId: "5", numeroTransferencia: " TX-12 ", monto: 800 };
test("el pago genera una erogación por el saldo pendiente y conserva la transferencia y documento", () => {
  assert.deepEqual(erogacionDeDocumento(doc, pago, "2026-11-12", "Nota"), {
    companiaId: "1", bancoId: "5", numeroTransferencia: "TX-12", proveedor: "Proveedor", fecha: "2026-11-12", moneda: "USD", monto: 800, notas: "Nota", documentoPagoId: "sl:cp-F1", documentoPagoNumero: "F1",
  });
});
test("el número de transferencia es obligatorio", () => {
  assert.ok(validarPagoDocumento(doc, { ...pago, numeroTransferencia: "  " }, [banco]));
  assert.equal(validarPagoDocumento(doc, pago, [banco]), null);
});
test("solo permite bancos activos de la compañía del documento", () => {
  assert.ok(validarPagoDocumento(doc, pago, [{ ...banco, companiaId: "2" }]));
  assert.ok(validarPagoDocumento(doc, pago, [{ ...banco, activo: false }]));
});
test("marcar pagado requiere el saldo completo, no un abono ni el total original", () => {
  assert.ok(validarPagoDocumento(doc, { ...pago, monto: 400 }, [banco]));
  assert.ok(validarPagoDocumento(doc, { ...pago, monto: 1500 }, [banco]));
  assert.equal(validarPagoDocumento(doc, pago, [banco]), null);
});
test("editar una marca usa el saldo de origen y no cero", () => {
  assert.equal(validarPagoDocumento({ ...doc, saldo: 0, pagadoCashFlow: true, saldoOrigen: 800 }, pago, [banco]), null);
});
test("se rechazan montos inválidos y transferencias que exceden el límite SQL", () => {
  for (const monto of [0, -1, NaN, Infinity]) assert.ok(validarPagoDocumento(doc, { ...pago, monto }, [banco]));
  assert.ok(validarPagoDocumento(doc, { ...pago, numeroTransferencia: "x".repeat(41) }, [banco]));
});