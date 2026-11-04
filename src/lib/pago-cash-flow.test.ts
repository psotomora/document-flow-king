import { describe, expect, it } from "vitest";
import type { DocumentoPorPagar } from "@/data/tipos";
import { marcarPagado, puedeMarcarPagado, quitarMarcaPagado } from "./pago-cash-flow";

const doc: DocumentoPorPagar = {
  id: "1", companiaId: "1", proveedor: "ABC", numero: "F-1", tipo: "FAC",
  fecha: "2026-10-01", fechaVence: "2026-10-31", moneda: "USD", monto: 1500, saldo: 800,
};

describe("marca Pagado (Cash Flow)", () => {
  it("deja el saldo en 0 y conserva el saldo del origen", () => {
    const m = marcarPagado(doc, "2026-11-04", null, "pedro");
    expect(m.saldo).toBe(0);
    expect(m.saldoOrigen).toBe(800);
    expect(m.pagadoCashFlow).toBe(true);
  });

  it("al volver a marcar no pierde el saldo del origen", () => {
    const m = marcarPagado(marcarPagado(doc, "2026-11-04", null, "a"), "2026-11-05", "x", "b");
    expect(m.saldoOrigen).toBe(800);
  });

  it("al quitar la marca restaura el saldo del origen", () => {
    expect(quitarMarcaPagado(marcarPagado(doc, "2026-11-04", null, "p")).saldo).toBe(800);
  });

  it("no permite marcar un documento ya cancelado en el origen", () => {
    expect(puedeMarcarPagado({ ...doc, saldo: 0 })).toBe(false);
  });
});
