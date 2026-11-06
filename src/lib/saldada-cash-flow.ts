import type { Factura } from "@/data/tipos";

/**
 * Marca «Saldada / N/C (Cash Flow)»: la factura tiene una nota de crédito en el ERP que aún
 * no se aplica en cuentas por cobrar. El saldo pasa a 0 (sale de pendientes, tablero y
 * proyecciones) y se conserva el saldo del origen para mostrarlo y restaurarlo.
 */
export function marcarSaldada(
  f: Factura,
  fecha: string,
  nota: string | null,
  usuario: string,
): Factura {
  const saldoErpOrigen = f.saldadaCashFlow ? (f.saldoErpOrigen ?? null) : (f.saldoErp ?? null);
  const cobradaOrigen = f.saldadaCashFlow ? (f.cobradaOrigen ?? false) : (f.cobrada ?? false);
  return {
    ...f,
    saldadaCashFlow: true,
    saldoErpOrigen,
    cobradaOrigen,
    saldoErp: 0,
    cobrada: true,
    fechaSaldadaCashFlow: fecha,
    notaSaldadaCashFlow: nota,
    saldadaPor: usuario,
  };
}

export function quitarMarcaSaldada(f: Factura): Factura {
  if (!f.saldadaCashFlow) return f;
  return {
    ...f,
    saldadaCashFlow: false,
    saldoErp: f.saldoErpOrigen ?? null,
    cobrada: f.cobradaOrigen ?? false,
    saldoErpOrigen: null,
    cobradaOrigen: null,
    fechaSaldadaCashFlow: null,
    notaSaldadaCashFlow: null,
    saldadaPor: null,
  };
}
