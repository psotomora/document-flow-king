/** Control de versiones de la aplicación. Actualizar en cada entrega. */
export const APP_VERSION = "1.19.10";
export const APP_FECHA_VERSION = "2026-09-09";
export const APP_NOMBRE = "Aplix Cash Flow Insights";


export interface EntradaVersion {
  version: string;
  fecha: string;
  cambios: string[];
}

/** Historial de versiones mostrado en el pie del menú lateral. */
export const HISTORIAL_VERSIONES: EntradaVersion[] = [
  {
    version: "1.19.10",
    fecha: "2026-09-09",
    cambios: [
      "Nuevo parámetro por usuario: cantidad de filas visibles en tablas (10, 20, 50 o 100).",
      "Selector de filas en Parámetros (valor global) y en cada tabla del sistema.",
      "Encabezado fijo y scroll agregados también en Bancos y Bitácora.",
    ],
  },
  {
    version: "1.19.9",
    fecha: "2026-09-09",
    cambios: [
      "Erogaciones: filtro por proveedor y selector de periodo (este mes, todos los registros o rango de fechas).",
      "Erogaciones: encabezado fijo y scroll con capacidad para ver unas 20 líneas.",
      "Pagos recibidos: filtro por cliente o número de factura.",
      "Contratos: encabezado fijo confirmado en las dos listas.",
    ],
  },
  {
    version: "1.19.8",
    fecha: "2026-09-09",
    cambios: [
      "Contratos recurrentes: filtro por cliente o número de contrato y por rango de fechas de próxima facturación.",
      "La tabla de contratos recurrentes fija el encabezado y tiene scroll vertical.",
      "Nuevos totales por facturar en dólares, en colones y el equivalente consolidado en dólares.",
    ],
  },
  {

    version: "1.19.7",
    fecha: "2026-09-09",
    cambios: [
      "Contratos por facturar este mes: cada línea permite editar el contrato (cliente, periodicidad, próxima facturación, moneda y monto) o eliminarlo (solo administradores).",
    ],
  },
  {
    version: "1.19.6",
    fecha: "2026-09-09",
    cambios: [
      "Contratos: nueva subsección 'Contratos por facturar este mes', generada al primer ingreso de cada mes, con filtros por cliente o número de contrato y rango de fechas que se recuerdan por usuario.",
      "Saldo consolidado: nueva tarjeta y línea de desglose con los contratos por facturar del mes; los contratos que ya tienen pedido o factura no se cuentan dos veces.",
      "Funciona igual con datos locales y con origen externo (SoftlandERP). Script database/08_preferencias_usuario.sql; la API actualiza la base automáticamente.",
    ],
  },
  {
    version: "1.19.5",
    fecha: "2026-09-09",
    cambios: [
      "Pedidos pendientes: nuevo filtro por número de pedido o nombre de cliente, y rango de fechas (inicio y fin) sobre la fecha de creación.",
    ],
  },
  {
    version: "1.19.4",
    fecha: "2026-09-09",
    cambios: [
      "Pagos recibidos: nuevo filtro por rango de fechas (inicio y fin) para limitar los registros mostrados y los totales calculados.",
    ],
  },
  {
    version: "1.19.3",
    fecha: "2026-09-09",
    cambios: [
      "Permisos por usuario: el administrador decide, con un interruptor por opción, si cada usuario ve Saldo por banco, Saldo consolidado, Erogaciones, Proyección de cobros y Catálogos.",
      "Las opciones no permitidas desaparecen del menú y no pueden abrirse por dirección directa.",
      "Los cambios de permisos quedan registrados en la bitácora (script database/07_permisos_usuario.sql; la API actualiza la base automáticamente).",
    ],
  },
  {
    version: "1.19.2",
    fecha: "2026-09-09",
    cambios: [
      "Bump de versión para control de la publicación en el servidor de producción.",
    ],
  },
  {
    version: "1.19.1",
    fecha: "2026-09-09",
    cambios: [
      "Pagos recibidos: la tabla ahora tiene scroll vertical con los encabezados de columna fijos al navegar la lista.",
    ],
  },
  {
    version: "1.19.0",
    fecha: "2026-09-09",
    cambios: [
      "Las facturas de SoftlandERP muestran el saldo real de cuentas por cobrar (DOCUMENTOS_CC), incluidos los pagos parciales.",
      "Una factura se considera cobrada cuando su saldo en cuentas por cobrar es cero o el documento está anulado.",
      "La fecha de vencimiento se toma de cuentas por cobrar cuando el ERP la registra.",
      "Probar conexión informa cuántos documentos de cuentas por cobrar tienen saldo pendiente.",
    ],
  },
  {
    version: "1.18.2",
    fecha: "2026-09-08",
    cambios: [
      "Saldo consolidado: nuevo desglose del saldo proyectado (bancos, facturas pendientes y pedidos pendientes) en pantalla y en el PDF.",
    ],
  },
  {
    version: "1.18.1",
    fecha: "2026-09-08",
    cambios: [
      "Facturas por cobrar: encabezados de columna fijos confirmados al hacer scroll.",
      "Pedidos pendientes: la tabla ahora tiene scroll vertical con los encabezados de columna fijos.",
    ],
  },
  {
    version: "1.18.0",
    fecha: "2026-09-08",
    cambios: [
      "Facturas por cobrar: la tabla de facturas ahora tiene scroll vertical con los encabezados de columna fijos al navegar la lista.",
    ],
  },
  {
    version: "1.17.0",
    fecha: "2026-09-08",
    cambios: [
      "Saldo consolidado: nuevo saldo proyectado total en dólares que suma los pedidos pendientes del origen seleccionado y las facturas pendientes de pago.",
      "Las facturas ya cobradas en el sistema de origen se excluyen de las cuentas por cobrar.",
    ],
  },
  {
    version: "1.16.5",
    fecha: "2026-09-08",
    cambios: [
      "Corrección automática de direcciones relativas de la API para evitar rutas como /usuarios/api/usuarios.",
      "El sitio IIS ahora dirige las solicitudes /api al servicio .NET antes de procesar las páginas web.",
    ],
  },
  {
    version: "1.16.4",
    fecha: "2026-09-08",
    cambios: [
      "Los errores de conexión muestran método, dirección solicitada y final, servidor, tipo de respuesta, versión de API e identificador de seguimiento.",
      "Las rutas desconocidas de la API responden en JSON para distinguir errores de la aplicación de errores generados por IIS.",
    ],
  },
  {
    version: "1.16.3",
    fecha: "2026-09-08",
    cambios: [
      "La verificación de conexión ahora muestra la versión exacta de la API publicada y confirma la disponibilidad de la creación de usuarios.",
    ],
  },
  {
    version: "1.16.2",
    fecha: "2026-09-08",
    cambios: [
      "Corrección del error 404 en formato HTML al crear usuarios desde el servidor publicado: la API ya no deja que IIS sustituya sus respuestas por páginas de error.",
    ],
  },
  {
    version: "1.16.1",
    fecha: "2026-09-08",
    cambios: [
      "Corrección: los datos de facturas, pagos, contratos, bancos, usuarios y bitácora vuelven a leerse correctamente desde SQL Server en el servidor de producción.",
    ],
  },
  {
    version: "1.16.0",
    fecha: "2026-09-08",
    cambios: [
      "Bump de versión para validar la publicación correcta en el servidor de producción.",
    ],
  },
  {
    version: "1.15.0",
    fecha: "2026-09-08",
    cambios: [
      "Saldos por banco: el perfil Administrador puede editar el saldo inicial en USD y CRC de cada cuenta.",
      "Todo cambio de saldo queda registrado en la bitácora con el usuario, la fecha y los valores aplicados.",
    ],
  },
  {
    version: "1.14.0",
    fecha: "2026-09-07",
    cambios: [
      "La aplicación siempre inicia en la pantalla de inicio de sesión, con SQL Server como opción principal.",
      "Nuevo interruptor de Modo demostración en el inicio de sesión.",
      "Si se pierde la conexión con el servidor, la sesión se cierra y se regresa al inicio de sesión.",
      "Los errores de conexión a SQL Server ahora indican la causa exacta y el código de error.",
    ],
  },
  {
    version: "1.13.3",
    fecha: "2026-09-05",
    cambios: [
      "Saldos por banco: se eliminan las pestañas de moneda; ahora se muestran las cuentas en USD arriba y las de CRC abajo, cada bloque con su total y exportación a Excel.",
      "Facturas por cobrar: el filtro de Estado se recuerda por usuario.",
    ],
  },
  {
    version: "1.13.2",
    fecha: "2026-09-05",
    cambios: [
      "Registro de pagos: el mensaje de confirmación se muestra solo cuando SQL Server confirma el guardado; si falla, el diálogo permanece abierto con el error.",
      "El banco receptor se limita a las cuentas activas de la compañía de la factura, para que el pago se refleje en Saldo por banco.",
    ],
  },
  {
    version: "1.13.1",
    fecha: "2026-09-06",
    cambios: [
      "El campo Monto en el registro de pagos ahora usa formato numérico (miles y decimales) sin mostrar el símbolo de moneda.",
      "El valor sugerido del pago se mantiene como número y se formatea al perder el foco o al abrir el diálogo.",
      "Corregido: ahora se pueden registrar pagos sobre facturas leídas de SoftlandERP (se guardan con el número de factura externa).",
    ],
  },
  {
    version: "1.13.0",
    fecha: "2026-09-05",
    cambios: [
      "Nuevo parámetro \"Usar datos de facturas de fuente externa\": con SoftlandERP, las facturas se leen de FACTURA y FACTURA_LINEA (vigentes, no anuladas) con la misma conexión de pedidos.",
      "Detalle de líneas de cada factura de SoftlandERP desde la pantalla de Facturas.",
      "Corregido el error al consultar las líneas de un pedido de SoftlandERP.",
    ],
  },
  {
    version: "1.12.0",
    fecha: "2026-09-05",
    cambios: [
      "Integración con SoftlandERP: con la fuente externa activa, los pedidos se leen de las tablas PEDIDO y PEDIDO_LINEA (estado Normal).",
      "Credenciales de SoftlandERP (servidor, base, esquema/compañía, usuario y clave cifrada) se administran en Parámetros con prueba de conexión.",
      "Al facturar un pedido de SoftlandERP, su estado pasa de N a F en el ERP y queda en bitácora. Detalle de líneas disponible en Pedidos.",
    ],
  },
  {
    version: "1.11.0",
    fecha: "2026-09-05",
    cambios: [
      "Nuevo subparámetro 'Fuente de pedidos' (SoftlandERP) que se habilita al activar los pedidos de fuente externa.",
      "Se guarda en flujo.Parametro (clave pedidosFuenteOrigen) con registro en bitácora; solo el administrador lo modifica.",
    ],
  },
  {
    version: "1.10.0",
    fecha: "2026-09-05",
    cambios: [
      "Nueva tabla flujo.Parametro para parámetros generales persistidos en base de datos.",
      "El parámetro 'Usar datos de pedidos de fuente externa' se guarda en SQL Server y queda en bitácora.",
      "La API crea la tabla y el parámetro automáticamente al iniciar (script 06_parametros_generales.sql).",
    ],
  },
  {
    version: "1.9.0",
    fecha: "2026-09-01",
    cambios: [
      "Eliminar facturas, pagos, erogaciones, contratos y pedidos es privilegio exclusivo del perfil administrador.",
      "La API rechaza cualquier eliminación transaccional realizada por perfiles de registro o consulta.",
      "Se agregó la acción de eliminar en Contratos y Pedidos para administradores.",
    ],
  },
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
