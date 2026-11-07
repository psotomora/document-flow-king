import { test } from "node:test";
import assert from "node:assert/strict";
import { construirReporteHtml, separarDestinatarios } from "./reporte-correo";

test("destinatarios separados por coma se validan uno por uno", () => {
  const r = separarDestinatarios("a@x.com, b@y.cr ,malo");
  assert.deepEqual(r.validos, ["a@x.com", "b@y.cr"]);
  assert.deepEqual(r.invalidos, ["malo"]);
});

test("el informe incluye solo las columnas indicadas y escapa el contenido", () => {
  const html = construirReporteHtml({
    titulo: "Pagos",
    filtros: [],
    columnas: ["Fecha", "Cliente"],
    filas: [["01/11/2026", "<A&B>"]],
  });
  assert.ok(html.includes("&lt;A&amp;B&gt;"));
  assert.equal((html.match(/<th /g) ?? []).length, 2);
});
