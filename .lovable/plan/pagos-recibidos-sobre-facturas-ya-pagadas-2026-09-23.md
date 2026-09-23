# Pagos recibidos sobre facturas ya pagadas

## Cambios
- Agregar junto a **Fecha fin** la casilla **Mostrar facturas en estado pagado**.
- Al activarla, incluir las facturas pagadas en el selector de **Registrar pago** y distinguirlas visualmente.
- Si se selecciona una factura pagada, registrar el ingreso y aumentar el saldo del banco, sin recalcular el saldo ni el estado de esa factura.
- Mantener sin cambios el comportamiento de pagos sobre facturas pendientes.
- Mostrar una confirmación específica cuando el pago sea solo un movimiento bancario.

## Datos y compatibilidad
- Guardar en cada pago si debe aplicarse a la factura o si corresponde únicamente al banco.
- Agregar un script SQL idempotente para instalaciones existentes.
- Actualizar la consulta y el registro de pagos de la API para conservar este indicador.

## Versión y comprobación
- Subir la aplicación y la API a **1.37.6** y registrar el cambio en el historial.
- Actualizar la guía de scripts y comprobar los tipos de la aplicación.
