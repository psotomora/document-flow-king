import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Contrato } from "../data/tipos";
import { contratosPorFacturarDelMes, type DocumentoContrato } from "./contratos";

const contrato: Contrato = {
  id: "c1", companiaId: "ax", numero: "CT-001", cliente: "Cliente Aplix",
  periodicidad: "Mensual", proximaFacturacion: "2026-10-20", plazoDias: 30,
  moneda: "USD", monto: 1200, facturado: false, estado: "Activo",
};
const factura: DocumentoContrato = {
  numero: "FAC-900", fecha: "2026-10-17T14:00:00", companiaId: "ax",
  cliente: " cliente   aplix ", moneda: "USD", monto: 1200, tipo: "factura",
};
const revisar = (documentos: DocumentoContrato[], contratos = [contrato]) =>
  contratosPorFacturarDelMes(contratos, documentos, "2026-10");

test("factura equivalente sin número de contrato excluye sus 1200 USD de pendientes", () => {
  const filas = revisar([factura]);
  assert.equal(filas[0]?.factura, "FAC-900");
  assert.equal(filas[0]?.yaDocumentado, true);
  assert.equal(filas.filter((c) => !c.yaDocumentado).reduce((s, c) => s + c.monto, 0), 0);
});

test("una factura de otra compañía no documenta el contrato, incluso con su número", () => {
  assert.equal(revisar([{ ...factura, companiaId: "tx", numero: "CT-001-2026-10-20" }])[0]?.yaDocumentado, false);
});

test("la equivalencia exige el mismo cliente", () => {
  assert.equal(revisar([{ ...factura, cliente: "Otro cliente" }])[0]?.yaDocumentado, false);
});

test("la equivalencia exige la misma moneda", () => {
  assert.equal(revisar([{ ...factura, moneda: "CRC" }])[0]?.yaDocumentado, false);
});

test("la equivalencia exige el importe original a precisión de centavos", () => {
  assert.equal(revisar([{ ...factura, monto: 1200.02 }])[0]?.yaDocumentado, false);
  assert.equal(revisar([{ ...factura, monto: 1200.001 }])[0]?.yaDocumentado, true);
});

test("una factura de otro mes no cancela la ocurrencia del mes actual", () => {
  assert.equal(revisar([{ ...factura, fecha: "2026-09-17", numero: "CT-001" }])[0]?.yaDocumentado, false);
});

test("una sola factura no excluye dos contratos iguales y las referencias tienen prioridad", () => {
  const otro = { ...contrato, id: "c2", numero: "CT-002" };
  const filas = revisar([{ ...factura, numero: "FAC-CT-002" }], [contrato, otro]);
  assert.equal(filas.find((c) => c.contratoId === "c1")?.yaDocumentado, false);
  assert.equal(filas.find((c) => c.contratoId === "c2")?.factura, "FAC-CT-002");
  assert.equal(filas.filter((c) => !c.yaDocumentado).reduce((s, c) => s + c.monto, 0), 1200);
});

test("un pedido referenciado sigue excluyendo al contrato pero la factura tiene prioridad", () => {
  const pedido: DocumentoContrato = { ...factura, tipo: "pedido", numero: "CT-001-2026-10-20" };
  assert.equal(revisar([pedido])[0]?.documento, "CT-001-2026-10-20");
  assert.equal(revisar([pedido])[0]?.factura, undefined);
  assert.equal(revisar([pedido, factura])[0]?.factura, "FAC-900");
});

test("una factura ya cobrada también excluye el contrato, usando su monto y no saldo", () => {
  const cobrada = { ...factura, cobrada: true, saldoErp: 0 };
  assert.equal(revisar([cobrada])[0]?.yaDocumentado, true);
});