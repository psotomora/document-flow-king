/** Detección de movimientos ya registrados que coinciden con una fila del estado de cuenta. */
export interface MovimientoRegistrado {
  id: string;
  fecha: string;
  bancoId: string;
  moneda: string;
  monto: number;
  descripcion: string;
}

export const VENTANA_DIAS_PREVIO = 15;

function dia(fecha: string): number | null {
  const t = Date.parse(fecha.slice(0, 10) + "T00:00:00Z");
  return Number.isNaN(t) ? null : t / 86400000;
}

/** Mismo banco, moneda y monto (±0,01) dentro de ±15 días de la fecha del extracto. */
export function movimientosPrevios(
  fila: { fecha: string; monto: number },
  bancoId: string,
  moneda: string,
  registrados: MovimientoRegistrado[],
): MovimientoRegistrado[] {
  const d = dia(fila.fecha);
  if (d === null) return [];
  return registrados.filter((r) => {
    const dr = dia(r.fecha);
    return (
      dr !== null &&
      r.bancoId === bancoId &&
      r.moneda === moneda &&
      Math.abs(r.monto - fila.monto) < 0.01 &&
      Math.abs(dr - d) <= VENTANA_DIAS_PREVIO
    );
  });
}
