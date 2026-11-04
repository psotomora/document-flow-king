/** Detección de referencias del estado de cuenta que ya están registradas en pagos o erogaciones. */
export interface RegistroConReferencia {
  id: string;
  referencias: (string | null | undefined)[];
  fecha: string;
  monto: number;
  moneda: string;
  descripcion: string;
}

/** Ignora espacios, guiones, signos y mayúsculas. */
export function normalizarReferencia(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Mínimo de caracteres significativos para considerar una referencia comparable. */
export const MINIMO_REFERENCIA = 4;

export function referenciasEnUso(
  referencia: string | null | undefined,
  registros: RegistroConReferencia[],
): RegistroConReferencia[] {
  const ref = normalizarReferencia(referencia);
  if (ref.length < MINIMO_REFERENCIA) return [];
  return registros.filter((r) => r.referencias.some((x) => normalizarReferencia(x) === ref));
}
