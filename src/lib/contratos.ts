import type { Contrato, Pedido, Periodicidad } from "@/data/tipos";

/** Meses que avanza cada periodicidad de facturación. */
export const MESES_POR_PERIODICIDAD: Record<Periodicidad, number> = {
  Mensual: 1,
  Bimestral: 2,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
};

/** Suma meses a una fecha ISO (YYYY-MM-DD) conservando el fin de mes. */
export function sumarMeses(fechaIso: string, meses: number): string {
  const [a, m, d] = fechaIso.slice(0, 10).split("-").map(Number);
  const base = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, 1));
  base.setUTCMonth(base.getUTCMonth() + meses);
  const ultimoDia = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
  ).getUTCDate();
  base.setUTCDate(Math.min(d ?? 1, ultimoDia));
  return base.toISOString().slice(0, 10);
}

/** Número de pedido derivado de un contrato y su fecha de facturación. */
export function numeroPedidoDeContrato(numeroContrato: string, fecha: string): string {
  return `${numeroContrato}-${fecha.slice(0, 10)}`;
}

export interface PedidoGenerado {
  contratoId: string;
  numeroContrato: string;
  pedido: Omit<Pedido, "id">;
  /** Próxima fecha de facturación que queda en el contrato. */
  proximaFacturacion: string;
}

/**
 * Revisa los contratos activos y devuelve los pedidos que debieron generarse
 * hasta la fecha actual y que aún no existen (se identifican por su número).
 */
export function pedidosPendientesDeContratos(
  contratos: Contrato[],
  pedidos: Pedido[],
  hoy: string,
  maximoPorContrato = 12,
): PedidoGenerado[] {
  const existentes = new Set(pedidos.map((p) => p.numero));
  const generados: PedidoGenerado[] = [];

  for (const c of contratos) {
    if (c.estado !== "Activo") continue;
    let fecha = c.proximaFacturacion.slice(0, 10);
    let vueltas = 0;
    while (fecha <= hoy && vueltas < maximoPorContrato) {
      const numero = numeroPedidoDeContrato(c.numero, fecha);
      const siguiente = sumarMeses(fecha, MESES_POR_PERIODICIDAD[c.periodicidad] ?? 1);
      if (!existentes.has(numero)) {
        existentes.add(numero);
        generados.push({
          contratoId: c.id,
          numeroContrato: c.numero,
          proximaFacturacion: siguiente,
          pedido: {
            companiaId: c.companiaId,
            numero,
            cliente: c.cliente,
            fechaCreacion: fecha,
            plazoDias: c.plazoDias,
            moneda: c.moneda,
            monto: c.monto,
            estado: "Pendiente",
          },
        });
      }
      fecha = siguiente;
      vueltas++;
    }
  }

  return generados;
}
