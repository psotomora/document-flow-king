/* ============================================================================
   Aplix Cash Flow Insights - Fase 1 SaaS: inquilinos y estado de sincronización
   Prepara la réplica del ERP sin cambiar la operación actual (las consultas
   directas a Softland siguen funcionando). Script idempotente.
   ============================================================================ */

IF OBJECT_ID('flujo.Inquilino', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.Inquilino
    (
        InquilinoId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Inquilino PRIMARY KEY,
        Codigo          NVARCHAR(40)  NOT NULL CONSTRAINT UQ_Inquilino_Codigo UNIQUE,
        Nombre          NVARCHAR(150) NOT NULL,
        -- Hash SHA-256 (hex) del token del agente local; el token en claro nunca se guarda.
        TokenAgenteHash NVARCHAR(128) NULL,
        Activo          BIT           NOT NULL CONSTRAINT DF_Inquilino_Activo DEFAULT (1),
        Creado          DATETIME2(0)  NOT NULL CONSTRAINT DF_Inquilino_Creado DEFAULT SYSUTCDATETIME()
    );
END;
GO

-- Inquilino por defecto: la instalación existente queda como el inquilino 1.
IF NOT EXISTS (SELECT 1 FROM flujo.Inquilino WHERE Codigo = 'principal')
    INSERT INTO flujo.Inquilino (Codigo, Nombre) VALUES ('principal', 'Instalación principal');
GO

IF OBJECT_ID('flujo.SincronizacionEstado', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.SincronizacionEstado
    (
        SincronizacionEstadoId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SincronizacionEstado PRIMARY KEY,
        InquilinoId     INT           NOT NULL CONSTRAINT FK_SincEstado_Inquilino REFERENCES flujo.Inquilino(InquilinoId),
        CompaniaId      INT           NULL,
        Entidad         NVARCHAR(40)  NOT NULL,   -- pedidos | facturas | documentosPagar | ...
        UltimaSincronizacion DATETIME2(0) NULL,   -- UTC
        DuracionMs      INT           NULL,
        Registros       INT           NULL,
        Resultado       NVARCHAR(20)  NULL,       -- ok | error
        Mensaje         NVARCHAR(400) NULL,
        SolicitadaEn    DATETIME2(0)  NULL,       -- UTC, última solicitud bajo demanda pendiente
        SolicitadaPor   NVARCHAR(100) NULL
    );
    CREATE UNIQUE INDEX UX_SincEstado ON flujo.SincronizacionEstado (InquilinoId, CompaniaId, Entidad);
END;
GO
