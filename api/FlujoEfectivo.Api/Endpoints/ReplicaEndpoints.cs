using System.Data;
using System.Text.Json;
using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

public static class ReplicaEndpoints
{
    public sealed class Ajuste
    {
        public string Modo { get; set; } = "directa";
        public int IntervaloMinutos { get; set; } = 5;
    }
    public sealed class Resultado
    {
        public Guid TrabajoId { get; set; }
        public int CompaniaId { get; set; }
        public bool Ok { get; set; }
        public int DuracionMs { get; set; }
        public List<ReplicaPedidos.Fila>? Pedidos { get; set; }
    }
    public sealed class ResultadoDocumentos
    {
        public Guid TrabajoId { get; set; }
        public int CompaniaId { get; set; }
        public bool FacturasOk { get; set; }
        public bool ContratosOk { get; set; }
        public int DuracionMs { get; set; }
        public List<ReplicaDocumentos.FilaFactura>? Facturas { get; set; }
        public List<ReplicaDocumentos.FilaContrato>? Contratos { get; set; }
        public bool DocumentosPagarOk { get; set; }
        public List<FlujoEfectivo.Api.Modelos.DocumentoPorPagarDto>? DocumentosPagar { get; set; }
    }
    public static void MapReplica(this IEndpointRouteBuilder g)
    {
        g.MapGet("/sincronizacion/conexiones", (Db db) =>
        {
            using var cn = db.Abrir();
            return Results.Ok(ReplicaPedidos.Conexiones(cn));
        });
        g.MapPut("/sincronizacion/conexiones/{compania:int}", (int compania, Ajuste ajuste, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return Results.Forbid();
            if (ajuste.Modo is not ("directa" or "agente") || ajuste.IntervaloMinutos is < 1 or > 1440)
                return Results.BadRequest(new { mensaje = "Modo inválido o intervalo fuera de 1 a 1440 minutos." });
            using var cn = db.Abrir();
            if (!ReplicaPedidos.Lista(cn)) return Results.BadRequest(new { mensaje = "Ejecute el script 20_replica_pedidos.sql." });
            var id = ReplicaPedidos.Principal(cn);
            using var tx = cn.BeginTransaction(IsolationLevel.Serializable);
            if (cn.ExecuteScalar<int>("SELECT COUNT(*) FROM flujo.ConexionErpCompania x JOIN flujo.Compania c ON c.CompaniaId=x.CompaniaId WHERE x.InquilinoId=@id AND x.CompaniaId=@compania AND c.Activo=1", new { id, compania }, tx) != 1)
                return Results.NotFound(new { mensaje = "Compañía no asignada a esta instalación." });
            cn.Execute("""
                UPDATE flujo.ConexionErpCompania SET Modo=@Modo, IntervaloMinutos=@IntervaloMinutos,
                    TrabajoId=NULL, TrabajoEn=NULL, SolicitudAtendida=NULL
                WHERE InquilinoId=@id AND CompaniaId=@compania;
                IF @Modo='directa'
                    UPDATE flujo.SincronizacionEstado SET SolicitadaEn=NULL, SolicitadaPor=NULL
                    WHERE InquilinoId=@id AND CompaniaId=@compania AND Entidad IN ('pedidos','facturas','contratos','documentosPagar');
                """, new { id, compania, ajuste.Modo, ajuste.IntervaloMinutos }, tx);
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Parámetros", $"ERP compañía {compania}", "Modificación", valorNuevo: $"Pedidos, facturas, contratos y documentos por pagar: {ajuste.Modo}; intervalo {ajuste.IntervaloMinutos} min", tx: tx);
            tx.Commit();
            return Results.Ok(new { mensaje = "Modo de conexión ERP actualizado." });
        });
    }
    // Trabajo reservado en el latido: identificador de intento único y lease de 10 min.
    public static List<ReplicaPedidos.Conexion> Reservar(IDbConnection cn, int id)
    {
        if (!ReplicaPedidos.Lista(cn)) return [];
        using var tx = cn.BeginTransaction(IsolationLevel.Serializable);
        var trabajos = cn.Query<ReplicaPedidos.Conexion>("""
            SELECT x.CompaniaId, x.IntervaloMinutos FROM flujo.ConexionErpCompania x WITH (UPDLOCK)
            JOIN flujo.Compania c ON c.CompaniaId=x.CompaniaId AND c.Activo=1
            LEFT JOIN flujo.SincronizacionEstado s ON s.InquilinoId=x.InquilinoId AND s.CompaniaId=x.CompaniaId AND s.Entidad='pedidos'
            WHERE x.InquilinoId=@id AND x.Modo='agente'
              AND (x.TrabajoId IS NULL OR x.TrabajoEn < DATEADD(MINUTE,-10,SYSUTCDATETIME()))
              AND (s.UltimaSincronizacion IS NULL OR s.UltimaSincronizacion <= DATEADD(MINUTE,-x.IntervaloMinutos,SYSUTCDATETIME()) OR s.SolicitadaEn IS NOT NULL
                   OR EXISTS (SELECT 1 FROM flujo.SincronizacionEstado q WHERE q.InquilinoId=x.InquilinoId AND q.CompaniaId=x.CompaniaId AND q.Entidad IN ('facturas','contratos','documentosPagar') AND q.SolicitadaEn IS NOT NULL))
            """, new { id }, tx).ToList();
        var reservados = new List<ReplicaPedidos.Conexion>();
        foreach (var t in trabajos)
        {
            t.TrabajoId = Guid.NewGuid();
            var afectados = cn.Execute("""
                UPDATE flujo.ConexionErpCompania SET TrabajoId=@TrabajoId, TrabajoEn=SYSUTCDATETIME(),
                    SolicitudAtendida=(SELECT SolicitadaEn FROM flujo.SincronizacionEstado WHERE InquilinoId=@id AND CompaniaId=@CompaniaId AND Entidad='pedidos')
                WHERE InquilinoId=@id AND CompaniaId=@CompaniaId AND Modo='agente'
                    AND (TrabajoId IS NULL OR TrabajoEn < DATEADD(MINUTE,-10,SYSUTCDATETIME()))
                """, new { id, t.CompaniaId, t.TrabajoId }, tx);
            if (afectados == 1) reservados.Add(t);
        }
        tx.Commit();
        return reservados;
    }
    public static void MapReplicaPublica(this IEndpointRouteBuilder app)
    {
        // Facturas y contratos viajan en el mismo trabajo reservado que Pedidos; este envío no
        // libera la reserva (la libera /pedidos al final), así un trabajo vencido nunca reemplaza datos.
        app.MapPost("/api/public/agente/documentos", (HttpContext ctx, Db db, ResultadoDocumentos r) =>
        {
            using var cn = db.Abrir();
            if (!ReplicaDocumentos.Lista(cn)) return Results.Json(new { mensaje = "Ejecute el script 21_replica_documentos.sql." }, statusCode: 503);
            var id = AgenteEndpoints.Autenticar(ctx, cn);
            if (id is null) return Results.Unauthorized();
            var error = (r.FacturasOk ? ReplicaDocumentos.ValidarFacturas(r.Facturas) : null)
                ?? (r.ContratosOk ? ReplicaDocumentos.ValidarContratos(r.Contratos) : null)
                ?? (r.DocumentosPagarOk ? ReplicaDocumentos.ValidarDocumentosPagar(r.DocumentosPagar) : null);
            // Sin el script 22 un agente nuevo no rompe el envío: se ignoran los documentos por pagar.
            // Se consulta antes de abrir la transacción: Dapper no puede usar la conexión sin ella después.
            var soportaPagar = ReplicaDocumentos.ListaPagar(cn);
            var conPagar = r.DocumentosPagarOk && soportaPagar;
            if (error is not null || r.DuracionMs < 0) return Results.BadRequest(new { mensaje = error ?? "Duración inválida." });
            using var tx = cn.BeginTransaction(IsolationLevel.Serializable);
            var existe = cn.ExecuteScalar<int>("SELECT COUNT(*) FROM flujo.ConexionErpCompania WITH (UPDLOCK) WHERE InquilinoId=@id AND CompaniaId=@CompaniaId AND Modo='agente' AND TrabajoId=@TrabajoId", new { id, r.CompaniaId, r.TrabajoId }, tx);
            if (existe != 1) return Results.Conflict(new { mensaje = "Trabajo vencido, no asignado o modo cambiado; réplica conservada." });
            void Guardar(string entidad, bool ok, string? datos, int registros)
            {
                if (ok && datos is not null)
                    cn.Execute("""
                        UPDATE flujo.ReplicaErp SET Datos=@datos,RecibidoEn=SYSUTCDATETIME() WHERE InquilinoId=@id AND CompaniaId=@compania AND Entidad=@entidad;
                        IF @@ROWCOUNT=0 INSERT INTO flujo.ReplicaErp (InquilinoId,CompaniaId,Entidad,Datos,RecibidoEn) VALUES (@id,@compania,@entidad,@datos,SYSUTCDATETIME());
                        """, new { id, compania = r.CompaniaId, entidad, datos }, tx);
                cn.Execute("""
                    IF NOT EXISTS (SELECT 1 FROM flujo.SincronizacionEstado WHERE InquilinoId=@id AND CompaniaId=@compania AND Entidad=@entidad)
                        INSERT INTO flujo.SincronizacionEstado (InquilinoId,CompaniaId,Entidad) VALUES (@id,@compania,@entidad);
                    UPDATE s SET UltimaVerificacion=SYSUTCDATETIME(), Resultado=@resultado, DuracionMs=@duracion,
                        UltimaSincronizacion=CASE WHEN @ok=1 THEN SYSUTCDATETIME() ELSE UltimaSincronizacion END,
                        Registros=CASE WHEN @ok=1 THEN @registros ELSE Registros END,
                        Mensaje=CASE WHEN @ok=1 THEN NULL ELSE 'No se pudo leer Softland; se conserva la última réplica.' END,
                        SolicitadaEn=CASE WHEN @ok=1 AND s.SolicitadaEn<=x.TrabajoEn THEN NULL ELSE s.SolicitadaEn END
                    FROM flujo.SincronizacionEstado s JOIN flujo.ConexionErpCompania x ON x.InquilinoId=s.InquilinoId AND x.CompaniaId=s.CompaniaId
                    WHERE s.InquilinoId=@id AND s.CompaniaId=@compania AND s.Entidad=@entidad;
                    """, new { id, compania = r.CompaniaId, entidad, ok, resultado = ok ? "ok" : "error", duracion = r.DuracionMs, registros }, tx);
            }
            if (r.FacturasOk && r.Facturas is { } f) ReplicaDocumentos.Normalizar(f, r.CompaniaId);
            if (r.ContratosOk && r.Contratos is { } c) ReplicaDocumentos.Normalizar(c, r.CompaniaId);
            Guardar("facturas", r.FacturasOk, r.FacturasOk ? JsonSerializer.Serialize(r.Facturas, ReplicaPedidos.Json) : null, r.Facturas?.Count ?? 0);
            Guardar("contratos", r.ContratosOk, r.ContratosOk ? JsonSerializer.Serialize(r.Contratos, ReplicaPedidos.Json) : null, r.Contratos?.Count ?? 0);
            if (conPagar && r.DocumentosPagar is { } p) ReplicaDocumentos.Normalizar(p, r.CompaniaId);
            if (soportaPagar)
                Guardar("documentosPagar", conPagar, conPagar ? JsonSerializer.Serialize(r.DocumentosPagar, ReplicaPedidos.Json) : null, r.DocumentosPagar?.Count ?? 0);
            tx.Commit();
            return Results.Ok(new { ok = true });
        }).AllowAnonymous().WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(100 * 1024 * 1024));
        app.MapPost("/api/public/agente/pedidos", (HttpContext ctx, Db db, Resultado r) =>
        {
            using var cn = db.Abrir();
            if (!ReplicaPedidos.Lista(cn)) return Results.Json(new { mensaje = "Ejecute el script 20_replica_pedidos.sql." }, statusCode: 503);
            var id = AgenteEndpoints.Autenticar(ctx, cn);
            if (id is null) return Results.Unauthorized();
            var error = r.Ok ? ReplicaPedidos.Validar(r.Pedidos) : null;
            if (error is not null || r.DuracionMs < 0) return Results.BadRequest(new { mensaje = error ?? "Duración inválida." });
            using var tx = cn.BeginTransaction(IsolationLevel.Serializable);
            var existe = cn.ExecuteScalar<int>("SELECT COUNT(*) FROM flujo.ConexionErpCompania WITH (UPDLOCK) WHERE InquilinoId=@id AND CompaniaId=@CompaniaId AND Modo='agente' AND TrabajoId=@TrabajoId", new { id, r.CompaniaId, r.TrabajoId }, tx);
            if (existe != 1) return Results.Conflict(new { mensaje = "Trabajo vencido, no asignado o modo cambiado; réplica conservada." });
            if (r.Ok && r.Pedidos is { } filas)
            {
                ReplicaPedidos.Normalizar(filas, r.CompaniaId);
                cn.Execute("""
                    UPDATE flujo.ReplicaPedidos SET Datos=@datos,RecibidoEn=SYSUTCDATETIME() WHERE InquilinoId=@id AND CompaniaId=@compania;
                    IF @@ROWCOUNT=0 INSERT INTO flujo.ReplicaPedidos (InquilinoId,CompaniaId,Datos,RecibidoEn) VALUES (@id,@compania,@datos,SYSUTCDATETIME());
                    """, new { id, compania = r.CompaniaId, datos = JsonSerializer.Serialize(filas, ReplicaPedidos.Json) }, tx);
            }
            cn.Execute("""
                IF NOT EXISTS (SELECT 1 FROM flujo.SincronizacionEstado WHERE InquilinoId=@id AND CompaniaId=@compania AND Entidad='pedidos')
                    INSERT INTO flujo.SincronizacionEstado (InquilinoId,CompaniaId,Entidad) VALUES (@id,@compania,'pedidos');
                UPDATE s SET UltimaVerificacion=SYSUTCDATETIME(), Resultado=@resultado, DuracionMs=@duracion,
                    UltimaSincronizacion=CASE WHEN @ok=1 THEN SYSUTCDATETIME() ELSE UltimaSincronizacion END,
                    Registros=CASE WHEN @ok=1 THEN @registros ELSE Registros END,
                    Mensaje=CASE WHEN @ok=1 THEN NULL ELSE 'No se pudo leer Softland; se conserva la última réplica.' END,
                    SolicitadaEn=CASE WHEN @ok=1 AND s.SolicitadaEn=x.SolicitudAtendida THEN NULL ELSE s.SolicitadaEn END
                FROM flujo.SincronizacionEstado s JOIN flujo.ConexionErpCompania x ON x.InquilinoId=s.InquilinoId AND x.CompaniaId=s.CompaniaId
                WHERE s.InquilinoId=@id AND s.CompaniaId=@compania AND s.Entidad='pedidos';
                UPDATE flujo.ConexionErpCompania SET TrabajoId=NULL,TrabajoEn=NULL,SolicitudAtendida=NULL WHERE InquilinoId=@id AND CompaniaId=@compania;
                """, new { id, compania = r.CompaniaId, ok = r.Ok, resultado = r.Ok ? "ok" : "error", duracion = r.DuracionMs, registros = r.Pedidos?.Count ?? 0 }, tx);
            tx.Commit();
            return Results.Ok(new { ok = true });
        }).AllowAnonymous();
    }
}