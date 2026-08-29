import type { Moneda } from "@/data/tipos";

const formatoUSD = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoCRC = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat("es-CR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearMoneda(valor: number, moneda: Moneda): string {
  return moneda === "USD" ? formatoUSD.format(valor) : formatoCRC.format(valor);
}

export function formatearNumero(valor: number): string {
  return formatoNumero.format(valor);
}

export function formatearPorcentaje(valor: number): string {
  return `${formatoNumero.format(valor)} %`;
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
  const [fecha, hora = ""] = iso.split("T");
  return `${formatearFecha(fecha)} ${hora.slice(0, 5)}`.trim();
}

export const etiquetaMoneda: Record<Moneda, string> = {
  USD: "Dólares (USD)",
  CRC: "Colones (CRC)",
};
