import type { FacturaCalculada } from "./calculos";

/** La casilla incluye pagadas sin alterar las candidatas automáticas pendientes. */
export function facturasParaPago<T extends Pick<FacturaCalculada, "saldoPendiente" | "estado">>(facturas: T[], mostrarPagadas: boolean): T[] {
  return facturas.filter((f) => f.saldoPendiente > 0.009 || (mostrarPagadas && f.estado === "Pagada"));
}

/** Una factura ya pagada registra solo el ingreso bancario. */
export function montoReferenciaPago(factura: Pick<FacturaCalculada, "estado" | "monto" | "saldoPendiente">): number {
  return factura.estado === "Pagada" ? factura.monto : factura.saldoPendiente;
}
