/* ============================================================================
   13_correo_smtp.sql
   Configuración del servidor SMTP usado para enviar estados de cuenta.
   La contraseña se guarda cifrada por la API (misma llave que SoftlandERP).
   ========================================================================== */

IF OBJECT_ID('flujo.ConfiguracionCorreo', 'U') IS NULL
BEGIN
    CREATE TABLE flujo.ConfiguracionCorreo
    (
        Id              INT           NOT NULL CONSTRAINT PK_ConfiguracionCorreo PRIMARY KEY,
        Servidor        NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Servidor DEFAULT '',
        Puerto          INT           NOT NULL CONSTRAINT DF_Correo_Puerto DEFAULT (587),
        Ssl             BIT           NOT NULL CONSTRAINT DF_Correo_Ssl DEFAULT (1),
        Usuario         NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Usuario DEFAULT '',
        ClaveCifrada    NVARCHAR(400) NOT NULL CONSTRAINT DF_Correo_Clave DEFAULT '',
        Remitente       NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Remitente DEFAULT '',
        NombreRemitente NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Nombre DEFAULT '',
        CopiaOculta     NVARCHAR(400) NOT NULL CONSTRAINT DF_Correo_Bcc DEFAULT '',
        Actualizado     DATETIME2(0)  NOT NULL CONSTRAINT DF_Correo_Actualizado DEFAULT SYSUTCDATETIME(),
        UsuarioId       INT           NULL
    );
END
GO
