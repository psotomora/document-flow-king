import { describe, expect, it } from "vitest";
import { nivelCupo, porcentajeCupo } from "./empresas";

describe("cupo de usuarios por empresa", () => {
  it("3 de 5 activos es normal (60 %)", () => {
    expect(nivelCupo(3, 5)).toBe("normal");
    expect(porcentajeCupo(3, 5)).toBe(60);
  });
  it("5 de 5 activos se marca como lleno", () => {
    expect(nivelCupo(5, 5)).toBe("lleno");
    expect(porcentajeCupo(5, 5)).toBe(100);
  });
  it("sin cupo propio no tiene límite", () => {
    expect(nivelCupo(40, null)).toBe("sinLimite");
  });
});
