/* Aplix Cash Flow Insights 1.38.79 - Marca «Saldada / N/C (Cash Flow)» en facturas por cobrar.
   Para notas de crédito emitidas en el ERP que aún no se aplican en cuentas por cobrar.
   No escribe en Softland. */
IF OBJECT_ID('flujo.FacturaMarca', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.FacturaMarca (
        FacturaMarcaId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FacturaMarca PRIMARY KEY,
        CompaniaId  INT            NOT NULL CONSTRAINT FK_FacturaMarca_Compania REFERENCES flujo.Compania(CompaniaId),
        Numero      NVARCHAR(60)   NOT NULL,
        Fecha       DATE           NOT NULL,
        Nota        NVARCHAR(500)  NULL,
        MarcadoPor  NVARCHAR(100)  NULL,
        MarcadoEn   DATETIME2      NOT NULL CONSTRAINT DF_FacturaMarca_MarcadoEn DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_FacturaMarca_Documento ON flujo.FacturaMarca (CompaniaId, Numero);
END
GO
