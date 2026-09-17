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

    /// <summary>Código reservado para el personal de Aplix (administración de clientes).</summary>
    public const string CodigoAplix = "APLIX";

    public static void MapAuth(this IEndpointRouteBuilder grupo)
    {
        grupo.MapPost("/auth/login", async (LoginRequest datos, Db db, Catalogo catalogo, TokenServicio tokens) =>
        {
            // Mensaje único para cualquier fallo: nunca revela si un código de
            // empresa existe, ni qué empresas están registradas.
            static async Task<IResult> Rechazar()
            {
                await Task.Delay(400);
                return Results.Json(new { mensaje = "Datos de acceso incorrectos." }, statusCode: 401);
            }

            var codigo = (datos.ClienteCodigo ?? "").Trim();

            // Personal de Aplix: usuarios propios del catálogo, sin acceso a datos de clientes.
            if (codigo.Equals(CodigoAplix, StringComparison.OrdinalIgnoreCase))
            {
                using var cnCat = catalogo.AbrirCatalogo();
                var aplix = cnCat.QueryFirstOrDefault<FilaUsuario>(
                    """
                    SELECT UsuarioId, NombreCompleto, 'superadmin' AS Perfil, HashContrasena, Activo
                    FROM catalogo.UsuarioAplix WHERE NombreUsuario = @usuario
                    """, new { usuario = datos.Usuario });
                if (aplix is null || !aplix.Activo
                    || !Contrasenas.Verificar(datos.Contrasena, aplix.HashContrasena))
                    return await Rechazar();

                var superUsuario = new UsuarioDto(aplix.UsuarioId.ToString(), aplix.NombreCompleto, "superadmin");
                var (tokenSuper, expiraSuper) = tokens.Crear(superUsuario, 0, "Aplix");
                Catalogo.Auditar(cnCat, datos.Usuario, "Acceso", "Consola Aplix");
                return Results.Ok(new LoginResponse(tokenSuper, superUsuario, expiraSuper, "Aplix"));
            }

            ClienteTenant? cliente = null;
            if (codigo.Length > 0)
            {
                cliente = catalogo.PorCodigo(codigo);
                if (cliente is null || !cliente.Activo) return await Rechazar();
            }

            using var cn = cliente is null ? db.Abrir() : catalogo.Abrir(cliente);
            var fila = cn.QueryFirstOrDefault<FilaUsuario>(
                """
                SELECT u.UsuarioId, u.NombreCompleto, p.Codigo AS Perfil, u.HashContrasena, u.Activo
                FROM flujo.Usuario u
                INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
                WHERE u.NombreUsuario = @usuario
                """,
                new { usuario = datos.Usuario });

            if (fila is null || !fila.Activo || !Contrasenas.Verificar(datos.Contrasena, fila.HashContrasena))
                return await Rechazar();

            var usuario = new UsuarioDto(fila.UsuarioId.ToString(), fila.NombreCompleto, fila.Perfil);
            var (token, expira) = tokens.Crear(usuario, cliente?.ClienteId ?? 0, cliente?.Nombre);

            Db.Auditar(cn, fila.UsuarioId, fila.NombreCompleto, "Seguridad", datos.Usuario, "Acceso",
                valorNuevo: "Inicio de sesión");

            return Results.Ok(new LoginResponse(token, usuario, expira, cliente?.Nombre));
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
