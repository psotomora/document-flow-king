/* ============================================================================
   Aplix Cash Flow Insights - Fase 2 SaaS: estado del agente local
   Guarda el último latido del agente y el diagnóstico de su conexión local
   con Softland. No cambia la operación actual. Script idempotente.
   Requiere 18_agente_sincronizacion.sql.
   ============================================================================ */

IF OBJECT_ID('flujo.AgenteEstado', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.AgenteEstado
    (
        InquilinoId        INT           NOT NULL CONSTRAINT PK_AgenteEstado PRIMARY KEY
                           CONSTRAINT FK_AgenteEstado_Inquilino REFERENCES flujo.Inquilino(InquilinoId),
        UltimoLatido       DATETIME2(0)  NULL,   -- UTC
        VersionAgente      NVARCHAR(30)  NULL,
        Equipo             NVARCHAR(100) NULL,
        UltimoDiagnostico  DATETIME2(0)  NULL,   -- UTC
        SoftlandOk         BIT           NULL,
        SoftlandLatenciaMs INT           NULL,
        SoftlandVersionSql NVARCHAR(200) NULL,
        SoftlandMensaje    NVARCHAR(400) NULL
    );
END;
GO
