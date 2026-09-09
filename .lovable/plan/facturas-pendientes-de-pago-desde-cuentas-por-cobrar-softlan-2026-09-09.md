# Facturas pendientes de pago desde cuentas por cobrar (SoftlandERP)

## Qué cambia para el usuario

Hoy la aplicación decide si una factura de SoftlandERP está cobrada usando el campo `COBRADA` de la tabla de facturas. Eso solo distingue entre "cobrada" y "no cobrada", y no refleja pagos parciales.

Con este cambio, el saldo real viene del módulo de cuentas por cobrar:

- La lista de facturas sigue mostrando las facturas del módulo de facturación (con su detalle de líneas).
- Cada factura muestra además el **saldo pendiente real** según cuentas por cobrar.
- Una factura se considera pendiente cuando su saldo es mayor que cero y el documento no está anulado.
- Las facturas totalmente aplicadas dejan de sumar en el saldo proyectado del consolidado; las parcialmente pagadas suman solo lo que falta.
- Si un documento no existe todavía en cuentas por cobrar (factura recién emitida, aún no cargada), se sigue usando el total de la factura como pendiente.

## Consulta propuesta

Cruce por número de documento y tipo, sobre el mismo esquema (compañía) ya configurado:

```text
FACTURA f
  LEFT JOIN DOCUMENTOS_CC cc
    ON cc.DOCUMENTO = f.FACTURA
   AND cc.TIPO = 'FAC'
```

Criterios de vigencia y pendiente (ambos, según lo definido):

- `f.TIPO_DOCUMENTO = 'F'` y `ISNULL(f.ANULADA,'N') <> 'S'` (se mantiene el filtro actual).
- `cc.FECHA_ANUL IS NULL` — documento de cobro no anulado.
- `cc.SALDO > 0` — queda monto por aplicar.

Campos que se leerán de `DOCUMENTOS_CC`:

| Campo | Uso |
| --- | --- |
| `SALDO` | Saldo pendiente en la moneda del documento |
| `MONTO` | Monto original, para validar aplicaciones |
| `MONEDA` | Confirmar moneda del saldo |
| `FECHA_VENCE` | Fecha de vencimiento real del ERP (mejor que plazo calculado) |
| `FECHA_ANUL` | Excluir documentos anulados |
| `SALDO_DOLAR` / `SALDO_LOCAL` | Respaldo cuando la moneda no coincide |

Se seguirá considerando "cobrada" cuando `SALDO <= 0` o el documento esté anulado.

Nota: si en la compañía el tipo de documento de factura no es `FAC`, el valor se hará configurable en Parámetros en lugar de quedar fijo.

## Detalles técnicos

- `api/FlujoEfectivo.Api/Datos/Softland.cs`
  - En `Facturas(...)`: agregar el `LEFT JOIN` a `[esquema].[DOCUMENTOS_CC]`, detectando primero la existencia de la tabla con `OBJECT_ID` (igual que se hace con `CONDICION_PAGO`), para no romper instalaciones sin ese módulo.
  - Devolver `SaldoPendiente` y `FechaVence`; calcular `Cobrada` como `saldo <= 0` en vez de leer `f.COBRADA`.
  - En `Probar(...)`: informar si `DOCUMENTOS_CC` existe y cuántos documentos con saldo hay.
- `api/FlujoEfectivo.Api/Modelos/Dtos.cs`: agregar `SaldoPendiente` (decimal) y `FechaVence` (string) a `FacturaDto`, con constructor sin parámetros compatible con Dapper.
- `src/data/tipos.ts`: agregar `saldoPendiente?: number | null` y `fechaVence?: string | null` a `Factura`.
- `src/lib/calculos.ts`: cuando la factura trae `saldoPendiente`, usarlo como pendiente en lugar de `monto - pagos` para el saldo proyectado.
- `src/routes/facturas.tsx`: mostrar la columna de saldo pendiente y usar `fechaVence` del ERP cuando exista.
- `docs/API-SQLSERVER.md`: documentar la equivalencia de campos de `DOCUMENTOS_CC`.
- Subir la versión en `src/lib/version.ts` a 1.19.0.

## Verificación

- `bunx tsgo --noEmit` para el frontend.
- Revisar en Parámetros → Probar conexión que reporte los documentos de cuentas por cobrar.
- Comparar en Facturas una factura con pago parcial contra el ERP.
