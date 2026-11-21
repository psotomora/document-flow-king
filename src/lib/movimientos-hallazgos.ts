import type { DocumentoPorPagar, Factura, Moneda, Pago } from "../data/tipos";
import { MINIMO_REFERENCIA, raizReferencia } from "./referencias-en-uso";

export const TIPOS_MOVIMIENTO = ["Crédito", "Débito"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export function filtrarTiposMovimiento<T extends { tipo: TipoMovimiento }>(filas: T[], tipos: readonly TipoMovimiento[]): T[] {
  return filas.filter((fila) => tipos.includes(fila.tipo));
}

export interface MovimientoParaHallazgos {
  registroId: string;
  companiaId: string;
  bancoId: string;
  fecha: string;
  moneda: Moneda;
  monto: number;
  tipo: TipoMovimiento;
  referencia: string;
  documentoId?: string | null;
}

export interface HallazgoMovimiento {
  id: string;
  texto: string;
  motivo: string;
  vinculado: boolean;
}

/** Solo consulta: los vínculos existentes se distinguen de las posibles coincidencias. */
export function hallazgosMovimiento(
  movimiento: MovimientoParaHallazgos,
  documentos: DocumentoPorPagar[],
  pagos: Pago[],
  facturas: Factura[],
): HallazgoMovimiento[] {
  const monto = Math.abs(movimiento.monto);
  if (movimiento.tipo === "Débito") {
    return documentos.filter((d) => d.companiaId === movimiento.companiaId &&
      (d.id === movimiento.documentoId || d.erogacionPagoId === movimiento.registroId ||
        (d.moneda === movimiento.moneda && !d.pagadoCashFlow && d.saldo > 0.009 &&
          Math.abs(d.saldo - monto) < 0.01 && d.fecha.slice(0, 10) <= movimiento.fecha.slice(0, 10))))
      .map((d) => {
        const vinculado = d.id === movimiento.documentoId || d.erogacionPagoId === movimiento.registroId;
        return { id: d.id, texto: `Documento ${d.numero} · ${d.proveedor}`, motivo: vinculado ? "Documento vinculado" : "Saldo y moneda coinciden", vinculado };
      }).sort((a, b) => Number(b.vinculado) - Number(a.vinculado));
  }
  const ref = raizReferencia(movimiento.referencia);
  return pagos.flatMap((p): HallazgoMovimiento[] => {
    const factura = facturas.find((f) => f.id === p.facturaId);
    if (p.bancoId !== movimiento.bancoId || p.moneda !== movimiento.moneda ||
      (factura && factura.companiaId !== movimiento.companiaId)) return [];
    const vinculado = p.id === movimiento.registroId;
    const mismaReferencia = ref.length >= MINIMO_REFERENCIA && raizReferencia(p.referencia) === ref;
    if (!vinculado && !(p.fecha.slice(0, 7) === movimiento.fecha.slice(0, 7) && Math.abs(p.monto - monto) < 0.01)) return [];
    return [{ id: p.id, texto: `Pago ${p.referencia || p.id}${factura ? ` · Factura ${factura.numero} · ${factura.cliente}` : ""}`, motivo: vinculado ? "Pago registrado" : mismaReferencia ? "Referencia, monto y mes coinciden" : "Monto y mes coinciden", vinculado }];
  }).sort((a, b) => Number(b.vinculado) - Number(a.vinculado));
}