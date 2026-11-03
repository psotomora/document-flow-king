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
}
