using System.Data;
using Dapper;

namespace FlujoEfectivo.Api.Seguridad;

/// <summary>Una sola sesión activa por usuario; el segundo ingreso se rechaza.</summary>
public static class SesionUnica
{
    public const int MinutosInactividad = 3;
    public const string Claim = "sid_flujo";

    public static bool Ocupada(Guid? sesionId, DateTime? ultimaActividadUtc, DateTime ahoraUtc) =>
        sesionId is not null && ultimaActividadUtc is not null
        && ahoraUtc - ultimaActividadUtc.Value < TimeSpan.FromMinutes(MinutosInactividad);

    /// <summary>Reserva la sesión de forma atómica; devuelve null si otra sesión sigue activa.</summary>
    public static Guid? Abrir(IDbConnection cn, int usuarioId)
    {
        var nueva = Guid.NewGuid();
        var filas = cn.Execute(
            """
            UPDATE flujo.Usuario SET SesionId = @nueva, UltimaActividad = SYSUTCDATETIME()
            WHERE UsuarioId = @usuarioId
              AND (SesionId IS NULL OR UltimaActividad IS NULL
                   OR UltimaActividad < DATEADD(MINUTE, -@minutos, SYSUTCDATETIME()))
            """,
            new { nueva, usuarioId, minutos = MinutosInactividad });
        return filas == 1 ? nueva : null;
    }

    /// <summary>Valida la sesión del token y renueva la actividad (como máximo cada 30 s).</summary>
    public static bool Validar(IDbConnection cn, int usuarioId, Guid sesionId)
    {
        var vigente = cn.ExecuteScalar<int>(
            """
            SELECT COUNT(*) FROM flujo.Usuario
            WHERE UsuarioId = @usuarioId AND SesionId = @sesionId
            """, new { usuarioId, sesionId }) == 1;
        if (vigente)
            cn.Execute(
                """
                UPDATE flujo.Usuario SET UltimaActividad = SYSUTCDATETIME()
                WHERE UsuarioId = @usuarioId AND SesionId = @sesionId
                  AND (UltimaActividad IS NULL OR UltimaActividad < DATEADD(SECOND, -30, SYSUTCDATETIME()))
                """, new { usuarioId, sesionId });
        return vigente;
    }

    public static void Cerrar(IDbConnection cn, int usuarioId, Guid sesionId) =>
        cn.Execute(
            "UPDATE flujo.Usuario SET SesionId = NULL, UltimaActividad = NULL WHERE UsuarioId = @usuarioId AND SesionId = @sesionId",
            new { usuarioId, sesionId });
}
