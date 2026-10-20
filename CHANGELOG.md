# Historial de cambios

## 1.38.18 — 2026-10-20
- Diálogos de líneas de Pedidos pendientes, Facturas por cobrar y Contratos redimensionables desde la esquina inferior derecha, con límites de pantalla y tablas desplazables.
- Las descripciones truncadas muestran el texto completo al señalarlo o enfocarlo con el teclado.

## 1.38.17 — 2026-10-18
- Compatibilidad de íconos: favicon.ico con tamaños 16, 32, 48 y 64 px y favicon PNG sin transparencia, derivados del ícono de Aplix existente.
- Enlaces icon/shortcut icon con la ruta base de la aplicación, sin atributo sizes; se conservan apple-touch-icon y los metadatos iOS.
- Se compararon NotifyHub y License Hub; los íconos PNG de producción responden correctamente. La visualización en Safari requiere comprobación en el dispositivo después de actualizar IIS.

## 1.38.16 — 2026-10-17
- Recuperación de contraseña: se guarda la contraseña temporal únicamente después de que el servidor de correo acepte el envío. Si el envío falla, la contraseña anterior permanece intacta y no se registra una recuperación exitosa.
- Pruebas de regresión del endpoint con envío rechazado, excepción de envío y envío exitoso, sin correo ni base de datos reales.

## 1.38.15 — 2026-10-17
- Contratos del mes: se reconoce la factura equivalente por compañía, cliente, moneda y monto original dentro del mismo mes, aunque su número no contenga el contrato.
- Se unifica la coincidencia de la lista, Tablero, Saldo consolidado, histórico y avisos de pendientes para evitar sumar nuevamente el contrato.
- Se priorizan las referencias explícitas y no se reutiliza una factura para varios contratos de igual importe.

## 1.38.14 — 2026-10-17
- Filtros persistentes por usuario en Pedidos, Facturas por cobrar, Pagos recibidos, Erogaciones, Documentos por pagar, Reporte de documentos, Comparativo, Contratos y Bitácora.
- Se conserva la compañía seleccionada, la vista del reporte y la cantidad de filas.
- Guardado inmediato al seleccionar; los cambios pendientes terminan antes de cerrar sesión.
- En demostración se recuerdan en el navegador, separados por usuario; con la API se utiliza el almacenamiento existente de preferencias por usuario.

## 1.38.13 — 2026-10-17
- Pagos recibidos: la tarjeta de Conciliar estado de cuenta se muestra arriba, antes del listado de pagos.

## 1.38.12 — 2026-10-17
- Filtros de fecha uniformes: Hoy, Última semana, Último mes y Rango de fechas en Pedidos, Facturas por cobrar, Pagos recibidos, Erogaciones, Documentos por pagar, Reporte de documentos, Contratos recurrentes y Contratos del mes.
- Última semana incluye los últimos siete días y Último mes los últimos treinta días, contando hoy.
- Calendarios para escoger inicio y fin, con límites inclusivos incluso en registros con hora.
- El Comparativo anual usa el mismo periodo del reporte y su equivalente del año anterior.
- Se conserva el guardado por usuario de los filtros de Contratos del mes.