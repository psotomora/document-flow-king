using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

public static class AuthEndpoints
{
    public sealed class FilaUsuario
    {
        public int UsuarioId { get; set; }
        public string NombreCompleto { get; set; } = "";
        public string Perfil { get; set; } = "";
        public string? HashContrasena { get; set; }
        public bool Activo { get; set; }
    }

    public static void MapAuth(this IEndpointRouteBuilder grupo)
    {
        grupo.MapPost("/auth/login", (LoginRequest datos, Db db, TokenServicio tokens) =>
        {
            using var cn = db.Abrir();
            var fila = cn.QueryFirstOrDefault<FilaUsuario>(
                """
                SELECT u.UsuarioId, u.NombreCompleto, p.Codigo AS Perfil, u.HashContrasena, u.Activo
                FROM flujo.Usuario u
                INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
                WHERE u.NombreUsuario = @usuario
                """,
                new { usuario = datos.Usuario });

            if (fila is null || !fila.Activo || !Contrasenas.Verificar(datos.Contrasena, fila.HashContrasena))
                return Results.Json(new { mensaje = "Usuario o contraseña incorrectos." }, statusCode: 401);

            var usuario = new UsuarioDto(fila.UsuarioId.ToString(), fila.NombreCompleto, fila.Perfil);
            var (token, expira) = tokens.Crear(usuario);

            Db.Auditar(cn, fila.UsuarioId, fila.NombreCompleto, "Seguridad", datos.Usuario, "Acceso",
                valorNuevo: "Inicio de sesión");

            return Results.Ok(new LoginResponse(token, usuario, expira));
        }).AllowAnonymous();

        grupo.MapGet("/auth/yo", (HttpContext ctx) => Results.Ok(new UsuarioDto(
            ctx.User.UsuarioId().ToString(),
            ctx.User.NombreUsuario(),
            ctx.User.Perfil()))).RequireAuthorization();

        grupo.MapPost("/auth/cambiar-contrasena",
            (CambioContrasena datos, HttpContext ctx, Db db) =>
        {
            if (datos.Nueva.Length < 8)
                return Results.BadRequest(new { mensaje = "La nueva contraseña debe tener al menos 8 caracteres." });

            using var cn = db.Abrir();
            var id = ctx.User.UsuarioId();
            var hashActual = cn.QueryFirstOrDefault<string?>(
                "SELECT HashContrasena FROM flujo.Usuario WHERE UsuarioId = @id", new { id });

            if (!Contrasenas.Verificar(datos.Actual, hashActual))
                return Results.BadRequest(new { mensaje = "La contraseña actual no es correcta." });

            cn.Execute("UPDATE flujo.Usuario SET HashContrasena = @hash WHERE UsuarioId = @id",
                new { hash = Contrasenas.Crear(datos.Nueva), id });

            Db.Auditar(cn, id, ctx.User.NombreUsuario(), "Seguridad", "Contraseña", "Modificación");
            return Results.Ok(new { mensaje = "Contraseña actualizada." });
        }).RequireAuthorization();
    }

    public record CambioContrasena(string Actual, string Nueva);
}
