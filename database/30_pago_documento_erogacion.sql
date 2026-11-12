/* Aplicar después del script 27. No crea erogaciones retroactivas ni escribe en Softland. */
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('flujo.DocumentoPagarMarca', 'U') IS NULL
    THROW 50001, 'Ejecute primero el script 27_marca_pago_documentos.sql.', 1;
IF COL_LENGTH('flujo.DocumentoPagarMarca', 'ErogacionId') IS NULL
    ALTER TABLE flujo.DocumentoPagarMarca ADD ErogacionId INT NULL;
COMMIT;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_DocumentoPagarMarca_Erogacion')
    ALTER TABLE flujo.DocumentoPagarMarca ADD CONSTRAINT FK_DocumentoPagarMarca_Erogacion
        FOREIGN KEY (ErogacionId) REFERENCES flujo.Erogacion(ErogacionId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('flujo.DocumentoPagarMarca') AND name='UX_DocumentoPagarMarca_Erogacion')
    CREATE UNIQUE INDEX UX_DocumentoPagarMarca_Erogacion ON flujo.DocumentoPagarMarca(ErogacionId) WHERE ErogacionId IS NOT NULL;
GO