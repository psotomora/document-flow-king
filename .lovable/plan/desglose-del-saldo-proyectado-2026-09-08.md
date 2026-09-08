# Desglose del saldo proyectado

## Objetivo

Mostrar en la pantalla de Saldo consolidado, de forma explícita, de dónde sale el saldo proyectado total, para confirmar visualmente que no hay doble conteo entre pagos ya recibidos y facturas por cobrar.

## Qué se verá

Una sección "Cómo se compone el saldo proyectado" con estas líneas, todas expresadas en dólares:

1. Saldo en bancos (saldo inicial + pagos recibidos − erogaciones)
2. Facturas pendientes de cobro (solo el saldo sin pagar de cada factura)
3. Pedidos pendientes (solo estado Pendiente, según el origen local o SoftlandERP)
4. Total proyectado (suma de las tres líneas anteriores)

Cada línea llevará una nota corta que aclara la regla, por ejemplo que las facturas ya cobradas aportan cero porque su monto ya está reflejado en el banco.

El mismo desglose se agrega al PDF que se exporta desde esa pantalla, con las mismas cuatro filas.

## Notas técnicas

- No cambia la lógica de cálculo en `src/lib/calculos.ts`; se reutilizan `saldoActualUSD`, `equivalenteUsdDeCrc`, `porCobrarUSD`/`porCobrarCRC`, `pedidosPendientesUSD` y `saldoProyectadoTotalUSD`.
- Cambios solo en `src/routes/consolidado.tsx`: nueva tarjeta/tabla de desglose y filas equivalentes en la exportación PDF existente.
- Se sube la versión en `src/lib/version.ts` a 1.18.2 con su nota de cambios.
- Verificación: `bunx tsgo --noEmit`.
