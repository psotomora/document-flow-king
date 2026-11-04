/** Detección de movimientos ya registrados que coinciden con una fila del estado de cuenta. */
export interface MovimientoRegistrado {
  id: string;
  fecha: string;
  bancoId: string;
  moneda: string;
  monto: number;
  descripcion: string;
}

/** Mes calendario (AAAA-MM) de una fecha ISO o null si no es válida. */
function mes(fecha: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec((fecha ?? "").trim());
  return m ? `${m[1]}-${m[2]}` : null;
}

/**
 * Mismo banco, moneda y monto (±0,01) dentro del mismo mes calendario que la fila del extracto.
 * Elimina repeticiones (mismo id o mismo fecha + monto + descripción) para no listar un registro dos veces.
 */
export function movimientosPrevios(
  fila: { fecha: string; monto: number },
  bancoId: string,
  moneda: string,
  registrados: MovimientoRegistrado[],
): MovimientoRegistrado[] {
  const m = mes(fila.fecha);
  if (m === null) return [];
  const vistos = new Set<string>();
  const res: MovimientoRegistrado[] = [];
  for (const r of registrados) {
    if (r.bancoId !== bancoId || r.moneda !== moneda || Math.abs(r.monto - fila.monto) >= 0.01 || mes(r.fecha) !== m) continue;
    const clave = `${r.fecha.slice(0, 10)}|${r.monto.toFixed(2)}|${r.descripcion.trim()}`;
    if (vistos.has(`id:${r.id}`) || vistos.has(clave)) continue;
    vistos.add(`id:${r.id}`);
    vistos.add(clave);
    res.push(r);
  }
  return res.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
