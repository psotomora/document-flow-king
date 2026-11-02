/** Validación cronológica de la conciliación bancaria: un pago no puede corresponder a un documento emitido después. */
const dia = (f: string) => (f || "").slice(0, 10);

export function emitidoAntesDe(fechaDocumento: string, fechaMovimiento: string): boolean {
  if (!fechaDocumento || !fechaMovimiento) return true;
  return dia(fechaDocumento) <= dia(fechaMovimiento);
}

/** Distancia en días entre el documento y el movimiento (para priorizar el más cercano). */
export function distanciaDias(fechaDocumento: string, fechaMovimiento: string): number {
  const a = Date.parse(dia(fechaDocumento));
  const b = Date.parse(dia(fechaMovimiento));
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.MAX_SAFE_INTEGER;
  return Math.abs(b - a) / 86_400_000;
}

/** Filtra documentos emitidos hasta la fecha del movimiento y los ordena del más cercano al más lejano. */
export function filtrarPorFecha<T>(docs: T[], fechaDe: (d: T) => string, fechaMovimiento: string): T[] {
  return docs
    .filter((d) => emitidoAntesDe(fechaDe(d), fechaMovimiento))
    .sort((a, b) => distanciaDias(fechaDe(a), fechaMovimiento) - distanciaDias(fechaDe(b), fechaMovimiento));
}
