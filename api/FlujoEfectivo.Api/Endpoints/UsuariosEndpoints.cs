using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using FlujoEfectivo.Api.Seguridad;
using Microsoft.Data.SqlClient;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>Mantenimiento de usuarios (RF-015). Solo el perfil administrador.</summary>
public static class UsuariosEndpoints
{
    private static bool EsAdmin(HttpContext ctx) =>
        string.Equals(ctx.User.Perfil(), "administrador", StringComparison.OrdinalIgnoreCase);

    private static int? PerfilId(System.Data.IDbConnection cn, string codigo) =>
        cn.QueryFirstOrDefault<int?>("SELECT PerfilId FROM flujo.Perfil WHERE Codigo = @codigo",
            new { codigo });

    public static void MapUsuarios(this IEndpointRouteBuilder grupo)
    {
        var g = grupo.MapGroup("").RequireAuthorization();

        g.MapGet("/usuarios", (HttpContext ctx, Db db) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            using var cn = db.Abrir();
            return Results.Ok(cn.Query<UsuarioAdminDto>(Consultas.Lista));
        });

        g.MapPost("/usuarios", (NuevoUsuario datos, HttpContext ctx, Db db) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            if (string.IsNullOrWhiteSpace(datos.Nombre) || string.IsNullOrWhiteSpace(datos.NombreUsuario))
                return Results.BadRequest(new { mensaje = "Nombre y nombre de usuario son obligatorios." });
            if (!string.IsNullOrEmpty(datos.Contrasena) && datos.Contrasena.Length < 8)
                return Results.BadRequest(new { mensaje = "La contraseña debe tener al menos 8 caracteres." });

            using var cn = db.Abrir();
            var perfilId = PerfilId(cn, datos.Perfil);
            if (perfilId is null) return Results.BadRequest(new { mensaje = "Perfil no válido." });

            if (cn.QueryFirstOrDefault<int?>(
                    "SELECT UsuarioId FROM flujo.Usuario WHERE NombreUsuario = @n",
                    new { n = datos.NombreUsuario }) is not null)
                return Results.BadRequest(new { mensaje = "Ya existe un usuario con ese nombre de inicio de sesión." });

            var id = cn.QuerySingle<int>(
                """
                INSERT INTO flujo.Usuario
                    (NombreUsuario, NombreCompleto, CorreoElectronico, HashContrasena, PerfilId, Activo)
                OUTPUT INSERTED.UsuarioId
                VALUES (@NombreUsuario, @Nombre, @Correo, @Hash, @PerfilId, @Activo)
                """,
                new
                {
                    datos.NombreUsuario,
                    datos.Nombre,
                    Correo = string.IsNullOrWhiteSpace(datos.Correo) ? null : datos.Correo,
                    Hash = string.IsNullOrEmpty(datos.Contrasena) ? null : Contrasenas.Crear(datos.Contrasena),
                    PerfilId = perfilId,
                    Activo = datos.Activo,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Seguridad",
                datos.NombreUsuario, "Creación",
                valorNuevo: $"Perfil: {datos.Perfil}; Activo: {datos.Activo}");

            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/usuarios/{id}", (string id, CambioUsuario datos, HttpContext ctx, Db db) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            if (!int.TryParse(id, out var usuarioId))
                return Results.BadRequest(new { mensaje = "Identificador no válido." });
            if (!string.IsNullOrEmpty(datos.Contrasena) && datos.Contrasena.Length < 8)
                return Results.BadRequest(new { mensaje = "La contraseña debe tener al menos 8 caracteres." });

            using var cn = db.Abrir();
            var actual = cn.QueryFirstOrDefault<UsuarioAdminDto>(
                Consultas.Lista + " AND u.UsuarioId = @usuarioId", new { usuarioId });
            if (actual is null) return Results.NotFound(new { mensaje = "Usuario no encontrado." });

            int? perfilId = null;
            if (!string.IsNullOrWhiteSpace(datos.Perfil))
            {
                perfilId = PerfilId(cn, datos.Perfil);
                if (perfilId is null) return Results.BadRequest(new { mensaje = "Perfil no válido." });
            }

            // Evita dejar el sistema sin administradores activos.
            var quedaSinAdmin =
                (datos.Activo == false || (perfilId is not null && datos.Perfil != "administrador"))
                && actual.Perfil == "administrador"
                && cn.QuerySingle<int>(
                    """
                    SELECT COUNT(*) FROM flujo.Usuario u
                    INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
                    WHERE p.Codigo = 'administrador' AND u.Activo = 1 AND u.UsuarioId <> @usuarioId
                    """, new { usuarioId }) == 0;
            if (quedaSinAdmin)
                return Results.BadRequest(new { mensaje = "Debe existir al menos un administrador activo." });

            cn.Execute(
                """
                UPDATE flujo.Usuario SET
                    NombreCompleto    = ISNULL(@Nombre, NombreCompleto),
                    NombreUsuario     = ISNULL(@NombreUsuario, NombreUsuario),
                    CorreoElectronico = CASE WHEN @Correo IS NULL THEN CorreoElectronico ELSE NULLIF(@Correo, '') END,
                    PerfilId          = ISNULL(@PerfilId, PerfilId),
                    Activo            = ISNULL(@Activo, Activo),
                    HashContrasena    = ISNULL(@Hash, HashContrasena)
                WHERE UsuarioId = @usuarioId
                """,
                new
                {
                    datos.Nombre,
                    datos.NombreUsuario,
                    datos.Correo,
                    PerfilId = perfilId,
                    datos.Activo,
                    Hash = string.IsNullOrEmpty(datos.Contrasena) ? null : Contrasenas.Crear(datos.Contrasena),
                    usuarioId,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Seguridad",
                actual.NombreUsuario, "Modificación",
                valorAnterior: $"Perfil: {actual.Perfil}; Activo: {actual.Activo}",
                valorNuevo: $"Perfil: {datos.Perfil ?? actual.Perfil}; Activo: {datos.Activo ?? actual.Activo}");

            return Results.Ok(new { mensaje = "Usuario actualizado." });
        });

        g.MapDelete("/usuarios/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            if (!int.TryParse(id, out var usuarioId))
                return Results.BadRequest(new { mensaje = "Identificador no válido." });
            if (usuarioId == ctx.User.UsuarioId())
                return Results.BadRequest(new { mensaje = "No puede eliminar el usuario de la sesión activa." });

            using var cn = db.Abrir();
            var actual = cn.QueryFirstOrDefault<UsuarioAdminDto>(
                Consultas.Lista + " AND u.UsuarioId = @usuarioId", new { usuarioId });
            if (actual is null) return Results.NotFound(new { mensaje = "Usuario no encontrado." });

            var referencias = cn.QuerySingle<int>(
                """
                SELECT (SELECT COUNT(*) FROM flujo.TipoCambio WHERE UsuarioId = @usuarioId)
                     + (SELECT COUNT(*) FROM flujo.Bitacora   WHERE UsuarioId = @usuarioId)
                """, new { usuarioId });
            if (referencias > 0)
                return Results.BadRequest(new
                {
                    mensaje = "No se puede eliminar: el usuario tiene movimientos o bitácora asociados. Inactívelo en su lugar.",
                });

            try
            {
                cn.Execute("DELETE FROM flujo.Usuario WHERE UsuarioId = @usuarioId", new { usuarioId });
            }
            catch (SqlException ex) when (ex.Number is 547)
            {
                return Results.BadRequest(new
                {
                    mensaje = "No se puede eliminar: existen registros que dependen de este usuario. Inactívelo en su lugar.",
                });
            }

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Seguridad",
                actual.NombreUsuario, "Eliminación", valorAnterior: $"Perfil: {actual.Perfil}");

            return Results.Ok(new { mensaje = "Usuario eliminado." });
        });
    }

    private static class Consultas
    {
        public const string Lista =
            """
            SELECT CAST(u.UsuarioId AS NVARCHAR(20)) AS Id, u.NombreCompleto AS Nombre,
                   u.NombreUsuario, u.CorreoElectronico AS Correo, p.Codigo AS Perfil, u.Activo
            FROM flujo.Usuario u
            INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
            WHERE 1 = 1
            """;
    }
}
