# Comparativo anual: usar el mismo filtro del reporte, pero del año anterior

## Situación

En "Reporte de documentos" las dos pestañas trabajan hoy con filtros separados:
la pestaña Documentos tiene su propio cliente, número, tipo, moneda y periodo, y
la pestaña Comparativo anual tiene otro juego de filtros propio. Por eso lo que
se ve en una pestaña no coincide con lo que se ve en la otra, y el detalle del
comparativo no corresponde al periodo que usted eligió en el reporte.

Además usted reporta que las tarjetas del comparativo no muestran cifras del año
anterior aunque el reporte sí devuelve documentos de ese año. Esa causa todavía
no está confirmada, así que el primer paso del trabajo es comprobarla con los
datos reales antes de tocar los cálculos.

## Lo que se va a hacer

1. **Comprobar primero.** Con los datos de la fuente externa, revisar cuántos
   documentos existen por año y confirmar si el periodo anterior que calcula el
   comparativo (mismas fechas, un año atrás) realmente encuentra documentos.
   Si el rango está bien y aun así sale en cero, se corrige el cálculo; si el
   problema es que las fechas del documento vienen distintas de lo esperado, se
   ajusta la lectura de la fecha.

2. **Un solo juego de filtros.** Los filtros (cliente, número, tipo, moneda y
   periodo con Este mes / Acumulado del año a la fecha / Rango de fechas) pasan
   a ser compartidos por las dos pestañas. Se eliminan los filtros duplicados
   del comparativo.

3. **Periodos equivalentes.** El periodo actual del comparativo es exactamente
   el mismo que muestra la pestaña Documentos; el periodo anterior es ese mismo
   rango de fechas restándole un año. Esto aplica a las tres opciones de
   periodo, incluido el rango libre.

4. **Detalle del comparativo.** La tabla y la exportación a Excel del
   comparativo muestran el detalle del año anterior para ese mismo periodo, con
   un texto visible que indica las fechas exactas que se están mostrando.

5. **Tarjetas y gráfico.** Se mantienen los montos netos (facturas menos
   devoluciones y notas de crédito) en colones, dólares y consolidado, y el
   gráfico por tipo de documento, todos alimentados por los periodos ya
   unificados. Si un periodo queda sin documentos, se indica con un mensaje
   claro en lugar de mostrar ceros sin explicación.

## Detalle técnico

- Los filtros suben desde `src/routes/documentos-cobrar.tsx` y se pasan a
  `src/components/documentos/VistaComparativa.tsx` como propiedades; se retira
  el estado local de filtros de ese componente.
- El periodo "Acumulado del año a la fecha" en la pestaña Documentos hoy filtra
  por año calendario completo; se alinea a rango 1 de enero → hoy para que el
  comparativo sea exactamente equivalente.
- El desplazamiento de un año se aplica sobre las fechas ISO de inicio y fin del
  rango vigente, con ajuste para el 29 de febrero.
- Se conservan selector de filas, scroll, encabezado fijo, botón Actualizar y
  exportación a Excel, agregando la columna de periodo ya existente.
- Se sube la versión en `src/lib/version.ts` con su entrada de historial y se
  corre el chequeo de tipos.
