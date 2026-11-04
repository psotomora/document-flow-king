import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../api/FlujoEfectivo.Api/Endpoints/RegistrosEndpoints.cs", import.meta.url), "utf8");
const handler = source.slice(source.indexOf("private static IResult GuardarCompania"), source.indexOf("private sealed class FilaFactura"));
test("alta deriva empresa del usuario, sin aceptar reasignación en el cuerpo", () => {
  assert.match(source, /record DatosCompania\(string\? Codigo, string\? Nombre\)/);
  assert.match(handler, /Saas.Contexto\(cn, ctx.User.UsuarioId\(\)\)/);
  assert.match(handler, /var inquilino = empresa.InquilinoId/);
  assert.match(handler, /INSERT INTO flujo.Compania \(Codigo, Nombre, InquilinoId\)/);
});
test("edición rechaza compañías ajenas y acota el UPDATE por empresa", () => {
  assert.match(handler, /WHERE CompaniaId=@id AND InquilinoId=@inquilino[\s\S]*?statusCode: 403/);
  assert.match(handler, /UPDATE flujo.Compania SET Codigo=@codigo, Nombre=@nombre WHERE CompaniaId=@id AND InquilinoId=@inquilino/);
  assert.doesNotMatch(handler, /UPDATE flujo.Compania SET[^"\n]*InquilinoId=/);
});
test("alta y edición exigen el mismo permiso de catálogos que los bancos", () => {
  assert.match(handler, /!ctx.User.EsAdministrador\(\) && !PuedeEditarCatalogos\(ctx, db\)/);
});
test("validaciones respetan las longitudes y unicidad del esquema existente", () => {
  assert.match(handler, /codigo.Length is < 1 or > 10 \|\| nombre.Length is < 1 or > 150/);
  assert.match(handler, /WHERE Codigo=@codigo AND \(@id IS NULL OR CompaniaId<>@id\)/);
});
test("compañía y bitácora se guardan en una transacción", () => {
  assert.match(handler, /using var tx = cn.BeginTransaction\(\)/);
  assert.match(handler, /Db.Auditar\([\s\S]*?"Creación" : "Modificación"[\s\S]*?tx: tx\);\s*tx.Commit\(\)/);
});