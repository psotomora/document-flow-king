using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>GET /api/estado devuelve, en una sola llamada, todo lo que la interfaz necesita.</summary>
public static class EstadoEndpoints
{
    /// <summary>Mensaje legible que incluye la causa raíz del error.</summary>
    private static string Detalle(Exception ex)
    {
        var raiz = ex.GetBaseException();
        return raiz.Message == ex.Message
            ? $"{ex.Message} ({ex.GetType().Name})"
            : $"{ex.Message} → {raiz.Message} ({raiz.GetType().Name})";
    }

    public static void MapEstado(this IEndpointRouteBuilder grupo)
    {
        grupo.MapGet("/estado", (HttpContext ctx, Db db, IConfiguration config) =>
        {
            using var cn = db.Abrir();
            var secreto = config["Jwt:Llave"] ?? "";

            var companias = cn.Query<CompaniaDto>(
                "SELECT CAST(CompaniaId AS NVARCHAR(20)) AS Id, Codigo, Nombre FROM flujo.Compania WHERE Activo = 1 ORDER BY Codigo").ToList();

            var bancos = cn.Query<BancoDto>(
                """
                SELECT CAST(CuentaBancariaId AS NVARCHAR(20)) AS Id, Nombre,
                       CAST(CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       SaldoInicialUSD, SaldoInicialCRC, Activo
                FROM flujo.CuentaBancaria ORDER BY CompaniaId, Nombre
                """);

            var pagos = cn.Query<PagoDto>(
                """
                SELECT CAST(PagoId AS NVARCHAR(20)) AS Id,
                       COALESCE(CAST(FacturaId AS NVARCHAR(20)), FacturaExterna) AS FacturaId,
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
                       e.Moneda, e.Monto, e.Notas,
                       CAST(e.DocumentoPorPagarId AS NVARCHAR(20)) AS DocumentoPagoId,
                       e.DocumentoPagoNumero
                FROM flujo.Erogacion e
                INNER JOIN flujo.Proveedor p ON p.ProveedorId = e.ProveedorId
                ORDER BY e.Fecha DESC, e.ErogacionId DESC
                """);

            var parametros = cn.Query<(string Clave, string Valor)>(
                    "SELECT Clave, Valor FROM flujo.Parametro")
                .ToDictionary(p => p.Clave, p => p.Valor);

            string? avisoFuente = null;

            // Contratos recurrentes: registro interno o fuente externa (CONTRATO / CONTRATO_LINEA).
            IEnumerable<ContratoDto> contratos;
            var contratosSoftland = parametros.GetValueOrDefault("contratosFuenteExterna") == "1"
                && string.Equals(parametros.GetValueOrDefault("pedidosFuenteOrigen", Softland.Fuente),
                    Softland.Fuente, StringComparison.OrdinalIgnoreCase);
            if (contratosSoftland)
            {
                var cfg = Softland.Leer(cn);
                if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                {
                    contratos = [];
                    avisoFuente ??= "La fuente SoftlandERP está activa, pero aún no se registran sus credenciales en Parámetros.";
                }
                else
                {
                    try
                    {
                        var companiaId = cfg.CompaniaId?.ToString()
                            ?? companias.FirstOrDefault()?.Id ?? "0";
                        contratos = Softland.Contratos(cfg, secreto, companiaId).ToList();
                    }
                    catch (Exception ex)
                    {
                        contratos = [];
                        avisoFuente = (avisoFuente is null ? "" : avisoFuente + " ")
                            + "No fue posible leer los contratos de SoftlandERP: " + Detalle(ex);
                    }
                }
            }
            else
            contratos = cn.Query<ContratoDto>(
                """
                SELECT CAST(k.ContratoId AS NVARCHAR(20)) AS Id,
                       CAST(k.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       k.Numero, c.Nombre AS Cliente, k.Periodicidad,
                       CONVERT(CHAR(10), k.ProximaFacturacion, 23) AS ProximaFacturacion,
                       k.PlazoDias, k.Moneda, k.Monto, k.Facturado, k.Estado, k.Notas,
                       CONVERT(CHAR(10), k.CreadoEn, 23) AS FechaCreacion
                FROM flujo.Contrato k
                INNER JOIN flujo.Cliente c ON c.ClienteId = k.ClienteId
                ORDER BY k.ProximaFacturacion
                """);
            IEnumerable<PedidoDto> pedidos;
            var usaSoftland = parametros.GetValueOrDefault("pedidosFuenteExterna") == "1"
                && string.Equals(parametros.GetValueOrDefault("pedidosFuenteOrigen", Softland.Fuente),
                    Softland.Fuente, StringComparison.OrdinalIgnoreCase);
            if (usaSoftland)
            {
                var cfg = Softland.Leer(cn);
                if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                {
                    pedidos = [];
                    avisoFuente = "La fuente SoftlandERP está activa, pero aún no se registran sus credenciales en Parámetros.";
                }
                else
                {
                    try
                    {
                        var companiaId = cfg.CompaniaId?.ToString()
                            ?? companias.FirstOrDefault()?.Id ?? "0";
                        pedidos = Softland.Pedidos(cfg, secreto, companiaId).ToList();
                    }
                    catch (Exception ex)
                    {
                        pedidos = [];
                        avisoFuente = "No fue posible leer los pedidos de SoftlandERP: " + Detalle(ex);
                    }
                }
            }
            else
            pedidos = cn.Query<PedidoDto>(
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

            IEnumerable<FacturaDto> facturas;
            var facturasSoftland = parametros.GetValueOrDefault("facturasFuenteExterna") == "1"
                && string.Equals(parametros.GetValueOrDefault("pedidosFuenteOrigen", Softland.Fuente),
                    Softland.Fuente, StringComparison.OrdinalIgnoreCase);
            if (facturasSoftland)
            {
                var cfg = Softland.Leer(cn);
                if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                {
                    facturas = [];
                    avisoFuente ??= "La fuente SoftlandERP está activa, pero aún no se registran sus credenciales en Parámetros.";
                }
                else
                {
                    try
                    {
                        var companiaId = cfg.CompaniaId?.ToString()
                            ?? companias.FirstOrDefault()?.Id ?? "0";
                        facturas = Softland.Facturas(cfg, secreto, companiaId).ToList();
                    }
                    catch (Exception ex)
                    {
                        facturas = [];
                        avisoFuente = (avisoFuente is null ? "" : avisoFuente + " ")
                            + "No fue posible leer las facturas de SoftlandERP: " + Detalle(ex);
                    }
                }
            }
            else
            facturas = cn.Query<FacturaDto>(
                """
                SELECT CAST(f.FacturaId AS NVARCHAR(20)) AS Id,
                       CAST(f.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       f.Numero, c.Nombre AS Cliente,
                       CONVERT(CHAR(10), f.FechaEmision, 23) AS FechaEmision,
                       f.PlazoDias, f.Moneda, f.Monto, f.Notas,
                       CONVERT(CHAR(10), f.CreadoEn, 23) AS FechaCreacion
                FROM flujo.Factura f
                INNER JOIN flujo.Cliente c ON c.ClienteId = f.ClienteId
                WHERE f.Anulada = 0
                ORDER BY f.FechaEmision DESC, f.FacturaId DESC
                """);


            // Documentos por pagar: registro interno o fuente externa (DOCUMENTOS_CP).
            IEnumerable<DocumentoPorPagarDto> documentosPorPagar;
            var cpSoftland = parametros.GetValueOrDefault("documentosPagoFuenteExterna") == "1"
                && string.Equals(parametros.GetValueOrDefault("pedidosFuenteOrigen", Softland.Fuente),
                    Softland.Fuente, StringComparison.OrdinalIgnoreCase);
            if (cpSoftland)
            {
                var cfg = Softland.Leer(cn);
                if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                {
                    documentosPorPagar = [];
                    avisoFuente ??= "La fuente SoftlandERP está activa, pero aún no se registran sus credenciales en Parámetros.";
                }
                else
                {
                    try
                    {
                        var companiaId = cfg.CompaniaId?.ToString()
                            ?? companias.FirstOrDefault()?.Id ?? "0";
                        documentosPorPagar = Softland.DocumentosPorPagar(cfg, secreto, companiaId).ToList();
                    }
                    catch (Exception ex)
                    {
                        documentosPorPagar = [];
                        avisoFuente = (avisoFuente is null ? "" : avisoFuente + " ")
                            + "No fue posible leer los documentos por pagar de SoftlandERP: " + Detalle(ex);
                    }
                }
            }
            else
            documentosPorPagar = cn.Query<DocumentoPorPagarDto>(
                """
                SELECT CAST(d.DocumentoPorPagarId AS NVARCHAR(20)) AS Id,
                       CAST(d.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       d.Proveedor, d.Numero, d.Tipo,
                       CONVERT(CHAR(10), d.Fecha, 23) AS Fecha,
                       CONVERT(CHAR(10), d.FechaVence, 23) AS FechaVence,
                       d.Moneda, d.Monto, d.Saldo, d.Notas
                FROM flujo.DocumentoPorPagar d
                WHERE d.Saldo > 0 AND d.Anulado = 0
                ORDER BY d.Fecha DESC, d.DocumentoPorPagarId DESC
                """);

            // Documentos por cobrar (FAC y DEV): registro interno o fuente externa (DOCUMENTOS_CC).
            IEnumerable<DocumentoPorCobrarDto> documentosPorCobrar;
            var ccSoftland = parametros.GetValueOrDefault("documentosCobroFuenteExterna") == "1"
                && string.Equals(parametros.GetValueOrDefault("pedidosFuenteOrigen", Softland.Fuente),
                    Softland.Fuente, StringComparison.OrdinalIgnoreCase);
            if (ccSoftland)
            {
                var cfg = Softland.Leer(cn);
                if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                {
                    documentosPorCobrar = [];
                    avisoFuente ??= "La fuente SoftlandERP está activa, pero aún no se registran sus credenciales en Parámetros.";
                }
                else
                {
                    try
                    {
                        var companiaId = cfg.CompaniaId?.ToString()
                            ?? companias.FirstOrDefault()?.Id ?? "0";
                        documentosPorCobrar = Softland.DocumentosPorCobrar(cfg, secreto, companiaId).ToList();
                    }
                    catch (Exception ex)
                    {
                        documentosPorCobrar = [];
                        avisoFuente = (avisoFuente is null ? "" : avisoFuente + " ")
                            + "No fue posible leer los documentos por cobrar de SoftlandERP: " + Detalle(ex);
                    }
                }
            }
            else
            documentosPorCobrar = cn.Query<DocumentoPorCobrarDto>(
                """
                SELECT CAST(d.DocumentoPorCobrarId AS NVARCHAR(20)) AS Id,
                       CAST(d.CompaniaId AS NVARCHAR(20)) AS CompaniaId,
                       d.Cliente, d.Numero, d.Tipo,
                       CONVERT(CHAR(10), d.Fecha, 23) AS Fecha,
                       CONVERT(CHAR(10), d.FechaVence, 23) AS FechaVence,
                       d.Moneda, d.Monto, d.Saldo, d.Notas
                FROM flujo.DocumentoPorCobrar d
                WHERE d.Anulado = 0
                ORDER BY d.Fecha DESC, d.DocumentoPorCobrarId DESC
                """);

            var tiposCambio = cn.Query<TipoCambioDto>(
                """
                SELECT CAST(t.TipoCambioId AS NVARCHAR(20)) AS Id, t.Valor,
                       CONVERT(NVARCHAR(16), t.VigenteDesde, 126) AS Fecha,
                       ISNULL(u.NombreCompleto, 'Sistema') AS Usuario, t.Nota
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

            var esAdmin = string.Equals(ctx.User.Perfil(), "administrador", StringComparison.OrdinalIgnoreCase);
            const string consultaUsuarios =
                """
                SELECT CAST(u.UsuarioId AS NVARCHAR(20)) AS Id, u.NombreCompleto AS Nombre,
                       u.NombreUsuario, u.CorreoElectronico AS Correo, p.Codigo AS Perfil, u.Activo,
                       u.VerBancos, u.VerConsolidado, u.VerErogaciones, u.VerProyeccion, u.VerCatalogos,
                       u.EditarErogaciones, u.AsignarFacturaContrato
                FROM flujo.Usuario u
                INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
                """;
            // El administrador ve la lista completa; los demás perfiles solo su
            // propio registro, para conocer sus permisos de visibilidad.
            var usuarios = esAdmin
                ? cn.Query<UsuarioAdminDto>(consultaUsuarios + " ORDER BY u.NombreCompleto")
                : cn.Query<UsuarioAdminDto>(consultaUsuarios + " WHERE u.UsuarioId = @usuarioId",
                    new { usuarioId = ctx.User.UsuarioId() });

            var usuario = new UsuarioDto(
                ctx.User.UsuarioId().ToString(), ctx.User.NombreUsuario(), ctx.User.Perfil());

            // Preferencias personales del usuario autenticado (filtros recordados).
            var preferencias = new Dictionary<string, string>();
            try
            {
                preferencias = cn.Query<(string Clave, string Valor)>(
                        "SELECT Clave, Valor FROM flujo.PreferenciaUsuario WHERE UsuarioId = @usuarioId",
                        new { usuarioId = ctx.User.UsuarioId() })
                    .ToDictionary(p => p.Clave, p => p.Valor);
            }
            catch
            {
                // La tabla puede no existir en bases antiguas; se ignora.
            }

            return Results.Ok(new EstadoDto(usuario, usuarios, companias, bancos, facturas, pagos,
                erogaciones, documentosPorPagar, documentosPorCobrar, contratos, pedidos,
                tiposCambio, bitacora, parametros, avisoFuente, preferencias));
        }).RequireAuthorization();
    }
}
