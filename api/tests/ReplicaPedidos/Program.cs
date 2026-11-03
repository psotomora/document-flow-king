using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;

static void Verificar(bool condicion, string regla)
{
    if (!condicion) throw new Exception(regla);
    Console.WriteLine($"OK: {regla}");
}
static ReplicaPedidos.Fila Pedido(string numero) => new()
{
    Pedido = new PedidoDto { Numero = numero, Cliente = "Cliente", FechaCreacion = "2026-11-03", Moneda = "USD", Monto = 19999.99m, Estado = "Pendiente", CompaniaId = "999", Id = "ajeno" },
    Detalle = [new LineaPedidoDto { Linea = 1, Cantidad = 1, PrecioUnitario = 19999.99m }]
};
Verificar(ReplicaPedidos.Validar([]) is null, "Una instantánea vacía exitosa es válida");
Verificar(ReplicaPedidos.Validar(null) is not null, "Un envío ausente no vacía la réplica");
Verificar(ReplicaPedidos.Validar([Pedido("1"), Pedido("1")]) is not null, "No admite pedidos duplicados");
var filas = new List<ReplicaPedidos.Fila> { Pedido("1") };
Verificar(ReplicaPedidos.Validar(filas) is null, "Acepta pedido pendiente con decimal exacto");
ReplicaPedidos.Normalizar(filas, 7);
Verificar(filas[0].Pedido.CompaniaId == "7" && filas[0].Pedido.Id == "sl:ag:7:1", "La compañía y el ID son asignados por el servidor");
Verificar(filas[0].Pedido.Monto == 19999.99m && filas[0].Pedido.Moneda == "USD", "Preserva monto y moneda al centavo");
Verificar(filas[0].Pedido.Lineas == 1 && filas[0].Detalle[0].PrecioUnitario == 19999.99m, "Preserva el detalle del pedido");
var otra = new List<ReplicaPedidos.Fila> { Pedido("1") };
ReplicaPedidos.Normalizar(otra, 8);
Verificar(otra[0].Pedido.Id != filas[0].Pedido.Id, "El mismo número en dos compañías no comparte ID");
filas[0].Pedido.Estado = "Facturado";
Verificar(ReplicaPedidos.Validar(filas) is not null, "La réplica solo acepta pedidos pendientes");
filas[0].Pedido.Estado = "Pendiente";
filas[0].Pedido.Moneda = "EUR";
Verificar(ReplicaPedidos.Validar(filas) is not null, "No admite moneda distinta de USD o CRC");
// Facturas y contratos (Fase 3): mismos IDs del modo directo para no romper pagos ni coincidencias del mes.
static ReplicaDocumentos.FilaFactura Factura(string numero) => new()
{
    Factura = new FacturaDto { Numero = numero, Cliente = "Cliente", FechaEmision = "2026-11-03", Moneda = "USD", Monto = 19000.55m, SaldoErp = 19000.55m, CompaniaId = "999", Id = "ajeno" },
    Detalle = null
};
static ReplicaDocumentos.FilaContrato Contrato(string numero) => new()
{
    Contrato = new ContratoDto { Numero = numero, Cliente = "Cliente", ProximaFacturacion = "2026-11-15", Moneda = "CRC", Monto = 150000m, Estado = "Activo", Id = "ajeno" },
    Detalle = [new LineaContratoDto { Linea = 1 }, new LineaContratoDto { Linea = 2 }]
};
Verificar(ReplicaDocumentos.ValidarFacturas(null) is not null, "Un envío de facturas ausente no vacía la réplica");
Verificar(ReplicaDocumentos.ValidarFacturas([Factura("F1"), Factura("F1")]) is not null, "No admite facturas duplicadas");
var facs = new List<ReplicaDocumentos.FilaFactura> { Factura("F1") };
Verificar(ReplicaDocumentos.ValidarFacturas(facs) is null, "Acepta factura sin detalle replicado");
ReplicaDocumentos.Normalizar(facs, 7);
Verificar(facs[0].Factura.Id == "sl:F1" && facs[0].Factura.CompaniaId == "7", "La factura conserva el ID del modo directo y la compañía del servidor");
Verificar(facs[0].Factura.SaldoErp == 19000.55m, "Preserva el saldo de la factura al centavo");
facs[0].Factura.Moneda = "EUR";
Verificar(ReplicaDocumentos.ValidarFacturas(facs) is not null, "No admite facturas en moneda distinta de USD o CRC");
var cts = new List<ReplicaDocumentos.FilaContrato> { Contrato("C1") };
Verificar(ReplicaDocumentos.ValidarContratos(cts) is null, "Acepta contrato activo con detalle");
ReplicaDocumentos.Normalizar(cts, 7);
Verificar(cts[0].Contrato.Id == "sl:ct-C1" && cts[0].Contrato.Lineas == 2, "El contrato conserva el ID del modo directo y su detalle");
cts[0].Contrato.Estado = "Otro";
Verificar(ReplicaDocumentos.ValidarContratos(cts) is not null, "Solo admite contratos Activo o Cancelado");
