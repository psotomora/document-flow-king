import type { Banco, DocumentoPorPagar, Erogacion } from "@/data/tipos";

export interface DatosPagoDocumento {
  bancoId: string;
  numeroTransferencia: string;
  monto: number;
}

export function validarPagoDocumento(d: DocumentoPorPagar, pago: DatosPagoDocumento, bancos: Banco[]): string | null {
  if (!bancos.some((b) => b.id === pago.bancoId && b.companiaId === d.companiaId && b.activo))
    return "Seleccione una cuenta bancaria activa de la compañía del documento.";
  if (!pago.numeroTransferencia.trim() || pago.numeroTransferencia.trim().length > 40)
    return "Indique el número de transferencia (máximo 40 caracteres).";
  const saldo = d.pagadoCashFlow ? (d.saldoOrigen ?? 0) : d.saldo;
  if (!Number.isFinite(pago.monto) || pago.monto <= 0 || Math.abs(pago.monto - saldo) > 0.005)
    return "Para marcar pagado debe registrar el saldo pendiente completo.";
  return null;
}

export function erogacionDeDocumento(d: DocumentoPorPagar, pago: DatosPagoDocumento, fecha: string, nota: string | null): Omit<Erogacion, "id"> {
  return { companiaId: d.companiaId, bancoId: pago.bancoId, numeroTransferencia: pago.numeroTransferencia.trim(),
    proveedor: d.proveedor, fecha, moneda: d.moneda, monto: pago.monto, notas: nota ?? undefined,
    documentoPagoId: d.id, documentoPagoNumero: d.numero };
}