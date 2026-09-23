/* ============================================================================
   Aplix Cash Flow Insights - Pago bancario sobre factura ya pagada
   Agrega el indicador que permite excluir el pago del saldo de la factura.
   Script idempotente para instalaciones existentes.
   ============================================================================ */

IF OBJECT_ID('flujo.Pago', 'U') IS NOT NULL
   AND COL_LENGTH('flujo.Pago', 'AplicaFactura') IS NULL
BEGIN
    ALTER TABLE flujo.Pago ADD AplicaFactura BIT NOT NULL
        CONSTRAINT DF_Pago_AplicaFactura DEFAULT (1) WITH VALUES;
END;
GO