# Historial de cambios

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