# Documentos por cobrar (FAC y DEV) — v1.21.0

Nueva sección en **Operación → Documentos por cobrar**: una vista de consulta con todos los
documentos de cliente de tipo **FAC** (facturas) y **DEV** (devoluciones/notas de crédito),
excluyendo los anulados. Muestra tanto los ya cobrados como los que tienen saldo pendiente.

## Qué verá el usuario

- Un grid con las mismas columnas que Documentos por pagar, pero del lado del cliente:
  Compañía · Cliente · Documento · Tipo · Fecha · Vence · Monto · Saldo · Notas.
- Los mismos filtros que Facturas por cobrar: cliente, moneda, rango de fechas
  (desde/hasta) y, adicionalmente, tipo de documento (Todos / FAC / DEV).
- Totales arriba: monto y saldo en USD, en CRC y consolidado en USD.
- Selector de cantidad de filas (preferencia por usuario), scroll con encabezado fijo.
- Botón **Actualizar** (relee del origen externo sin recargar la página) y
  botón **Exportar Excel** con exactamente las filas filtradas.
- Cuando el origen es externo, la información es de solo lectura y se indica con un aviso.

## Origen de los datos

- **Fuente externa (SoftlandERP)**: se leen de `DOCUMENTOS_CC` los documentos con
  `TIPO IN ('FAC','DEV')` y `FECHA_ANUL IS NULL`, resolviendo el nombre del cliente contra
  la tabla `CLIENTE` cuando exista. Reutiliza la conexión ya configurada; no se pide
  ninguna configuración nueva.
- **Modo local (SQL Server propio)**: tabla nueva `flujo.DocumentoPorCobrar` con el mismo
  juego de campos, alta/edición/borrado según permisos (borrar solo administrador).
- **Modo demostración**: datos de ejemplo equivalentes en la semilla.

Se agrega un parámetro de administrador auditado, `documentosCobroFuenteExterna`, análogo
al de documentos por pagar, para decidir si la sección lee del ERP o del registro local.

## Detalle técnico

- Frontend: nueva ruta `src/routes/documentos-cobrar.tsx` (patrón de
  `documentos-pagar.tsx` + filtros de `facturas.tsx`), entrada de menú en `AppShell.tsx`
  bajo Operación, tipo `DocumentoPorCobrar` en `src/data/tipos.ts`, estado y acciones en
  `AppContexto.tsx`, cliente en `src/lib/api.ts`, semilla demo en `src/data/semilla.ts`.
- Reutiliza `BotonActualizar`, `SelectorFilas`, `useFilasVisibles`, `exportarExcel`,
  `formatearFecha` y `formatearMoneda`.
- Backend: método `DocumentosPorCobrar(...)` en `api/.../Datos/Softland.cs`, DTO en
  `Modelos/Dtos.cs`, endpoints CRUD locales en `RegistrosEndpoints.cs`, parámetro nuevo en
  el endpoint de parámetros con registro en bitácora.
- Base de datos: script idempotente `database/10_documentos_por_cobrar.sql` más
  auto-migración en `Program.cs`, siguiendo lo hecho para documentos por pagar.
- Esta vista es informativa: no altera el saldo consolidado ni la proyección, para evitar
  doble conteo con Facturas por cobrar.
- Versión a `1.21.0` en `src/lib/version.ts` y verificación con `bunx tsgo --noEmit`.
