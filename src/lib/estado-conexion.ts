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

export function verificarConexion(modo: "agente" | "directa", companiaId: string, filas: VerificacionConexion[], agente: DiagnosticoAgente | null, ahora: number) {
  if (modo === "agente") {
    return {
      fecha: agente?.ultimoDiagnostico ?? null,
      estado: agente && !agente.enLinea ? "error" as const : estadoSoftland(agente?.ultimoDiagnostico ?? null, agente?.softlandOk ?? null, ahora),
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