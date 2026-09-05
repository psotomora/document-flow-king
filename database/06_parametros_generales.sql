/* ===================================================================
   06_parametros_generales.sql
   Parámetros generales del sistema (clave/valor) persistidos en base
   de datos. Ejecutar después de 05_parametros.sql. Es idempotente.
   La API también crea esta tabla automáticamente al iniciar si falta.
   =================================================================== */
USE FlujoEfectivo;
GO

IF OBJECT_ID('flujo.Parametro', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.Parametro
    (
        Clave        NVARCHAR(60)  NOT NULL CONSTRAINT PK_Parametro PRIMARY KEY,
        Valor        NVARCHAR(200) NOT NULL,
        Descripcion  NVARCHAR(200) NULL,
        Actualizado  DATETIME2(0)  NOT NULL CONSTRAINT DF_Parametro_Actualizado DEFAULT SYSUTCDATETIME(),
        UsuarioId    INT           NULL
    );
END
GO

/* Parámetro: usar pedidos de fuente externa (SoftlandERP). '1' = Sí, '0' = No */
IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'pedidosFuenteExterna')
    INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
    VALUES ('pedidosFuenteExterna', '0', 'Usar datos de pedidos de fuente externa (SoftlandERP)');
GO
