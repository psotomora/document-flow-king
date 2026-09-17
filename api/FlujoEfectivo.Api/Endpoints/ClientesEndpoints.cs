using System.Text.RegularExpressions;
using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using FlujoEfectivo.Api.Seguridad;
using Microsoft.Data.SqlClient;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>
/// Consola de Aplix: alta y mantenimiento de los clientes (empresas) del modo
/// SaaS. Solo el perfil superadmin tiene acceso; ningún usuario de un cliente
/// puede ver esta información.
/// </summary>
public static partial class ClientesEndpoints
{
    [GeneratedRegex(@"^\s*(USE\s+\[?\w+\]?|GO)\s*;?\s*$", RegexOptions.IgnoreCase | RegexOptions.Multiline)]
    private static partial Regex LineaIgnorada();

    [GeneratedRegex(@"^[A-Za-z][A-Za-z0-9_-]{1,29}$")]
    private static partial Regex CodigoValido();

    [GeneratedRegex(@"^[A-Za-z_][A-Za-z0-9_]{0,127}$")]
    private static partial Regex NombreBaseValido();

    private static IResult? Guardia(HttpContext ctx) =>
        ctx.User.EsSuperAdministrador()
            ? null
            : Results.Json(new { mensaje = "Operación reservada al personal de Aplix." }, statusCode: 403);

    private static ClienteAdminDto AlDto(ClienteTenant c) =>
        new(c.ClienteId, c.Codigo, c.Nombre, c.Servidor, c.BaseDatos, c.Usuario, c.Encriptar, c.Activo);

    public static void MapClientes(this IEndpointRouteBuilder grupo)
    {
        grupo.MapGet("/admin/clientes", (HttpContext ctx, Catalogo catalogo) =>
            Guardia(ctx) ?? Results.Ok(catalogo.Todos().Select(AlDto)));

        grupo.MapPost("/admin/clientes", (HttpContext ctx, CambioCliente c, Catalogo catalogo) =>
        {
            if (Guardia(ctx) is { } no) return no;
            if (Validar(c) is { } error) return error;

            using var cn = catalogo.AbrirCatalogo();
            if (cn.ExecuteScalar<int>(
                    "SELECT COUNT(1) FROM catalogo.Cliente WHERE Codigo = @codigo", new { c.Codigo }) > 0)
                return Results.BadRequest(new { mensaje = "Ya existe un cliente con ese código." });

            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO catalogo.Cliente
                    (Codigo, Nombre, Servidor, BaseDatos, Usuario, ClaveCifrada, Encriptar, Activo)
                OUTPUT INSERTED.ClienteId
                VALUES (@Codigo, @Nombre, @Servidor, @BaseDatos, @usuario, @clave, @Encriptar, @Activo)
                """,
                new
                {
                    c.Codigo, c.Nombre, c.Servidor, c.BaseDatos, c.Encriptar, c.Activo,
                    usuario = c.Usuario ?? "",
                    clave = string.IsNullOrEmpty(c.Clave) ? "" : catalogo.Cifrar(c.Clave),
                });

            Catalogo.Auditar(cn, ctx.User.NombreUsuario(), "Creación", c.Codigo, c.Nombre);
            catalogo.LimpiarCache();
            return Results.Ok(new { id });
        });

        grupo.MapPut("/admin/clientes/{id:int}", (HttpContext ctx, int id, CambioCliente c, Catalogo catalogo) =>
        {
            if (Guardia(ctx) is { } no) return no;
            if (Validar(c) is { } error) return error;

            using var cn = catalogo.AbrirCatalogo();
            var filas = cn.Execute(
                """
                UPDATE catalogo.Cliente SET
                    Codigo = @Codigo, Nombre = @Nombre, Servidor = @Servidor, BaseDatos = @BaseDatos,
                    Usuario = @usuario, Encriptar = @Encriptar, Activo = @Activo,
                    ClaveCifrada = CASE WHEN @cambiaClave = 1 THEN @clave ELSE ClaveCifrada END
                WHERE ClienteId = @id
                """,
                new
                {
                    id, c.Codigo, c.Nombre, c.Servidor, c.BaseDatos, c.Encriptar, c.Activo,
                    usuario = c.Usuario ?? "",
                    cambiaClave = string.IsNullOrEmpty(c.Clave) ? 0 : 1,
                    clave = string.IsNullOrEmpty(c.Clave) ? "" : catalogo.Cifrar(c.Clave),
                });
            if (filas == 0) return Results.NotFound(new { mensaje = "El cliente no existe." });

            Catalogo.Auditar(cn, ctx.User.NombreUsuario(), "Modificación", c.Codigo, c.Nombre);
            catalogo.LimpiarCache();
            return Results.Ok(new { mensaje = "Cliente actualizado." });
        });

        grupo.MapPost("/admin/clientes/{id:int}/probar", (HttpContext ctx, int id, Catalogo catalogo) =>
        {
            if (Guardia(ctx) is { } no) return no;
            var cliente = catalogo.PorId(id);
            if (cliente is null) return Results.NotFound(new { mensaje = "El cliente no existe." });
            try
            {
                using var cn = catalogo.Abrir(cliente);
                var completo = cn.ExecuteScalar<int>(
                    """
                    SELECT CASE WHEN OBJECT_ID('flujo.Usuario', 'U') IS NOT NULL
                                 AND OBJECT_ID('flujo.Compania', 'U') IS NOT NULL
                           THEN 1 ELSE 0 END
                    """) == 1;
                return Results.Ok(new
                {
                    estado = completo ? "ok" : "sin-estructura",
                    mensaje = completo
                        ? "Conexión correcta y estructura presente."
                        : "Conecta, pero la base no tiene la estructura: use Aprovisionar.",
                });
            }
            catch (Exception ex)
            {
                var raiz = ex;
                while (raiz.InnerException is not null) raiz = raiz.InnerException;
                return Results.Json(new { estado = "error", mensaje = raiz.Message }, statusCode: 400);
            }
        });

        grupo.MapPost("/admin/clientes/{id:int}/aprovisionar",
            (HttpContext ctx, int id, Catalogo catalogo, IConfiguration config, ILoggerFactory logs) =>
        {
            if (Guardia(ctx) is { } no) return no;
            var cliente = catalogo.PorId(id);
            if (cliente is null) return Results.NotFound(new { mensaje = "El cliente no existe." });
            if (!NombreBaseValido().IsMatch(cliente.BaseDatos))
                return Results.BadRequest(new { mensaje = "El nombre de la base de datos no es válido." });

            var log = logs.CreateLogger("Aprovisionamiento");
            try
            {
                // 1. Crear la base si no existe.
                var maestro = new SqlConnectionStringBuilder(catalogo.CadenaDe(cliente))
                {
                    InitialCatalog = "master",
                };
                using (var cnMaster = new SqlConnection(maestro.ConnectionString))
                {
                    cnMaster.Open();
                    cnMaster.Execute(
                        $"IF DB_ID(@base) IS NULL EXEC('CREATE DATABASE [{cliente.BaseDatos}]')",
                        new { @base = cliente.BaseDatos });
                }

                // 2. Ejecutar la plantilla de scripts sobre la base del cliente.
                var carpeta = config["Scripts:Carpeta"];
                if (string.IsNullOrWhiteSpace(carpeta))
                    carpeta = Path.Combine(AppContext.BaseDirectory, "database");
                if (!Directory.Exists(carpeta))
                    return Results.BadRequest(new
                    {
                        mensaje = $"No se encontró la carpeta de scripts '{carpeta}'. "
                                + "Copie la carpeta database junto a la API o indique Scripts:Carpeta.",
                    });

                var archivos = Directory.GetFiles(carpeta, "*.sql")
                    .Where(f => !Path.GetFileName(f).StartsWith("03_", StringComparison.OrdinalIgnoreCase))
                    .OrderBy(f => Path.GetFileName(f), StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                var aplicados = new List<string>();
                using var cn = catalogo.Abrir(cliente);
                foreach (var archivo in archivos)
                {
                    var contenido = LineaIgnorada().Replace(File.ReadAllText(archivo), "§GO§");
                    foreach (var lote in contenido.Split("§GO§", StringSplitOptions.RemoveEmptyEntries))
                    {
                        if (string.IsNullOrWhiteSpace(lote)) continue;
                        try { cn.Execute(lote); }
                        catch (Exception ex) { log.LogWarning(ex, "Lote omitido en {Archivo}", archivo); }
                    }
                    aplicados.Add(Path.GetFileName(archivo));
                }

                using var cnCat = catalogo.AbrirCatalogo();
                Catalogo.Auditar(cnCat, ctx.User.NombreUsuario(), "Aprovisionamiento", cliente.Codigo,
                    string.Join(", ", aplicados));

                return Results.Ok(new
                {
                    mensaje = $"Base preparada con {aplicados.Count} script(s).",
                    scripts = aplicados,
                });
            }
            catch (Exception ex)
            {
                var raiz = ex;
                while (raiz.InnerException is not null) raiz = raiz.InnerException;
                return Results.Json(new { mensaje = raiz.Message }, statusCode: 400);
            }
        });
    }

    private static IResult? Validar(CambioCliente c)
    {
        if (!CodigoValido().IsMatch(c.Codigo ?? ""))
            return Results.BadRequest(new
            {
                mensaje = "El código de empresa debe tener entre 2 y 30 caracteres: letras, números, guion o guion bajo.",
            });
        if (string.Equals(c.Codigo, AuthEndpoints.CodigoAplix, StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest(new { mensaje = "Ese código está reservado." });
        if (string.IsNullOrWhiteSpace(c.Nombre))
            return Results.BadRequest(new { mensaje = "Indique el nombre del cliente." });
        if (string.IsNullOrWhiteSpace(c.Servidor) || string.IsNullOrWhiteSpace(c.BaseDatos))
            return Results.BadRequest(new { mensaje = "Indique el servidor y la base de datos." });
        if (!NombreBaseValido().IsMatch(c.BaseDatos))
            return Results.BadRequest(new { mensaje = "El nombre de la base de datos no es válido." });
        return null;
    }
}
