import { test } from "node:test";
import assert from "node:assert/strict";
import { resolverUrlApi } from "./configuracion-api";

test("producción usa /api del mismo origen incluso con una dirección antigua guardada", () => {
  assert.equal(resolverUrlApi({ desarrollo: false, origen: "https://apps.aplix.cr", local: "http://localhost:5080/api" }), "https://apps.aplix.cr/api");
});
test("limpiar el navegador no cambia la dirección de producción", () => {
  assert.equal(resolverUrlApi({ desarrollo: false, origen: "https://apps.aplix.cr" }), "https://apps.aplix.cr/api");
});
test("la configuración del despliegue tiene prioridad sobre la del navegador", () => {
  assert.equal(resolverUrlApi({ desarrollo: false, origen: "https://apps.aplix.cr", configurada: "https://api.ejemplo.com/api/", local: "http://localhost:5080/api" }), "https://api.ejemplo.com/api");
});
test("desarrollo sin configuración conserva la demostración", () => {
  assert.equal(resolverUrlApi({ desarrollo: true, origen: "http://localhost:8080" }), "");
});
test("desarrollo permite una dirección local y prioriza VITE_API_URL", () => {
  assert.equal(resolverUrlApi({ desarrollo: true, origen: "http://localhost:8080", local: "api/" }), "http://localhost:8080/api");
  assert.equal(resolverUrlApi({ desarrollo: true, configurada: "http://localhost:5000/api", local: "http://localhost:5080/api" }), "http://localhost:5000/api");
});