namespace FlujoEfectivo.Api.Modelos;

/// <summary>Contratos de datos que consume el frontend React. Los identificadores viajan
/// como cadenas para conservar el mismo modelo de la interfaz.</summary>

public record UsuarioDto(string Id, string Nombre, string Perfil);

public record UsuarioAdminDto(
    string Id,
    string Nombre,
    string NombreUsuario,
    string? Correo,
    string Perfil,
    bool Activo);

public record CompaniaDto(string Id, string Codigo, string Nombre);

public record BancoDto(
    string Id,
    string Nombre,
    string CompaniaId,
    decimal SaldoInicialUSD,
    decimal SaldoInicialCRC,
    bool Activo);

public record FacturaDto(
    string Id,
    string CompaniaId,
    string Numero,
    string Cliente,
    string FechaEmision,
    int PlazoDias,
    string Moneda,
    decimal Monto,
    string? Notas);

public record PagoDto(
    string Id,
    string FacturaId,
    string Fecha,
    string BancoId,
    decimal Monto,
    string Moneda,
    decimal? TipoCambioOperacion,
    string Metodo,
    string? Referencia);

public record ErogacionDto(
    string Id,
    string CompaniaId,
    string BancoId,
    string NumeroTransferencia,
    string Proveedor,
    string Fecha,
    string Moneda,
    decimal Monto,
    string? Notas);

public record ContratoDto(
    string Id,
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

public record PedidoDto(
    string Id,
    string CompaniaId,
    string Numero,
    string Cliente,
    string FechaCreacion,
    int PlazoDias,
    string Moneda,
    decimal Monto,
    string Estado);

public record TipoCambioDto(string Id, decimal Valor, string Fecha, string Usuario, string? Nota);

public record BitacoraDto(
    string Id,
    string FechaHora,
    string Usuario,
    string Modulo,
    string Registro,
    string Operacion,
    string? ValorAnterior,
    string? ValorNuevo);

public record EstadoDto(
    UsuarioDto Usuario,
    IEnumerable<UsuarioAdminDto> Usuarios,
    IEnumerable<CompaniaDto> Companias,
    IEnumerable<BancoDto> Bancos,
    IEnumerable<FacturaDto> Facturas,
    IEnumerable<PagoDto> Pagos,
    IEnumerable<ErogacionDto> Erogaciones,
    IEnumerable<ContratoDto> Contratos,
    IEnumerable<PedidoDto> Pedidos,
    IEnumerable<TipoCambioDto> TiposCambio,
    IEnumerable<BitacoraDto> Bitacora,
    Dictionary<string, string> Parametros);

/* ------------------------- Entradas ------------------------- */

public record LoginRequest(string Usuario, string Contrasena);

public record NuevoUsuario(
    string Nombre,
    string NombreUsuario,
    string? Correo,
    string Perfil,
    bool Activo,
    string? Contrasena);

public record CambioUsuario(
    string? Nombre,
    string? NombreUsuario,
    string? Correo,
    string? Perfil,
    bool? Activo,
    string? Contrasena);

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
