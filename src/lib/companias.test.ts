import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validarCompania } from "./companias";

describe("Validación de compañías", () => {
  it("exige código y razón social", () => {
    assert.notEqual(validarCompania(" ", "GSTI"), null);
    assert.notEqual(validarCompania("GS", " "), null);
  });
  it("respeta el límite de 10 caracteres del código", () => {
    assert.equal(validarCompania("A".repeat(10), "GSTI"), null);
    assert.notEqual(validarCompania("A".repeat(11), "GSTI"), null);
  });
  it("respeta el límite de 150 caracteres de la razón social", () => {
    assert.equal(validarCompania("GS", "A".repeat(150)), null);
    assert.notEqual(validarCompania("GS", "A".repeat(151)), null);
  });
});