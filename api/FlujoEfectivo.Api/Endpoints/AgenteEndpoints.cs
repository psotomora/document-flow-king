using System.Security.Cryptography;
using System.Text;
using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>Fase 2 SaaS: canal del agente local. El agente solo hace llamadas salientes HTTPS
/// autenticadas con x-agent-token; la nube nunca abre conexiones hacia el SQL Server del cliente.</summary>
public static class AgenteEndpoints
{
    /// <summary>Sin latido en este lapso, el agente se considera desconectado.</summary>
    public const int MinutosEnLinea = 3;

    public sealed class Latido
    {
        public string? Version { get; set; }
        public string? Equipo { get; set; }
    }

    public sealed class Diagnostico
    {
        public bool Ok { get; set; }
        public int? LatenciaMs { get; set; }
        public string? VersionSql { get; set; }
        public string? Mensaje { get; set; }
    }

    public sealed class EstadoAgenteDto
    {
        public bool TokenConfigurado { get; set; }
        public DateTime? UltimoLatido { get; set; }
        public string? VersionAgente { get; set; }
        public string? Equipo { get; set; }
        public DateTime? UltimoDiagnostico { get; set; }
        public bool? SoftlandOk { get; set; }
        public int? SoftlandLatenciaMs { get; set; }
        public string? SoftlandVersionSql { get; set; }
        public string? SoftlandMensaje { get; set; }
        public bool EnLinea { get; set; }
        public int MinutosEnLinea { get; set; } = AgenteEndpoints.MinutosEnLinea;
    }

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static string? Recortar(string? s, int max) =>
        string.IsNullOrWhiteSpace(s) ? null : (s.Length > max ? s[..max] : s);

    private static bool TablasListas(System.Data.IDbConnection cn) =>
        cn.ExecuteScalar<int>(
            "SELECT CASE WHEN OBJECT_ID('flujo.Inquilino','U') IS NOT NULL AND OBJECT_ID('flujo.AgenteEstado','U') IS NOT NULL THEN 1 ELSE 0 END") == 1;

    /// <summary>Devuelve el inquilino del token, o null si el token no es válido.</summary>
    public static int? Autenticar(HttpContext ctx, System.Data.IDbConnection cn)
    {
        var token = ctx.Request.Headers["x-agent-token"].ToString();
        if (string.IsNullOrWhiteSpace(token) || token.Length < 20) return null;
        var hash = Hash(token.Trim());
        var candidatos = cn.Query<(int Id, string Hash)>(
            "SELECT InquilinoId, TokenAgenteHash FROM flujo.Inquilino WHERE Activo = 1 AND TokenAgenteHash IS NOT NULL");
        foreach (var c in candidatos)
            if (CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(c.Hash), Encoding.ASCII.GetBytes(hash)))
                return c.Id;
        return null;
    }

    private const string Asegurar =
        "IF NOT EXISTS (SELECT 1 FROM flujo.AgenteEstado WHERE InquilinoId = @id) INSERT INTO flujo.AgenteEstado (InquilinoId) VALUES (@id);";

    /// <summary>Rutas públicas del agente (sin JWT; autenticadas con x-agent-token).</summary>
    public static void MapAgentePublico(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/public/agente/latido", (HttpContext ctx, Db db, Latido l) =>
        {
            using var cn = db.Abrir();
            if (!TablasListas(cn))
                return Results.Json(new { mensaje = "Falta ejecutar los scripts 18 y 19 en la base de datos." }, statusCode: 503);
            var id = Autenticar(ctx, cn);
            if (id is null) return Results.Json(new { mensaje = "Token de agente no válido." }, statusCode: 401);

            cn.Execute(Asegurar + """
                UPDATE flujo.AgenteEstado SET UltimoLatido = SYSUTCDATETIME(), VersionAgente = @version, Equipo = @equipo
                WHERE InquilinoId = @id;
                """, new { id, version = Recortar(l.Version, 30), equipo = Recortar(l.Equipo, 100) });

            // Solicitudes bajo demanda pendientes (se atienden a partir de la Fase 3).
            var solicitudes = cn.Query<string>(
                "SELECT Entidad FROM flujo.SincronizacionEstado WHERE InquilinoId = @id AND SolicitadaEn IS NOT NULL",
                new { id });
            var trabajos = ReplicaEndpoints.Reservar(cn, id.Value);
            return Results.Ok(new { ok = true, hora = DateTime.UtcNow, solicitudes, trabajos });
        }).AllowAnonymous();

        app.MapPost("/api/public/agente/diagnostico", (HttpContext ctx, Db db, Diagnostico d) =>
        {
            using var cn = db.Abrir();
            if (!TablasListas(cn))
                return Results.Json(new { mensaje = "Falta ejecutar los scripts 18 y 19 en la base de datos." }, statusCode: 503);
            var id = Autenticar(ctx, cn);
            if (id is null) return Results.Json(new { mensaje = "Token de agente no válido." }, statusCode: 401);

            cn.Execute(Asegurar + """
                UPDATE flujo.AgenteEstado SET UltimoDiagnostico = SYSUTCDATETIME(), UltimoLatido = SYSUTCDATETIME(),
                    SoftlandOk = @ok, SoftlandLatenciaMs = @lat, SoftlandVersionSql = @ver, SoftlandMensaje = @msg
                WHERE InquilinoId = @id;
                """, new { id, ok = d.Ok, lat = d.LatenciaMs, ver = Recortar(d.VersionSql, 200), msg = Recortar(d.Mensaje, 400) });
            return Results.Ok(new { ok = true });
        }).AllowAnonymous();
    }

    /// <summary>Rutas autenticadas para la aplicación web.</summary>
    public static void MapAgente(this IEndpointRouteBuilder g)
    {
        g.MapGet("/agente/estado", (Db db) =>
        {
            using var cn = db.Abrir();
            if (!TablasListas(cn)) return Results.Ok(new EstadoAgenteDto());
            var e = cn.QueryFirstOrDefault<EstadoAgenteDto>(
                """
                SELECT CAST(CASE WHEN i.TokenAgenteHash IS NULL THEN 0 ELSE 1 END AS BIT) AS TokenConfigurado,
                       a.UltimoLatido, a.VersionAgente, a.Equipo, a.UltimoDiagnostico,
                       a.SoftlandOk, a.SoftlandLatenciaMs, a.SoftlandVersionSql, a.SoftlandMensaje
                FROM flujo.Inquilino i
                LEFT JOIN flujo.AgenteEstado a ON a.InquilinoId = i.InquilinoId
                WHERE i.Codigo = 'principal'
                """) ?? new EstadoAgenteDto();
            e.EnLinea = e.UltimoLatido is { } u && DateTime.UtcNow - DateTime.SpecifyKind(u, DateTimeKind.Utc) < TimeSpan.FromMinutes(MinutosEnLinea);
            return Results.Ok(e);
        });

        // Genera un token nuevo (invalida el anterior). El token en claro se muestra una sola vez.
        g.MapPost("/agente/token", (HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return Results.Forbid();
            using var cn = db.Abrir();
            if (!TablasListas(cn))
                return Results.BadRequest(new { mensaje = "Falta ejecutar los scripts 18_agente_sincronizacion.sql y 19_agente_estado.sql." });
            // Con el esquema SaaS instalado, solo el Súper Administrador emite tokens (igual que en Empresas).
            if (Saas.Listo(cn) && Saas.Contexto(cn, ctx.User.UsuarioId()) is not { SuperAdministrador: true })
                return Results.Json(new { mensaje = "Solo el Súper Administrador de Aplix puede generar el token del agente, desde Administración → Empresas." }, statusCode: 403);
            var token = "agt_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
            cn.Execute("UPDATE flujo.Inquilino SET TokenAgenteHash = @hash WHERE Codigo = 'principal'", new { hash = Hash(token) });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Parámetros", "principal", "Token de agente",
                valorNuevo: "Se generó un token nuevo; el anterior quedó invalidado.");
            return Results.Ok(new { token });
        });
    }
}
