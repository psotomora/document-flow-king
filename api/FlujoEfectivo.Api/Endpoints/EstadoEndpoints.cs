using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>GET /api/estado devuelve, en una sola llamada, todo lo que la interfaz necesita.</summary>
public static class EstadoEndpoints
{
    public static void MapEstado(this IEndpointRouteBuilder grupo)
    {
        grupo.MapGet("/estado", (HttpContext ctx, Db db) =>
        {
            using var cn = db.Abrir();

            var companias = cn.Query<CompaniaDto>(
                "SELECT CAST(CompaniaId AS NVARCHAR(20)) AS Id, Codigo, Nombre FROM flujo.Compania WHERE Activo = 1 ORDER BY Codigo");

            var bancos = cn.Query<BancoDto>(
                """
                SELECT CAST(CuentaBancariaId AS NVARCHAR(20)) AS Id, Nombre,
                       CAST(CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       SaldoInicialUSD, SaldoInicialCRC, Activo
                FROM flujo.CuentaBancaria ORDER BY CompaniaId, Nombre
                """);

            var facturas = cn.Query<FacturaDto>(
                """
                SELECT CAST(f.FacturaId AS NVARCHAR(20)) AS Id,
                       CAST(f.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       f.Numero, c.Nombre AS Cliente,
                       CONVERT(CHAR(10), f.FechaEmision, 23) AS FechaEmision,
                       f.PlazoDias, f.Moneda, f.Monto, f.Notas
                FROM flujo.Factura f
                INNER JOIN flujo.Cliente c ON c.ClienteId = f.ClienteId
                WHERE f.Anulada = 0
                ORDER BY f.FechaEmision DESC, f.FacturaId DESC
                """);

            var pagos = cn.Query<PagoDto>(
                """
                SELECT CAST(PagoId AS NVARCHAR(20)) AS Id,
                       CAST(FacturaId AS NVARCHAR(20)) AS FacturaId,
                       CONVERT(CHAR(10), Fecha, 23) AS Fecha,
                       CAST(CuentaBancariaId AS NVARCHAR(20)) AS BancoId,
                       Monto, Moneda, TipoCambioOperacion, Metodo, Referencia
                FROM flujo.Pago ORDER BY Fecha DESC, PagoId DESC
                """);

            var erogaciones = cn.Query<ErogacionDto>(
                """
                SELECT CAST(e.ErogacionId AS NVARCHAR(20)) AS Id,
                       CAST(e.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       CAST(e.CuentaBancariaId AS NVARCHAR(20)) AS BancoId,
                       e.NumeroTransferencia, p.Nombre AS Proveedor,
                       CONVERT(CHAR(10), e.Fecha, 23) AS Fecha,
                       e.Moneda, e.Monto, e.Notas
                FROM flujo.Erogacion e
                INNER JOIN flujo.Proveedor p ON p.ProveedorId = e.ProveedorId
                ORDER BY e.Fecha DESC, e.ErogacionId DESC
                """);

            var contratos = cn.Query<ContratoDto>(
                """
                SELECT CAST(k.ContratoId AS NVARCHAR(20)) AS Id,
                       CAST(k.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       k.Numero, c.Nombre AS Cliente, k.Periodicidad,
                       CONVERT(CHAR(10), k.ProximaFacturacion, 23) AS ProximaFacturacion,
                       k.PlazoDias, k.Moneda, k.Monto, k.Facturado, k.Estado, k.Notas
                FROM flujo.Contrato k
                INNER JOIN flujo.Cliente c ON c.ClienteId = k.ClienteId
                ORDER BY k.ProximaFacturacion
                """);

            var pedidos = cn.Query<PedidoDto>(
                """
                SELECT CAST(d.PedidoId AS NVARCHAR(20)) AS Id,
                       CAST(d.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       d.Numero, c.Nombre AS Cliente,
                       CONVERT(CHAR(10), d.FechaCreacion, 23) AS FechaCreacion,
                       d.PlazoDias, d.Moneda, d.Monto, d.Estado
                FROM flujo.Pedido d
                INNER JOIN flujo.Cliente c ON c.ClienteId = d.ClienteId
                ORDER BY d.FechaCreacion DESC, d.PedidoId DESC
                """);

            var tiposCambio = cn.Query<TipoCambioDto>(
                """
                SELECT CAST(t.TipoCambioId AS NVARCHAR(20)) AS Id, t.Valor,
                       CONVERT(NVARCHAR(16), t.VigenteDesde, 126) AS Fecha,
                       ISNULL(u.NombreCompleto, 'Sistema') AS Usuario
                FROM flujo.TipoCambio t
                LEFT JOIN flujo.Usuario u ON u.UsuarioId = t.UsuarioId
                ORDER BY t.VigenteDesde
                """);

            var bitacora = cn.Query<BitacoraDto>(
                """
                SELECT TOP (500) CAST(BitacoraId AS NVARCHAR(20)) AS Id,
                       CONVERT(NVARCHAR(16), FechaHora, 126) AS FechaHora,
                       NombreUsuario AS Usuario, Modulo, Registro, Operacion, ValorAnterior, ValorNuevo
                FROM flujo.Bitacora ORDER BY FechaHora DESC, BitacoraId DESC
                """);

            var usuario = new UsuarioDto(
                ctx.User.UsuarioId().ToString(), ctx.User.NombreUsuario(), ctx.User.Perfil());

            return Results.Ok(new EstadoDto(usuario, companias, bancos, facturas, pagos,
                erogaciones, contratos, pedidos, tiposCambio, bitacora));
        }).RequireAuthorization();
    }
}
