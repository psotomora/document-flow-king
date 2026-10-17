import { test } from "node:test";
import { strict as assert } from "node:assert";
import { claveFiltro, clavePreferenciasDemo, leerFiltro, leerPreferenciasDemo } from "./filtros-guardados";

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