/* ============================================================================
   12_contratos_mes_historico.sql
   Histórico de contratos por facturar de meses ya cerrados (RF-011).
   Al cambio de mes, si el parámetro 'contratosMesLimpiar' está encendido, las
   líneas del mes anterior se archivan aquí y la lista activa queda limpia.
   Script idempotente: se puede ejecutar varias veces sin efectos adversos.
   ========================================================================== */
USE FlujoEfectivo;
GO

IF OBJECT_ID('flujo.ContratoMesHistorico', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.ContratoMesHistorico
    (
        ContratoMesHistoricoId INT IDENTITY(1,1) PRIMARY KEY,
        Mes             CHAR(7)        NOT NULL,   -- AAAA-MM del mes archivado
        ArchivadoEn     DATE           NOT NULL,
        ContratoId      NVARCHAR(40)   NOT NULL,
        CompaniaId      NVARCHAR(20)   NOT NULL,
        Numero          NVARCHAR(60)   NOT NULL,
        Cliente         NVARCHAR(150)  NOT NULL,
        Periodicidad    NVARCHAR(20)   NOT NULL,
        Fecha           DATE           NOT NULL,
        Moneda          CHAR(3)        NOT NULL,
        Monto           DECIMAL(18,2)  NOT NULL,
        Pagado          BIT            NOT NULL
            CONSTRAINT DF_ContratoMesHistorico_Pagado DEFAULT (0),
        Documento       NVARCHAR(60)   NULL,
        CreadoEn        DATETIME2(0)   NOT NULL
            CONSTRAINT DF_ContratoMesHistorico_Creado DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_ContratoMesHistorico UNIQUE (Mes, ContratoId, Fecha)
    );
    CREATE INDEX IX_ContratoMesHistorico_Mes ON flujo.ContratoMesHistorico (Mes);
END
GO
