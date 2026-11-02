import { describe, expect, it } from "vitest";
import { filtrarPorFecha } from "./conciliacion-fechas";

const docs = [
  { id: "oct", f: "2026-10-05" },
  { id: "nov", f: "2026-11-02" },
  { id: "sep", f: "2026-09-10" },
];

describe("conciliación cronológica", () => {
  it("no sugiere documentos emitidos después del pago", () => {
    expect(filtrarPorFecha(docs, (d) => d.f, "2026-10-28").map((d) => d.id)).not.toContain("nov");
  });
  it("prioriza el documento más cercano a la fecha del pago", () => {
    expect(filtrarPorFecha(docs, (d) => d.f, "2026-10-28").map((d) => d.id)).toEqual(["oct", "sep"]);
  });
  it("acepta documentos emitidos el mismo día del pago", () => {
    expect(filtrarPorFecha(docs, (d) => d.f, "2026-11-02T00:00").map((d) => d.id)[0]).toBe("nov");
  });
});
