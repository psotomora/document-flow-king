import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../api/FlujoEfectivo.Api/Endpoints/RegistrosEndpoints.cs", import.meta.url), "utf8");
const marca = source.slice(source.indexOf('g.MapPost("/documentos-pagar/marca-pago"'), source.indexOf('g.MapPost("/documentos-pagar/desmarcar-pago"'));
const quitar = source.slice(source.indexOf('g.MapPost("/documentos-pagar/desmarcar-pago"'), source.indexOf('g.MapPost("/facturas/marca-saldada"'));
const eliminar = source.slice(source.indexOf('g.MapDelete("/erogaciones/{id}"'), source.indexOf('/* --------------------------- Transferencias'));
const saldar = source.slice(source.indexOf('g.MapPost("/facturas/marca-saldada"'), source.indexOf('g.MapPost("/facturas/desmarcar-saldada"'));
test("la eliminación directa rechaza erogaciones vinculadas antes de borrar", () => {
  assert.match(eliminar, /WHERE ErogacionId=@id", new \{ id = Id\(id\) \}\) > 0\)\s*return Results.BadRequest/);
  assert.ok(eliminar.indexOf("MarcasPagoCashFlow.ErogacionDisponible") < eliminar.indexOf("DELETE FROM flujo.Erogacion"));
});
test("marcar una factura saldada no consulta erogaciones ni usa un id inexistente", () => {
  assert.doesNotMatch(saldar, /ErogacionDisponible|Id\(id\)|DocumentoPagarMarca/);
  assert.match(saldar, /MarcasFacturaCashFlow.Marcar/);
});
test("la auditoría de reversión recibe valores no nulos", () => {
  assert.match(quitar, /vinculada.Value.ToString\(\)/);
  assert.match(quitar, /m.Numero \?\? "", "Modificación"/);
});
test("erogación, marca y auditoría se guardan con la misma transacción", () => {
  assert.match(marca, /using var tx = cn.BeginTransaction/);
  assert.match(marca, /INSERT INTO flujo.Erogacion[^\n]*valores, tx/);
  assert.match(marca, /MarcasPagoCashFlow.Marcar\(cn, m, ctx.User.NombreUsuario\(\), erogacion, tx\)/);
  assert.match(marca, /tx: tx\);\s*tx.Commit/);
});
test("reintentar o editar reutiliza la erogación bloqueada en vez de duplicarla", () => {
  assert.match(marca, /UPDLOCK, HOLDLOCK/);
  assert.match(marca, /var erogacion = vinculada \?\? cn.ExecuteScalar/);
});
test("revertir elimina solo la erogación vinculada y requiere administrador", () => {
  assert.match(quitar, /vinculada is not null && !ctx.User.EsAdministrador\(\)/);
  assert.match(quitar, /MarcasPagoCashFlow.Quitar\(cn, m, tx\)/);
  assert.match(quitar, /DELETE FROM flujo.Erogacion WHERE ErogacionId=@vinculada AND CompaniaId=@compania/);
  assert.match(quitar, /tx: tx\);\s*tx.Commit/);
});
test("no se paga un saldo o documento falsificado y el banco pertenece a la compañía", () => {
  assert.match(marca, /CuentaBancariaId=@banco AND CompaniaId=@compania AND Activo=1/);
  assert.match(marca, /Math.Abs\(documento.Saldo - m.Monto.Value\) > 0.005m/);
  assert.match(marca, /alcance.Companias.Contains\(compania\)/);
  assert.match(marca, /documento.Moneda != m.Moneda/);
});