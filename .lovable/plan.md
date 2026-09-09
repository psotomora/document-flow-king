# v1.19.6 — Contratos por facturar del mes

## Qué se agrega

En la pantalla de Contratos, debajo del listado actual (que no cambia), una nueva
subsección: **Contratos por facturar este mes**. Al primer ingreso de cada mes el
sistema revisa los contratos activos y arma la lista del mes corriente; si nadie
entra el día 1, la lista se arma igual el día en que alguien entra por primera vez.

La lista es solo de consulta: compañía, número de contrato, cliente, periodicidad,
fecha esperada de facturación dentro del mes, moneda y monto. Incluye totales en
dólares y colones y exportación a Excel, igual que las demás secciones.

Funciona tanto con datos locales como cuando el origen de pedidos y facturas es
externo (SoftlandERP): los contratos siempre viven en la base del sistema, así que
la lista se arma igual en ambos modos.

## Filtros que se recuerdan

La subsección tiene filtros de cliente o número de contrato, fecha de inicio y fecha
de fin. Lo que cada usuario deja seleccionado se guarda en la base de datos y vuelve
a aplicarse la próxima vez que entre, en cualquier equipo. Cada usuario tiene sus
propios valores.

## Saldo consolidado

- Nueva tarjeta: **Contratos por facturar este mes**, con el monto en dólares
  (los colones se convierten al tipo de cambio vigente).
- Nueva línea en el desglose "Cómo se compone el saldo proyectado", con su nota
  explicativa, y el mismo renglón agregado al PDF exportado.
- El total proyectado pasa a incluir ese monto.
- Sin doble conteo: si un contrato del mes ya tiene su pedido o su factura
  registrada (local o del origen externo), no se suma otra vez; solo se listan y
  suman los contratos del mes que aún no se han convertido en documento.

## Detalle técnico

- `src/lib/contratos.ts`: nueva función `contratosPorFacturarDelMes(contratos,
  pedidos, facturas, mes)` que devuelve, por contrato activo, las ocurrencias de
  facturación que caen dentro del mes corriente (avanzando desde
  `proximaFacturacion` según `MESES_POR_PERIODICIDAD`, hacia atrás y adelante dentro
  del mes), marcando cuáles ya tienen documento asociado (coincidencia por
  `numeroPedidoDeContrato` y por número de contrato contenido en el número/referencia
  del pedido o factura). Se reutiliza `sumarMeses`.
- `src/contexto/AppContexto.tsx`: memo `contratosMesActual` expuesto en el contexto;
  marca de "mes ya revisado" persistida como parámetro por usuario para que la
  revisión ocurra una sola vez por mes (primer ingreso). No se modifica el efecto
  actual de generación de pedidos.
- Preferencias por usuario: nuevo endpoint `GET/PUT /preferencias/{clave}` en
  `api/FlujoEfectivo.Api/Endpoints/UsuariosEndpoints.cs` respaldado por una tabla
  `flujo.PreferenciaUsuario (UsuarioId, Clave, Valor)` creada en
  `database/08_preferencias_usuario.sql` (idempotente, con GRANTs) y aplicada por la
  auto-migración de `Program.cs`. El estado inicial (`EstadoEndpoints.cs`) devuelve
  las preferencias del usuario autenticado. En modo demostración se usa memoria local.
- `src/lib/calculos.ts`: `calcularSaldoProyectado` recibe el monto en USD de los
  contratos del mes pendientes y agrega `contratosMesUSD` al resultado y al
  `saldoProyectadoTotalUSD`.
- `src/routes/contratos.tsx`: nueva subsección con filtros, totales, tabla con
  encabezado fijo y scroll, y exportación.
- `src/routes/consolidado.tsx`: tarjeta, fila de desglose y renglón en el PDF.
- `src/lib/version.ts`: versión 1.19.6 con su entrada de historial.
- Verificación con `bunx tsgo --noEmit`.
