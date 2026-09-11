using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

public record CargarLicencia(string Archivo);
public record ExigirLicencia(bool Activa);
public record EmitirLicencia(
    string ClienteCodigo,
    string ClienteNombre,
    string Producto,
    string Vence,
    string? Huella,
    string? Companias,
    int MaxUsuarios,
    int DiasGracia,
    string? Notas);

/// <summary>Licenciamiento: consulta y carga de la licencia, y emisión interna (servidor emisor).</summary>
public static class LicenciaEndpoints
{
    private static EstadoLicencia? _cache;
    private static DateTime _cacheHasta = DateTime.MinValue;
    private static readonly object Candado = new();

    /// <summary>Estado con caché corta; evita consultar la base en cada petición.</summary>
    public static EstadoLicencia EstadoCacheado(Db db, IConfiguration config)
    {
        lock (Candado)
        {
            if (_cache is not null && DateTime.UtcNow < _cacheHasta) return _cache;
            using var cn = db.Abrir();
            _cache = Licencias.Estado(cn, config);
            _cacheHasta = DateTime.UtcNow.AddMinutes(2);
            return _cache;
        }
    }

    public static void Invalidar()
    {
        lock (Candado) { _cache = null; _cacheHasta = DateTime.MinValue; }
    }

    public static void MapLicencia(this IEndpointRouteBuilder grupo)
    {
        var g = grupo.MapGroup("").RequireAuthorization();

        g.MapGet("/licencia", (Db db, IConfiguration config) =>
        {
            using var cn = db.Abrir();
            return Results.Ok(Licencias.Estado(cn, config));
        });

        g.MapPost("/licencia", (CargarLicencia datos, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return Results.Forbid();
            var (contenido, error) = Licencias.Verificar(datos.Archivo ?? "", config["Licencia:LlavePublica"] ?? "");
            if (contenido is null) return Results.BadRequest(new { mensaje = error });

            using var cn = db.Abrir();
            Licencias.Asegurar(cn);
            DateTime.TryParse(contenido.Vence, out var vence);
            cn.Execute(
                """
                MERGE flujo.Licencia AS destino
                USING (SELECT 1 AS Id) AS origen ON destino.Id = origen.Id
                WHEN MATCHED THEN UPDATE SET Archivo = @archivo, ClienteNombre = @cliente,
                     Serie = @serie, Vence = @vence, CargadaEn = SYSUTCDATETIME(), UsuarioId = @usuarioId
                WHEN NOT MATCHED THEN INSERT (Id, Archivo, ClienteNombre, Serie, Vence, UsuarioId)
                     VALUES (1, @archivo, @cliente, @serie, @vence, @usuarioId);
                """,
                new
                {
                    archivo = datos.Archivo,
                    cliente = contenido.ClienteNombre,
                    serie = contenido.Serie,
                    vence = vence == default ? (DateTime?)null : vence,
                    usuarioId = ctx.User.UsuarioId(),
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Licencia",
                contenido.Serie, "Modificación", null,
                $"{contenido.ClienteNombre} vence {contenido.Vence}");

            Invalidar();
            return Results.Ok(Licencias.Estado(cn, config));
        });

        g.MapPost("/licencia/requerida", (ExigirLicencia datos, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return Results.Forbid();
            using var cn = db.Abrir();
            Licencias.Asegurar(cn);
            var valor = datos.Activa ? "1" : "0";
            cn.Execute(
                """
                MERGE flujo.Parametro AS d USING (SELECT @c AS Clave) AS o ON d.Clave = o.Clave
                WHEN MATCHED THEN UPDATE SET Valor = @v, Actualizado = SYSUTCDATETIME(), UsuarioId = @u
                WHEN NOT MATCHED THEN INSERT (Clave, Valor, Descripcion, UsuarioId)
                     VALUES (@c, @v, 'Exigir un archivo de licencia válido para usar el sistema', @u);
                """,
                new { c = Licencias.ParamRequerida, v = valor, u = ctx.User.UsuarioId() });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Licencia",
                Licencias.ParamRequerida, "Modificación", null, valor);

            Invalidar();
            return Results.Ok(Licencias.Estado(cn, config));
        });

        /* ---- Servidor emisor (solo instalación interna de Aplix) ------------- */

        g.MapPost("/licencias/llaves", (HttpContext ctx) =>
        {
            if (!ctx.User.EsAdministrador()) return Results.Forbid();
            var (privada, publica) = Licencias.GenerarLlaves();
            return Results.Ok(new { privada, publica });
        });

        g.MapGet("/licencias", (HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return Results.Forbid();
            if (string.IsNullOrWhiteSpace(config["Licencia:LlavePrivada"]))
                return Results.Ok(Array.Empty<object>());
            using var cn = db.Abrir();
            Licencias.Asegurar(cn);
            return Results.Ok(cn.Query(
                """
                SELECT CAST(LicenciaEmitidaId AS NVARCHAR(20)) AS id, Serie AS serie, Producto AS producto,
                       ClienteCodigo AS clienteCodigo, ClienteNombre AS clienteNombre, Huella AS huella,
                       Companias AS companias, MaxUsuarios AS maxUsuarios,
                       CONVERT(CHAR(10), Vence, 23) AS vence, DiasGracia AS diasGracia, Notas AS notas,
                       Archivo AS archivo, CONVERT(CHAR(16), EmitidaEn, 126) AS emitidaEn, EmitidaPor AS emitidaPor
                FROM flujo.LicenciaEmitida ORDER BY LicenciaEmitidaId DESC
                """));
        });

        g.MapPost("/licencias/emitir", (EmitirLicencia datos, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return Results.Forbid();
            var privada = config["Licencia:LlavePrivada"];
            if (string.IsNullOrWhiteSpace(privada))
                return Results.BadRequest(new
                {
                    mensaje = "Este servidor no es emisor de licencias: falta Licencia:LlavePrivada en appsettings.",
                });
            if (string.IsNullOrWhiteSpace(datos.ClienteNombre) || !DateTime.TryParse(datos.Vence, out var vence))
                return Results.BadRequest(new { mensaje = "Indique el cliente y una fecha de vencimiento válida." });

            var companias = (datos.Companias ?? "")
                .Split([',', ';', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();

            var contenido = new ContenidoLicencia
            {
                Producto = string.IsNullOrWhiteSpace(datos.Producto) ? "FlujoEfectivo" : datos.Producto.Trim(),
                ClienteCodigo = (datos.ClienteCodigo ?? "").Trim(),
                ClienteNombre = datos.ClienteNombre.Trim(),
                Emitida = DateTime.Today.ToString("yyyy-MM-dd"),
                Vence = vence.ToString("yyyy-MM-dd"),
                Companias = companias,
                MaxUsuarios = Math.Max(0, datos.MaxUsuarios),
                Huella = (datos.Huella ?? "").Trim().ToUpperInvariant(),
                DiasGracia = datos.DiasGracia <= 0 ? 15 : datos.DiasGracia,
                Notas = string.IsNullOrWhiteSpace(datos.Notas) ? null : datos.Notas.Trim(),
                Serie = "LIC-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
            };

            string archivo;
            try
            {
                archivo = Licencias.Firmar(contenido, privada);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new
                {
                    mensaje = "No fue posible firmar la licencia. Revise el formato PEM de la llave privada. " + ex.Message,
                });
            }

            using var cn = db.Abrir();
            Licencias.Asegurar(cn);
            cn.Execute(
                """
                INSERT INTO flujo.LicenciaEmitida
                    (Serie, Producto, ClienteCodigo, ClienteNombre, Huella, Companias, MaxUsuarios,
                     Vence, DiasGracia, Notas, Archivo, EmitidaPor)
                VALUES (@Serie, @Producto, @ClienteCodigo, @ClienteNombre, @Huella, @Companias, @MaxUsuarios,
                        @Vence, @DiasGracia, @Notas, @Archivo, @Por)
                """,
                new
                {
                    contenido.Serie,
                    contenido.Producto,
                    contenido.ClienteCodigo,
                    contenido.ClienteNombre,
                    contenido.Huella,
                    Companias = string.Join(", ", companias),
                    contenido.MaxUsuarios,
                    Vence = vence.Date,
                    contenido.DiasGracia,
                    contenido.Notas,
                    Archivo = archivo,
                    Por = ctx.User.NombreUsuario(),
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Licencia",
                contenido.Serie, "Creación", null,
                $"{contenido.ClienteNombre} vence {contenido.Vence} huella {contenido.Huella}");

            var nombre = $"{(string.IsNullOrWhiteSpace(contenido.ClienteCodigo) ? contenido.ClienteNombre : contenido.ClienteCodigo)}-{contenido.Serie}.lic";
            return Results.Ok(new { archivo, nombreArchivo = nombre.Replace(' ', '-'), serie = contenido.Serie });
        });
    }
}
