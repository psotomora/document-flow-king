import { format, parseISO, subDays } from "date-fns";

export type PeriodoFecha = "hoy" | "semana" | "mes" | "rango";
export const PERIODOS_FECHA: { valor: PeriodoFecha; etiqueta: string }[] = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "semana", etiqueta: "Última semana" },
  { valor: "mes", etiqueta: "Último mes" },
  { valor: "rango", etiqueta: "Rango de fechas" },
];

/** Ventanas móviles de 7 y 30 días, incluyendo hoy y ambos extremos. */
export function rangoPeriodo(periodo: PeriodoFecha, hoy: string, desde = "", hasta = "") {
  if (periodo === "rango") return { desde, hasta };
  const dias = periodo === "semana" ? 6 : periodo === "mes" ? 29 : 0;
  return { desde: format(subDays(parseISO(hoy.slice(0, 10)), dias), "yyyy-MM-dd"), hasta: hoy.slice(0, 10) };
}

export function fechaEnPeriodo(fecha: string, periodo: PeriodoFecha, hoy: string, desde = "", hasta = "") {
  const rango = rangoPeriodo(periodo, hoy, desde, hasta);
  const dia = fecha.slice(0, 10);
  return (!rango.desde || dia >= rango.desde) && (!rango.hasta || dia <= rango.hasta);
}

export function periodoValido(valor: unknown): PeriodoFecha {
  return valor === "hoy" || valor === "semana" || valor === "mes" ? valor : "rango";
}