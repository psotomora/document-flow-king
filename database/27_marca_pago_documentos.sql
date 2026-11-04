/* Aplix Cash Flow Insights 1.38.77 - Marca «Pagado (Cash Flow)» en documentos por pagar.
   Registra pagos conocidos en Flujo de Efectivo que aún no se aplican en el ERP.
   No escribe en Softland. */
IF OBJECT_ID('flujo.DocumentoPagarMarca', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.DocumentoPagarMarca (
        DocumentoPagarMarcaId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DocumentoPagarMarca PRIMARY KEY,
        CompaniaId  INT            NOT NULL CONSTRAINT FK_DocumentoPagarMarca_Compania REFERENCES flujo.Compania(CompaniaId),
        Proveedor   NVARCHAR(200)  NOT NULL,
        Tipo        NVARCHAR(20)   NOT NULL,
        Numero      NVARCHAR(60)   NOT NULL,
        FechaPago   DATE           NOT NULL,
        Nota        NVARCHAR(500)  NULL,
        MarcadoPor  NVARCHAR(100)  NULL,
        MarcadoEn   DATETIME2      NOT NULL CONSTRAINT DF_DocumentoPagarMarca_MarcadoEn DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_DocumentoPagarMarca_Documento ON flujo.DocumentoPagarMarca (CompaniaId, Numero);
END
GO
