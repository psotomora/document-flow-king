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
  notas?: string | null | undefined;
  /** Sistema del que proviene la factura; ausente = registro interno. */
  origen?: string | null;
  /** Cantidad de líneas (solo facturas de fuente externa). */
  lineas?: number | null;
  /** Verdadero cuando la factura ya está cobrada en el sistema de origen. */
  cobrada?: boolean | null;
  /** Saldo pendiente según cuentas por cobrar del sistema de origen. */
  saldoErp?: number | null;
  /** Fecha de vencimiento registrada en cuentas por cobrar del sistema de origen. */
  fechaVence?: string | null;
}

export interface LineaFactura {
  linea: number;
  articulo: string;
  descripcion?: string | null;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  impuesto: number;
  total: number;
  bodega?: string | null;
  pedido?: string | null;
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
  /** Documento por pagar aplicado (opcional). */
  documentoPagoId?: string | null;
  /** Número del documento por pagar aplicado (opcional). */
  documentoPagoNumero?: string | null;
}

/** Documento pendiente de pago a un proveedor (cuentas por pagar). */
export interface DocumentoPorPagar {
  id: string;
  companiaId: string;
  proveedor: string;
  numero: string;
  /** Tipo de documento del sistema de origen (FAC, ND, etc.). */
  tipo: string;
  fecha: string;
  fechaVence: string;
  moneda: Moneda;
  monto: number;
  /** Saldo pendiente de pago. */
  saldo: number;
  /** Sistema del que proviene; ausente = registro interno. */
  origen?: string | null;
  notas?: string | null;
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

export type EstadoPedido = "Pendiente" | "Facturado" | "Anulado";

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
  /** Sistema del que proviene el pedido; ausente = registro interno. */
  origen?: string | null;
  /** Cantidad de líneas (solo pedidos de fuente externa). */
  lineas?: number | null;
  notas?: string | null;
}

export interface LineaPedido {
  linea: number;
  articulo: string;
  descripcion?: string | null;
  cantidad: number;
  cantidadFacturada: number;
  precioUnitario: number;
  descuento: number;
  fechaEntrega: string;
  estado?: string | null;
}

export interface ConexionSoftland {
  fuente: string;
  servidor: string;
  baseDatos: string;
  esquema: string;
  usuario: string;
  tieneClave: boolean;
  companiaId?: string | null;
  encriptar: boolean;
}

export interface TipoCambio {
  id: string;
  valor: number;
  fecha: string;
  usuario: string;
  nota?: string | undefined;
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
  /** Nombre de inicio de sesión (modo conectado a SQL Server). */
  nombreUsuario?: string;
  correo?: string | undefined;
  activo?: boolean;
  /** Permisos de visibilidad por usuario (ausente = permitido). */
  verBancos?: boolean;
  verConsolidado?: boolean;
  verErogaciones?: boolean;
  verProyeccion?: boolean;
  verCatalogos?: boolean;
}
