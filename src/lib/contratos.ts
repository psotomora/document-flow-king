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

/** Contrato que debe facturarse dentro del mes corriente. */
export interface ContratoDelMes {
  contratoId: string;
  companiaId: string;
  numero: string;
  cliente: string;
  periodicidad: Periodicidad;
  /** Fecha esperada de facturación dentro del mes. */
  fecha: string;
  moneda: Contrato["moneda"];
  monto: number;
  /** Fecha en que se creó el contrato en el sistema. */
  fechaCreacion: string;
  /** Verdadero si ya existe un pedido o factura asociado a esa facturación. */
  yaDocumentado: boolean;
  /** Número del pedido o factura encontrado, si existe. */
  documento?: string;
}

/** Último día del mes indicado en formato YYYY-MM. */
function finDeMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a ?? 1970, m ?? 1, 0)).getUTCDate();
  return `${mes}-${String(ultimo).padStart(2, "0")}`;
}

/**
 * Contratos activos cuya facturación cae dentro del mes indicado (YYYY-MM).
 * Marca los que ya tienen pedido o factura registrada, para no contarlos dos
 * veces en el saldo proyectado. Funciona igual con datos locales o externos.
 */
export function contratosPorFacturarDelMes(
  contratos: Contrato[],
  documentos: { numero: string; fecha: string }[],
  mes: string,
): ContratoDelMes[] {
  const inicio = `${mes}-01`;
  const fin = finDeMes(mes);
  const delMes = documentos.filter((d) => (d.fecha ?? "").slice(0, 7) === mes);
  const resultado: ContratoDelMes[] = [];

  for (const c of contratos) {
    if (c.estado !== "Activo") continue;
    const paso = MESES_POR_PERIODICIDAD[c.periodicidad] ?? 1;
    let fecha = c.proximaFacturacion.slice(0, 10);
    let vueltas = 0;
    // Alinea la fecha con el mes solicitado, hacia atrás o hacia adelante.
    while (fecha > fin && vueltas < 60) {
      fecha = sumarMeses(fecha, -paso);
      vueltas++;
    }
    while (fecha < inicio && vueltas < 60) {
      fecha = sumarMeses(fecha, paso);
      vueltas++;
    }
    while (fecha >= inicio && fecha <= fin) {
      const esperado = numeroPedidoDeContrato(c.numero, fecha);
      const clave = c.numero.trim().toUpperCase();
      const doc = delMes.find(
        (d) =>
          d.numero === esperado ||
          (clave.length > 0 && d.numero.trim().toUpperCase().includes(clave)),
      );
      resultado.push({
        contratoId: c.id,
        companiaId: c.companiaId,
        numero: c.numero,
        cliente: c.cliente,
        periodicidad: c.periodicidad,
        fecha,
        moneda: c.moneda,
        monto: c.monto,
        fechaCreacion: c.fechaCreacion ?? c.proximaFacturacion,
        yaDocumentado: doc !== undefined,
        ...(doc ? { documento: doc.numero } : {}),
      });
      fecha = sumarMeses(fecha, paso);
    }
  }

  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero.localeCompare(b.numero));
}
