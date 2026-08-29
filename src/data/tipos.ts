export type Moneda = "USD" | "CRC";

export type Perfil = "administrador" | "registro" | "consulta";

export type EstadoFactura = "Pagada" | "Pendiente" | "Vencida";

export interface Compania {
  id: string;
  codigo: string;
  nombre: string;
}

export interface Banco {
  id: string;
  nombre: string;
  companiaId: string;
  saldoInicialUSD: number;
  saldoInicialCRC: number;
  activo: boolean;
}

export interface Factura {
  id: string;
  companiaId: string;
  numero: string;
  cliente: string;
  fechaEmision: string;
  plazoDias: number;
  moneda: Moneda;
  monto: number;
  notas?: string | undefined;
}

export interface Pago {
  id: string;
  facturaId: string;
  fecha: string;
  bancoId: string;
  monto: number;
  moneda: Moneda;
  tipoCambioOperacion?: number | undefined;
  metodo: string;
  referencia?: string | undefined;
}

export interface Erogacion {
  id: string;
  companiaId: string;
  bancoId: string;
  numeroTransferencia: string;
  proveedor: string;
  fecha: string;
  moneda: Moneda;
  monto: number;
  notas?: string | undefined;
}

export type Periodicidad = "Mensual" | "Bimestral" | "Trimestral" | "Semestral" | "Anual";

export type EstadoContrato = "Activo" | "Cancelado";

export interface Contrato {
  id: string;
  companiaId: string;
  numero: string;
  cliente: string;
  periodicidad: Periodicidad;
  proximaFacturacion: string;
  plazoDias: number;
  moneda: Moneda;
  monto: number;
  facturado: boolean;
  estado: EstadoContrato;
  notas?: string | undefined;
}

export type EstadoPedido = "Pendiente" | "En proceso" | "Facturado" | "Anulado";

export interface Pedido {
  id: string;
  companiaId: string;
  numero: string;
  cliente: string;
  fechaCreacion: string;
  plazoDias: number;
  moneda: Moneda;
  monto: number;
  estado: EstadoPedido;
}

export interface TipoCambio {
  id: string;
  valor: number;
  fecha: string;
  usuario: string;
}

export type OperacionBitacora = "Creación" | "Modificación" | "Eliminación";

export interface RegistroBitacora {
  id: string;
  fechaHora: string;
  usuario: string;
  modulo: string;
  registro: string;
  operacion: OperacionBitacora;
  valorAnterior?: string | undefined;
  valorNuevo?: string | undefined;
}

export interface Usuario {
  id: string;
  nombre: string;
  perfil: Perfil;
}
