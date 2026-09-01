import type {
  Banco,
  Compania,
  Contrato,
  Erogacion,
  Factura,
  Pago,
  Pedido,
  RegistroBitacora,
  TipoCambio,
  Usuario,
} from "./tipos";

/**
 * Fecha de corte de la maqueta. Todos los cálculos de vencimiento y de tramos
 * de proyección se realizan contra esta fecha para que la demostración sea
 * reproducible y no dependa del día en que se abra la aplicación.
 */
export const FECHA_CORTE = "2026-08-29";

export const companias: Compania[] = [
  { id: "tx", codigo: "TX", nombre: "THERONIX, S. A." },
  { id: "ax", codigo: "AX", nombre: "APLIX" },
];

export const bancos: Banco[] = [
  {
    id: "bac-tx",
    nombre: "BAC TX",
    companiaId: "tx",
    saldoInicialUSD: 42500,
    saldoInicialCRC: 8750000,
    activo: true,
  },
  {
    id: "promerica-tx",
    nombre: "PROMERICA TX",
    companiaId: "tx",
    saldoInicialUSD: 18300,
    saldoInicialCRC: 12400000,
    activo: true,
  },
  {
    id: "bac-ax",
    nombre: "BAC AX",
    companiaId: "ax",
    saldoInicialUSD: 26750,
    saldoInicialCRC: 5320000,
    activo: true,
  },
  {
    id: "promerica-ax",
    nombre: "PROMERICA AX",
    companiaId: "ax",
    saldoInicialUSD: 9800,
    saldoInicialCRC: 3150000,
    activo: true,
  },
];

export const usuarios: Usuario[] = [
  { id: "u1", nombre: "María Jiménez", perfil: "administrador", nombreUsuario: "mjimenez", correo: "mjimenez@aplix.cr", activo: true },
  { id: "u2", nombre: "Carlos Rojas", perfil: "registro", nombreUsuario: "crojas", correo: "crojas@aplix.cr", activo: true },
  { id: "u3", nombre: "Ana Vargas", perfil: "consulta", nombreUsuario: "avargas", correo: "avargas@aplix.cr", activo: true },
];

export const tiposCambio: TipoCambio[] = [
  { id: "tc1", valor: 508.35, fecha: "2026-05-04T09:12:00", usuario: "María Jiménez" },
  { id: "tc2", valor: 512.7, fecha: "2026-07-01T08:40:00", usuario: "María Jiménez" },
  { id: "tc3", valor: 515.25, fecha: "2026-08-18T10:05:00", usuario: "María Jiménez" },
];

export const facturas: Factura[] = [
  { id: "f1", companiaId: "tx", numero: "TX-1001", cliente: "Grupo Ferretero CR", fechaEmision: "2026-05-12", plazoDias: 30, moneda: "USD", monto: 18500, notas: "Licenciamiento anual" },
  { id: "f2", companiaId: "tx", numero: "TX-1002", cliente: "Distribuidora del Valle", fechaEmision: "2026-06-02", plazoDias: 45, moneda: "CRC", monto: 6350000, notas: "Soporte trimestral" },
  { id: "f3", companiaId: "tx", numero: "TX-1003", cliente: "Corporación Santa Ana", fechaEmision: "2026-07-08", plazoDias: 30, moneda: "USD", monto: 9750 },
  { id: "f4", companiaId: "tx", numero: "TX-1004", cliente: "Grupo Ferretero CR", fechaEmision: "2026-07-22", plazoDias: 30, moneda: "USD", monto: 4200, notas: "Horas adicionales" },
  { id: "f5", companiaId: "tx", numero: "TX-1005", cliente: "Textiles Heredia", fechaEmision: "2026-08-05", plazoDias: 15, moneda: "CRC", monto: 2450000 },
  { id: "f6", companiaId: "tx", numero: "TX-1006", cliente: "Corporación Santa Ana", fechaEmision: "2026-08-14", plazoDias: 30, moneda: "USD", monto: 12800 },
  { id: "f7", companiaId: "tx", numero: "TX-1007", cliente: "Inversiones Escazú", fechaEmision: "2026-08-24", plazoDias: 45, moneda: "CRC", monto: 9800000, notas: "Proyecto de migración" },
  { id: "f8", companiaId: "ax", numero: "AX-2001", cliente: "Farmacias Unidas", fechaEmision: "2026-05-28", plazoDias: 30, moneda: "USD", monto: 7600 },
  { id: "f9", companiaId: "ax", numero: "AX-2002", cliente: "Transportes Pacífico", fechaEmision: "2026-06-19", plazoDias: 60, moneda: "CRC", monto: 4100000 },
  { id: "f10", companiaId: "ax", numero: "AX-2003", cliente: "Hotelera Guanacaste", fechaEmision: "2026-07-15", plazoDias: 30, moneda: "USD", monto: 15400, notas: "Implementación fase I" },
  { id: "f11", companiaId: "ax", numero: "AX-2004", cliente: "Farmacias Unidas", fechaEmision: "2026-08-10", plazoDias: 30, moneda: "USD", monto: 5250 },
  { id: "f12", companiaId: "ax", numero: "AX-2005", cliente: "Agroindustrial Zarcero", fechaEmision: "2026-08-20", plazoDias: 30, moneda: "CRC", monto: 3720000 },
  { id: "f13", companiaId: "ax", numero: "AX-2006", cliente: "Transportes Pacífico", fechaEmision: "2026-08-27", plazoDias: 60, moneda: "USD", monto: 22300, notas: "Renovación de contrato" },
  { id: "f14", companiaId: "ax", numero: "AX-2007", cliente: "Hotelera Guanacaste", fechaEmision: "2026-04-16", plazoDias: 30, moneda: "CRC", monto: 5600000, notas: "Saldo en gestión de cobro" },
];

export const pagos: Pago[] = [
  { id: "p1", facturaId: "f1", fecha: "2026-06-08", bancoId: "bac-tx", monto: 18500, moneda: "USD", metodo: "Transferencia", referencia: "TRF-88412" },
  { id: "p2", facturaId: "f2", fecha: "2026-07-14", bancoId: "promerica-tx", monto: 3000000, moneda: "CRC", metodo: "Transferencia", referencia: "TRF-91120" },
  { id: "p3", facturaId: "f3", fecha: "2026-08-06", bancoId: "bac-tx", monto: 5000, moneda: "USD", metodo: "Transferencia", referencia: "TRF-93055" },
  { id: "p4", facturaId: "f4", fecha: "2026-08-19", bancoId: "bac-tx", monto: 4200, moneda: "USD", metodo: "Cheque", referencia: "CHQ-2214" },
  { id: "p5", facturaId: "f5", fecha: "2026-08-18", bancoId: "promerica-tx", monto: 1200000, moneda: "CRC", metodo: "Transferencia", referencia: "TRF-93871" },
  { id: "p6", facturaId: "f8", fecha: "2026-06-24", bancoId: "bac-ax", monto: 7600, moneda: "USD", metodo: "Transferencia", referencia: "TRF-89330" },
  { id: "p7", facturaId: "f9", fecha: "2026-08-11", bancoId: "promerica-ax", monto: 2050000, moneda: "CRC", metodo: "Transferencia", referencia: "TRF-93410" },
  { id: "p8", facturaId: "f10", fecha: "2026-08-21", bancoId: "bac-ax", monto: 4000000, moneda: "CRC", tipoCambioOperacion: 515.25, metodo: "Transferencia", referencia: "TRF-93902 (pago en CRC de factura en USD)" },
  { id: "p9", facturaId: "f11", fecha: "2026-08-26", bancoId: "bac-ax", monto: 2500, moneda: "USD", metodo: "Transferencia", referencia: "TRF-94120" },
  { id: "p10", facturaId: "f14", fecha: "2026-06-02", bancoId: "promerica-ax", monto: 1600000, moneda: "CRC", metodo: "Depósito", referencia: "DEP-5521" },
];

export const erogaciones: Erogacion[] = [
  { id: "e1", companiaId: "tx", bancoId: "bac-tx", numeroTransferencia: "TE-70021", proveedor: "Amazon Web Services", fecha: "2026-07-05", moneda: "USD", monto: 3850, notas: "Infraestructura julio" },
  { id: "e2", companiaId: "tx", bancoId: "promerica-tx", numeroTransferencia: "TE-70055", proveedor: "CCSS", fecha: "2026-07-31", moneda: "CRC", monto: 4250000, notas: "Cargas sociales" },
  { id: "e3", companiaId: "tx", bancoId: "bac-tx", numeroTransferencia: "TE-70108", proveedor: "Microsoft", fecha: "2026-08-04", moneda: "USD", monto: 2140 },
  { id: "e4", companiaId: "tx", bancoId: "promerica-tx", numeroTransferencia: "TE-70143", proveedor: "Inmobiliaria Lindora", fecha: "2026-08-01", moneda: "CRC", monto: 1850000, notas: "Alquiler agosto" },
  { id: "e5", companiaId: "ax", bancoId: "bac-ax", numeroTransferencia: "TE-80014", proveedor: "Amazon Web Services", fecha: "2026-08-05", moneda: "USD", monto: 1920 },
  { id: "e6", companiaId: "ax", bancoId: "promerica-ax", numeroTransferencia: "TE-80042", proveedor: "CCSS", fecha: "2026-08-01", moneda: "CRC", monto: 2980000, notas: "Cargas sociales" },
  { id: "e7", companiaId: "ax", bancoId: "bac-ax", numeroTransferencia: "TE-80077", proveedor: "Kölbi Empresarial", fecha: "2026-08-12", moneda: "CRC", monto: 385000, notas: "Telecomunicaciones" },
  { id: "e8", companiaId: "ax", bancoId: "bac-ax", numeroTransferencia: "TE-80095", proveedor: "JetBrains", fecha: "2026-08-22", moneda: "USD", monto: 1150, notas: "Licencias de desarrollo" },
];

export const contratos: Contrato[] = [
  { id: "c1", companiaId: "tx", numero: "CT-101", cliente: "Grupo Ferretero CR", periodicidad: "Mensual", proximaFacturacion: "2026-09-01", plazoDias: 30, moneda: "USD", monto: 3200, facturado: false, estado: "Activo", notas: "Soporte mensual" },
  { id: "c2", companiaId: "tx", numero: "CT-102", cliente: "Distribuidora del Valle", periodicidad: "Trimestral", proximaFacturacion: "2026-10-01", plazoDias: 45, moneda: "CRC", monto: 2850000, facturado: false, estado: "Activo" },
  { id: "c3", companiaId: "ax", numero: "CT-201", cliente: "Farmacias Unidas", periodicidad: "Mensual", proximaFacturacion: "2026-09-05", plazoDias: 30, moneda: "USD", monto: 1850, facturado: true, estado: "Activo" },
  { id: "c4", companiaId: "ax", numero: "CT-202", cliente: "Hotelera Guanacaste", periodicidad: "Anual", proximaFacturacion: "2027-01-15", plazoDias: 60, moneda: "USD", monto: 24000, facturado: false, estado: "Activo", notas: "Mantenimiento anual" },
  { id: "c5", companiaId: "ax", numero: "CT-203", cliente: "Transportes Pacífico", periodicidad: "Semestral", proximaFacturacion: "2026-09-30", plazoDias: 30, moneda: "CRC", monto: 4600000, facturado: false, estado: "Cancelado", notas: "Cancelado por el cliente" },
];

export const pedidos: Pedido[] = [
  { id: "pd1", companiaId: "tx", numero: "PD-501", cliente: "Corporación Santa Ana", fechaCreacion: "2026-08-12", plazoDias: 30, moneda: "USD", monto: 8600, estado: "Pendiente" },
  { id: "pd2", companiaId: "tx", numero: "PD-502", cliente: "Textiles Heredia", fechaCreacion: "2026-08-20", plazoDias: 15, moneda: "CRC", monto: 1950000, estado: "Pendiente" },
  { id: "pd3", companiaId: "ax", numero: "PD-601", cliente: "Agroindustrial Zarcero", fechaCreacion: "2026-08-18", plazoDias: 30, moneda: "USD", monto: 5400, estado: "Pendiente" },
  { id: "pd4", companiaId: "ax", numero: "PD-602", cliente: "Farmacias Unidas", fechaCreacion: "2026-07-30", plazoDias: 30, moneda: "CRC", monto: 2300000, estado: "Facturado" },
  { id: "pd5", companiaId: "ax", numero: "PD-603", cliente: "Inversiones Escazú", fechaCreacion: "2026-08-25", plazoDias: 45, moneda: "USD", monto: 11200, estado: "Pendiente" },
];

export const bitacoraInicial: RegistroBitacora[] = [
  { id: "b1", fechaHora: "2026-08-27T14:22:00", usuario: "Carlos Rojas", modulo: "Facturas", registro: "AX-2006", operacion: "Creación", valorNuevo: "Monto: $22.300,00" },
  { id: "b2", fechaHora: "2026-08-26T09:15:00", usuario: "Carlos Rojas", modulo: "Pagos", registro: "TRF-94120", operacion: "Creación", valorNuevo: "Monto: $2.500,00" },
  { id: "b3", fechaHora: "2026-08-22T16:48:00", usuario: "María Jiménez", modulo: "Erogaciones", registro: "TE-80095", operacion: "Creación", valorNuevo: "Monto: $1.150,00" },
  { id: "b4", fechaHora: "2026-08-18T10:05:00", usuario: "María Jiménez", modulo: "Parámetros", registro: "Tipo de cambio", operacion: "Modificación", valorAnterior: "512,70", valorNuevo: "515,25" },
  { id: "b5", fechaHora: "2026-08-14T11:30:00", usuario: "Carlos Rojas", modulo: "Facturas", registro: "TX-1006", operacion: "Creación", valorNuevo: "Monto: $12.800,00" },
];
