import { test } from "node:test";
import { strict as assert } from "node:assert";
import { verificarConexion } from "./estado-conexion";

const ahora = Date.parse("2026-11-04T00:02:00Z");
const agente = { ultimoDiagnostico: "2026-11-04T00:01:00Z", softlandOk: true, enLinea: true };
test("agente muestra la verificación de conexión, no la sincronización de documentos", () => {
  assert.deepEqual(verificarConexion("agente", "1", [], agente, ahora), { estado: "exito", fecha: agente.ultimoDiagnostico });
});
test("agente en línea con diagnóstico fallido nunca muestra verde", () => {
  assert.equal(verificarConexion("agente", "1", [], { ...agente, softlandOk: false }, ahora).estado, "error");
});
test("agente desconectado con diagnóstico reciente muestra rojo", () => {
  assert.equal(verificarConexion("agente", "1", [], { ...agente, enLinea: false }, ahora).estado, "error");
});
test("verificación del agente vence exactamente a los cinco minutos", () => {
  assert.equal(verificarConexion("agente", "1", [], agente, ahora + 240000).estado, "error");
});
test("sin diagnóstico no se inventa conexión exitosa", () => {
  assert.equal(verificarConexion("agente", "1", [], { ...agente, ultimoDiagnostico: null }, ahora).estado, "pendiente");
});
test("conexión directa considera solo su compañía y no el agente", () => {
  const filas = [
    { companiaId: "1", ultimaVerificacion: agente.ultimoDiagnostico, resultado: "ok" },
    { companiaId: "2", ultimaVerificacion: agente.ultimoDiagnostico, resultado: "error" },
  ];
  assert.equal(verificarConexion("directa", "1", filas, { ...agente, softlandOk: false }, ahora).estado, "exito");
  assert.equal(verificarConexion("directa", "2", filas, agente, ahora).estado, "error");
});
test("lecturas recientes actualizan la verificación aunque el diagnóstico siga en 5:59 p. m.", () => {
  const viejo = { ...agente, ultimoDiagnostico: "2026-11-03T23:59:00Z" };
  const filas = ["pedidos", "facturas", "contratos", "documentosPagar"].map(() => ({ companiaId: "1", ultimaVerificacion: "2026-11-04T00:19:00Z", resultado: "ok" }));
  assert.deepEqual(verificarConexion("agente", "1", filas, viejo, Date.parse("2026-11-04T00:20:00Z")), { estado: "exito", fecha: "2026-11-04T00:19:00Z" });
});
test("un pedido exitoso no oculta una lectura fallida de facturas", () => {
  const viejo = { ...agente, ultimoDiagnostico: "2026-11-03T23:59:00Z" };
  const filas = [
    { companiaId: "1", ultimaVerificacion: "2026-11-04T00:01:00Z", resultado: "error" },
    { companiaId: "1", ultimaVerificacion: "2026-11-04T00:01:01Z", resultado: "ok" },
  ];
  assert.equal(verificarConexion("agente", "1", filas, viejo, ahora).estado, "error");
});
test("las lecturas del agente vencen a los cinco minutos y no verifican otra compañía", () => {
  const viejo = { ...agente, ultimoDiagnostico: "2026-11-03T23:59:00Z" };
  const filas = [{ companiaId: "1", ultimaVerificacion: "2026-11-04T00:01:00Z", resultado: "ok" }];
  assert.equal(verificarConexion("agente", "1", filas, viejo, Date.parse("2026-11-04T00:06:00Z")).estado, "error");
  assert.equal(verificarConexion("agente", "2", filas, viejo, ahora).estado, "error");
});
test("una lectura reciente no pone verde un agente desconectado", () => {
  const filas = [{ companiaId: "1", ultimaVerificacion: agente.ultimoDiagnostico, resultado: "ok" }];
  assert.equal(verificarConexion("agente", "1", filas, { ...agente, enLinea: false }, ahora).estado, "error");
});