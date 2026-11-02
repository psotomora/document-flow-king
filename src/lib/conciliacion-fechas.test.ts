import { test } from "node:test";
import { strict as assert } from "node:assert";
import { filtrarPorFecha } from "./conciliacion-fechas";

const docs = [
  { id: "oct", f: "2026-10-05" },
  { id: "nov", f: "2026-11-02" },
  { id: "sep", f: "2026-09-10" },
];

test("no sugiere documentos emitidos después del pago y prioriza el más cercano", () => {
  assert.deepEqual(filtrarPorFecha(docs, (d) => d.f, "2026-10-28").map((d) => d.id), ["oct", "sep"]);
});

test("acepta documentos emitidos el mismo día del pago", () => {
  assert.equal(filtrarPorFecha(docs, (d) => d.f, "2026-11-02T00:00").map((d) => d.id)[0], "nov");
});
