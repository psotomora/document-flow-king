import { describe, expect, it } from "bun:test";
import { fechaEnPeriodo, rangoPeriodo } from "./filtros-fecha";

describe("filtros de fecha", () => {
  it("Hoy incluye únicamente el día indicado incluso con hora", () => {
    expect(rangoPeriodo("hoy", "2026-10-17")).toEqual({ desde: "2026-10-17", hasta: "2026-10-17" });
    expect(fechaEnPeriodo("2026-10-17T23:59:59", "hoy", "2026-10-17")).toBe(true);
    expect(fechaEnPeriodo("2026-10-16", "hoy", "2026-10-17")).toBe(false);
  });
  it("Última semana abarca siete días inclusivos sin fechas futuras", () => {
    expect(rangoPeriodo("semana", "2026-10-17")).toEqual({ desde: "2026-10-11", hasta: "2026-10-17" });
    expect(fechaEnPeriodo("2026-10-11", "semana", "2026-10-17")).toBe(true);
    expect(fechaEnPeriodo("2026-10-10", "semana", "2026-10-17")).toBe(false);
    expect(fechaEnPeriodo("2026-10-18", "semana", "2026-10-17")).toBe(false);
  });
  it("Último mes abarca treinta días incluso al cambiar de año", () => {
    expect(rangoPeriodo("mes", "2026-01-10")).toEqual({ desde: "2025-12-12", hasta: "2026-01-10" });
    expect(fechaEnPeriodo("2025-12-11", "mes", "2026-01-10")).toBe(false);
  });
  it("Rango de fechas incluye inicio y fin completos", () => {
    expect(fechaEnPeriodo("2026-10-17T23:59:59", "rango", "2026-10-17", "2026-10-11", "2026-10-17")).toBe(true);
    expect(fechaEnPeriodo("2026-10-10", "rango", "2026-10-17", "2026-10-11", "2026-10-17")).toBe(false);
    expect(fechaEnPeriodo("2026-10-18", "rango", "2026-10-17", "2026-10-11", "2026-10-17")).toBe(false);
  });
  it("Rango permite extremos abiertos sin excluir el histórico", () => {
    expect(fechaEnPeriodo("2020-01-01", "rango", "2026-10-17")).toBe(true);
    expect(fechaEnPeriodo("2026-10-18", "rango", "2026-10-17", "2026-10-11")).toBe(true);
    expect(fechaEnPeriodo("2026-10-18", "rango", "2026-10-17", "", "2026-10-17")).toBe(false);
  });
});