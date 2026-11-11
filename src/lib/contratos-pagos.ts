import type { Contrato, Factura, Pago, Periodicidad } from "@/data/tipos";
import { contratosPorFacturarDelMes, MESES_POR_PERIODICIDAD, sumarMeses, type ContratoDelMes } from "./contratos";

const normalizar = (valor: string) => valor.trim().replace(/\s+/g, " ").toUpperCase();

export interface HallazgoPagoContrato {
  factura: string;
  pagos: Pago[];
  monto: number;
  motivo: "Factura asociada" | "Cliente, moneda y monto";
  completo: boolean;
}

/** Sugerencias, nunca aplicaciones automáticas: pagos del mismo mes y compañía. */
export function sugerirPagosContrato(
  contrato: ContratoDelMes,
  pagos: readonly Pago[],
  facturas: readonly Factura[],
  facturaAsociada = contrato.factura ?? "",
): HallazgoPagoContrato[] {
  if (!normalizar(contrato.cliente) || contrato.monto <= 0) return [];
  const hallazgos: HallazgoPagoContrato[] = [];
  for (const factura of facturas) {
    if (factura.companiaId !== contrato.companiaId ||
        normalizar(factura.cliente) !== normalizar(contrato.cliente)) continue;
    const coincidentes = pagos.filter((p) => p.facturaId === factura.id &&
      p.fecha.slice(0, 7) === contrato.fecha.slice(0, 7) &&
      p.moneda === contrato.moneda && Number.isFinite(p.monto) && p.monto > 0);
    const monto = coincidentes.reduce((s, p) => s + p.monto, 0);
    if (!coincidentes.length) continue;
    const asociada = Boolean(facturaAsociada) && normalizar(factura.numero) === normalizar(facturaAsociada);
    const equivalente = factura.moneda === contrato.moneda && Math.abs(monto - contrato.monto) < 0.01;
    if (!asociada && !equivalente) continue;
    hallazgos.push({
      factura: factura.numero, pagos: coincidentes, monto,
      motivo: asociada ? "Factura asociada" : "Cliente, moneda y monto",
      completo: monto + 0.009 >= contrato.monto,
    });
  }
  return hallazgos.sort((a, b) => Number(b.motivo === "Factura asociada") - Number(a.motivo === "Factura asociada") || a.factura.localeCompare(b.factura));
}

/** Previsión bruta por calendario: no aplica marcas de pago del mes actual. */
export function facturacionContratosProximoMes(contratos: Contrato[], hoy: string, tipoCambio: number) {
  const mes = sumarMeses(`${hoy.slice(0, 7)}-01`, 1).slice(0, 7);
  const lineas = contratosPorFacturarDelMes(contratos, [], mes)
    .filter((c) => c.fechaCreacion.slice(0, 10) <= c.fecha);
  const grupos = (Object.keys(MESES_POR_PERIODICIDAD) as Periodicidad[]).map((periodicidad) => {
    const filas = lineas.filter((c) => c.periodicidad === periodicidad);
    return {
      periodicidad, cantidad: filas.length,
      usd: filas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.monto, 0),
      crc: filas.filter((c) => c.moneda === "CRC").reduce((s, c) => s + c.monto, 0),
    };
  });
  const usd = grupos.reduce((s, g) => s + g.usd, 0);
  const crc = grupos.reduce((s, g) => s + g.crc, 0);
  return { mes, grupos, cantidad: lineas.length, usd, crc, equivalenteUsd: usd + (tipoCambio > 0 ? crc / tipoCambio : 0) };
}