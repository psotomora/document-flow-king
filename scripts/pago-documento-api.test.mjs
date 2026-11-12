import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../api/FlujoEfectivo.Api/Endpoints/RegistrosEndpoints.cs", import.meta.url), "utf8");
const marca = source.slice(source.indexOf('g.MapPost("/documentos-pagar/marca-pago"'), source.indexOf('g.MapPost("/documentos-pagar/desmarcar-pago"'));
const quitar = source.slice(source.indexOf('g.MapPost("/documentos-pagar/desmarcar-pago"'), source.indexOf('g.MapPost("/facturas/marca-saldada"'));
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