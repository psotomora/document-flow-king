/* ============================================================================
   10_documentos_por_cobrar.sql
   Documentos de cuentas por cobrar de clientes (tipos FAC y DEV) para la
   vista de consulta de Operación → Documentos por cobrar.
   Script idempotente: se puede ejecutar varias veces sin efectos adversos.
   ========================================================================== */
USE FlujoEfectivo;
GO

IF OBJECT_ID('flujo.DocumentoPorCobrar', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.DocumentoPorCobrar
    (
        DocumentoPorCobrarId INT IDENTITY(1,1) PRIMARY KEY,
        CompaniaId           INT             NOT NULL
            CONSTRAINT FK_DocumentoPorCobrar_Compania REFERENCES flujo.Compania (CompaniaId),
        Cliente              NVARCHAR(150)   NOT NULL,
        Numero               NVARCHAR(50)    NOT NULL,
        Tipo                 NVARCHAR(10)    NOT NULL CONSTRAINT DF_DocPorCobrar_Tipo DEFAULT ('FAC'),
        Fecha                DATE            NOT NULL,
        FechaVence           DATE            NULL,
        Moneda               CHAR(3)         NOT NULL,
        Monto                DECIMAL(18,2)   NOT NULL,
        Saldo                DECIMAL(18,2)   NOT NULL,
        Anulado              BIT             NOT NULL CONSTRAINT DF_DocPorCobrar_Anulado DEFAULT (0),
        Notas                NVARCHAR(500)   NULL,
        CreadoEn             DATETIME2(0)    NOT NULL CONSTRAINT DF_DocPorCobrar_Creado DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_DocumentoPorCobrar UNIQUE (CompaniaId, Tipo, Numero),
        CONSTRAINT CK_DocPorCobrar_Moneda CHECK (Moneda IN ('USD', 'CRC')),
        CONSTRAINT CK_DocPorCobrar_Tipo CHECK (Tipo IN ('FAC', 'DEV'))
    );
END
GO

/* Parámetro que habilita la lectura desde la fuente externa (DOCUMENTOS_CC). */
IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'documentosCobroFuenteExterna')
    INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
    VALUES ('documentosCobroFuenteExterna', '0',
            'Usar datos de documentos por cobrar (FAC y DEV) de fuente externa');
GO
