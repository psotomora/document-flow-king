# Historial de cambios

## 1.38.60 — 2026-11-04
- Fase 5 (paso 3): se habilita el ingreso de empresas secundarias.
- Separados por empresa: parámetros generales, configuración de correo, conexión a Softland, token/estado del agente, conexiones y sincronización ERP, histórico de contratos y bitácora.
- Licencia y tipo de cambio: solo la instalación principal puede modificarlos.
- Producción: solo API (sin SQL nuevo; requiere los scripts 23 y 24 ya ejecutados). La web solo cambia la versión.

## 1.38.59 - 2026-11-04

- Modo Agente: la leyenda superior usa las verificaciones de lectura de la compañía cuando son posteriores al diagnóstico general. Conserva el vencimiento de cinco minutos, el estado desconectado y los fallos de otras lecturas; el latido nunca implica conexión exitosa al ERP.
- Actualizar solo aplicación web; API, agente y SQL sin cambios.

## 1.38.58 - 2026-11-04

- API: comprobar soporte de documentos por pagar antes de iniciar la transacción y reutilizar el resultado durante el guardado; elimina el ExecuteScalar sin transacción que causaba HTTP 500 en `/api/public/agente/documentos`.
- Barra superior: indicador por compañía de Modo Agente o Conexión directa, verde tras conexión verificada y rojo ante fallo o verificación vencida. En modo Agente muestra la última verificación de Softland, independiente de la recepción de documentos; el latido por sí solo no implica éxito.
- Actualizar aplicación web y API; agente y SQL sin cambios.

## 1.38.57 - 2026-11-03

- Réplica por agente: `DOCUMENTOS_CC` se cruza con `OUTER APPLY TOP 1` para no duplicar facturas; unicidad de documentos por pagar por proveedor + tipo + número; mensajes de rechazo indican el documento; el agente imprime el cuerpo de los rechazos HTTP. Agente 1.38.57.

## 1.38.56 - 2026-11-03

- Fase 5 (paso 2a): script `24_aislamiento_datos_inquilino.sql` asigna cada compañía a una empresa (las existentes a `principal`). `GET /api/estado` devuelve solo compañías, bancos, documentos y usuarios de la empresa del usuario, y la API rechaza (403) cualquier alta o cambio que apunte a una compañía o banco de otra empresa. El ingreso de empresas secundarias sigue bloqueado hasta acotar parámetros, correo y fuentes externas.

## 1.38.55 - 2026-11-03

- Parámetros → Agente local: generar/regenerar el token queda reservado al Súper Administrador (validado también en `POST /api/agente/token`, con bitácora). Los administradores conservan el semáforo, diagnóstico y modo de conexión.

## 1.38.54 - 2026-11-03

- Usuarios: casilla «Súper Administrador de Aplix» (solo visible para Súper Administradores) que asigna o retira el permiso sin SQL; exige perfil Administrador y no permite retirárselo a uno mismo. Nuevos endpoints `/api/inquilinos/usuarios/{id}/super-administrador`.

## 1.38.53 - 2026-11-03
- Fase 5 (paso 1): empresas (inquilinos) con cupo de usuarios (`MaxUsuarios`), vencimiento, contacto y suspensión, gestionados por el Súper Administrador en la nueva pantalla **Empresas**; token del agente por empresa y creación de su primer administrador.
- La API rechaza crear o activar usuarios por encima del cupo de la empresa; la principal sigue rigiéndose por la licencia .lic. Usuarios y perfiles muestra «Licencias: X de Y usuarios utilizados».
- Empresas suspendidas o vencidas no ingresan y su agente queda rechazado. Por aislamiento, las empresas nuevas aún no ingresan hasta acotar los datos por empresa (paso 2).
- Ejecutar SQL `23_saas_multi_inquilino.sql` y actualizar **aplicación web y API**; agente sin cambios.

## 1.38.52 - 2026-11-03
- Opción A: el selector global de compañía solo aparece cuando hay varias compañías disponibles. Con una sola, el menú muestra su nombre y no se aplica un filtro global oculto; se conserva la preferencia del usuario para cuando vuelvan a existir varias.
- Actualizar **solo aplicación web**; API, agente y scripts SQL sin cambios.

## 1.38.51 - 2026-11-03
- Fase 3: Documentos por pagar (DOCUMENTOS_CP) se replican por el agente en las compañías en modo Agente, con la misma consulta, mapeo e IDs del modo directo; leyenda y «Sincronizar ahora» en Documentos por pagar.
- Ejecutar SQL `22_replica_documentos_pagar.sql` y actualizar **aplicación web, API y agente**.

## 1.38.50 - 2026-11-03
- Fase 3: Facturas (con saldo de cuentas por cobrar) y Contratos se replican por el agente en las compañías en modo Agente, usando la misma consulta y mapeo del modo directo y los mismos IDs, por lo que pagos, conciliación y la coincidencia de contratos del mes no cambian.
- Detalle replicado: todas las líneas de contratos; líneas de facturas pendientes y de los últimos 12 meses.
- Leyenda de sincronización y botón «Sincronizar ahora» en Contratos; Facturas por cobrar y Contratos solicitan sincronización al agente.
- Documentos por cobrar (comparativo anual) y por pagar siguen en conexión directa.
- Ejecutar SQL `21_replica_documentos.sql` y actualizar **aplicación web, API y agente**.

## 1.38.49 - 2026-11-03
- Paquete del agente: ejecutable único (PublishSingleFile) con scripts .bat de servicio, prueba en consola y LEAME; sin cientos de DLL.

## 1.38.48 — 2026-11-03
- Fase 3 piloto de Pedidos: modo directo/agente por compañía, intervalo, instantánea completa con detalle, recepción atómica, solicitudes bajo demanda y reservas de trabajo. Misma consulta y mapeo de Softland compartidos por API y agente.
- Pedidos por agente son de solo lectura. Facturas y cuentas por pagar conservan conexión directa. No habilita todavía un segundo inquilino de usuarios (Fase 5).
- Leyenda superior verde tras verificación exitosa reciente, roja desde exactamente cinco minutos o tras fallo; consulta automática del estado sin renovar artificialmente la fecha.
- Ejecutar SQL `20_replica_pedidos.sql` y actualizar **aplicación web y API**; actualizar aparte el agente del cliente, conservando su configuración y agregando el mapeo `Agente:Companias`.

## 1.38.47 — 2026-11-03
- Parámetros: la tarjeta «Agente local» aparece debajo de la tarjeta de Licencia (antes estaba junto a «Carga inicial»).
- Solo aplicación web; sin cambios en API ni SQL.

## 1.38.46 — 2026-11-03
- `npm run package:agente` compila el agente local (win-x64 autocontenido, no requiere .NET en el servidor del cliente) y crea `cashflow-agente-<versión>.zip` con el ejecutable y la plantilla `appsettings.json`; excluye configuraciones privadas, certificados, logs y Git. Nuevo `build:agente` para publicar en `publicar/agente` sin ZIP.
- Solo herramientas de empaquetado: la API y la aplicación web no cambian.

## 1.38.45 — 2026-11-03
- Agente local: agregado el paquete Microsoft.Extensions.Http para que compile (IHttpClientFactory).

## 1.38.44 — 2026-11-03
- Fase 2 SaaS: agente local `agente/AplixCashFlowAgente` (.NET 8, consola o servicio de Windows) que envía latido y diagnóstico de Softland a `/api/public/agente/*` con `x-agent-token`, solo por HTTPS saliente.
- API: endpoints públicos del agente, `GET /agente/estado` y `POST /agente/token` (administrador, el token se guarda como hash).
- Web: tarjeta «Agente local» en Parámetros con estado en línea, conexión a Softland y generación de token.
- Nuevo script SQL `19_agente_estado.sql`. Actualizar API, aplicación web y ejecutar el script.

## 1.38.43 — 2026-11-03
- Nuevo `npm run package:api`: compila automáticamente la API en Release en una carpeta temporal limpia y crea `cashflow-api-1.38.43.zip` en la raíz del proyecto.
- Incluye DLL, dependencias, archivos de ejecución y plantilla IIS directamente en la raíz del ZIP; excluye todos los `appsettings*.json`, archivos `.env`, certificados, licencias, logs, SQL y metadatos Git. Conserve las configuraciones existentes del servidor.
- La API mantiene su versión 1.38.41; no cambia su código ni hay nuevos scripts SQL. Solo actualizar la aplicación web para reflejar 1.38.43; el comando permite transferir la API pendiente de Fase 1 por separado (requiere script SQL 18 si aún no se ejecutó).

## 1.38.42 — 2026-11-03
- Pagos recibidos: la casilla Mostrar facturas en estado pagado incluye esas facturas en el selector de conciliación; registrar el depósito conserva su estado y suma solo el ingreso bancario.
- La lista de conciliación se amplía al texto más largo, limitada por la pantalla y sin ocultar información; las sugerencias automáticas mantienen la validación cronológica y solo consideran pendientes.
- Facturas por cobrar: acción Registrar pago en cada fila abre la ventana existente con factura, monto, moneda y banco precargados.
- Actualizar solo aplicación web; sin cambios en API ni SQL.

## 1.38.41 — 2026-11-02
- Fase 1 SaaS: script `database/18_agente_sincronizacion.sql` (tablas `flujo.Inquilino` con inquilino por defecto y `flujo.SincronizacionEstado`).
- API: `GET /api/sincronizacion/estado` y `POST /api/sincronizacion/solicitar`.
- Web: leyenda de última sincronización y botón «Sincronizar ahora» en Pedidos pendientes, Facturas por cobrar y Documentos por pagar. Las consultas directas a Softland siguen activas.

## 1.38.40 — 2026-11-02
- Conciliación bancaria (pagos recibidos y erogaciones): solo sugiere documentos emitidos hasta la fecha del movimiento, priorizando el más cercano.
- El selector de documentos muestra y permite buscar por fecha de emisión. Solo aplicación web; sin API ni SQL.

## 1.38.39 — 2026-11-02
- Nuevo `npm run package:node`, siguiendo NotifyHub: compila y verifica la aplicación web y crea `cashflow-deploy-1.38.39.zip` en la raíz del proyecto.
- Contiene directamente `server/`, `public/` y `web.config`, con dependencias de servidor e íconos Safari/iOS; excluye archivos privados `.env` y metadatos Git.
- Se conserva la publicación y el servicio NSSM existentes. Actualizar solo la aplicación web; sin cambios en API ni SQL.

## 1.38.38 — 2026-10-26
- Ingreso en móvil igual a NotifyHub: en pantallas menores a 1024 px se oculta el panel azul y aparece arriba del formulario la marca compacta (isotipo, nombre y versión). Sin cambios en API ni SQL.

## 1.38.37 — 2026-10-24
- El enlace al archivo de estilos incluye la versión de la aplicación (`assets/app.css?v=…`): cada publicación obliga al navegador y a IIS a descargar el diseño nuevo, sin depender de Ctrl+F5. Corrige el caso en que producción mostraba el ingreso apilado por servir el CSS anterior desde caché. Sin cambios en API ni SQL.

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