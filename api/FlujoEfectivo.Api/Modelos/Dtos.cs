namespace FlujoEfectivo.Api.Modelos;

/// <summary>Contratos de datos que consume el frontend React. Los identificadores viajan
/// como cadenas para conservar el mismo modelo de la interfaz.</summary>

public record UsuarioDto(string Id, string Nombre, string Perfil);

public class UsuarioAdminDto
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string NombreUsuario { get; set; } = "";
    public string? Correo { get; set; }
    public string Perfil { get; set; } = "";
    public bool Activo { get; set; }
    public bool VerBancos { get; set; } = true;
    public bool VerConsolidado { get; set; } = true;
    public bool VerErogaciones { get; set; } = true;
    public bool VerProyeccion { get; set; } = true;
    public bool VerCatalogos { get; set; } = true;
}

public class CompaniaDto
{
    public string Id { get; set; } = "";
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
}

public class BancoDto
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string CompaniaId { get; set; } = "";
    public decimal SaldoInicialUSD { get; set; }
    public decimal SaldoInicialCRC { get; set; }
    public bool Activo { get; set; }
}

public class FacturaDto
{
    public FacturaDto() { }

    public FacturaDto(
        string id,
        string companiaId,
        string numero,
        string cliente,
        string fechaEmision,
        int plazoDias,
        string moneda,
        decimal monto,
        string? notas,
        string? origen = null,
        int? lineas = null,
        bool cobrada = false,
        decimal? saldoErp = null,
        string? fechaVence = null,
        string? fechaCreacion = null)
    {
        Cobrada = cobrada;
        SaldoErp = saldoErp;
        FechaVence = fechaVence;
        FechaCreacion = fechaCreacion;
        Id = id;
        CompaniaId = companiaId;
        Numero = numero;
        Cliente = cliente;
        FechaEmision = fechaEmision;
        PlazoDias = plazoDias;
        Moneda = moneda;
        Monto = monto;
        Notas = notas;
        Origen = origen;
        Lineas = lineas;
    }

    public string Id { get; set; } = "";
    public string CompaniaId { get; set; } = "";
    public string Numero { get; set; } = "";
    public string Cliente { get; set; } = "";
    public string FechaEmision { get; set; } = "";
    public int PlazoDias { get; set; }
    public string Moneda { get; set; } = "";
    public decimal Monto { get; set; }
    public string? Notas { get; set; }
    public string? Origen { get; set; }
    public int? Lineas { get; set; }
    /// <summary>Verdadero cuando la factura ya está cobrada en el ERP de origen.</summary>
    public bool Cobrada { get; set; }
    /// <summary>Saldo pendiente según cuentas por cobrar del ERP (DOCUMENTOS_CC.SALDO).</summary>
    public decimal? SaldoErp { get; set; }
    /// <summary>Fecha de vencimiento registrada en cuentas por cobrar del ERP.</summary>
    public string? FechaVence { get; set; }
    /// <summary>Fecha en que se creó el registro en el sistema.</summary>
    public string? FechaCreacion { get; set; }
}

public class LineaFacturaDto
{
    public LineaFacturaDto() { }

    public LineaFacturaDto(
        int linea,
        string articulo,
        string? descripcion,
        decimal cantidad,
        decimal precioUnitario,
        decimal descuento,
        decimal impuesto,
        decimal total,
        string? bodega,
        string? pedido)
    {
        Linea = linea;
        Articulo = articulo;
        Descripcion = descripcion;
        Cantidad = cantidad;
        PrecioUnitario = precioUnitario;
        Descuento = descuento;
        Impuesto = impuesto;
        Total = total;
        Bodega = bodega;
        Pedido = pedido;
    }

    public int Linea { get; set; }
    public string Articulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
    public string? Bodega { get; set; }
    public string? Pedido { get; set; }
}

public class PagoDto
{
    public string Id { get; set; } = "";
    public string FacturaId { get; set; } = "";
    public string Fecha { get; set; } = "";
    public string BancoId { get; set; } = "";
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "";
    public decimal? TipoCambioOperacion { get; set; }
    public string Metodo { get; set; } = "";
    public string? Referencia { get; set; }
}

public class ErogacionDto
{
    public string Id { get; set; } = "";
    public string CompaniaId { get; set; } = "";
    public string BancoId { get; set; } = "";
    public string NumeroTransferencia { get; set; } = "";
    public string Proveedor { get; set; } = "";
    public string Fecha { get; set; } = "";
    public string Moneda { get; set; } = "";
    public decimal Monto { get; set; }
    public string? Notas { get; set; }
    public string? DocumentoPagoId { get; set; }
    public string? DocumentoPagoNumero { get; set; }
}

public class DocumentoPorPagarDto
{
    public string Id { get; set; } = "";
    public string CompaniaId { get; set; } = "";
    public string Proveedor { get; set; } = "";
    public string Numero { get; set; } = "";
    public string Tipo { get; set; } = "";
    public string Fecha { get; set; } = "";
    public string? FechaVence { get; set; }
    public string Moneda { get; set; } = "";
    public decimal Monto { get; set; }
    public decimal Saldo { get; set; }
    public string? Origen { get; set; }
    public string? Notas { get; set; }
}

/// <summary>Documento de cuentas por cobrar del cliente (FAC o DEV), cobrado o pendiente.</summary>
public class DocumentoPorCobrarDto
{
    public string Id { get; set; } = "";
    public string CompaniaId { get; set; } = "";
    public string Cliente { get; set; } = "";
    public string Numero { get; set; } = "";
    public string Tipo { get; set; } = "";
    public string Fecha { get; set; } = "";
    public string? FechaVence { get; set; }
    public string Moneda { get; set; } = "";
    public decimal Monto { get; set; }
    public decimal Saldo { get; set; }
    public string? Origen { get; set; }
    public string? Notas { get; set; }
}

public class ContratoDto
{
    public string Id { get; set; } = "";
    public string CompaniaId { get; set; } = "";
    public string Numero { get; set; } = "";
    public string Cliente { get; set; } = "";
    public string Periodicidad { get; set; } = "";
    public string ProximaFacturacion { get; set; } = "";
    public int PlazoDias { get; set; }
    public string Moneda { get; set; } = "";
    public decimal Monto { get; set; }
    public bool Facturado { get; set; }
    public string Estado { get; set; } = "";
    public string? Notas { get; set; }
    /// <summary>Fecha en que se creó el contrato en el sistema.</summary>
    public string? FechaCreacion { get; set; }
}

public class PedidoDto
{
    public string Id { get; set; } = "";
    public string CompaniaId { get; set; } = "";
    public string Numero { get; set; } = "";
    public string Cliente { get; set; } = "";
    public string FechaCreacion { get; set; } = "";
    public int PlazoDias { get; set; }
    public string Moneda { get; set; } = "";
    public decimal Monto { get; set; }
    public string Estado { get; set; } = "";
    public string? Notas { get; set; }
    public string? Origen { get; set; }
    public int? Lineas { get; set; }
}

public class TipoCambioDto
{
    public string Id { get; set; } = "";
    public decimal Valor { get; set; }
    public string Fecha { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string? Nota { get; set; }
}

public class BitacoraDto
{
    public string Id { get; set; } = "";
    public string FechaHora { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string Modulo { get; set; } = "";
    public string Registro { get; set; } = "";
    public string Operacion { get; set; } = "";
    public string? ValorAnterior { get; set; }
    public string? ValorNuevo { get; set; }
}

public record EstadoDto(
    UsuarioDto Usuario,
    IEnumerable<UsuarioAdminDto> Usuarios,
    IEnumerable<CompaniaDto> Companias,
    IEnumerable<BancoDto> Bancos,
    IEnumerable<FacturaDto> Facturas,
    IEnumerable<PagoDto> Pagos,
    IEnumerable<ErogacionDto> Erogaciones,
    IEnumerable<DocumentoPorPagarDto> DocumentosPorPagar,
    IEnumerable<DocumentoPorCobrarDto> DocumentosPorCobrar,
    IEnumerable<ContratoDto> Contratos,
    IEnumerable<PedidoDto> Pedidos,
    IEnumerable<TipoCambioDto> TiposCambio,
    IEnumerable<BitacoraDto> Bitacora,
    Dictionary<string, string> Parametros,
    string? AvisoFuenteExterna = null,
    Dictionary<string, string>? Preferencias = null);

/* ------------------------- Entradas ------------------------- */

public record LoginRequest(string Usuario, string Contrasena);

public record NuevoUsuario(
    string Nombre,
    string NombreUsuario,
    string? Correo,
    string Perfil,
    bool Activo,
    string? Contrasena,
    bool? VerBancos = null,
    bool? VerConsolidado = null,
    bool? VerErogaciones = null,
    bool? VerProyeccion = null,
    bool? VerCatalogos = null);

public record CambioUsuario(
    string? Nombre,
    string? NombreUsuario,
    string? Correo,
    string? Perfil,
    bool? Activo,
    string? Contrasena,
    bool? VerBancos = null,
    bool? VerConsolidado = null,
    bool? VerErogaciones = null,
    bool? VerProyeccion = null,
    bool? VerCatalogos = null);

public record LoginResponse(string Token, UsuarioDto Usuario, DateTime Expira);

public record NuevaFactura(
    string CompaniaId,
    string Numero,
    string Cliente,
    string FechaEmision,
    int PlazoDias,
    string Moneda,
    decimal Monto,
    string? Notas);

public record NuevoPago(
    string FacturaId,
    string Fecha,
    string BancoId,
    decimal Monto,
    string Moneda,
    decimal? TipoCambioOperacion,
    string Metodo,
    string? Referencia);

public record NuevaErogacion(
    string CompaniaId,
    string BancoId,
    string NumeroTransferencia,
    string Proveedor,
    string Fecha,
    string Moneda,
    decimal Monto,
    string? Notas,
    string? DocumentoPagoId = null,
    string? DocumentoPagoNumero = null);

public record NuevoDocumentoPorCobrar(
    string CompaniaId,
    string Cliente,
    string Numero,
    string Tipo,
    string Fecha,
    string? FechaVence,
    string Moneda,
    decimal Monto,
    decimal Saldo,
    string? Notas);

public record NuevoDocumentoPorPagar(
    string CompaniaId,
    string Proveedor,
    string Numero,
    string Tipo,
    string Fecha,
    string? FechaVence,
    string Moneda,
    decimal Monto,
    decimal Saldo,
    string? Notas);

public record NuevoContrato(
    string CompaniaId,
    string Numero,
    string Cliente,
    string Periodicidad,
    string ProximaFacturacion,
    int PlazoDias,
    string Moneda,
    decimal Monto,
    bool Facturado,
    string Estado,
    string? Notas);

public record CambioContrato(
    string? Periodicidad,
    string? ProximaFacturacion,
    int? PlazoDias,
    string? Moneda,
    decimal? Monto,
    bool? Facturado,
    string? Estado,
    string? Notas);

public class LineaPedidoDto
{
    public LineaPedidoDto() { }

    public LineaPedidoDto(
        int linea,
        string articulo,
        string? descripcion,
        decimal cantidad,
        decimal cantidadFacturada,
        decimal precioUnitario,
        decimal descuento,
        string fechaEntrega,
        string? estado)
    {
        Linea = linea;
        Articulo = articulo;
        Descripcion = descripcion;
        Cantidad = cantidad;
        CantidadFacturada = cantidadFacturada;
        PrecioUnitario = precioUnitario;
        Descuento = descuento;
        FechaEntrega = fechaEntrega;
        Estado = estado;
    }

    public int Linea { get; set; }
    public string Articulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public decimal Cantidad { get; set; }
    public decimal CantidadFacturada { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public string FechaEntrega { get; set; } = "";
    public string? Estado { get; set; }
}

public record FuenteExternaDto(
    string Fuente,
    string Servidor,
    string BaseDatos,
    string Esquema,
    string Usuario,
    bool TieneClave,
    string? CompaniaId,
    bool Encriptar);

public record CambioFuenteExterna(
    string Servidor,
    string BaseDatos,
    string Esquema,
    string? Usuario,
    string? Clave,
    string? CompaniaId,
    bool? Encriptar);

public record NuevoPedido(
    string CompaniaId,
    string Numero,
    string Cliente,
    string FechaCreacion,
    int PlazoDias,
    string Moneda,
    decimal Monto,
    string Estado);

public record CambioPedido(int? PlazoDias, decimal? Monto, string? Moneda, string? Estado);

public record NuevoBanco(
    string Nombre,
    string CompaniaId,
    decimal SaldoInicialUSD,
    decimal SaldoInicialCRC,
    bool Activo);

public record CambioBanco(
    string? Nombre,
    decimal? SaldoInicialUSD,
    decimal? SaldoInicialCRC,
    bool? Activo);

public record NuevoTipoCambio(decimal Valor, string? Nota);

public record CambioParametro(string Valor);

public record LoteImportacion(
    List<NuevaFactura>? Facturas,
    List<NuevoPago>? Pagos,
    List<NuevaErogacion>? Erogaciones);
