import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("el envío de documentos no ejecuta la detección de esquema sin transacción durante el guardado", () => {
  const fuente = readFileSync(new URL("../api/FlujoEfectivo.Api/Endpoints/ReplicaEndpoints.cs", import.meta.url), "utf8");
  const inicio = fuente.indexOf('app.MapPost("/api/public/agente/documentos"');
  const fin = fuente.indexOf('app.MapPost("/api/public/agente/pedidos"', inicio);
  assert.ok(inicio >= 0 && fin > inicio, "Se prueba el endpoint real de documentos");
  const endpoint = fuente.slice(inicio, fin);
  const transaccion = endpoint.indexOf("cn.BeginTransaction(");
  const confirmar = endpoint.indexOf("tx.Commit()");
  assert.ok(transaccion >= 0 && confirmar > transaccion);
  assert.match(endpoint.slice(0, transaccion), /var soportaPagar = ReplicaDocumentos\.ListaPagar\(cn\);/);
  assert.doesNotMatch(endpoint.slice(transaccion, confirmar), /ReplicaDocumentos\.Lista(?:Pagar)?\(cn\)/);
  assert.match(endpoint.slice(transaccion, confirmar), /if \(soportaPagar\)\s+Guardar\("documentosPagar"/);
});