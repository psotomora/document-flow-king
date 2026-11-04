import { describe, expect, it } from "bun:test";
import { validarCompania } from "./companias";

describe("Validación de compañías", () => {
  it("exige código y razón social", () => {
    expect(validarCompania(" ", "GSTI")).not.toBeNull();
    expect(validarCompania("GS", " ")).not.toBeNull();
  });
  it("respeta el límite de 10 caracteres del código", () => {
    expect(validarCompania("A".repeat(10), "GSTI")).toBeNull();
    expect(validarCompania("A".repeat(11), "GSTI")).not.toBeNull();
  });
  it("respeta el límite de 150 caracteres de la razón social", () => {
    expect(validarCompania("GS", "A".repeat(150))).toBeNull();
    expect(validarCompania("GS", "A".repeat(151))).not.toBeNull();
  });
});