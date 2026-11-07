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

/** Raíz de la referencia: quita el sufijo correlativo de Cash Flow (485921-2 → 485921). */
export function raizReferencia(valor: string | null | undefined): string {
  return normalizarReferencia((valor ?? "").trim().replace(/-\d{1,2}$/, ""));
}

/** Coincide por raíz, así el extracto (485921) encuentra 485921, 485921-2, 485921-3… */
export function referenciasEnUso(
  referencia: string | null | undefined,
  registros: RegistroConReferencia[],
): RegistroConReferencia[] {
  const ref = raizReferencia(referencia);
  if (ref.length < MINIMO_REFERENCIA) return [];
  return registros.filter((r) => r.referencias.some((x) => raizReferencia(x) === ref));
}

/** Sugiere la referencia con sufijo correlativo libre: 123456 → 123456-2, 123456-3... */
export function siguienteReferenciaConSufijo(referencia: string, existentes: string[]): string {
  const base = referencia.trim().replace(/-\d+$/, "");
  const usadas = new Set(existentes.map((e) => e.trim().toUpperCase()));
  let n = 2;
  while (usadas.has(`${base}-${n}`.toUpperCase())) n++;
  return `${base}-${n}`;
}
