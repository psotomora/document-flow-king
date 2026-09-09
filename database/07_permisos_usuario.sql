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
