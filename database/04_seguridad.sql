/* =====================================================================
   Sistema de Control de Flujo de Efectivo — Theronix / Aplix
   Script 4 de 4: usuarios de acceso y contraseñas iniciales
   Ejecutar DESPUÉS de 02_datos_iniciales.sql
   ---------------------------------------------------------------------
   Formato del hash (PBKDF2-SHA256, 120 000 iteraciones):
       pbkdf2:sha256:{iteraciones}:{saltBase64}:{hashBase64}
   La API .NET (FlujoEfectivo.Api) genera y valida exactamente este
   formato. Las contraseñas iniciales DEBEN cambiarse tras el primer
   ingreso desde la opción "Cambiar contraseña".
   ===================================================================== */

USE FlujoEfectivo;
GO

DECLARE @admin INT = (SELECT PerfilId FROM flujo.Perfil WHERE Codigo = 'administrador');
DECLARE @registro INT = (SELECT PerfilId FROM flujo.Perfil WHERE Codigo = 'registro');
DECLARE @consulta INT = (SELECT PerfilId FROM flujo.Perfil WHERE Codigo = 'consulta');

/* --- Usuario administrador: admin / Admin123*  --------------------- */
IF EXISTS (SELECT 1 FROM flujo.Usuario WHERE NombreUsuario = 'admin')
    UPDATE flujo.Usuario
       SET HashContrasena = 'pbkdf2:sha256:120000:ZEgdRoEdb4h0fesLwakzOg==:vUQyCMs4VF9J2MKrG9rrjnceCxqY+FjW5SmApMoHtFY=',
           PerfilId = @admin, Activo = 1
     WHERE NombreUsuario = 'admin';
ELSE
    INSERT INTO flujo.Usuario (NombreUsuario, NombreCompleto, CorreoElectronico, HashContrasena, PerfilId)
    VALUES ('admin', 'Administrador del sistema', 'admin@aplix.cr',
            'pbkdf2:sha256:120000:ZEgdRoEdb4h0fesLwakzOg==:vUQyCMs4VF9J2MKrG9rrjnceCxqY+FjW5SmApMoHtFY=', @admin);

/* --- Usuario de registro: registro / Registro123* ------------------ */
IF NOT EXISTS (SELECT 1 FROM flujo.Usuario WHERE NombreUsuario = 'registro')
    INSERT INTO flujo.Usuario (NombreUsuario, NombreCompleto, CorreoElectronico, HashContrasena, PerfilId)
    VALUES ('registro', 'Analista de registro', 'registro@aplix.cr',
            'pbkdf2:sha256:120000:MXtTSCMfn/nutCaN/mXuFg==:0bJTqLc4zQukfbU0f+YuxytafXgD3iFJu8G6d7WfcxM=', @registro);

/* --- Usuario de consulta: consulta / Consulta123* ------------------ */
IF NOT EXISTS (SELECT 1 FROM flujo.Usuario WHERE NombreUsuario = 'consulta')
    INSERT INTO flujo.Usuario (NombreUsuario, NombreCompleto, CorreoElectronico, HashContrasena, PerfilId)
    VALUES ('consulta', 'Gerencia (solo consulta)', 'gerencia@aplix.cr',
            'pbkdf2:sha256:120000:0TLmX9+3nTEWBL8ilAfBjg==:WpwGzP45dsj4I3IEixY3geIcXKVybT+cd3lm1BMNf/A=', @consulta);
GO

PRINT 'Usuarios de acceso configurados. Cambie las contraseñas iniciales.';
GO
