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

        grupo.MapPost("/auth/recuperar", (RecuperarRequest datos, Db db, IConfiguration config) =>
        {
            var nombre = (datos.Usuario ?? "").Trim();
            if (nombre.Length == 0)
                return Results.BadRequest(new { mensaje = "Indique el nombre de usuario." });

            using var cn = db.Abrir();
            var fila = cn.QueryFirstOrDefault<FilaRecuperacion>(
                """
                SELECT UsuarioId, NombreCompleto, CorreoElectronico, Activo
                FROM flujo.Usuario WHERE NombreUsuario = @nombre
                """,
                new { nombre });

            if (fila is null || !fila.Activo)
                return Results.BadRequest(new { mensaje = "No existe un usuario activo con ese nombre." });
            if (string.IsNullOrWhiteSpace(fila.CorreoElectronico))
                return Results.BadRequest(new
                {
                    mensaje = "El usuario no tiene un correo registrado. Solicite al administrador que lo actualice en Acceso y le asigne una nueva contraseña.",
                });

            var cfg = Correo.Leer(cn);
            if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                return Results.BadRequest(new
                {
                    mensaje = "Falta configurar el servidor de correo en Parámetros → Servidor de correo. Mientras tanto, un administrador puede asignarle una nueva contraseña desde Acceso.",
                });

            // Contraseña temporal de un solo uso: el usuario debe cambiarla al ingresar.
            var temporal = GenerarTemporal();
            var hashTemporal = Contrasenas.Crear(temporal);

            var cuerpo =
                $"<p>Estimado(a) <strong>{System.Net.WebUtility.HtmlEncode(fila.NombreCompleto)}</strong>,</p>" +
                "<p>Recibimos una solicitud para recuperar la contraseña de su usuario " +
                $"<strong>{System.Net.WebUtility.HtmlEncode(nombre)}</strong> en el sistema Control de Flujo de Efectivo.</p>" +
                $"<p>Su contraseña temporal es: <strong style=\"font-size:16px\">{temporal}</strong></p>" +
                "<p>Ingrese con ella y cámbiela de inmediato desde la opción «Cambiar contraseña». " +
                "Si usted no solicitó este cambio, avise al administrador del sistema.</p>" +
                "<p>Cordialmente,<br/><strong>Administración Aplix</strong></p>";

            var (ok, mensaje) = Correo.Enviar(cfg, config["Jwt:Llave"] ?? "",
                fila.CorreoElectronico.Trim(), "Recuperación de contraseña — Flujo de Efectivo", cuerpo);
            if (!ok)
                return Results.BadRequest(new { mensaje });

            // Si SMTP falla, la contraseña actual debe seguir funcionando.
            cn.Execute("UPDATE flujo.Usuario SET HashContrasena = @hash WHERE UsuarioId = @id",
                new { hash = hashTemporal, id = fila.UsuarioId });

            Db.Auditar(cn, fila.UsuarioId, fila.NombreCompleto, "Seguridad", nombre, "Modificación",
                valorNuevo: "Recuperación de contraseña: se envió una contraseña temporal al correo registrado");

            return Results.Ok(new { mensaje = "Se envió una contraseña temporal al correo registrado. Revise su bandeja de entrada y la carpeta de correo no deseado." });
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
    public record RecuperarRequest(string Usuario);

    public sealed class FilaRecuperacion
    {
        public int UsuarioId { get; set; }
        public string NombreCompleto { get; set; } = "";
        public string? CorreoElectronico { get; set; }
        public bool Activo { get; set; }
    }

    /// <summary>Contraseña temporal legible: 10 caracteres sin ambiguos (0/O, 1/l/I).</summary>
    private static string GenerarTemporal()
    {
        const string letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
        const string digitos = "23456789";
        var chars = new char[10];
        for (var i = 0; i < 8; i++)
            chars[i] = letras[System.Security.Cryptography.RandomNumberGenerator.GetInt32(letras.Length)];
        chars[8] = digitos[System.Security.Cryptography.RandomNumberGenerator.GetInt32(digitos.Length)];
        chars[9] = digitos[System.Security.Cryptography.RandomNumberGenerator.GetInt32(digitos.Length)];
        return new string(chars);
    }
}
