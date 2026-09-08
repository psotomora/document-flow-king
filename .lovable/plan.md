# Saldo proyectado final en la pantalla de Saldo consolidado

## Qué se agrega

Al final de la pantalla **Saldo proyectado consolidado** aparecerá un nuevo valor:

**Saldo proyectado total (USD)** = saldo disponible en bancos (dólares + colones convertidos)
+ pedidos pendientes (del origen seleccionado: registro local o SoftlandERP)
+ facturas pendientes de pago (no anuladas y no cobradas).

Se mostrará en tres lugares de esa misma pantalla:
- una tarjeta al final de la fila de indicadores,
- una fila final en la tabla de conceptos,
- una fila final en el PDF exportado.

Debajo del valor se indicará de dónde salen los pedidos y las facturas (local o SoftlandERP).

## Reglas de cálculo

- **Pedidos pendientes**: solo los de estado Pendiente de la compañía activa. Si el interruptor de fuente externa está en Sí, ya vienen de SoftlandERP (estado Normal); si no, son los pedidos locales.
- **Facturas pendientes de pago**:
  - Facturas locales: se suma el **saldo pendiente** (monto menos pagos recibidos), nunca negativo.
  - Facturas de SoftlandERP: se excluyen las anuladas (ya se excluyen hoy) y además las que tienen `COBRADA = 'S'`.
- Los colones se convierten a dólares con el tipo de cambio vigente; el detalle por moneda se conserva en la tabla.

## Detalles técnicos

1. `api/FlujoEfectivo.Api/Datos/Softland.cs`: la consulta de FACTURA ya trae `COBRADA`; se pasa ese valor como campo propio `Cobrada` en el DTO (además de la nota actual).
2. `api/FlujoEfectivo.Api/Modelos/Dtos.cs`: agregar `Cobrada` (bool) a `FacturaDto`; en las facturas locales queda en falso.
3. `src/data/tipos.ts`: agregar `cobrada?: boolean | null` a `Factura`.
4. `src/lib/calculos.ts`: en `calcularSaldoProyectado`, excluir las facturas con `cobrada === true` del cálculo de `porCobrarUSD`/`porCobrarCRC`, y agregar al resultado `saldoProyectadoTotalUSD` (consolidado en USD + pedidos pendientes en USD). Se conservan los campos existentes para no romper el tablero de inicio.
5. `src/routes/consolidado.tsx`: agregar la tarjeta final, la fila final de la tabla y la fila del PDF, con el detalle del origen (`pedidosFuenteExterna` / `facturasFuenteExterna` desde `useApp()`).
6. Subir la versión en `src/lib/version.ts` a 1.17.0 con la nota correspondiente y ejecutar el chequeo de tipos.
