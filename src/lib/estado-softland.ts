export const LIMITE_VERIFICACION_MS = 5 * 60 * 1000;

export function fechaUtc(valor: string): number {
  return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(valor) ? valor : `${valor}Z`);
}

export function estadoSoftland(verificacion: string | null, exitosa: boolean | null, ahora: number): "exito" | "error" | "pendiente" {
  if (!verificacion) return exitosa === false ? "error" : "pendiente";
  const fecha = fechaUtc(verificacion);
  if (!Number.isFinite(fecha) || ahora - fecha >= LIMITE_VERIFICACION_MS || exitosa === false) return "error";
  return exitosa === true ? "exito" : "pendiente";
}