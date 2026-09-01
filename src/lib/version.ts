/** Control de versiones de la aplicación. Actualizar en cada entrega. */
export const APP_VERSION = "1.8.0";
export const APP_FECHA_VERSION = "2026-09-01";
export const APP_NOMBRE = "Aplix Cash Flow Insights";


export interface EntradaVersion {
  version: string;
  fecha: string;
  cambios: string[];
}

/** Historial de versiones mostrado en el pie del menú lateral. */
export const HISTORIAL_VERSIONES: EntradaVersion[] = [
  {
    version: "1.8.0",
    fecha: "2026-09-01",
    cambios: [
      "El pie del menú lateral muestra el usuario, su perfil y la compañía de la sesión activa.",
      "En modo conectado a SQL Server se muestra el usuario real de la sesión (sin selector de demostración).",
      "Si la sesión expira o se pierde la conexión, el sistema solicita nuevamente el inicio de sesión.",
    ],
  },
  {
    version: "1.7.0",
    fecha: "2026-09-01",
    cambios: [
      "Mantenimiento completo de usuarios: crear, editar y eliminar (con validación de integridad referencial).",
      "Activación e inactivación de usuarios y asignación de los perfiles administrador, registro y consulta.",
      "La edición se realiza en una pantalla independiente al seleccionar el usuario de la lista.",
    ],
  },
  {
    version: "1.6.0",
    fecha: "2026-09-01",
    cambios: [
      "Al cerrar sesión en el modo conectado a SQL Server se muestra una página de finalización de sesión.",
      "El token de acceso se descarta y se ofrece volver a iniciar sesión.",
    ],
  },
  {
    version: "1.5.0",
    fecha: "2026-08-31",
    cambios: [
      "Los pedidos se pueden crear manualmente o a partir de un contrato activo.",
      "Al cargar el sistema se generan los pedidos de contratos cuya fecha de facturación venció.",
      "La próxima facturación del contrato avanza según su periodicidad.",
    ],
  },
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
