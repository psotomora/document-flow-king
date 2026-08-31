using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Fábrica de conexiones a SQL Server (local o remoto) y utilidades comunes.</summary>
public sealed class Db(IConfiguration configuracion)
{
    private readonly string _cadena =
        configuracion.GetConnectionString("FlujoEfectivo")
        ?? throw new InvalidOperationException(
            "Falta la cadena de conexión 'FlujoEfectivo' en appsettings.json.");

    public IDbConnection Abrir()
    {
        var conexion = new SqlConnection(_cadena);
        conexion.Open();
        return conexion;
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
