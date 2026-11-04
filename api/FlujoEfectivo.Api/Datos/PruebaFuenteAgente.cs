using System.Data;
using System.Text.Json;
using Dapper;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Comprobación de credenciales de una fuente externa delegada al agente local.
/// El estado vive en flujo.Parametro con clave propia de la empresa (sin scripts SQL nuevos).</summary>
public static class PruebaFuenteAgente
{
    /// <summary>Sin respuesta del agente en este lapso, la comprobación se da por fallida.</summary>
    public const int MinutosEspera = 5;
    /// <summary>Una solicitud entregada y no respondida se reenvía tras este lapso.</summary>
    public const int MinutosReenvio = 2;

    public sealed class Estado
    {
        public string Estado_ { get; set; } = "sin_probar"; // sin_probar | en_proceso | fallida | exitosa
        public DateTime? SolicitadaEn { get; set; }
        public DateTime? EntregadaEn { get; set; }
        public DateTime? ResueltaEn { get; set; }
        public string? Mensaje { get; set; }
    }

    public sealed record EstadoDto(string Estado, DateTime? SolicitadaEn, DateTime? ResueltaEn, string? Mensaje);

    public sealed class Solicitud
    {
        public string Fuente { get; set; } = "";
        public string Servidor { get; set; } = "";
        public string BaseDatos { get; set; } = "";
        public string Esquema { get; set; } = "";
        public string Usuario { get; set; } = "";
        public string Clave { get; set; } = "";
        public bool Encriptar { get; set; } = true;
    }

    private static readonly string[] Fuentes = [Softland.Fuente, Softland.Fuente2];

    private static string Clave(IDbConnection cn, string fuente) =>
        Saas.ClaveParametro(Saas.Secundaria(cn), "pruebaAgente:" + fuente);

    private static Estado Leer(IDbConnection cn, string fuente)
    {
        var json = cn.ExecuteScalar<string?>("SELECT Valor FROM flujo.Parametro WHERE Clave = @c", new { c = Clave(cn, fuente) });
        if (string.IsNullOrWhiteSpace(json)) return new Estado();
        try { return JsonSerializer.Deserialize<Estado>(json) ?? new Estado(); }
        catch (JsonException) { return new Estado(); }
    }

    private static void Escribir(IDbConnection cn, string fuente, Estado e, int? usuarioId) =>
        cn.Execute(
            """
            MERGE flujo.Parametro AS d
            USING (SELECT @c AS Clave) AS o ON d.Clave = o.Clave
            WHEN MATCHED THEN UPDATE SET Valor = @v, Actualizado = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT (Clave, Valor, UsuarioId) VALUES (@c, @v, @u);
            """, new { c = Clave(cn, fuente), v = JsonSerializer.Serialize(e), u = usuarioId });

    /// <summary>Estado visible, aplicando el vencimiento cuando el agente no respondió.</summary>
    public static EstadoDto Consultar(IDbConnection cn, string fuente) => Vista(Leer(cn, fuente), DateTime.UtcNow);

    public static EstadoDto Vista(Estado e, DateTime ahora)
    {
        if (e.Estado_ == "en_proceso" && e.SolicitadaEn is { } s && ahora - s > TimeSpan.FromMinutes(MinutosEspera))
            return new EstadoDto("fallida", e.SolicitadaEn, null,
                $"El agente no respondió en {MinutosEspera} minutos. Verifique que esté en línea y actualizado a la versión 1.38.73 o superior.");
        return new EstadoDto(e.Estado_, e.SolicitadaEn, e.ResueltaEn, e.Mensaje);
    }

    public static void Solicitar(IDbConnection cn, string fuente, int usuarioId) =>
        Escribir(cn, fuente, new Estado { Estado_ = "en_proceso", SolicitadaEn = DateTime.UtcNow }, usuarioId);

    /// <summary>Solicitudes que el agente debe atender ahora (con credenciales descifradas, solo por HTTPS).</summary>
    public static List<Solicitud> Pendientes(IDbConnection cn, string secreto)
    {
        var lista = new List<Solicitud>();
        var ahora = DateTime.UtcNow;
        foreach (var f in Fuentes)
        {
            var e = Leer(cn, f);
            if (Vista(e, ahora).Estado != "en_proceso") continue;
            if (e.EntregadaEn is { } en && ahora - en < TimeSpan.FromMinutes(MinutosReenvio)) continue;
            var cfg = Softland.Leer(cn, f);
            if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
            {
                Resolver(cn, f, false, "No hay credenciales guardadas para esta conexión.");
                continue;
            }
            string clave;
            try { clave = string.IsNullOrEmpty(cfg.ClaveCifrada) ? "" : Softland.Descifrar(cfg.ClaveCifrada, secreto); }
            catch (InvalidOperationException)
            {
                Resolver(cn, f, false, "La contraseña guardada pertenece a otra llave de seguridad. Escríbala de nuevo y guarde.");
                continue;
            }
            lista.Add(new Solicitud
            {
                Fuente = f, Servidor = cfg.Servidor, BaseDatos = cfg.BaseDatos, Esquema = cfg.Esquema,
                Usuario = cfg.Usuario, Clave = clave, Encriptar = cfg.Encriptar,
            });
            e.EntregadaEn = ahora;
            Escribir(cn, f, e, null);
        }
        return lista;
    }

    public static bool Resolver(IDbConnection cn, string fuente, bool ok, string? mensaje)
    {
        if (!Fuentes.Contains(fuente)) return false;
        var e = Leer(cn, fuente);
        if (e.Estado_ != "en_proceso") return false;
        e.Estado_ = ok ? "exitosa" : "fallida";
        e.ResueltaEn = DateTime.UtcNow;
        e.Mensaje = string.IsNullOrWhiteSpace(mensaje) ? null : (mensaje.Length > 500 ? mensaje[..500] : mensaje);
        Escribir(cn, fuente, e, null);
        return true;
    }
}
