using System.Data;
using Dapper;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Contexto multi-inquilino (Fase 5). Se lee siempre de la base para que
/// suspensiones, cupos y permisos de Súper Administrador surtan efecto de inmediato.</summary>
public static class Saas
{
    public sealed class ContextoUsuario
    {
        public int InquilinoId { get; set; }
        public string Codigo { get; set; } = "principal";
        public string Nombre { get; set; } = "";
        public bool SuperAdministrador { get; set; }
        public bool InquilinoActivo { get; set; } = true;
        public DateTime? FechaVencimiento { get; set; }
        public int? MaxUsuarios { get; set; }
        public bool EsPrincipal => string.Equals(Codigo, "principal", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>True cuando ya se ejecutó 23_saas_multi_inquilino.sql.</summary>
    public static bool Listo(IDbConnection cn) =>
        cn.ExecuteScalar<int>(
            "SELECT CASE WHEN COL_LENGTH('flujo.Usuario','InquilinoId') IS NOT NULL AND COL_LENGTH('flujo.Usuario','SuperAdministrador') IS NOT NULL AND COL_LENGTH('flujo.Inquilino','MaxUsuarios') IS NOT NULL THEN 1 ELSE 0 END") == 1;

    /// <summary>Contexto del usuario; null si el script aún no se ejecutó (todo opera como principal).</summary>
    public static ContextoUsuario? Contexto(IDbConnection cn, int usuarioId)
    {
        if (!Listo(cn)) return null;
        return cn.QueryFirstOrDefault<ContextoUsuario>(
            """
            SELECT i.InquilinoId, i.Codigo, i.Nombre, u.SuperAdministrador,
                   i.Activo AS InquilinoActivo, i.FechaVencimiento, i.MaxUsuarios
            FROM flujo.Usuario u
            INNER JOIN flujo.Inquilino i ON i.InquilinoId = u.InquilinoId
            WHERE u.UsuarioId = @usuarioId
            """, new { usuarioId });
    }

    /// <summary>Motivo por el que la empresa no puede ingresar, o null si puede.</summary>
    public static string? BloqueoIngreso(ContextoUsuario? c, DateTime hoy)
    {
        if (c is null) return null;
        if (!c.InquilinoActivo)
            return "El servicio de su empresa está suspendido. Contacte a Aplix.";
        if (c.FechaVencimiento is { } v && v.Date < hoy.Date)
            return $"La suscripción de su empresa venció el {v:dd/MM/yyyy}. Contacte a Aplix para renovarla.";
        // Aislamiento: hasta que las consultas de datos queden acotadas por empresa,
        // solo la instalación principal accede a la información operativa.
        if (!c.EsPrincipal)
            return "Su empresa está registrada; el acceso se habilitará cuando Aplix complete su configuración.";
        return null;
    }

    /// <summary>Mensaje de rechazo si la empresa ya alcanzó su cupo de usuarios activos.</summary>
    public static string? CupoExcedido(int? maxUsuarios, int activosSinExcluido) =>
        maxUsuarios is { } max && activosSinExcluido + 1 > max
            ? $"Su empresa ha alcanzado el límite de {max} usuarios activos permitidos por su plan. "
              + "Inactive un usuario o contacte a Aplix para ampliar sus licencias."
            : null;

    public static int Activos(IDbConnection cn, int inquilinoId, int? excluir) =>
        cn.ExecuteScalar<int>(
            "SELECT COUNT(1) FROM flujo.Usuario WHERE InquilinoId = @i AND Activo = 1 AND (@e IS NULL OR UsuarioId <> @e)",
            new { i = inquilinoId, e = excluir });

    /* ------------------- Aislamiento de datos (paso 2) ------------------- */

    public sealed record Alcance(HashSet<int> Companias, HashSet<int> Bancos);

    /// <summary>True cuando ya se ejecutó 24_aislamiento_datos_inquilino.sql.</summary>
    public static bool AislamientoListo(IDbConnection cn) =>
        Listo(cn) && cn.ExecuteScalar<int>(
            "SELECT CASE WHEN COL_LENGTH('flujo.Compania','InquilinoId') IS NOT NULL THEN 1 ELSE 0 END") == 1;

    /// <summary>Compañías y bancos de la empresa del usuario; null si el script 24 no se ha ejecutado.</summary>
    public static Alcance? AlcanceUsuario(IDbConnection cn, int usuarioId)
    {
        if (!AislamientoListo(cn)) return null;
        var companias = cn.Query<int>(
            """
            SELECT c.CompaniaId FROM flujo.Compania c
            INNER JOIN flujo.Usuario u ON u.InquilinoId = c.InquilinoId
            WHERE u.UsuarioId = @usuarioId
            """, new { usuarioId }).ToHashSet();
        var bancos = cn.Query<int>(
            """
            SELECT b.CuentaBancariaId FROM flujo.CuentaBancaria b
            INNER JOIN flujo.Compania c ON c.CompaniaId = b.CompaniaId
            INNER JOIN flujo.Usuario u ON u.InquilinoId = c.InquilinoId
            WHERE u.UsuarioId = @usuarioId
            """, new { usuarioId }).ToHashSet();
        return new Alcance(companias, bancos);
    }

    private static readonly string[] CamposCompania = ["CompaniaId", "CompaniaOrigenId", "CompaniaDestinoId"];
    private static readonly string[] CamposBanco = ["BancoId", "CuentaBancariaId", "BancoOrigenId", "BancoDestinoId"];

    private static int? Entero(object? v) => v switch
    {
        int n => n,
        string s when int.TryParse(s, out var n) => n,
        _ => null,
    };

    /// <summary>False si el objeto referencia una compañía o banco fuera de la empresa.</summary>
    public static bool Permitido(object? item, Alcance a)
    {
        if (item is null) return true;
        var tipo = item.GetType();
        if (tipo.IsPrimitive || item is string) return true;
        foreach (var p in tipo.GetProperties())
        {
            if (p.GetIndexParameters().Length > 0) continue;
            var esCompania = CamposCompania.Contains(p.Name);
            var esBanco = CamposBanco.Contains(p.Name);
            if (!esCompania && !esBanco) continue;
            if (Entero(p.GetValue(item)) is not { } id) continue;
            if (esCompania && !a.Companias.Contains(id)) return false;
            if (esBanco && !a.Bancos.Contains(id)) return false;
        }
        return true;
    }

    public static List<T> Acotar<T>(IEnumerable<T> items, Alcance? a) =>
        a is null ? items.ToList() : items.Where(x => Permitido(x, a)).ToList();
}
