/* ============================================================================
   09_documentos_por_pagar.sql
   Documentos de proveedores pendientes de pago (cuentas por pagar internas)
   y su referencia opcional desde las erogaciones.
   Script idempotente: se puede ejecutar varias veces sin efectos adversos.
   ========================================================================== */
USE FlujoEfectivo;
GO

IF OBJECT_ID('flujo.DocumentoPorPagar', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.DocumentoPorPagar
    (
        DocumentoPorPagarId INT IDENTITY(1,1) PRIMARY KEY,
        CompaniaId          INT             NOT NULL
            CONSTRAINT FK_DocumentoPorPagar_Compania REFERENCES flujo.Compania (CompaniaId),
        Proveedor           NVARCHAR(150)   NOT NULL,
        Numero              NVARCHAR(50)    NOT NULL,
        Tipo                NVARCHAR(10)    NOT NULL CONSTRAINT DF_DocPorPagar_Tipo DEFAULT ('FAC'),
        Fecha               DATE            NOT NULL,
        FechaVence          DATE            NULL,
        Moneda              CHAR(3)         NOT NULL,
        Monto               DECIMAL(18,2)   NOT NULL,
        Saldo               DECIMAL(18,2)   NOT NULL,
        Anulado             BIT             NOT NULL CONSTRAINT DF_DocPorPagar_Anulado DEFAULT (0),
        Notas               NVARCHAR(500)   NULL,
        CreadoEn            DATETIME2(0)    NOT NULL CONSTRAINT DF_DocPorPagar_Creado DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_DocumentoPorPagar UNIQUE (CompaniaId, Tipo, Numero),
        CONSTRAINT CK_DocPorPagar_Moneda CHECK (Moneda IN ('USD', 'CRC'))
    );
END
GO

/* Referencia opcional de la erogación al documento que cancela. */
IF COL_LENGTH('flujo.Erogacion', 'DocumentoPorPagarId') IS NULL
    ALTER TABLE flujo.Erogacion ADD DocumentoPorPagarId INT NULL;
GO

IF COL_LENGTH('flujo.Erogacion', 'DocumentoPagoNumero') IS NULL
    ALTER TABLE flujo.Erogacion ADD DocumentoPagoNumero NVARCHAR(50) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Erogacion_DocumentoPorPagar')
    ALTER TABLE flujo.Erogacion
        ADD CONSTRAINT FK_Erogacion_DocumentoPorPagar
        FOREIGN KEY (DocumentoPorPagarId) REFERENCES flujo.DocumentoPorPagar (DocumentoPorPagarId);
GO

/* Parámetro que habilita la lectura desde la fuente externa (DOCUMENTOS_CP). */
IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'documentosPagoFuenteExterna')
    INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
    VALUES ('documentosPagoFuenteExterna', '0',
            'Usar datos de documentos pendientes de pago de fuente externa');
GO
