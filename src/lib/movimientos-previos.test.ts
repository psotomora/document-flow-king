import { describe, expect, it } from "vitest";
import { movimientosPrevios } from "./movimientos-previos";
const r = { id: "1", fecha: "2026-10-14", bancoId: "b", moneda: "CRC", monto: 150000, descripcion: "x" };
describe("movimientosPrevios", () => {
  it("detecta mismo monto dentro de 15 días", () => expect(movimientosPrevios({ fecha: "2026-10-29", monto: 150000 }, "b", "CRC", [r])).toHaveLength(1));
  it("ignora fuera de 15 días", () => expect(movimientosPrevios({ fecha: "2026-10-30", monto: 150000 }, "b", "CRC", [r])).toHaveLength(0));
  it("ignora otro banco o moneda o monto", () => {
    expect(movimientosPrevios({ fecha: "2026-10-14", monto: 150000 }, "c", "CRC", [r])).toHaveLength(0);
    expect(movimientosPrevios({ fecha: "2026-10-14", monto: 150000 }, "b", "USD", [r])).toHaveLength(0);
    expect(movimientosPrevios({ fecha: "2026-10-14", monto: 150001 }, "b", "CRC", [r])).toHaveLength(0);
  });
});
