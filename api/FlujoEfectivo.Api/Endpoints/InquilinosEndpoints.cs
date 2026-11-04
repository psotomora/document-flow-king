using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>Fase 5: administración de empresas (inquilinos) por el Súper Administrador
/// y consulta del cupo de usuarios de la empresa propia.</summary>
public static class InquilinosEndpoints
{
    public sealed class InquilinoDto
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = "";
        public string Nombre { get; set; } = "";
        public string? Contacto { get; set; }
        public string? Correo { get; set; }
        public bool Activo { get; set; }
        public int? MaxUsuarios { get; set; }
        public DateTime? FechaVencimiento { get; set; }
        public int UsuariosActivos { get; set; }
        public bool TokenConfigurado { get; set; }
        public DateTime? UltimoLatido { get; set; }
        public bool AgenteEnLinea { get; set; }
        public bool EsPrincipal { get; set; }
        public DateTime Creado { get; set; }
    }

    public sealed record DatosInquilino(
        string? Codigo, string? Nombre, string? Contacto, string? Correo,
        int? MaxUsuarios, DateTime? FechaVencimiento, bool? Activo, bool? SinCupo);

    public sealed record NuevoAdministrador(string Nombre, string NombreUsuario, string? Correo, string Contrasena);

    public sealed record ValorSuper(bool Valor);

    private static string Faltante => "Falta ejecutar el script 23_saas_multi_inquilino.sql.";

    private static Saas.ContextoUsuario? Super(HttpContext ctx, System.Data.IDbConnection cn)
    {
        var c = Saas.Contexto(cn, ctx.User.UsuarioId());
        return c is { SuperAdministrador: true } && ctx.User.EsAdministrador() ? c : null;
    }

    private const string Lista =
        """
        SELECT i.InquilinoId AS Id, i.Codigo, i.Nombre, i.Contacto, i.Correo, i.Activo, i.MaxUsuarios,
               i.FechaVencimiento, i.Creado,
               (SELECT COUNT(1) FROM flujo.Usuario u WHERE u.InquilinoId = i.InquilinoId AND u.Activo = 1) AS UsuariosActivos,
               CAST(CASE WHEN i.TokenAgenteHash IS NULL THEN 0 ELSE 1 END AS BIT) AS TokenConfigurado,
               a.UltimoLatido
        FROM flujo.Inquilino i
        LEFT JOIN flujo.AgenteEstado a ON a.InquilinoId = i.InquilinoId
        """;

    private static InquilinoDto Completar(InquilinoDto d)
    {
        d.EsPrincipal = string.Equals(d.Codigo, "principal", StringComparison.OrdinalIgnoreCase);
        d.AgenteEnLinea = d.UltimoLatido is { } u
            && DateTime.UtcNow - DateTime.SpecifyKind(u, DateTimeKind.Utc) < TimeSpan.FromMinutes(AgenteEndpoints.MinutosEnLinea);
        return d;
    }

    public static void MapInquilinos(this IEndpointRouteBuilder grupo)
    {
        var g = grupo.MapGroup("").RequireAuthorization();

        // Contexto de la sesión: empresa, cupo y si es Súper Administrador.
        g.MapGet("/inquilinos/sesion", (HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            var c = Saas.Contexto(cn, ctx.User.UsuarioId());
            if (c is null) return Results.Ok(new { disponible = false, superAdministrador = false });
            return Results.Ok(new
            {
                disponible = true,
                superAdministrador = c.SuperAdministrador && ctx.User.EsAdministrador(),
                inquilino = new { id = c.InquilinoId, c.Codigo, c.Nombre, c.FechaVencimiento },
                maxUsuarios = c.MaxUsuarios,
                usuariosActivos = Saas.Activos(cn, c.InquilinoId, null),
            });
        });

        g.MapGet("/inquilinos/usuarios/{id:int}/super-administrador", (int id, HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            if (!Saas.Listo(cn)) return Results.BadRequest(new { mensaje = Faltante });
            if (Super(ctx, cn) is null) return Results.Forbid();
            var v = cn.QueryFirstOrDefault<bool?>("SELECT SuperAdministrador FROM flujo.Usuario WHERE UsuarioId = @id", new { id });
            return v is null ? Results.NotFound(new { mensaje = "Usuario no encontrado." }) : Results.Ok(new { valor = v.Value });
        });

        g.MapPut("/inquilinos/usuarios/{id:int}/super-administrador", (int id, ValorSuper d, HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            if (!Saas.Listo(cn)) return Results.BadRequest(new { mensaje = Faltante });
            if (Super(ctx, cn) is null) return Results.Forbid();
            if (!d.Valor && id == ctx.User.UsuarioId())
                return Results.BadRequest(new { mensaje = "No puede retirarse a sí mismo el rol de Súper Administrador." });
            var u = cn.QueryFirstOrDefault<(string NombreUsuario, string Perfil)?>(
                """
                SELECT u.NombreUsuario, p.Codigo FROM flujo.Usuario u
                INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId WHERE u.UsuarioId = @id
                """, new { id });
            if (u is null) return Results.NotFound(new { mensaje = "Usuario no encontrado." });
            if (d.Valor && !string.Equals(u.Value.Perfil, "administrador", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { mensaje = "Primero asigne el perfil Administrador al usuario." });
            cn.Execute("UPDATE flujo.Usuario SET SuperAdministrador = @v WHERE UsuarioId = @id", new { v = d.Valor, id });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Usuarios", u.Value.NombreUsuario,
                "Modificación", valorNuevo: d.Valor ? "Asignar Súper Administrador" : "Retirar Súper Administrador");
            return Results.Ok(new { valor = d.Valor });
        });

        g.MapGet("/inquilinos", (HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            if (!Saas.Listo(cn)) return Results.BadRequest(new { mensaje = Faltante });
            if (Super(ctx, cn) is null) return Results.Forbid();
            var filas = cn.Query<InquilinoDto>(Lista + " ORDER BY CASE WHEN i.Codigo = 'principal' THEN 0 ELSE 1 END, i.Nombre")
                .Select(Completar).ToList();
            return Results.Ok(filas);
        });

        g.MapPost("/inquilinos", (DatosInquilino d, HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            if (!Saas.Listo(cn)) return Results.BadRequest(new { mensaje = Faltante });
            if (Super(ctx, cn) is null) return Results.Forbid();

            var codigo = (d.Codigo ?? "").Trim().ToLowerInvariant();
            var nombre = (d.Nombre ?? "").Trim();
            if (!Regex.IsMatch(codigo, "^[a-z0-9][a-z0-9-]{1,38}$"))
                return Results.BadRequest(new { mensaje = "El código debe tener de 2 a 40 letras minúsculas, números o guiones." });
            if (nombre.Length == 0) return Results.BadRequest(new { mensaje = "Indique el nombre de la empresa." });
            if (d.MaxUsuarios is < 1) return Results.BadRequest(new { mensaje = "El cupo de usuarios debe ser al menos 1." });
            if (cn.ExecuteScalar<int>("SELECT COUNT(1) FROM flujo.Inquilino WHERE Codigo = @codigo", new { codigo }) > 0)
                return Results.BadRequest(new { mensaje = "Ya existe una empresa con ese código." });

            var id = cn.QuerySingle<int>(
                """
                INSERT INTO flujo.Inquilino (Codigo, Nombre, Contacto, Correo, MaxUsuarios, FechaVencimiento, Activo)
                OUTPUT INSERTED.InquilinoId
                VALUES (@codigo, @nombre, @Contacto, @Correo, @max, @FechaVencimiento, ISNULL(@Activo, 1))
                """,
                new { codigo, nombre, d.Contacto, d.Correo, max = d.MaxUsuarios ?? 5, d.FechaVencimiento, d.Activo });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Empresas", codigo, "Creación",
                valorNuevo: $"Nombre: {nombre}; Cupo: {d.MaxUsuarios ?? 5}; Vence: {d.FechaVencimiento:yyyy-MM-dd}");
            return Results.Ok(new { id });
        });

        g.MapPut("/inquilinos/{id:int}", (int id, DatosInquilino d, HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            if (!Saas.Listo(cn)) return Results.BadRequest(new { mensaje = Faltante });
            if (Super(ctx, cn) is null) return Results.Forbid();
            var actual = cn.QueryFirstOrDefault<InquilinoDto>(Lista + " WHERE i.InquilinoId = @id", new { id });
            if (actual is null) return Results.NotFound(new { mensaje = "Empresa no encontrada." });
            Completar(actual);

            if (actual.EsPrincipal && d.Activo == false)
                return Results.BadRequest(new { mensaje = "La instalación principal no se puede suspender." });
            if (d.MaxUsuarios is < 1) return Results.BadRequest(new { mensaje = "El cupo de usuarios debe ser al menos 1." });
            var nombre = d.Nombre?.Trim();
            if (nombre is { Length: 0 }) return Results.BadRequest(new { mensaje = "Indique el nombre de la empresa." });

            // SinCupo = true deja la empresa sin límite propio (solo aplica la licencia .lic).
            int? max = d.SinCupo == true ? null : d.MaxUsuarios ?? actual.MaxUsuarios;
            cn.Execute(
                """
                UPDATE flujo.Inquilino SET
                    Nombre = ISNULL(@nombre, Nombre),
                    Contacto = @Contacto, Correo = @Correo,
                    MaxUsuarios = @max, FechaVencimiento = @FechaVencimiento,
                    Activo = ISNULL(@Activo, Activo)
                WHERE InquilinoId = @id
                """,
                new { id, nombre, d.Contacto, d.Correo, max, d.FechaVencimiento, d.Activo });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Empresas", actual.Codigo, "Modificación",
                valorAnterior: $"Cupo: {actual.MaxUsuarios?.ToString() ?? "sin límite"}; Vence: {actual.FechaVencimiento:yyyy-MM-dd}; Activo: {actual.Activo}",
                valorNuevo: $"Cupo: {max?.ToString() ?? "sin límite"}; Vence: {d.FechaVencimiento:yyyy-MM-dd}; Activo: {d.Activo ?? actual.Activo}");
            return Results.Ok(new { mensaje = "Empresa actualizada." });
        });

        // Token del agente de la empresa: se muestra una sola vez; se guarda su hash.
        g.MapPost("/inquilinos/{id:int}/token-agente", (int id, HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            if (!Saas.Listo(cn)) return Results.BadRequest(new { mensaje = Faltante });
            if (Super(ctx, cn) is null) return Results.Forbid();
            var codigo = cn.QueryFirstOrDefault<string>("SELECT Codigo FROM flujo.Inquilino WHERE InquilinoId = @id", new { id });
            if (codigo is null) return Results.NotFound(new { mensaje = "Empresa no encontrada." });
            var token = "agt_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
            using var tx = cn.BeginTransaction();
            cn.Execute("UPDATE flujo.Inquilino SET TokenAgenteHash = @hash WHERE InquilinoId = @id",
                new { id, hash = AgenteEndpoints.Hash(token) }, tx);
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Empresas", codigo, "Modificación",
                valorNuevo: "Token de agente: se generó un token nuevo; el anterior quedó invalidado.", tx: tx);
            tx.Commit();
            return Results.Ok(new { token });
        });

        // Primer administrador de una empresa, respetando su cupo.
        g.MapPost("/inquilinos/{id:int}/administrador", (int id, NuevoAdministrador d, HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();
            if (!Saas.Listo(cn)) return Results.BadRequest(new { mensaje = Faltante });
            if (Super(ctx, cn) is null) return Results.Forbid();
            var inq = cn.QueryFirstOrDefault<InquilinoDto>(Lista + " WHERE i.InquilinoId = @id", new { id });
            if (inq is null) return Results.NotFound(new { mensaje = "Empresa no encontrada." });
            if (string.IsNullOrWhiteSpace(d.Nombre) || string.IsNullOrWhiteSpace(d.NombreUsuario))
                return Results.BadRequest(new { mensaje = "Nombre y nombre de usuario son obligatorios." });
            if (string.IsNullOrEmpty(d.Contrasena) || d.Contrasena.Length < 8)
                return Results.BadRequest(new { mensaje = "La contraseña debe tener al menos 8 caracteres." });
            var cupo = Saas.CupoExcedido(inq.MaxUsuarios, inq.UsuariosActivos);
            if (cupo is not null) return Results.BadRequest(new { mensaje = cupo });
            if (cn.ExecuteScalar<int>("SELECT COUNT(1) FROM flujo.Usuario WHERE NombreUsuario = @n", new { n = d.NombreUsuario.Trim() }) > 0)
                return Results.BadRequest(new { mensaje = "Ya existe un usuario con ese nombre de inicio de sesión." });

            cn.Execute(
                """
                INSERT INTO flujo.Usuario (NombreUsuario, NombreCompleto, CorreoElectronico, HashContrasena, PerfilId, Activo, InquilinoId)
                SELECT @usuario, @nombre, @correo, @hash, PerfilId, 1, @id FROM flujo.Perfil WHERE Codigo = 'administrador'
                """,
                new
                {
                    id,
                    usuario = d.NombreUsuario.Trim(),
                    nombre = d.Nombre.Trim(),
                    correo = string.IsNullOrWhiteSpace(d.Correo) ? null : d.Correo.Trim(),
                    hash = Contrasenas.Crear(d.Contrasena),
                });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Empresas", inq.Codigo, "Creación",
                valorNuevo: $"Usuario: {d.NombreUsuario.Trim()}");
            return Results.Ok(new { mensaje = "Administrador creado." });
        });
    }
}
