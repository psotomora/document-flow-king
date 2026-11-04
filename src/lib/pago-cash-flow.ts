import type { DocumentoPorPagar } from "@/data/tipos";

/**
 * Marca «Pagado (Cash Flow)»: el documento se paga en Flujo de Efectivo aunque el ERP
 * todavía reporte saldo. El saldo pasa a 0 (sale de pendientes y de los totales) y el
 * saldo del origen se conserva para mostrarlo y restaurarlo al quitar la marca.
 */
export function marcarPagado(
  d: DocumentoPorPagar,
  fechaPago: string,
  nota: string | null,
  usuario: string,
): DocumentoPorPagar {
  const saldoOrigen = d.pagadoCashFlow ? (d.saldoOrigen ?? d.saldo) : d.saldo;
  return {
    ...d,
    pagadoCashFlow: true,
    saldoOrigen,
    saldo: 0,
    fechaPagoCashFlow: fechaPago,
    notaPagoCashFlow: nota,
    marcadoPor: usuario,
  };
}

export function quitarMarcaPagado(d: DocumentoPorPagar): DocumentoPorPagar {
  if (!d.pagadoCashFlow) return d;
  return {
    ...d,
    pagadoCashFlow: false,
    saldo: d.saldoOrigen ?? d.saldo,
    saldoOrigen: null,
    fechaPagoCashFlow: null,
    notaPagoCashFlow: null,
    marcadoPor: null,
  };
}

/** Solo se marcan documentos con saldo real en el origen o ya marcados (para editar/quitar). */
export function puedeMarcarPagado(d: DocumentoPorPagar): boolean {
  return d.pagadoCashFlow === true || d.saldo > 0;
}
