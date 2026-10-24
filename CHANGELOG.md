# Historial de cambios

## 1.38.36 — 2026-10-24
- `npm run dev` levanta en una sola consola la aplicación web (8080) y la API .NET local (5080); Ctrl+C detiene ambas. Si no hay SDK de .NET, solo arranca la web.
- Nuevos comandos: `dev:web`, `dev:api`, `build:api` (publica la API en `publicar/api`) y `build:all`.
- La publicación en producción no cambia. Sin cambios en API ni SQL.

## 1.38.35 — 2026-10-24
- Solo en desarrollo (`npm run dev`): botón discreto en el ingreso y en el encabezado para cambiar y probar la dirección de la API local. No aparece en la compilación de producción. Sin cambios en API ni SQL.

## 1.38.34 — 2026-10-24
- En el ingreso, el estado de la API se muestra en verde con su versión cuando está conectada y en rojo «API no conectada» cuando no responde. Sin cambios en API ni SQL.

## 1.38.33 — 2026-10-24
- Corregido el caso sin configuración en desarrollo: también se usa `/api` del mismo dominio, en vez de impedir el ingreso por falta de VITE_API_URL.
- Retirados el logo encima de la tarjeta y el editor de servidor del ingreso; se conserva la identidad del panel azul.
- La demostración sigue disponible con su interruptor. Sin cambios en API ni SQL.

## 1.38.32 — 2026-10-24
- Producción usa automáticamente `/api` del mismo dominio, ignorando direcciones antiguas del navegador. Limpiar datos del sitio o recargar no requiere configurar la conexión.
- `VITE_API_URL`, si se define al compilar, tiene prioridad. Los controles técnicos de conexión solo se muestran en desarrollo.
- Se conserva la demostración y configuración local en desarrollo. Sin cambios en API ni SQL.

## 1.38.31 — 2026-10-24
- El ingreso muestra los dos paneles lado a lado desde 640 px de ancho; solo se apilan en celulares.

## 1.38.30 — 2026-10-24
- La pantalla de ingreso muestra el panel azul a la izquierda y el formulario a la derecha desde 768 px de ancho (iPad y laptops con zoom o escala), en lugar de apilarlos.

## 1.38.29 — 2026-10-24
- El isotipo blanco del ingreso usa la dirección absoluta del recurso público, evitando solicitar la ruta de assets de Lovable al servidor IIS donde devolvía 404.
- Se conserva el diseño del ingreso y el logotipo azul empaquetado con la aplicación; no hay cambios funcionales en la API.

## 1.38.28 — 2026-10-24
- Panel azul del ingreso igual al de las demás aplicaciones de la suite: marca «Aplix Cash Flow Insights / Flujo de efectivo» con la versión arriba a la izquierda, isotipo con halo y textos «Aplix Apps / Suite de Productividad» centrados, aro decorativo en la esquina y bajada con tres puntos fuertes al pie.
- El formulario de ingreso y el resto de la pantalla no cambian.

## 1.38.27 — 2026-10-24
- Pantalla de ingreso con panel azul izquierdo, isotipo blanco con halo y textos «Aplix Apps» y «Suite de Productividad»; en pantallas estrechas se muestra encima del formulario.
- Se conservan los campos, modo demostración, recuperación de contraseña, servidor e íconos de Safari/iOS.

## 1.38.26 — 2026-10-22
- Todas las tablas incluyen el botón «Columnas» para mostrar u ocultar columnas y cambiar su orden; se guarda como preferencia del usuario.

## 1.38.25 — 2026-10-21
- Menú reorganizado: Tablero queda como opción independiente; Operación agrupa Pedidos pendientes, Contratos, Facturas por cobrar, Pagos recibidos, Documentos por pagar y Erogaciones; Proyección conserva Proyección de cobros; el nuevo grupo Información reúne Saldo por banco, Saldo consolidado y Reporte de documentos.
- Carga inicial ya no aparece en el menú: se accede desde una tarjeta al final de Parámetros.

## 1.38.24 — 2026-10-21
- Envío de estados de cuenta: la ventana crece con el contenido dentro del ancho disponible; los clientes largos se muestran completos en varias líneas sin desbordar los campos.
- El listado de clientes respeta el ancho disponible y la ventana permite desplazamiento vertical cuando supera la altura de pantalla.

## 1.38.23 — 2026-10-21
- Saldo consolidado usa el saldo pendiente de Facturas por cobrar por moneda, sin descartar facturas por la marca Cobrada del ERP.
- Los saldos cero o negativos no aportan al proyectado; se mantienen los pagos locales, la conversión de colones y las reglas de pedidos y contratos.
- Pruebas de regresión para la diferencia de 19 mil frente a 9 mil USD, saldos liquidados y saldo ERP con pagos locales.

## 1.38.22 - 2026-10-21
- Comparativo anual: un rango de fechas incompleto se completa con 1 de enero a hoy, evitando comparar el mismo periodo dos veces.

## 1.38.21 — 2026-10-20
- Nueva opción «Al día de hoy» en los filtros de fecha de todas las pantallas, antes de Rango de fechas: abarca desde el 1 de enero del año en curso hasta la fecha actual.

## 1.38.20 — 2026-10-20
- Estado de cuenta en PDF: «Documentos incluidos» se movió al final del informe para que no se superponga con el nombre del cliente cuando es largo.

## 1.38.19 — 2026-10-20
- Corrige el desbordamiento de los campos en ventanas emergentes cuando el nombre del cliente es largo.

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