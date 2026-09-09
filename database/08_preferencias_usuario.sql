/* ===================================================================
   08_preferencias_usuario.sql
   Preferencias personales por usuario (filtros recordados). Ejecutar
   después de 07_permisos_usuario.sql. Es idempotente. La API también
   crea esta tabla automáticamente al iniciar si falta.
   =================================================================== */
USE FlujoEfectivo;
GO

IF OBJECT_ID('flujo.PreferenciaUsuario', 'U') IS NULL
    CREATE TABLE flujo.PreferenciaUsuario
    (
        UsuarioId   INT           NOT NULL,
        Clave       NVARCHAR(60)  NOT NULL,
        Valor       NVARCHAR(400) NOT NULL,
        Actualizado DATETIME2(0)  NOT NULL
            CONSTRAINT DF_PreferenciaUsuario_Actualizado DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_PreferenciaUsuario PRIMARY KEY (UsuarioId, Clave),
        CONSTRAINT FK_PreferenciaUsuario_Usuario FOREIGN KEY (UsuarioId)
            REFERENCES flujo.Usuario(UsuarioId) ON DELETE CASCADE
    );
GO
