import { describe, expect, it } from "vitest";
import { referenciasEnUso } from "./referencias-en-uso";

const reg = (id: string, ref: string) => ({ id, referencias: [ref], fecha: "2026-11-01", monto: 10, moneda: "CRC", descripcion: "" });

describe("referenciasEnUso", () => {
  it("ignora espacios, guiones y mayúsculas", () => {
    expect(referenciasEnUso("tr 12-345", [reg("1", "TR12345")]).map((r) => r.id)).toEqual(["1"]);
  });
  it("no compara referencias de menos de 4 caracteres", () => {
    expect(referenciasEnUso("A-1", [reg("1", "A1")])).toEqual([]);
  });
  it("no marca referencias distintas", () => {
    expect(referenciasEnUso("TR999", [reg("1", "TR12345")])).toEqual([]);
  });
});
