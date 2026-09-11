/** Control de versiones de la aplicación. Actualizar en cada entrega. */
export const APP_VERSION = "1.35.4";
export const APP_FECHA_VERSION = "2026-09-11";
export const APP_NOMBRE = "Aplix Cash Flow Insights";


export interface EntradaVersion {
  version: string;
  fecha: string;
  cambios: string[];
}

/** Historial de versiones mostrado en el pie del menú lateral. */
export const HISTORIAL_VERSIONES: EntradaVersion[] = [
  {
    version: "1.35.4",
    fecha: "2026-09-11",
    cambios: [
      "Reporte de documentos: al cambiar de pestaña se conserva la fuente externa seleccionada en Comparativo anual.",
    ],
  },
  {
    version: "1.35.3",
    fecha: "2026-09-11",
    cambios: [
      "Reporte de documentos: tanto Documentos como Comparativo anual obtienen la información exclusivamente de la tabla FACTURA, en las dos fuentes externas.",
    ],
  },
  {
    version: "1.35.2",
    fecha: "2026-09-11",
    cambios: [
      "Reporte de documentos: los totales del tab Documentos ahora son netos (FAC menos DEV y NC), coincidiendo con el Comparativo anual.",
    ],
  },
  {
    version: "1.35.1",
    fecha: "2026-09-11",
    cambios: [
      "Documentos y Comparativo anual usan exactamente la misma lista de documentos (DOCUMENTOS_CC con histórico de FACTURA), por lo que los totales de un mismo periodo coinciden.",
    ],
  },
  {
    version: "1.35.0",
    fecha: "2026-09-11",
    cambios: [
      "Parámetros: la conexión externa se llama Fuente externa y se agregó una segunda conexión con las mismas credenciales.",
      "Reporte de documentos: en Comparativo anual se puede elegir cuál de las dos fuentes externas provee los datos del año anterior.",
    ],
  },
  {
    version: "1.34.6",
    fecha: "2026-09-11",
    cambios: [
      "Comparativo anual del Reporte de documentos usa exclusivamente la tabla FACTURA como origen de datos.",
    ],
  },
  {
    version: "1.34.5",
    fecha: "2026-09-11",
    cambios: [
      "Parámetros: la primera tarjeta ahora muestra la versión de la aplicación y la versión de la API.",
    ],
  },
  {
    version: "1.34.4",
    fecha: "2026-09-11",
    cambios: [
      "El histórico del Reporte de documentos conserva facturas con numeración reutilizada entre distintos periodos.",
      "El aviso del Comparativo anual identifica la versión mínima de API y aclara que aplica a los filtros seleccionados.",
    ],
  },
  {
    version: "1.34.3",
    fecha: "2026-09-11",
    cambios: [
      "Comparativo anual: la tabla FACTURA es ahora la fuente principal del histórico para mostrar el mismo periodo del año anterior.",
      "DOCUMENTOS_CC completa el saldo y vencimiento sin reemplazar la fecha histórica de la factura; también se evitan duplicados.",
    ],
  },
  {
    version: "1.34.2",
    fecha: "2026-09-11",
    cambios: [
      "La selección de factura asociada ahora permite buscar por número y muestra un campo más ancho.",
      "Las columnas de todos los listados se pueden ajustar arrastrando su borde derecho.",
    ],
  },
  {
    version: "1.34.1",
    fecha: "2026-09-11",
    cambios: [
      "Contratos por facturar del mes: nuevo filtro 'Factura asociada' para ver todas, solo las que tienen factura o solo las que no.",
      "El filtro se guarda como preferencia del usuario y se aplica también a la exportación a Excel.",
    ],
  },
  {
    version: "1.34.0",
    fecha: "2026-09-11",
    cambios: [
      "Contratos por facturar del mes: nueva columna con la factura asociada, sugerida automáticamente y editable desde una lista.",
      "Nuevo privilegio por usuario para cambiar la factura asociada; el administrador siempre puede hacerlo.",
      "La factura asociada también se incluye en la exportación a Excel.",
    ],
  },
  {
    version: "1.33.6",
    fecha: "2026-09-11",
    cambios: [
      "Si la base de datos no permite crear la tabla de configuración de correo, ahora se explica el motivo real en lugar de 'Invalid object name'.",
      "La creación automática también agrega el esquema flujo cuando falta.",
    ],
  },
  {
    version: "1.33.5",
    fecha: "2026-09-11",
    cambios: [
      "La tabla de configuración de correo se crea sola si la base viene de una versión anterior.",
      "La actualización automática del esquema ahora aplica cada cambio por separado para que un fallo no bloquee los demás.",
    ],
  },
  {
    version: "1.33.4",
    fecha: "2026-09-11",
    cambios: [
      "El pie del estado de cuenta en PDF ahora indica 'Generado el (fecha/hora). Departamento de Contabilidad.'",
    ],
  },
  {
    version: "1.33.3",
    fecha: "2026-09-11",
    cambios: [
      "El envío del estado de cuenta pide el nombre de la persona a quien se dirige el correo.",
      "El cuerpo del correo va firmado por Administración Aplix (Theronix, S. A.).",
    ],
  },
  {
    version: "1.33.2",
    fecha: "2026-09-11",
    cambios: [
      "Corregido el error al enviar el estado de cuenta por correo: el registro en bitácora usaba una operación no permitida.",
    ],
  },
  {
    version: "1.33.1",
    fecha: "2026-09-11",
    cambios: [
      "El estado de cuenta en PDF muestra 'Theronix, S. A.' como nombre de la empresa emisora.",
      "Al final del estado de cuenta se incluyen los datos de las cuentas bancarias de Theronix (BAC y Promerica, en USD y CRC).",
    ],
  },
  {
    version: "1.33.0",
    fecha: "2026-09-11",
    cambios: [
      "Facturas por cobrar: nuevo botón 'Envío de estados de cuenta' con selección de cliente y correo del destinatario.",
      "El estado de cuenta se genera en PDF con el logo de Aplix, el cliente, la fecha de emisión y el desglose de facturas.",
      "El PDF puede descargarse o enviarse por el servidor de correo configurado; cada envío queda en bitácora.",
    ],
  },
  {
    version: "1.32.1",
    fecha: "2026-09-11",
    cambios: [
      "Parámetros: nueva sección Servidor de correo (SMTP) para el envío de estados de cuenta, con contraseña cifrada y bitácora.",
      "Botón de correo de prueba para confirmar la configuración antes de usarla.",
      "Nueva tabla flujo.ConfiguracionCorreo (script 13_correo_smtp.sql) creada automáticamente al iniciar la API.",
      "Mensaje guiado cuando Microsoft 365 rechaza la autenticación SMTP (error 535 / 5.7.139).",
    ],
  },
  {
    version: "1.31.3",
    fecha: "2026-09-11",
    cambios: [
      "Reporte de documentos: el histórico se completa con la tabla de facturas cuando cuentas por cobrar ya no conserva los documentos cancelados de periodos anteriores.",
      "El comparativo anual vuelve a mostrar el mismo periodo del año pasado.",
    ],
  },
  {
    version: "1.31.2",
    fecha: "2026-09-11",
    cambios: [
      "Comparativo anual: aviso cuando el origen de datos no entrega documentos del periodo del año anterior.",
      "Datos de demostración con documentos del año anterior para validar la comparación.",
    ],
  },
  {
    version: "1.31.1",
    fecha: "2026-09-11",
    cambios: [
      "El histórico de contratos por facturar se guarda en una tabla propia (flujo.ContratoMesHistorico) en lugar de una preferencia, para mantener el rendimiento.",
      "Nuevo script 12_contratos_mes_historico.sql y creación automática de la tabla al iniciar la API.",
    ],
  },
  {

    version: "1.31.0",
    fecha: "2026-09-11",
    cambios: [
      "Nuevo parámetro para limpiar los contratos del mes al cambio de mes, archivando el mes anterior en un histórico.",
      "Nueva subsección 'Histórico de contratos por facturar' con exportación a Excel.",
    ],
  },
  {
    version: "1.30.7",
    fecha: "2026-09-11",
    cambios: [
      "Los contratos del mes marcados como pagados dejan de sumar en las tarjetas de totales por facturar.",
    ],
  },
  {
    version: "1.30.6",
    fecha: "2026-09-11",
    cambios: [
      "Los contratos por facturar del mes se revisan contra las facturas registradas y la línea se resalta en verde cuando hay coincidencia.",
      "La situación y la exportación a Excel muestran el número de la factura encontrada.",
    ],
  },
  {
    version: "1.30.5",
    fecha: "2026-09-11",
    cambios: [
      "La generación automática de pedidos desde contratos ya no se ejecuta cuando los contratos o los pedidos provienen de la fuente externa.",
      "Si el número de pedido ya existe en la base, se omite en silencio en lugar de mostrar el error de clave duplicada.",
    ],
  },
  {
    version: "1.30.4",
    fecha: "2026-09-11",
    cambios: [
      "En la pantalla de inicio de sesión se muestra, junto a la versión de la aplicación, la versión de la API leída desde /api/salud.",
    ],
  },
  {
    version: "1.30.3",
    fecha: "2026-09-10",
    cambios: [
      "Filtros «Pagados» y «Pendientes» en la subsección de contratos por facturar este mes.",
      "Ambos filtros se guardan como preferencia del usuario y afectan la tabla y la exportación a Excel.",
    ],
  },
  {
    version: "1.30.2",
    fecha: "2026-09-10",
    cambios: [
      "Nuevo interruptor «Pagado» por línea en los contratos por facturar del mes, como marca histórica del usuario.",
      "La marca no genera facturas ni afecta la proyección y se incluye en la exportación a Excel.",
    ],
  },
  {
    version: "1.30.1",
    fecha: "2026-09-10",
    cambios: [
      "Nuevo privilegio individual, administrado por usuarios administradores, para editar erogaciones existentes.",
      "La edición permite actualizar todos los datos de la erogación, ajusta el documento por pagar asociado y registra el cambio en la bitácora.",
    ],
  },
  {
    version: "1.30.0",
    fecha: "2026-09-10",
    cambios: [
      "Nuevo parámetro de administrador: «Usar datos de contratos de fuente externa», con la misma conexión de pedidos y facturas.",
      "Con la fuente externa activa, los contratos recurrentes se leen de SoftlandERP y cada línea permite ver su detalle (artículos, cantidades y montos).",
      "Se conservan los datos locales, el modo demostración, los filtros, los totales y la exportación a Excel.",
      "Nuevo botón «Actualizar» en Contratos para releer la información sin recargar la página.",
    ],
  },
  {
    version: "1.22.10",
    fecha: "2026-09-10",
    cambios: [
      "La conexión externa ahora se prueba antes de guardarse y muestra el error real si las credenciales o la comunicación con SQL Server fallan.",
      "La API evita conservar una contraseña cifrada con una llave anterior y la publicación ya no sobrescribe appsettings.Production.json.",
    ],
  },
  {
    version: "1.22.9",
    fecha: "2026-09-10",
    cambios: [
      "Reporte de documentos: los filtros (cliente, número, tipo, moneda y periodo) ahora son compartidos entre la pestaña Documentos y el Comparativo anual.",
      "Comparativo anual: el periodo anterior es exactamente el mismo rango del filtro vigente, restándole un año (con ajuste para el 29 de febrero).",
      "El periodo «Acumulado del año a la fecha» se limita hasta hoy para que la comparación sea equivalente.",
    ],
  },
  {
    version: "1.22.8",
    fecha: "2026-09-10",
    cambios: [
      "Reporte de documentos y Comparativo anual: ahora se incluyen las notas de crédito (NC) además de FAC y DEV; las NC restan en los totales netos.",
      "Comparativo anual: el grid y la exportación muestran el detalle del año anterior según el filtro seleccionado.",
    ],
  },
  {
    version: "1.22.7",
    fecha: "2026-09-10",
    cambios: [
      "Comparativo anual: los totales de la tarjeta ahora son el monto neto (facturas FAC menos devoluciones DEV) y se agrega una leyenda explicativa.",
    ],
  },
  {
    version: "1.22.6",
    fecha: "2026-09-10",
    cambios: [
      "Comparativo anual: la tarjeta muestra el comparativo en moneda local (CRC), en dólares (USD) y un consolidado con selector de moneda al tipo de cambio vigente.",
    ],
  },
  {
    version: "1.22.5",
    fecha: "2026-09-10",
    cambios: [
      "Comparativo anual: la tabla y la exportación a Excel ahora incluyen los documentos del año actual y del año anterior, con una columna Periodo que identifica cada grupo.",
    ],
  },
  {
    version: "1.22.4",
    fecha: "2026-09-10",
    cambios: [
      "Reporte de documentos: se corrige la moneda de los documentos del origen externo; ahora se reconocen todas las formas en que SoftlandERP identifica dólares y colones.",
    ],
  },
  {
    version: "1.22.3",
    fecha: "2026-09-10",
    cambios: [
      "Despliegue en Windows: fuera del entorno de Lovable la compilación siempre genera un servidor Node autónomo (ya no un paquete de Cloudflare Workers), sin depender de variables de entorno.",
      "Nuevo comando npm run build:node que compila y verifica automáticamente el resultado antes de publicar en IIS.",
    ],
  },
  {
    version: "1.22.2",
    fecha: "2026-09-10",
    cambios: [
      "Comparativo anual: cuando se usa un rango de fechas, el periodo anterior es exactamente el mismo rango del año anterior; toda la vista compara año actual contra año anterior.",
    ],
  },
  {
    version: "1.22.1",
    fecha: "2026-09-10",
    cambios: [
      "Comparativo anual: ahora compara el año en curso a la fecha de hoy contra el mismo periodo del año anterior (opción predeterminada) y el mes en curso a hoy contra su equivalente del año anterior.",
    ],
  },
  {
    version: "1.22.0",
    fecha: "2026-09-10",
    cambios: [
      "Reporte de documentos: nueva vista 'Comparativo anual' con los mismos filtros, periodo anterior por defecto (mes o acumulado a la fecha), tarjeta de año actual contra año anterior y gráfico por tipo de documento (FAC y DEV).",
    ],
  },
  {
    version: "1.21.3",
    fecha: "2026-09-10",
    cambios: [
      "Parámetros: el interruptor de documentos por cobrar ahora se etiqueta 'Usar datos para reporte de documentos de fuente externa'.",
    ],
  },
  {
    version: "1.21.2",
    fecha: "2026-09-10",
    cambios: [
      "El Reporte de documentos abre con el acumulado del año, para que no aparezca vacío cuando no hay documentos del mes en curso.",
    ],
  },
  {
    version: "1.21.1",
    fecha: "2026-09-10",
    cambios: [
      "La sección se llama ahora 'Reporte de documentos'.",
      "El filtro de fechas pasó a ser un selector: Este mes, Acumulado del año a la fecha o Rango de fechas.",
    ],
  },
  {
    version: "1.21.0",
    fecha: "2026-09-10",
    cambios: [
      "Nueva sección Operación → Documentos por cobrar con los documentos de cliente tipo FAC y DEV, sin los anulados.",
      "Filtros por cliente, número de documento, tipo, moneda y rango de fechas, con selector de filas, encabezado fijo y totales.",
      "Botón 'Actualizar' y exportación a Excel; puede leerse del sistema externo (DOCUMENTOS_CC) o del registro interno.",
      "Nuevo parámetro de administrador 'Usar datos de documentos por cobrar de fuente externa', auditado en la bitácora.",
    ],
  },
  {
    version: "1.20.6",
    fecha: "2026-09-10",
    cambios: [
      "La sesión se mantiene al refrescar el navegador mientras el acceso siga vigente.",
      "Nuevo botón 'Actualizar' en Pedidos, Facturas por cobrar y Documentos por pagar para releer los datos del origen sin recargar la página.",
      "La vigilancia de conexión ya no cierra la sesión ante un corte momentáneo del servidor.",
    ],
  },
  {
    version: "1.20.5",
    fecha: "2026-09-10",
    cambios: ["Bump de versión para control de la publicación en el servidor de producción."],
  },
  {
    version: "1.20.4",
    fecha: "2026-09-09",
    cambios: [
      "Facturas por cobrar: nueva columna 'Creación' con la fecha en que se registró la factura.",
      "Contratos por facturar este mes: nueva columna 'Creación' con la fecha en que se creó el contrato.",
      "Base de datos: la tabla flujo.Contrato ahora guarda la fecha de creación (CreadoEn); la API la agrega automáticamente en bases existentes.",
    ],
  },
  {
    version: "1.20.3",
    fecha: "2026-09-09",
    cambios: [
      "SoftlandERP: mensaje claro cuando la clave guardada no se puede descifrar porque cambió la llave de seguridad; basta volver a guardarla en Parámetros.",
    ],
  },
  {
    version: "1.20.2",
    fecha: "2026-09-09",
    cambios: [
      "Despliegue en Windows: la compilación ahora respeta NITRO_PRESET=node-server y genera un servidor Node autónomo para IIS.",
    ],
  },
  {
    version: "1.20.1",
    fecha: "2026-09-09",
    cambios: [
      "Documentos por pagar: filtros separados para proveedor y número de documento, permitiendo buscar por uno u otro criterio de forma independiente.",
    ],
  },
  {
    version: "1.20.0",
    fecha: "2026-09-09",
    cambios: [
      "Nueva sección Operación → Documentos por pagar con los documentos de proveedores pendientes de pago.",
      "Filtros por proveedor o número de documento y por periodo (este mes, todos o rango de fechas), con totales USD, CRC y consolidado.",
      "Nuevo parámetro de administrador para leer los documentos pendientes de pago desde la fuente externa (DOCUMENTOS_CP), con la misma conexión de pedidos y facturas.",
      "Las erogaciones pueden asociarse a un documento por pagar y rebajan su saldo; también pueden registrarse sin documento.",
    ],
  },
  {
    version: "1.19.11",
    fecha: "2026-09-09",
    cambios: [
      "Contratos recurrentes: nueva sección con los totales por periodicidad (mensual, bimestral, trimestral, semestral y anual) según los filtros aplicados.",
    ],
  },
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
