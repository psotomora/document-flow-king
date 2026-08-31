import type {
  Banco,
  EstadoFactura,
  Erogacion,
  Factura,
  Moneda,
  Pago,
  Pedido,
} from "@/data/tipos";

/**
 * Reglas de cálculo del ERS (RF-003, RF-004, RF-008, RF-009, RF-010, RF-013).
 * Funciones puras: reciben datos y devuelven resultados, sin estado ni efectos.
 */

const MS_DIA = 86_400_000;

export function aFecha(iso: string): Date {
  const [anio = "1970", mes = "01", dia = "01"] = iso.slice(0, 10).split("-");
  return new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
}

export function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  return aIso(new Date(aFecha(iso).getTime() + dias * MS_DIA));
}

export function diferenciaDias(desdeIso: string, hastaIso: string): number {
  return Math.round((aFecha(hastaIso).getTime() - aFecha(desdeIso).getTime()) / MS_DIA);
}

/** RF-003: fecha de vencimiento = fecha de emisión + plazo en días. */
export function fechaVencimiento(factura: Factura): string {
  return sumarDias(factura.fechaEmision, factura.plazoDias);
}

/** RF-003: días para vencer = fecha de vencimiento - fecha actual. */
export function diasParaVencer(factura: Factura, hoyIso: string): number {
  return diferenciaDias(hoyIso, fechaVencimiento(factura));
}

/**
 * RF-005 (ajustado): un pago puede registrarse en moneda distinta a la de la
 * factura; en ese caso se convierte con el tipo de cambio de la operación.
 */
export function montoPagoEnMonedaFactura(pago: Pago, monedaFactura: Moneda): number {
  if (pago.moneda === monedaFactura) return pago.monto;
  const tc = pago.tipoCambioOperacion;
  if (!tc || tc <= 0) return 0;
  return monedaFactura === "USD" ? pago.monto / tc : pago.monto * tc;
}

/** RF-004: total pagado de una factura. */
export function totalPagado(factura: Factura, pagos: Pago[]): number {
  return pagos
    .filter((p) => p.facturaId === factura.id)
    .reduce((suma, p) => suma + montoPagoEnMonedaFactura(p, factura.moneda), 0);
}

/** RF-004: saldo pendiente = monto facturado - total pagado. */
export function saldoPendiente(factura: Factura, pagos: Pago[]): number {
  return factura.monto - totalPagado(factura, pagos);
}

/** RF-004: estado derivado de la factura. */
export function estadoFactura(factura: Factura, pagos: Pago[], hoyIso: string): EstadoFactura {
  const saldo = saldoPendiente(factura, pagos);
  if (saldo <= 0.009) return "Pagada";
  return diferenciaDias(hoyIso, fechaVencimiento(factura)) < 0 ? "Vencida" : "Pendiente";
}

export interface FacturaCalculada extends Factura {
  fechaVencimiento: string;
  diasParaVencer: number | null;
  totalPagado: number;
  saldoPendiente: number;
  estado: EstadoFactura;
}

export function calcularFactura(
  factura: Factura,
  pagos: Pago[],
  hoyIso: string,
): FacturaCalculada {
  const pagado = totalPagado(factura, pagos);
  const saldo = factura.monto - pagado;
  const estado = estadoFactura(factura, pagos, hoyIso);
  return {
    ...factura,
    fechaVencimiento: fechaVencimiento(factura),
    // RF-003.3: sin saldo pendiente no se muestran los días para vencer.
    diasParaVencer: estado === "Pagada" ? null : diasParaVencer(factura, hoyIso),
    totalPagado: pagado,
    saldoPendiente: saldo,
    estado,
  };
}

export function calcularFacturas(
  facturas: Factura[],
  pagos: Pago[],
  hoyIso: string,
): FacturaCalculada[] {
  return facturas.map((f) => calcularFactura(f, pagos, hoyIso));
}

export interface SaldoBanco {
  bancoId: string;
  nombre: string;
  companiaId: string;
  saldoInicial: number;
  pagosRecibidos: number;
  saldoActual: number;
  erogaciones: number;
  saldoNeto: number;
}

/** RF-008: saldo disponible por banco, independiente por moneda. */
export function calcularSaldosPorBanco(
  bancos: Banco[],
  pagos: Pago[],
  erogaciones: Erogacion[],
  moneda: Moneda,
): SaldoBanco[] {
  return bancos.map((banco) => {
    const saldoInicial = moneda === "USD" ? banco.saldoInicialUSD : banco.saldoInicialCRC;
    const pagosRecibidos = pagos
      .filter((p) => p.bancoId === banco.id && p.moneda === moneda)
      .reduce((s, p) => s + p.monto, 0);
    const totalErogaciones = erogaciones
      .filter((e) => e.bancoId === banco.id && e.moneda === moneda)
      .reduce((s, e) => s + e.monto, 0);
    const saldoActual = saldoInicial + pagosRecibidos;
    return {
      bancoId: banco.id,
      nombre: banco.nombre,
      companiaId: banco.companiaId,
      saldoInicial,
      pagosRecibidos,
      saldoActual,
      erogaciones: totalErogaciones,
      saldoNeto: saldoActual - totalErogaciones,
    };
  });
}

export function totalizarSaldos(saldos: SaldoBanco[]): Omit<SaldoBanco, "bancoId" | "nombre" | "companiaId"> {
  return saldos.reduce(
    (acc, s) => ({
      saldoInicial: acc.saldoInicial + s.saldoInicial,
      pagosRecibidos: acc.pagosRecibidos + s.pagosRecibidos,
      saldoActual: acc.saldoActual + s.saldoActual,
      erogaciones: acc.erogaciones + s.erogaciones,
      saldoNeto: acc.saldoNeto + s.saldoNeto,
    }),
    { saldoInicial: 0, pagosRecibidos: 0, saldoActual: 0, erogaciones: 0, saldoNeto: 0 },
  );
}

export const TRAMOS = [
  { clave: "vencido", etiqueta: "Vencido sin cobrar" },
  { clave: "0-7", etiqueta: "De 0 a 7 días" },
  { clave: "8-15", etiqueta: "De 8 a 15 días" },
  { clave: "16-30", etiqueta: "De 16 a 30 días" },
  { clave: "31-60", etiqueta: "De 31 a 60 días" },
  { clave: "60+", etiqueta: "Más de 60 días" },
] as const;

export type ClaveTramo = (typeof TRAMOS)[number]["clave"];

export function tramoDeVencimiento(dias: number): ClaveTramo {
  if (dias < 0) return "vencido";
  if (dias <= 7) return "0-7";
  if (dias <= 15) return "8-15";
  if (dias <= 30) return "16-30";
  if (dias <= 60) return "31-60";
  return "60+";
}

export interface FilaTramo {
  clave: ClaveTramo;
  etiqueta: string;
  monto: number;
  cantidad: number;
  porcentaje: number;
}

/** RF-010: proyección de cobros por tramos de vencimiento, por moneda. */
export function proyeccionPorTramos(
  facturas: FacturaCalculada[],
  moneda: Moneda,
): { filas: FilaTramo[]; total: number; cantidadTotal: number } {
  const pendientes = facturas.filter((f) => f.moneda === moneda && f.saldoPendiente > 0.009);
  const total = pendientes.reduce((s, f) => s + f.saldoPendiente, 0);
  const filas = TRAMOS.map(({ clave, etiqueta }) => {
    const delTramo = pendientes.filter(
      (f) => tramoDeVencimiento(f.diasParaVencer ?? 0) === clave,
    );
    const monto = delTramo.reduce((s, f) => s + f.saldoPendiente, 0);
    return {
      clave,
      etiqueta,
      monto,
      cantidad: delTramo.length,
      porcentaje: total > 0 ? (monto / total) * 100 : 0,
    };
  });
  return { filas, total, cantidadTotal: pendientes.length };
}

export interface IndicadoresMoneda {
  moneda: Moneda;
  totalFacturado: number;
  totalCobrado: number;
  saldoPorCobrar: number;
  porcentajeCobrado: number;
  saldoVencido: number;
  pagadas: number;
  pendientes: number;
  vencidas: number;
  totalFacturas: number;
}

/** RF-013: indicadores del tablero, separados por moneda. */
export function indicadoresPorMoneda(
  facturas: FacturaCalculada[],
  moneda: Moneda,
): IndicadoresMoneda {
  const delMoneda = facturas.filter((f) => f.moneda === moneda);
  const totalFacturado = delMoneda.reduce((s, f) => s + f.monto, 0);
  const totalCobrado = delMoneda.reduce((s, f) => s + Math.min(f.totalPagado, f.monto), 0);
  const saldoPorCobrar = delMoneda.reduce((s, f) => s + Math.max(f.saldoPendiente, 0), 0);
  return {
    moneda,
    totalFacturado,
    totalCobrado,
    saldoPorCobrar,
    porcentajeCobrado: totalFacturado > 0 ? (totalCobrado / totalFacturado) * 100 : 0,
    saldoVencido: delMoneda
      .filter((f) => f.estado === "Vencida")
      .reduce((s, f) => s + f.saldoPendiente, 0),
    pagadas: delMoneda.filter((f) => f.estado === "Pagada").length,
    pendientes: delMoneda.filter((f) => f.estado === "Pendiente").length,
    vencidas: delMoneda.filter((f) => f.estado === "Vencida").length,
    totalFacturas: delMoneda.length,
  };
}

export function saldoPorCliente(
  facturas: FacturaCalculada[],
  moneda: Moneda,
): { cliente: string; saldo: number }[] {
  const mapa = new Map<string, number>();
  facturas
    .filter((f) => f.moneda === moneda && f.saldoPendiente > 0.009)
    .forEach((f) => mapa.set(f.cliente, (mapa.get(f.cliente) ?? 0) + f.saldoPendiente));
  return [...mapa.entries()]
    .map(([cliente, saldo]) => ({ cliente, saldo }))
    .sort((a, b) => b.saldo - a.saldo);
}

export interface SaldoProyectado {
  saldoActualUSD: number;
  saldoActualCRC: number;
  porCobrarUSD: number;
  porCobrarCRC: number;
  proyectadoUSD: number;
  proyectadoCRC: number;
  equivalenteUsdDeCrc: number;
  consolidadoUSD: number;
  pedidosPendientesUSD: number;
  consolidadoConPedidosUSD: number;
}

/** RF-009: saldo proyectado consolidado, expresado en dólares. */
export function calcularSaldoProyectado(
  saldosUSD: SaldoBanco[],
  saldosCRC: SaldoBanco[],
  facturas: FacturaCalculada[],
  pedidos: Pedido[],
  tipoCambio: number,
): SaldoProyectado {
  const saldoActualUSD = totalizarSaldos(saldosUSD).saldoNeto;
  const saldoActualCRC = totalizarSaldos(saldosCRC).saldoNeto;
  const porCobrarUSD = facturas
    .filter((f) => f.moneda === "USD")
    .reduce((s, f) => s + Math.max(f.saldoPendiente, 0), 0);
  const porCobrarCRC = facturas
    .filter((f) => f.moneda === "CRC")
    .reduce((s, f) => s + Math.max(f.saldoPendiente, 0), 0);
  const proyectadoUSD = saldoActualUSD + porCobrarUSD;
  const proyectadoCRC = saldoActualCRC + porCobrarCRC;
  const equivalenteUsdDeCrc = tipoCambio > 0 ? proyectadoCRC / tipoCambio : 0;
  const consolidadoUSD = proyectadoUSD + equivalenteUsdDeCrc;
  const pendientes = pedidos.filter((p) => p.estado === "Pendiente");
  const pedidosPendientesUSD =
    pendientes.filter((p) => p.moneda === "USD").reduce((s, p) => s + p.monto, 0) +
    (tipoCambio > 0
      ? pendientes.filter((p) => p.moneda === "CRC").reduce((s, p) => s + p.monto, 0) / tipoCambio
      : 0);
  return {
    saldoActualUSD,
    saldoActualCRC,
    porCobrarUSD,
    porCobrarCRC,
    proyectadoUSD,
    proyectadoCRC,
    equivalenteUsdDeCrc,
    consolidadoUSD,
    pedidosPendientesUSD,
    consolidadoConPedidosUSD: consolidadoUSD + pedidosPendientesUSD,
  };
}

export function equivalenteEnDolares(monto: number, moneda: Moneda, tipoCambio: number): number {
  if (moneda === "USD") return monto;
  return tipoCambio > 0 ? monto / tipoCambio : 0;
}

export function inicioDePeriodo(hoyIso: string, periodo: "semanal" | "mensual"): string {
  const hoy = aFecha(hoyIso);
  if (periodo === "semanal") {
    const diaSemana = (hoy.getUTCDay() + 6) % 7; // lunes = 0
    return aIso(new Date(hoy.getTime() - diaSemana * MS_DIA));
  }
  return `${hoyIso.slice(0, 7)}-01`;
}
