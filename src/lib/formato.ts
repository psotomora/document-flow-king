import type { Moneda } from "@/data/tipos";

/**
 * Formato manual es-CR (miles con punto, decimales con coma). No se usa Intl
 * porque el runtime del servidor y el del navegador pueden traer datos de
 * localización distintos y eso provoca desajustes de hidratación.
 */
function formatearFijo(valor: number, decimales = 2): string {
  const negativo = valor < 0 || Object.is(valor, -0);
  const partes = Math.abs(valor).toFixed(decimales).split(".");
  const entero = (partes[0] ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimal = partes[1];
  const texto = decimal ? `${entero},${decimal}` : entero;
  return negativo ? `-${texto}` : texto;
}

export function formatearMoneda(valor: number, moneda: Moneda): string {
  const simbolo = moneda === "USD" ? "$" : "₡";
  const negativo = valor < 0;
  return `${negativo ? "-" : ""}${simbolo}${formatearFijo(Math.abs(valor))}`;
}

export function formatearNumero(valor: number): string {
  return formatearFijo(valor);
}

export function formatearPorcentaje(valor: number): string {
  return `${formatearFijo(valor)} %`;
}


/** Convierte "2026-08-29" al formato dd/mm/aaaa usado en Costa Rica. */
export function formatearFecha(iso: string): string {
  if (!iso) return "";
  const soloFecha = iso.slice(0, 10);
  const [anio, mes, dia] = soloFecha.split("-");
  if (!anio || !mes || !dia) return iso;
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaHora(iso: string): string {
  if (!iso) return "";
  const [fecha = "", hora = ""] = iso.split("T");
  return `${formatearFecha(fecha)} ${hora.slice(0, 5)}`.trim();
}

export const etiquetaMoneda: Record<Moneda, string> = {
  USD: "Dólares (USD)",
  CRC: "Colones (CRC)",
};
