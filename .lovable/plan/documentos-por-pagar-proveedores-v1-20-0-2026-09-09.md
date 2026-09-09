# Documentos por pagar (proveedores) — v1.20.0

## Qué cambia para el usuario

Nueva opción en el menú **Operación → Documentos por pagar**, justo debajo de Erogaciones. Funciona igual que Facturas por cobrar, con tres modos:

1. **Demostración**: datos de ejemplo cargados con la semilla.
2. **Tablas locales**: documentos registrados en la propia base de datos, con alta, edición y borrado (borrar solo administradores).
3. **Fuente externa (SoftlandERP)**: se leen del ERP, solo lectura.

Solo se muestran documentos **pendientes de pago** (saldo mayor que cero y no anulados).

Filtros de la pantalla:

- Búsqueda por **proveedor o número de documento** (parcial, sin distinguir mayúsculas).
- **Periodo**: Este mes, Todos los registros o Rango de fechas (fecha inicio / fecha fin), igual que en Erogaciones.
- Selector de filas visibles, encabezado fijo y scroll, como en las demás tablas.
- Totales pendientes en USD, en CRC y equivalente consolidado en USD.
- Exportación a Excel de lo filtrado.

Nuevo parámetro en **Parámetros → Integración**: *Usar datos de documentos pendientes de pago de fuente externa*, con la misma conexión de pedidos y facturas (no se piden credenciales nuevas). Solo administrador; cada cambio queda en bitácora.

### Erogaciones enlazadas a un documento

En el alta de una erogación se agrega un selector opcional **Documento por pagar**:

- Se puede elegir un documento pendiente (del origen activo: local o SoftlandERP) — al elegirlo se precargan proveedor, moneda y monto pendiente, editables.
- O dejarlo en **Sin documento**, que es el comportamiento actual.
- Cuando el origen es externo, el documento se guarda por su número y proveedor del ERP (no se escribe nada en el ERP).
- En modo local, la erogación aplicada reduce el saldo pendiente del documento.
- La lista de Erogaciones muestra una columna con el documento asociado (o vacío).

El saldo consolidado **no** cambia por ahora.

## Consulta del ERP

Sobre el esquema (compañía) ya configurado:

```text
SELECT PROVEEDOR, DOCUMENTO, TIPO, FECHA_DOCUMENTO, FECHA, FECHA_VENCE,
       MONEDA, MONTO, SALDO, SALDO_DOLAR, SALDO_LOCAL, CONDICION_PAGO, ESTADO
FROM [esquema].[DOCUMENTOS_CP]
WHERE SALDO > 0
  AND FECHA_ANUL IS NULL
  AND ISNULL(ANULADO,'N') <> 'S'
```

Se incluyen todos los tipos de documento con saldo. El nombre del proveedor se resuelve con la tabla de proveedores del ERP si existe (`LEFT JOIN` detectado con `OBJECT_ID`, igual que se hace hoy con `CONDICION_PAGO` y `DOCUMENTOS_CC`); si no existe, se muestra el código.

## Detalles técnicos

**Base de datos**
- Nuevo script `database/09_documentos_por_pagar.sql` idempotente: tabla `flujo.DocumentoPorPagar` (Id, CompaniaId, Proveedor, Numero, Tipo, Fecha, FechaVence, Moneda, Monto, Saldo, Estado, Notas) y columna `DocumentoPorPagar` (NVARCHAR) en `flujo.Erogacion` para la referencia.
- `database/06_parametros_generales.sql`: nuevo parámetro `documentosPagoFuenteExterna` con valor `0`.
- Auto‑migración equivalente en `api/FlujoEfectivo.Api/Program.cs`.

**API**
- `Modelos/Dtos.cs`: `DocumentoPorPagarDto` y campo de referencia en el DTO de erogación.
- `Datos/Softland.cs`: método `DocumentosPorPagar(...)` con la consulta anterior, detección de tabla con `OBJECT_ID`; `Probar(...)` informa si existe `DOCUMENTOS_CP` y cuántos documentos con saldo hay.
- `Endpoints/RegistrosEndpoints.cs`: CRUD de documentos por pagar (borrado solo administrador, con bitácora) y lectura conmutada por el parámetro externo, igual que facturas.

**Frontend**
- `src/data/tipos.ts`: interfaz `DocumentoPorPagar` y `documentoPagoId?`/`documentoPagoNumero?` en `Erogacion`.
- `src/data/semilla.ts`: documentos de demostración.
- `src/contexto/AppContexto.tsx`: `PARAM_DOCUMENTOS_PAGO_FUENTE_EXTERNA`, estado `documentosPorPagar`, carga desde API y acciones de alta/edición/borrado.
- `src/routes/documentos-pagar.tsx`: nueva pantalla con filtros, totales, tabla con encabezado fijo, `SelectorFilas` y exportación.
- `src/components/layout/AppShell.tsx`: entrada en el grupo Operación.
- `src/routes/erogaciones.tsx`: selector opcional de documento en el diálogo de alta y columna en la tabla.
- `src/routes/parametros.tsx`: nuevo interruptor de fuente externa.
- `src/lib/preferencias.ts`: claves de filtros persistidos por usuario para la nueva pantalla.
- `src/lib/version.ts`: subir a **1.20.0** con la nota del cambio.
- `docs/API-SQLSERVER.md`: documentar tabla, parámetro y equivalencia de campos de `DOCUMENTOS_CP`.

## Verificación

- `bunx tsgo --noEmit`.
- Parámetros → Probar conexión debe reportar los documentos por pagar del ERP.
- Comparar un documento con pago parcial contra el ERP.
