/* ---------------------------------------------------------------
   Habilita el acceso con el código de empresa APLIX.

   Copia los administradores activos de la base principal
   (FlujoEfectivo) al catálogo, conservando su misma contraseña.
   Se puede ejecutar varias veces sin riesgo.

   Ajuste el nombre de la base principal si es distinto.
   --------------------------------------------------------------- */
USE FlujoEfectivoCatalogo;
GO

INSERT INTO catalogo.UsuarioAplix (NombreUsuario, NombreCompleto, HashContrasena)
SELECT u.NombreUsuario, u.NombreCompleto, u.HashContrasena
FROM FlujoEfectivo.flujo.Usuario u
INNER JOIN FlujoEfectivo.flujo.Perfil p ON p.PerfilId = u.PerfilId
WHERE u.Activo = 1
  AND p.Codigo = 'administrador'
  AND u.HashContrasena IS NOT NULL
  AND LEN(u.HashContrasena) > 0
  AND NOT EXISTS (SELECT 1 FROM catalogo.UsuarioAplix a WHERE a.NombreUsuario = u.NombreUsuario);
GO

SELECT NombreUsuario, NombreCompleto, Activo FROM catalogo.UsuarioAplix;
GO
