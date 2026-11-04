import { test } from "node:test";
import assert from "node:assert/strict";
import { presentarPruebaAgente } from "./prueba-agente";

test("en proceso se muestra en azul", () => {
  assert.deepEqual(presentarPruebaAgente({ estado: "en_proceso" }), { etiqueta: "Comprobación en proceso", tono: "proceso" });
});

test("fallida se muestra en rojo", () => {
  assert.deepEqual(presentarPruebaAgente({ estado: "fallida" }), { etiqueta: "Falló comprobación", tono: "error" });
});

test("exitosa se muestra en verde", () => {
  assert.deepEqual(presentarPruebaAgente({ estado: "exitosa" }), { etiqueta: "Comprobación exitosa", tono: "exito" });
});

test("sin solicitud no muestra estado", () => {
  assert.equal(presentarPruebaAgente({ estado: "sin_probar" }), null);
});
