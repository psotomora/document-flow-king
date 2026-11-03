using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>Fase 1 SaaS: estado de la réplica del ERP y solicitudes de sincronización bajo demanda.
/// Mientras no exista el agente local, la operación sigue usando las consultas directas.</summary>
public static class SincronizacionEndpoints
{
    private static readonly HashSet<string> Entidades =
        new(StringComparer.OrdinalIgnoreCase) { "pedidos", "facturas", "contratos", "documentosPagar" };

    public sealed class EstadoSincronizacionDto
    {
        public string Entidad { get; set; } = "";
        public string? CompaniaId { get; set; }
        public DateTime? UltimaSincronizacion { get; set; }
        public int? DuracionMs { get; set; }
        public int? Registros { get; set; }
        public string? Resultado { get; set; }
        public string? Mensaje { get; set; }
        public DateTime? SolicitadaEn { get; set; }
        public DateTime? UltimaVerificacion { get; set; }
        public string Modo { get; set; } = "directa";
    }

    public sealed class SolicitudSincronizacion
    {
        public string Entidad { get; set; } = "";
        public string? CompaniaId { get; set; }
    }

    private static int? Compania(string? valor) =>
        int.TryParse(valor, out var n) ? n : null;

    public static void MapSincronizacion(this IEndpointRouteBuilder g)
    {
        g.MapGet("/sincronizacion/estado", (Db db, string? companiaId) =>
        {
            using var cn = db.Abrir();
            if (cn.ExecuteScalar<int?>("SELECT OBJECT_ID('flujo.SincronizacionEstado', 'U')") is null)
                return Results.Ok(Array.Empty<EstadoSincronizacionDto>());

            var fase3 = ReplicaPedidos.Lista(cn);
            var filas = cn.Query<EstadoSincronizacionDto>(
                $"""
                SELECT s.Entidad, CAST(s.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       s.UltimaSincronizacion, s.DuracionMs, s.Registros, s.Resultado, s.Mensaje, s.SolicitadaEn,
                       {(fase3 ? "s.UltimaVerificacion" : "s.UltimaSincronizacion")} AS UltimaVerificacion
                FROM flujo.SincronizacionEstado s
                INNER JOIN flujo.Inquilino i ON i.InquilinoId = s.InquilinoId AND i.Codigo = 'principal'
                WHERE @compania IS NULL OR s.CompaniaId = @compania OR s.CompaniaId IS NULL
                """, new { compania = Compania(companiaId) }).ToList();
            var conexiones = ReplicaPedidos.Conexiones(cn);
            string[] porAgente = ReplicaDocumentos.Lista(cn) ? ["pedidos", "facturas", "contratos"] : ["pedidos"];
            foreach (var f in filas)
                if (porAgente.Contains(f.Entidad) && conexiones.Any(x => x.CompaniaId.ToString() == f.CompaniaId && x.Modo == "agente")) f.Modo = "agente";
            foreach (var c in conexiones.Where(x => x.Modo == "agente" && (companiaId is null || x.CompaniaId.ToString() == companiaId)))
                foreach (var e in porAgente)
                    if (!filas.Any(f => f.Entidad == e && f.CompaniaId == c.CompaniaId.ToString()))
                        filas.Add(new EstadoSincronizacionDto { Entidad = e, CompaniaId = c.CompaniaId.ToString(), Modo = "agente" });
            return Results.Ok(filas);
        });

        g.MapPost("/sincronizacion/solicitar", (HttpContext ctx, Db db, SolicitudSincronizacion s) =>
        {
            if (!Entidades.Contains(s.Entidad))
                return Results.BadRequest(new { mensaje = $"Entidad no sincronizable: {s.Entidad}" });

            using var cn = db.Abrir();
            var conexiones = ReplicaPedidos.Conexiones(cn).Where(x => x.Modo == "agente" && (s.CompaniaId is null || x.CompaniaId.ToString() == s.CompaniaId)).ToList();
            var porAgente = s.Entidad == "pedidos" || (s.Entidad is "facturas" or "contratos" && ReplicaDocumentos.Lista(cn));
            if (!porAgente || conexiones.Count == 0)
                return Results.BadRequest(new { mensaje = "Esta pantalla usa conexión directa: utilice Actualizar. La sincronización por agente cubre Pedidos, Facturas y Contratos." });
            if (cn.ExecuteScalar<int?>("SELECT OBJECT_ID('flujo.SincronizacionEstado', 'U')") is null)
                return Results.BadRequest(new { mensaje = "Falta ejecutar el script 18_agente_sincronizacion.sql." });

            foreach (var c in conexiones)
            cn.Execute(
                """
                DECLARE @inq INT = (SELECT InquilinoId FROM flujo.Inquilino WHERE Codigo = 'principal');
                UPDATE flujo.SincronizacionEstado
                   SET SolicitadaEn = SYSUTCDATETIME(), SolicitadaPor = @usuario
                 WHERE InquilinoId = @inq AND Entidad = @entidad
                   AND ((CompaniaId IS NULL AND @compania IS NULL) OR CompaniaId = @compania);
                IF @@ROWCOUNT = 0
                    INSERT INTO flujo.SincronizacionEstado (InquilinoId, CompaniaId, Entidad, SolicitadaEn, SolicitadaPor)
                    VALUES (@inq, @compania, @entidad, SYSUTCDATETIME(), @usuario);
                """, new { entidad = s.Entidad, compania = c.CompaniaId, usuario = ctx.User.NombreUsuario() });
            return Results.Ok(new { mensaje = "Sincronización solicitada." });
        });
    }
}
