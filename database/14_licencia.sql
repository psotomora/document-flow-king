/* ===================================================================
   14_licencia.sql
   Licenciamiento: licencia instalada y (solo en el servidor emisor)
   historial de licencias emitidas. Es idempotente. La API también crea
   estas tablas al iniciar si el usuario tiene permisos para hacerlo.
   =================================================================== */
USE FlujoEfectivo;
GO

IF OBJECT_ID('flujo.Licencia', 'U') IS NULL
    CREATE TABLE flujo.Licencia
    (
        Id            INT            NOT NULL CONSTRAINT PK_Licencia PRIMARY KEY,
        Archivo       NVARCHAR(MAX)  NOT NULL,
        ClienteNombre NVARCHAR(200)  NOT NULL CONSTRAINT DF_Licencia_Cliente DEFAULT '',
        Serie         NVARCHAR(60)   NOT NULL CONSTRAINT DF_Licencia_Serie DEFAULT '',
        Vence         DATE           NULL,
        CargadaEn     DATETIME2(0)   NOT NULL CONSTRAINT DF_Licencia_Cargada DEFAULT SYSUTCDATETIME(),
        UsuarioId     INT            NULL
    );
GO

IF OBJECT_ID('flujo.LicenciaEmitida', 'U') IS NULL
    CREATE TABLE flujo.LicenciaEmitida
    (
        LicenciaEmitidaId INT IDENTITY(1,1) CONSTRAINT PK_LicenciaEmitida PRIMARY KEY,
        Serie             NVARCHAR(60)  NOT NULL,
        Producto          NVARCHAR(60)  NOT NULL,
        ClienteCodigo     NVARCHAR(60)  NOT NULL,
        ClienteNombre     NVARCHAR(200) NOT NULL,
        Huella            NVARCHAR(80)  NOT NULL,
        Companias         NVARCHAR(400) NOT NULL CONSTRAINT DF_LicEmitida_Comp DEFAULT '',
        MaxUsuarios       INT           NOT NULL CONSTRAINT DF_LicEmitida_Max DEFAULT (0),
        Vence             DATE          NOT NULL,
        DiasGracia        INT           NOT NULL CONSTRAINT DF_LicEmitida_Gracia DEFAULT (15),
        Notas             NVARCHAR(400) NULL,
        Archivo           NVARCHAR(MAX) NOT NULL,
        EmitidaEn         DATETIME2(0)  NOT NULL CONSTRAINT DF_LicEmitida_Fecha DEFAULT SYSUTCDATETIME(),
        EmitidaPor        NVARCHAR(120) NOT NULL CONSTRAINT DF_LicEmitida_Por DEFAULT ''
    );
GO

IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'licenciaRequerida')
    INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
    VALUES ('licenciaRequerida', '0', 'Exigir un archivo de licencia válido para usar el sistema');
GO

PRINT 'Licenciamiento configurado.';
GO
