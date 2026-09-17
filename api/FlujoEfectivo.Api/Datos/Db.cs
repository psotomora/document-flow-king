using System.Data;
using Dapper;
using FlujoEfectivo.Api.Seguridad;
using Microsoft.Data.SqlClient;

namespace FlujoEfectivo.Api.Datos;

/// <summary>
/// Fábrica de conexiones a SQL Server. En modo multicliente la conexión se
/// resuelve con el cliente (empresa) del token de la petición; el aislamiento
/// entre empresas está en la conexión, no en filtros de consulta.
/// </summary>
public sealed class Db(IConfiguration configuracion, Catalogo catalogo, IHttpContextAccessor contexto)
{
    private readonly string? _cadenaDefecto = configuracion.GetConnectionString("FlujoEfectivo");

    /// <summary>Cliente fijado manualmente (tareas de inicio o administración).</summary>
    private static readonly AsyncLocal<ClienteTenant?> _clienteForzado = new();

    public static IDisposable Fijar(ClienteTenant cliente)
    {
        _clienteForzado.Value = cliente;
        return new Liberar();
    }

    private sealed class Liberar : IDisposable
    {
        public void Dispose() => _clienteForzado.Value = null;
    }

    public ClienteTenant? ClienteActual()
    {
        if (_clienteForzado.Value is { } forzado) return forzado;
        var http = contexto.HttpContext;

        // El personal de Aplix puede trabajar dentro de una empresa concreta
        // enviando su identificador; ningún usuario de cliente puede hacerlo.
        if (http is not null && http.User.EsSuperAdministrador()
            && int.TryParse(http.Request.Headers["X-Empresa"].FirstOrDefault(), out var elegida)
            && elegida > 0)
            return catalogo.PorId(elegida);

        var id = http?.User.ClienteId() ?? 0;
        return id > 0 ? catalogo.PorId(id) : null;
    }

    public IDbConnection Abrir()
    {
        if (ClienteActual() is { } cliente) return catalogo.Abrir(cliente);

        if (string.IsNullOrWhiteSpace(_cadenaDefecto))
            throw new InvalidOperationException(
                "No hay empresa asociada a la sesión y no existe una cadena de conexión predeterminada.");

        var conexion = new SqlConnection(_cadenaDefecto);
        conexion.Open();
        return conexion;
    }

    /// <summary>Servidor y base configurados, sin exponer la contraseña.</summary>
    public string Descripcion()
    {
        try
        {
            var cadena = ClienteActual() is { } c ? catalogo.CadenaDe(c) : _cadenaDefecto ?? "";
            var b = new SqlConnectionStringBuilder(cadena);
            var auth = b.IntegratedSecurity ? "Autenticación de Windows" : $"usuario SQL '{b.UserID}'";
            return $"servidor '{b.DataSource}', base '{b.InitialCatalog}', {auth}";
        }
        catch
        {
            return "cadena de conexión no válida";
        }
    }



    /// <summary>Devuelve el ClienteId, creándolo si no existe.</summary>
    public static int ObtenerCliente(IDbConnection cn, string nombre, IDbTransaction? tx = null)
    {
        nombre = nombre.Trim();
        var id = cn.QueryFirstOrDefault<int?>(
            "SELECT ClienteId FROM flujo.Cliente WHERE Nombre = @nombre", new { nombre }, tx);
        if (id.HasValue) return id.Value;
        return cn.ExecuteScalar<int>(
            "INSERT INTO flujo.Cliente (Nombre) OUTPUT INSERTED.ClienteId VALUES (@nombre)",
            new { nombre }, tx);
    }

    /// <summary>Devuelve el ProveedorId, creándolo si no existe.</summary>
    public static int ObtenerProveedor(IDbConnection cn, string nombre, IDbTransaction? tx = null)
    {
        nombre = nombre.Trim();
        var id = cn.QueryFirstOrDefault<int?>(
            "SELECT ProveedorId FROM flujo.Proveedor WHERE Nombre = @nombre", new { nombre }, tx);
        if (id.HasValue) return id.Value;
        return cn.ExecuteScalar<int>(
            "INSERT INTO flujo.Proveedor (Nombre) OUTPUT INSERTED.ProveedorId VALUES (@nombre)",
            new { nombre }, tx);
    }

    /// <summary>Registra una operación en la bitácora de auditoría (RF-015).</summary>
    public static void Auditar(
        IDbConnection cn,
        int usuarioId,
        string nombreUsuario,
        string modulo,
        string registro,
        string operacion,
        string? valorAnterior = null,
        string? valorNuevo = null,
        IDbTransaction? tx = null)
    {
        cn.Execute(
            """
            INSERT INTO flujo.Bitacora
                (UsuarioId, NombreUsuario, Modulo, Registro, Operacion, ValorAnterior, ValorNuevo)
            VALUES (@usuarioId, @nombreUsuario, @modulo, @registro, @operacion, @valorAnterior, @valorNuevo)
            """,
            new { usuarioId, nombreUsuario, modulo, registro, operacion, valorAnterior, valorNuevo },
            tx);
    }
}
