/** Control de versiones de la aplicación. Actualizar en cada entrega. */
export const APP_VERSION = "1.4.0";
export const APP_FECHA_VERSION = "2026-08-31";
export const APP_NOMBRE = "Aplix Cash Flow Insights";


export interface EntradaVersion {
  version: string;
  fecha: string;
  cambios: string[];
}

/** Historial de versiones mostrado en el pie del menú lateral. */
export const HISTORIAL_VERSIONES: EntradaVersion[] = [
  {
    version: "1.4.0",
    fecha: "2026-08-31",
    cambios: [
      "Tipo de cambio como parámetro persistente en SQL Server con motivo del cambio.",
      "Bitácora del parámetro visible en la pantalla de Tipo de cambio.",
      "Script database/05_parametros.sql con la columna Nota y la vista de valor vigente.",
    ],
  },
  {
    version: "1.3.0",
    fecha: "2026-08-31",
    cambios: [
      "Control de versiones visible en el menú lateral.",
      "Las facturas se pueden generar desde un pedido existente.",
      "Estados de pedido simplificados: Pendiente, Facturado y Anulado.",
    ],
  },
  {
    version: "1.2.0",
    fecha: "2026-08-30",
    cambios: [
      "Conexión con API .NET y SQL Server.",
      "Pantalla de acceso e indicador de conexión.",
    ],
  },
  {
    version: "1.1.0",
    fecha: "2026-08-29",
    cambios: [
      "Bitácora, exportaciones a Excel/PDF y carga inicial desde Excel.",
      "Proyección de cobros, contratos, pedidos y saldo consolidado.",
    ],
  },
  {
    version: "1.0.0",
    fecha: "2026-08-29",
    cambios: ["Versión inicial: facturas, pagos, erogaciones y saldos por banco."],
  },
];
