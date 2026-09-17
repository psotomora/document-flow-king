/* =====================================================================
   16_transferencias.sql
   Transferencias de fondos entre cuentas bancarias (misma o distinta
   compañía). El monto se rebaja de la cuenta de origen y se suma a la
   cuenta de destino. Script idempotente: puede ejecutarse varias veces.
   ===================================================================== */

IF OBJECT_ID('flujo.Transferencia') IS NULL
CREATE TABLE flujo.Transferencia (
    TransferenciaId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Transferencia PRIMARY KEY,
    Fecha              DATE          NOT NULL,
    Referencia         NVARCHAR(60)  NOT NULL,
    CompaniaOrigenId   INT           NOT NULL,
    CuentaOrigenId     INT           NOT NULL,
    CompaniaDestinoId  INT           NOT NULL,
    CuentaDestinoId    INT           NOT NULL,
    Moneda             CHAR(3)       NOT NULL,
    Monto              DECIMAL(18,2) NOT NULL,
    Comentarios        NVARCHAR(300) NULL,
    CreadoPor          INT           NULL,
    CreadoEn           DATETIME2(0)  NOT NULL CONSTRAINT DF_Transferencia_CreadoEn DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Transferencia_CompaniaOrigen  FOREIGN KEY (CompaniaOrigenId)  REFERENCES flujo.Compania(CompaniaId),
    CONSTRAINT FK_Transferencia_CompaniaDestino FOREIGN KEY (CompaniaDestinoId) REFERENCES flujo.Compania(CompaniaId),
    CONSTRAINT FK_Transferencia_CuentaOrigen    FOREIGN KEY (CuentaOrigenId)    REFERENCES flujo.CuentaBancaria(CuentaBancariaId),
    CONSTRAINT FK_Transferencia_CuentaDestino   FOREIGN KEY (CuentaDestinoId)   REFERENCES flujo.CuentaBancaria(CuentaBancariaId),
    CONSTRAINT FK_Transferencia_Moneda          FOREIGN KEY (Moneda)            REFERENCES flujo.Moneda(Codigo),
    CONSTRAINT CK_Transferencia_Monto           CHECK (Monto > 0),
    CONSTRAINT CK_Transferencia_Cuentas         CHECK (CuentaOrigenId <> CuentaDestinoId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Transferencia_Fecha')
    CREATE INDEX IX_Transferencia_Fecha ON flujo.Transferencia (Fecha DESC);
GO
