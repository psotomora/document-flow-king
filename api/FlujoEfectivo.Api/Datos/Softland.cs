using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Dapper;
using FlujoEfectivo.Api.Modelos;
using Microsoft.Data.SqlClient;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Configuración de la conexión a la base de datos de SoftlandERP.</summary>
public sealed class ConfigSoftland
{
    public string Servidor { get; set; } = "";
    public string BaseDatos { get; set; } = "";
    public string Esquema { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string ClaveCifrada { get; set; } = "";
    public int? CompaniaId { get; set; }
    public bool Encriptar { get; set; } = true;
}

/// <summary>
/// Acceso de solo lectura (y cambio de estado) a las tablas PEDIDO, PEDIDO_LINEA, FACTURA y FACTURA_LINEA
/// de SoftlandERP. El esquema equivale a la compañía dentro del ERP.
/// </summary>
public static partial class Softland
{
    public const string Fuente = "SoftlandERP";

    /* ----------------------------- Configuración ----------------------------- */

    public static ConfigSoftland? Leer(IDbConnection cn) =>
        cn.QueryFirstOrDefault<ConfigSoftland>(
            """
            SELECT Servidor, BaseDatos, Esquema, Usuario, ClaveCifrada, CompaniaId, Encriptar
            FROM flujo.FuenteExterna WHERE Fuente = @f
            """, new { f = Fuente });

    public static void Guardar(IDbConnection cn, ConfigSoftland c, int usuarioId) =>
        cn.Execute(
            """
            MERGE flujo.FuenteExterna AS d
            USING (SELECT @f AS Fuente) AS o ON d.Fuente = o.Fuente
            WHEN MATCHED THEN UPDATE SET
                Servidor = @Servidor, BaseDatos = @BaseDatos, Esquema = @Esquema, Usuario = @Usuario,
                ClaveCifrada = @ClaveCifrada, CompaniaId = @CompaniaId, Encriptar = @Encriptar,
                Actualizado = SYSUTCDATETIME(), UsuarioId = @usuarioId
            WHEN NOT MATCHED THEN INSERT
                (Fuente, Servidor, BaseDatos, Esquema, Usuario, ClaveCifrada, CompaniaId, Encriptar, UsuarioId)
                VALUES (@f, @Servidor, @BaseDatos, @Esquema, @Usuario, @ClaveCifrada, @CompaniaId, @Encriptar, @usuarioId);
            """,
            new
            {
                f = Fuente, c.Servidor, c.BaseDatos, c.Esquema, c.Usuario, c.ClaveCifrada,
                c.CompaniaId, c.Encriptar, usuarioId,
            });

    /* ------------------------------- Cifrado --------------------------------- */

    private static byte[] LlaveDe(string secreto) => SHA256.HashData(Encoding.UTF8.GetBytes(secreto));

    public static string Cifrar(string texto, string secreto)
    {
        using var aes = Aes.Create();
        aes.Key = LlaveDe(secreto);
        aes.GenerateIV();
        var datos = aes.EncryptCbc(Encoding.UTF8.GetBytes(texto), aes.IV);
        return Convert.ToBase64String([.. aes.IV, .. datos]);
    }

    public static string Descifrar(string cifrado, string secreto)
    {
        if (string.IsNullOrEmpty(cifrado)) return "";
        var todo = Convert.FromBase64String(cifrado);
        using var aes = Aes.Create();
        aes.Key = LlaveDe(secreto);
        var iv = todo[..16];
        var datos = todo[16..];
        return Encoding.UTF8.GetString(aes.DecryptCbc(datos, iv));
    }

    /* ------------------------------- Conexión -------------------------------- */

    [GeneratedRegex("^[A-Za-z_][A-Za-z0-9_]*$")]
    private static partial Regex EsquemaValido();

    public static void ValidarEsquema(string esquema)
    {
        if (!EsquemaValido().IsMatch(esquema))
            throw new ArgumentException("El esquema (compañía Softland) solo admite letras, números y guion bajo.");
    }

    public static string CadenaConexion(ConfigSoftland c, string secreto)
    {
        var b = new SqlConnectionStringBuilder
        {
            DataSource = c.Servidor,
            InitialCatalog = c.BaseDatos,
            TrustServerCertificate = true,
            Encrypt = c.Encriptar,
            ConnectTimeout = 10,
            ApplicationName = "Aplix Cash Flow Insights",
        };
        if (string.IsNullOrWhiteSpace(c.Usuario))
            b.IntegratedSecurity = true;
        else
        {
            b.UserID = c.Usuario;
            b.Password = Descifrar(c.ClaveCifrada, secreto);
        }
        return b.ConnectionString;
    }

    public static IDbConnection Abrir(ConfigSoftland c, string secreto)
    {
        ValidarEsquema(c.Esquema);
        var cn = new SqlConnection(CadenaConexion(c, secreto));
        cn.Open();
        return cn;
    }

    /// <summary>Prueba la conexión y verifica que existan PEDIDO y PEDIDO_LINEA en el esquema.</summary>
    public static (bool ok, string mensaje, int pedidos) Probar(ConfigSoftland c, string secreto)
    {
        try
        {
            using var cn = Abrir(c, secreto);
            var existen = cn.ExecuteScalar<int>(
                "SELECT CASE WHEN OBJECT_ID(@p, 'U') IS NOT NULL AND OBJECT_ID(@l, 'U') IS NOT NULL THEN 1 ELSE 0 END",
                new { p = $"{c.Esquema}.PEDIDO", l = $"{c.Esquema}.PEDIDO_LINEA" });
            if (existen == 0)
                return (false, $"Conectó al servidor, pero no existen las tablas {c.Esquema}.PEDIDO / {c.Esquema}.PEDIDO_LINEA.", 0);
            var n = cn.ExecuteScalar<int>($"SELECT COUNT(1) FROM [{c.Esquema}].[PEDIDO] WHERE ESTADO = 'N'");
            var msg = $"Conexión correcta. {n} pedido(s) en estado Normal.";
            var hayFacturas = cn.ExecuteScalar<int>(
                "SELECT CASE WHEN OBJECT_ID(@f, 'U') IS NOT NULL AND OBJECT_ID(@l, 'U') IS NOT NULL THEN 1 ELSE 0 END",
                new { f = $"{c.Esquema}.FACTURA", l = $"{c.Esquema}.FACTURA_LINEA" }) == 1;
            if (hayFacturas)
            {
                var nf = cn.ExecuteScalar<int>($"SELECT COUNT(1) FROM [{c.Esquema}].[FACTURA] WHERE TIPO_DOCUMENTO = 'F' AND ISNULL(ANULADA, 'N') <> 'S'");
                msg += $" {nf} factura(s) vigente(s).";
            }
            else msg += " No se encontraron las tablas FACTURA / FACTURA_LINEA.";
            return (true, msg, n);
        }
        catch (Exception ex)
        {
            return (false, "No fue posible conectar con SoftlandERP: " + ex.Message, 0);
        }
    }

    /* -------------------------------- Pedidos -------------------------------- */

    public const string PrefijoId = "sl:";

    /// <summary>
    /// Pedidos en estado Normal (N) mapeados a la estructura interna.
    /// Equivalencias: PEDIDO→Numero, NOMBRE_CLIENTE/CLIENTE→Cliente, FECHA_PEDIDO→FechaCreacion,
    /// CONDICION_PAGO.DIAS_NETO→PlazoDias, MONEDA_PEDIDO (L/D)→Moneda (CRC/USD),
    /// TOTAL_A_FACTURAR→Monto, ESTADO (N/F/C)→Pendiente/Facturado/Anulado.
    /// </summary>
    public static IEnumerable<PedidoDto> Pedidos(ConfigSoftland c, string secreto, string companiaId)
    {
        using var cn = Abrir(c, secreto);
        var e = c.Esquema;
        var tieneCondicion = cn.ExecuteScalar<int>(
            "SELECT CASE WHEN OBJECT_ID(@t, 'U') IS NOT NULL THEN 1 ELSE 0 END",
            new { t = $"{e}.CONDICION_PAGO" }) == 1;
        var plazo = tieneCondicion
            ? $"ISNULL((SELECT TOP 1 cp.DIAS_NETO FROM [{e}].[CONDICION_PAGO] cp WHERE cp.CONDICION_PAGO = p.CONDICION_PAGO), 0)"
            : "0";

        var filas = cn.Query<FilaPedido>(
            $"""
            SELECT p.PEDIDO AS Numero,
                   ISNULL(NULLIF(LTRIM(RTRIM(p.NOMBRE_CLIENTE)), ''), p.CLIENTE) AS Cliente,
                   CONVERT(CHAR(10), p.FECHA_PEDIDO, 23) AS FechaCreacion,
                   {plazo} AS PlazoDias,
                   p.MONEDA_PEDIDO AS Moneda,
                   p.TOTAL_A_FACTURAR AS Monto,
                   p.ESTADO AS Estado,
                   p.ORDEN_COMPRA AS OrdenCompra,
                   (SELECT COUNT(1) FROM [{e}].[PEDIDO_LINEA] l WHERE l.PEDIDO = p.PEDIDO) AS Lineas
            FROM [{e}].[PEDIDO] p
            WHERE p.ESTADO = 'N'
            ORDER BY p.FECHA_PEDIDO DESC, p.PEDIDO DESC
            """);

        return filas.Select(f => new PedidoDto(
            PrefijoId + f.Numero, companiaId, f.Numero, f.Cliente, f.FechaCreacion, f.PlazoDias,
            MapearMoneda(f.Moneda), f.Monto, MapearEstado(f.Estado),
            string.IsNullOrWhiteSpace(f.OrdenCompra) ? null : $"OC {f.OrdenCompra.Trim()}",
            Fuente, f.Lineas));
    }

    /// <summary>Líneas (PEDIDO_LINEA) de un pedido de Softland.</summary>
    public static IEnumerable<LineaPedidoDto> Lineas(ConfigSoftland c, string secreto, string numero)
    {
        using var cn = Abrir(c, secreto);
        var e = c.Esquema;
        // Se leen las filas de forma dinámica y se convierten explícitamente:
        // los tipos de Softland (int, varchar, datetime nulos) no coinciden
        // exactamente con el constructor del record y Dapper no lo puede materializar.
        var filas = cn.Query(
            $"""
            SELECT l.PEDIDO_LINEA AS Linea, l.ARTICULO AS Articulo,
                   CAST(l.DESCRIPCION AS NVARCHAR(400)) AS Descripcion,
                   l.CANTIDAD_PEDIDA AS Cantidad, l.CANTIDAD_FACTURADA AS CantidadFacturada,
                   l.PRECIO_UNITARIO AS PrecioUnitario, l.MONTO_DESCUENTO AS Descuento,
                   CONVERT(CHAR(10), l.FECHA_ENTREGA, 23) AS FechaEntrega, l.ESTADO AS Estado
            FROM [{e}].[PEDIDO_LINEA] l
            WHERE l.PEDIDO = @numero
            ORDER BY l.PEDIDO_LINEA
            """, new { numero });

        var lista = new List<LineaPedidoDto>();
        foreach (var f in filas)
        {
            var d = (IDictionary<string, object?>)f;
            lista.Add(new LineaPedidoDto(
                Entero(d["Linea"]),
                Texto(d["Articulo"]),
                Texto(d["Descripcion"]),
                Numero(d["Cantidad"]),
                Numero(d["CantidadFacturada"]),
                Numero(d["PrecioUnitario"]),
                Numero(d["Descuento"]),
                Texto(d["FechaEntrega"]),
                Texto(d["Estado"])));
        }
        return lista;
    }

    /// <summary>Marca el pedido (y sus líneas) como Facturado (F) en Softland.</summary>
    public static int MarcarFacturado(ConfigSoftland c, string secreto, string numero)
    {
        using var cn = Abrir(c, secreto);
        var e = c.Esquema;
        using var tx = cn.BeginTransaction();
        var filas = cn.Execute(
            $"UPDATE [{e}].[PEDIDO] SET ESTADO = 'F', UpdatedBy = 'CashFlow', RecordDate = GETDATE() WHERE PEDIDO = @numero AND ESTADO = 'N'",
            new { numero }, tx);
        if (filas > 0)
            cn.Execute(
                $"UPDATE [{e}].[PEDIDO_LINEA] SET ESTADO = 'F', CANTIDAD_FACTURADA = CANTIDAD_PEDIDA, UpdatedBy = 'CashFlow', RecordDate = GETDATE() WHERE PEDIDO = @numero AND ESTADO = 'N'",
                new { numero }, tx);
        tx.Commit();
        return filas;
    }

    /* -------------------------------- Facturas ------------------------------- */

    /// <summary>
    /// Facturas de SoftlandERP (tabla FACTURA) no anuladas, mapeadas a la estructura interna.
    /// Equivalencias: FACTURA→Numero, NOMBRE_CLIENTE/CLIENTE→Cliente, FECHA→FechaEmision,
    /// CONDICION_PAGO.DIAS_NETO→PlazoDias, MONEDA_FACTURA (L/D)→Moneda (CRC/USD),
    /// TOTAL_FACTURA→Monto, PEDIDO/ORDEN_COMPRA→Notas, ANULADA='N' filtra las vigentes.
    /// </summary>
    public static IEnumerable<FacturaDto> Facturas(ConfigSoftland c, string secreto, string companiaId)
    {
        using var cn = Abrir(c, secreto);
        var e = c.Esquema;
        var tieneCondicion = cn.ExecuteScalar<int>(
            "SELECT CASE WHEN OBJECT_ID(@t, 'U') IS NOT NULL THEN 1 ELSE 0 END",
            new { t = $"{e}.CONDICION_PAGO" }) == 1;
        var plazo = tieneCondicion
            ? $"ISNULL((SELECT TOP 1 cp.DIAS_NETO FROM [{e}].[CONDICION_PAGO] cp WHERE cp.CONDICION_PAGO = f.CONDICION_PAGO), 0)"
            : "0";

        var filas = cn.Query(
            $"""
            SELECT f.FACTURA AS Numero,
                   ISNULL(NULLIF(LTRIM(RTRIM(f.NOMBRE_CLIENTE)), ''), f.CLIENTE) AS Cliente,
                   CONVERT(CHAR(10), f.FECHA, 23) AS FechaEmision,
                   {plazo} AS PlazoDias,
                   f.MONEDA_FACTURA AS Moneda,
                   f.TOTAL_FACTURA AS Monto,
                   f.PEDIDO AS Pedido,
                   f.ORDEN_COMPRA AS OrdenCompra,
                   f.COBRADA AS Cobrada,
                   (SELECT COUNT(1) FROM [{e}].[FACTURA_LINEA] l
                     WHERE l.FACTURA = f.FACTURA AND l.TIPO_DOCUMENTO = f.TIPO_DOCUMENTO) AS Lineas
            FROM [{e}].[FACTURA] f
            WHERE f.TIPO_DOCUMENTO = 'F' AND ISNULL(f.ANULADA, 'N') <> 'S'
            ORDER BY f.FECHA DESC, f.FACTURA DESC
            """);

        var lista = new List<FacturaDto>();
        foreach (var fila in filas)
        {
            var d = (IDictionary<string, object?>)fila;
            var numero = Texto(d["Numero"]);
            var notas = new List<string>();
            var pedido = Texto(d["Pedido"]);
            var oc = Texto(d["OrdenCompra"]);
            if (pedido.Length > 0) notas.Add($"Pedido {pedido}");
            if (oc.Length > 0) notas.Add($"OC {oc}");
            if (Texto(d["Cobrada"]).Equals("S", StringComparison.OrdinalIgnoreCase)) notas.Add("Cobrada en ERP");
            lista.Add(new FacturaDto(
                PrefijoId + numero, companiaId, numero, Texto(d["Cliente"]), Texto(d["FechaEmision"]),
                Entero(d["PlazoDias"]), MapearMoneda(Texto(d["Moneda"])), Numero(d["Monto"]),
                notas.Count > 0 ? string.Join(" · ", notas) : null,
                Fuente, Entero(d["Lineas"])));
        }
        return lista;
    }

    /// <summary>Moneda (CRC/USD) de una factura vigente de Softland, o null si no existe.</summary>
    public static string? MonedaFactura(ConfigSoftland c, string secreto, string numero)
    {
        using var cn = Abrir(c, secreto);
        var moneda = cn.ExecuteScalar<string?>(
            $"""
            SELECT TOP 1 f.MONEDA_FACTURA FROM [{c.Esquema}].[FACTURA] f
            WHERE f.FACTURA = @numero AND f.TIPO_DOCUMENTO = 'F' AND ISNULL(f.ANULADA, 'N') <> 'S'
            """, new { numero });
        return moneda is null ? null : MapearMoneda(moneda);
    }

    /// <summary>Líneas (FACTURA_LINEA) de una factura de Softland.</summary>
    public static IEnumerable<LineaFacturaDto> LineasFactura(ConfigSoftland c, string secreto, string numero)
    {
        using var cn = Abrir(c, secreto);
        var e = c.Esquema;
        var filas = cn.Query(
            $"""
            SELECT l.LINEA AS Linea, l.ARTICULO AS Articulo,
                   CAST(l.DESCRIPCION AS NVARCHAR(400)) AS Descripcion,
                   l.CANTIDAD AS Cantidad, l.PRECIO_UNITARIO AS PrecioUnitario,
                   ISNULL(l.DESC_TOT_LINEA, 0) + ISNULL(l.DESC_TOT_GENERAL, 0) AS Descuento,
                   ISNULL(l.TOTAL_IMPUESTO1, 0) + ISNULL(l.TOTAL_IMPUESTO2, 0) AS Impuesto,
                   l.PRECIO_TOTAL AS Total, l.BODEGA AS Bodega, l.PEDIDO AS Pedido
            FROM [{e}].[FACTURA_LINEA] l
            WHERE l.FACTURA = @numero AND l.TIPO_DOCUMENTO = 'F'
            ORDER BY l.LINEA
            """, new { numero });

        var lista = new List<LineaFacturaDto>();
        foreach (var f in filas)
        {
            var d = (IDictionary<string, object?>)f;
            lista.Add(new LineaFacturaDto(
                Entero(d["Linea"]), Texto(d["Articulo"]), Texto(d["Descripcion"]),
                Numero(d["Cantidad"]), Numero(d["PrecioUnitario"]), Numero(d["Descuento"]),
                Numero(d["Impuesto"]), Numero(d["Total"]), Texto(d["Bodega"]), Texto(d["Pedido"])));
        }
        return lista;
    }

    /* ------------------------------ Conversión ------------------------------- */

    private static string Texto(object? v) => v is null || v is DBNull ? "" : Convert.ToString(v)?.Trim() ?? "";
    private static decimal Numero(object? v) => v is null || v is DBNull ? 0m : Convert.ToDecimal(v);
    private static int Entero(object? v) => v is null || v is DBNull ? 0 : Convert.ToInt32(v);

    private static string MapearMoneda(string? m) =>
        string.Equals(m?.Trim(), "D", StringComparison.OrdinalIgnoreCase) ? "USD" : "CRC";

    private static string MapearEstado(string? e) => e?.Trim().ToUpperInvariant() switch
    {
        "F" => "Facturado",
        "C" => "Anulado",
        _ => "Pendiente",
    };

    private sealed class FilaPedido
    {
        public string Numero { get; set; } = "";
        public string Cliente { get; set; } = "";
        public string FechaCreacion { get; set; } = "";
        public int PlazoDias { get; set; }
        public string? Moneda { get; set; }
        public decimal Monto { get; set; }
        public string? Estado { get; set; }
        public string? OrdenCompra { get; set; }
        public int Lineas { get; set; }
    }
}
