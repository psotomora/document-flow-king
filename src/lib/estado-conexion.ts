import { estadoSoftland, fechaUtc } from "./estado-softland";

export interface VerificacionConexion {
  companiaId: string | null;
  ultimaVerificacion: string | null;
  resultado: string | null;
}
export interface DiagnosticoAgente {
  ultimoDiagnostico: string | null;
  softlandOk: boolean | null;
  enLinea: boolean;
}

export function verificarConexion(modo: "agente" | "directa", companiaId: string | null, filas: VerificacionConexion[], agente: DiagnosticoAgente | null, ahora: number) {
  if (modo === "agente") {
    // Las lecturas del ERP también verifican la conexión, pero el latido no.
    const diagnostico = agente?.ultimoDiagnostico ?? null;
    const propias = filas.filter((f) => companiaId !== null && String(f.companiaId) === companiaId);
    const comprobaciones = propias.length > 0 ? propias.map((f) => {
      const lecturaMasNueva = f.ultimaVerificacion && (!diagnostico || fechaUtc(f.ultimaVerificacion) > fechaUtc(diagnostico));
      return lecturaMasNueva
        ? { fecha: f.ultimaVerificacion, ok: f.resultado === "ok" ? true : f.resultado === "error" ? false : null }
        : { fecha: diagnostico, ok: agente?.softlandOk ?? null };
    }) : [{ fecha: diagnostico, ok: agente?.softlandOk ?? null }];
    const estados = comprobaciones.map((c) => estadoSoftland(c.fecha, c.ok, ahora));
    const fechas = comprobaciones.map((c) => c.fecha).filter((f): f is string => !!f).sort((a, b) => fechaUtc(a) - fechaUtc(b));
    return {
      fecha: fechas[0] ?? null,
      estado: (agente && !agente.enLinea) || estados.includes("error") ? "error" as const : estados.every((e) => e === "exito") ? "exito" as const : "pendiente" as const,
    };
  }
  const propias = filas.filter((f) => f.companiaId === companiaId || f.companiaId === null);
  const estados = propias.map((f) => estadoSoftland(f.ultimaVerificacion, f.resultado === "ok" ? true : f.resultado === "error" ? false : null, ahora));
  const fechas = propias.map((f) => f.ultimaVerificacion).filter((f): f is string => !!f).sort((a, b) => fechaUtc(a) - fechaUtc(b));
  return {
    fecha: fechas[0] ?? null,
    estado: estados.includes("error") ? "error" as const : estados.length > 0 && estados.every((e) => e === "exito") ? "exito" as const : "pendiente" as const,
  };
}