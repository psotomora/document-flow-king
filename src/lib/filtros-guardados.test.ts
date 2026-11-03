import { test } from "node:test";
import { strict as assert } from "node:assert";
import { claveFiltro, clavePreferenciasDemo, leerFiltro, leerPreferenciasDemo, resolverCompaniaActiva } from "./filtros-guardados";

test("una sola compañía no aplica un filtro global oculto", () => {
  assert.equal(resolverCompaniaActiva([{ id: "AX" }], "AX"), "todas");
});

test("sin compañías disponibles no aplica una selección anterior", () => {
  assert.equal(resolverCompaniaActiva([], "AX"), "todas");
});

test("con varias compañías conserva la selección guardada y todas", () => {
  const companias = [{ id: "AX" }, { id: "BX" }];
  assert.equal(resolverCompaniaActiva(companias, "BX"), "BX");
  assert.equal(resolverCompaniaActiva(companias, "todas"), "todas");
});

test("una compañía retirada no deja un filtro global inválido", () => {
  assert.equal(resolverCompaniaActiva([{ id: "AX" }, { id: "BX" }], "CX"), "todas");
});

test("la preferencia vuelve a aplicarse al recuperar varias compañías", () => {
  const guardada = "BX";
  assert.equal(resolverCompaniaActiva([{ id: "BX" }], guardada), "todas");
  assert.equal(resolverCompaniaActiva([{ id: "AX" }, { id: "BX" }], guardada), "BX");
});

test("cada pantalla recuerda su propia selección sin compartir campos", () => {
  const preferencias = { [claveFiltro("pagos", "periodo")]: JSON.stringify("semana") };
  assert.equal(leerFiltro(preferencias[claveFiltro("pagos", "periodo")], "rango"), "semana");
  assert.equal(leerFiltro(preferencias[claveFiltro("erogaciones", "periodo")], "mes"), "mes");
});

test("los filtros conservan fechas, estados y casillas", () => {
  assert.equal(leerFiltro('"2026-10-17"', ""), "2026-10-17");
  assert.deepEqual(leerFiltro('["Pagada"]', []), ["Pagada"]);
  assert.equal(leerFiltro("false", true), false);
});

test("salir y volver a entrar restaura preferencias independientes por usuario", () => {
  const almacenamiento = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: (k: string) => almacenamiento.get(k) ?? null } } });
  almacenamiento.set(clavePreferenciasDemo("pedro"), JSON.stringify({ [claveFiltro("pagos", "banco")]: '"banco1"' }));
  almacenamiento.set(clavePreferenciasDemo("otro"), JSON.stringify({ [claveFiltro("pagos", "banco")]: '"todos"' }));
  assert.equal(leerFiltro(leerPreferenciasDemo("pedro")[claveFiltro("pagos", "banco")], "todos"), "banco1");
  assert.equal(leerFiltro(leerPreferenciasDemo("otro")[claveFiltro("pagos", "banco")], "todos"), "todos");
  Reflect.deleteProperty(globalThis, "window");
});

test("preferencias corruptas no impiden abrir una pantalla", () => {
  assert.equal(leerFiltro("invalid", "rango"), "rango");
  assert.equal(leerFiltro("null", false), false);
  assert.deepEqual(leerFiltro("{}", []), []);
});