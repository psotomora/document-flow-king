# Corregir origen histórico del Comparativo anual

## Objetivo
Asegurar que “Reporte de documentos → Comparativo anual” muestre el detalle del mismo rango del año anterior usando el histórico de `FACTURA` en SoftlandERP.

## Cambios
- Convertir `FACTURA` en la fuente principal del histórico del reporte externo, incluyendo FAC, DEV y NC no anulados.
- Usar `DOCUMENTOS_CC` únicamente para completar saldo y vencimiento cuando exista el documento, sin sustituir la fecha histórica de `FACTURA`.
- Evitar duplicados y conservar documentos válidos que solo existan en cuentas por cobrar.
- Mantener los filtros actuales; el grid y Excel seguirán mostrando exclusivamente el rango equivalente del año anterior.
- Aumentar las versiones de aplicación y API y documentar el ajuste.

## Verificación
- Validar que el rango anterior se calcula restando exactamente un año al rango vigente.
- Ejecutar la comprobación de TypeScript y validar la estructura XML del proyecto API.
