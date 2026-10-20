import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { fechaEnPeriodo, rangoPeriodo } from "./filtros-fecha";

describe("filtros de fecha", () => {
  it("Hoy incluye únicamente el día indicado incluso con hora", () => {
    deepStrictEqual(rangoPeriodo("hoy", "2026-10-17"), { desde: "2026-10-17", hasta: "2026-10-17" });
    strictEqual(fechaEnPeriodo("2026-10-17T23:59:59", "hoy", "2026-10-17"), true);
    strictEqual(fechaEnPeriodo("2026-10-16", "hoy", "2026-10-17"), false);
  });
  it("Última semana abarca siete días inclusivos sin fechas futuras", () => {
    deepStrictEqual(rangoPeriodo("semana", "2026-10-17"), { desde: "2026-10-11", hasta: "2026-10-17" });
    strictEqual(fechaEnPeriodo("2026-10-11", "semana", "2026-10-17"), true);
    strictEqual(fechaEnPeriodo("2026-10-10", "semana", "2026-10-17"), false);
    strictEqual(fechaEnPeriodo("2026-10-18", "semana", "2026-10-17"), false);
  });
  it("Último mes abarca treinta días incluso al cambiar de año", () => {
    deepStrictEqual(rangoPeriodo("mes", "2026-01-10"), { desde: "2025-12-12", hasta: "2026-01-10" });
    strictEqual(fechaEnPeriodo("2025-12-11", "mes", "2026-01-10"), false);
  });
  it("Al día de hoy abarca desde el 1 de enero del año en curso hasta hoy", () => {
    deepStrictEqual(rangoPeriodo("ytd", "2026-10-17"), { desde: "2026-01-01", hasta: "2026-10-17" });
    strictEqual(fechaEnPeriodo("2026-01-01", "ytd", "2026-10-17"), true);
    strictEqual(fechaEnPeriodo("2025-12-31", "ytd", "2026-10-17"), false);
    strictEqual(fechaEnPeriodo("2026-10-17", "ytd", "2026-10-17"), true);
  });
  it("Rango de fechas incluye inicio y fin completos", () => {
    strictEqual(fechaEnPeriodo("2026-10-17T23:59:59", "rango", "2026-10-17", "2026-10-11", "2026-10-17"), true);
    strictEqual(fechaEnPeriodo("2026-10-10", "rango", "2026-10-17", "2026-10-11", "2026-10-17"), false);
    strictEqual(fechaEnPeriodo("2026-10-18", "rango", "2026-10-17", "2026-10-11", "2026-10-17"), false);
  });
  it("Rango permite extremos abiertos sin excluir el histórico", () => {
    strictEqual(fechaEnPeriodo("2020-01-01", "rango", "2026-10-17"), true);
    strictEqual(fechaEnPeriodo("2026-10-18", "rango", "2026-10-17", "2026-10-11"), true);
    strictEqual(fechaEnPeriodo("2026-10-18", "rango", "2026-10-17", "", "2026-10-17"), false);
  });
});