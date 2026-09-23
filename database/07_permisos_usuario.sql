/* ===================================================================
   07_permisos_usuario.sql
   Permisos de visibilidad por usuario (RF-015). Ejecutar después de
   06_parametros_generales.sql. Es idempotente. La API también agrega
   estas columnas automáticamente al iniciar si faltan.
   =================================================================== */
USE FlujoEfectivo;
GO

IF COL_LENGTH('flujo.Usuario', 'VerBancos') IS NULL
    ALTER TABLE flujo.Usuario ADD VerBancos BIT NOT NULL
        CONSTRAINT DF_Usuario_VerBancos DEFAULT 1;
GO

IF COL_LENGTH('flujo.Usuario', 'VerConsolidado') IS NULL
    ALTER TABLE flujo.Usuario ADD VerConsolidado BIT NOT NULL
        CONSTRAINT DF_Usuario_VerConsolidado DEFAULT 1;
GO

IF COL_LENGTH('flujo.Usuario', 'VerErogaciones') IS NULL
    ALTER TABLE flujo.Usuario ADD VerErogaciones BIT NOT NULL
        CONSTRAINT DF_Usuario_VerErogaciones DEFAULT 1;
GO

IF COL_LENGTH('flujo.Usuario', 'VerProyeccion') IS NULL
    ALTER TABLE flujo.Usuario ADD VerProyeccion BIT NOT NULL
        CONSTRAINT DF_Usuario_VerProyeccion DEFAULT 1;
GO

IF COL_LENGTH('flujo.Usuario', 'VerCatalogos') IS NULL
    ALTER TABLE flujo.Usuario ADD VerCatalogos BIT NOT NULL
        CONSTRAINT DF_Usuario_VerCatalogos DEFAULT 1;
GO

IF COL_LENGTH('flujo.Usuario', 'EditarErogaciones') IS NULL
    ALTER TABLE flujo.Usuario ADD EditarErogaciones BIT NOT NULL
        CONSTRAINT DF_Usuario_EditarErogaciones DEFAULT 1;
GO

IF COL_LENGTH('flujo.Usuario', 'AsignarFacturaContrato') IS NULL
    ALTER TABLE flujo.Usuario ADD AsignarFacturaContrato BIT NOT NULL
        CONSTRAINT DF_Usuario_AsignarFacturaContrato DEFAULT 0;
GO

-- Permite trasladar manualmente al histórico los contratos del mes ya pagados.
IF COL_LENGTH('flujo.Usuario', 'TrasladarContratosHistorico') IS NULL
    ALTER TABLE flujo.Usuario ADD TrasladarContratosHistorico BIT NOT NULL
        CONSTRAINT DF_Usuario_TrasladarContratosHistorico DEFAULT 0;
GO

/* v1.37.4: privilegio para editar transferencias entre bancos (lo habilita un administrador). */
IF COL_LENGTH('flujo.Usuario', 'EditarTransferencias') IS NULL
    ALTER TABLE flujo.Usuario ADD EditarTransferencias BIT NOT NULL
        CONSTRAINT DF_Usuario_EditarTransferencias DEFAULT 0;
GO

GO
-- v1.37.8: permiso por usuario para ver el Tablero.
IF COL_LENGTH('flujo.Usuario', 'VerTablero') IS NULL
    ALTER TABLE flujo.Usuario ADD VerTablero BIT NOT NULL
        CONSTRAINT DF_Usuario_VerTablero DEFAULT 1;
GO

-- v1.37.9: privilegio por usuario para modificar catálogos (lo habilita un administrador).
IF COL_LENGTH('flujo.Usuario', 'EditarCatalogos') IS NULL
    ALTER TABLE flujo.Usuario ADD EditarCatalogos BIT NOT NULL
        CONSTRAINT DF_Usuario_EditarCatalogos DEFAULT 0;
GO
