using System.Data;
using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>Altas, cambios y bajas de facturas, pagos, erogaciones, contratos,
/// pedidos, cuentas bancarias, tipo de cambio y carga inicial.</summary>
public static class RegistrosEndpoints
{
    private sealed class FilaFactura
    {
        public string Numero { get; set; } = "";
        public string Moneda { get; set; } = "";
    }

    private sealed class FilaErogacion
    {
        public string NumeroTransferencia { get; set; } = "";
        public int? DocumentoPorPagarId { get; set; }
        public decimal Monto { get; set; }
        public string Moneda { get; set; } = "";
    }

    private static IResult SinPermiso() =>
        Results.Json(new { mensaje = "Su perfil no permite modificar información." }, statusCode: 403);

    /// <summary>Eliminar información transaccional es privilegio exclusivo del perfil administrador.</summary>
    private static IResult SoloAdministrador() =>
        Results.Json(new { mensaje = "Solo los perfiles administradores pueden eliminar registros transaccionales." }, statusCode: 403);

    private static int Id(string valor) =>
        int.TryParse(valor, out var n) ? n : throw new ArgumentException($"Identificador inválido: {valor}");

    public static void MapRegistros(this IEndpointRouteBuilder g)
    {
        /* ----------------------------- Facturas ----------------------------- */
        g.MapPost("/facturas", (NuevaFactura f, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            if (cn.ExecuteScalar<int>(
                    "SELECT COUNT(1) FROM flujo.Factura WHERE CompaniaId=@c AND Numero=@n",
                    new { c = Id(f.CompaniaId), n = f.Numero }) > 0)
                return Results.BadRequest(new { mensaje = "Ya existe una factura con ese número en la compañía." });

            var clienteId = Db.ObtenerCliente(cn, f.Cliente);
            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.Factura (CompaniaId, Numero, ClienteId, FechaEmision, PlazoDias, Moneda, Monto, Notas)
                OUTPUT INSERTED.FacturaId
                VALUES (@CompaniaId, @Numero, @ClienteId, @FechaEmision, @PlazoDias, @Moneda, @Monto, @Notas)
                """,
                new
                {
                    CompaniaId = Id(f.CompaniaId), f.Numero, ClienteId = clienteId,
                    FechaEmision = DateTime.Parse(f.FechaEmision), f.PlazoDias, f.Moneda, f.Monto, f.Notas,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Facturas", f.Numero,
                "Creación", valorNuevo: $"{f.Moneda} {f.Monto}");
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapDelete("/facturas/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SoloAdministrador();
            if (id.StartsWith(Softland.PrefijoId, StringComparison.Ordinal))
                return Results.BadRequest(new { mensaje = "Las facturas de SoftlandERP no se eliminan desde esta aplicación." });
            using var cn = db.Abrir();
            using var tx = cn.BeginTransaction();
            var numero = cn.QueryFirstOrDefault<string>(
                "SELECT Numero FROM flujo.Factura WHERE FacturaId=@id", new { id = Id(id) }, tx);
            if (numero is null) return Results.NotFound(new { mensaje = "Factura inexistente." });

            cn.Execute("UPDATE flujo.Pedido SET FacturaId = NULL WHERE FacturaId=@id", new { id = Id(id) }, tx);
            cn.Execute("DELETE FROM flujo.Pago WHERE FacturaId=@id", new { id = Id(id) }, tx);
            cn.Execute("DELETE FROM flujo.Factura WHERE FacturaId=@id", new { id = Id(id) }, tx);
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Facturas", numero,
                "Eliminación", valorAnterior: "Factura y pagos asociados", tx: tx);
            tx.Commit();
            return Results.Ok(new { mensaje = "Factura eliminada." });
        });

        /* ------------------------------- Pagos ------------------------------ */
        g.MapPost("/pagos", (NuevoPago p, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();

            // La factura puede ser propia (FacturaId numérico) o de SoftlandERP (prefijo "sl:").
            var esExterna = p.FacturaId.StartsWith(Softland.PrefijoId, StringComparison.Ordinal);
            string numeroFactura;
            string monedaFactura;
            if (esExterna)
            {
                numeroFactura = p.FacturaId[Softland.PrefijoId.Length..];
                var cfg = Softland.Leer(cn);
                if (cfg is null) return Results.BadRequest(new { mensaje = "No hay credenciales de SoftlandERP registradas." });
                string? moneda;
                try { moneda = Softland.MonedaFactura(cfg, config["Jwt:Llave"] ?? "", numeroFactura); }
                catch (Exception ex) { return Results.Json(new { mensaje = "SoftlandERP: " + ex.Message }, statusCode: 502); }
                if (moneda is null) return Results.BadRequest(new { mensaje = "La factura indicada no existe en SoftlandERP." });
                monedaFactura = moneda;
            }
            else
            {
                if (!int.TryParse(p.FacturaId, out _))
                    return Results.BadRequest(new { mensaje = "Identificador de factura inválido." });
                var factura = cn.QueryFirstOrDefault<FilaFactura>(
                    "SELECT Numero, Moneda FROM flujo.Factura WHERE FacturaId=@id", new { id = Id(p.FacturaId) });
                if (factura is null) return Results.BadRequest(new { mensaje = "La factura indicada no existe." });
                numeroFactura = factura.Numero;
                monedaFactura = factura.Moneda;
            }

            if (!string.Equals(monedaFactura.Trim(), p.Moneda, StringComparison.OrdinalIgnoreCase)
                && (p.TipoCambioOperacion is null or <= 0))
                return Results.BadRequest(new
                {
                    mensaje = "Debe indicar el tipo de cambio de la operación cuando la moneda del pago difiere de la factura.",
                });

            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.Pago (FacturaId, FacturaExterna, CuentaBancariaId, Fecha, Moneda, Monto, TipoCambioOperacion, Metodo, Referencia)
                OUTPUT INSERTED.PagoId
                VALUES (@FacturaId, @FacturaExterna, @BancoId, @Fecha, @Moneda, @Monto, @TipoCambioOperacion, @Metodo, @Referencia)
                """,
                new
                {
                    FacturaId = esExterna ? (int?)null : Id(p.FacturaId),
                    FacturaExterna = esExterna ? p.FacturaId : null,
                    BancoId = Id(p.BancoId), Fecha = DateTime.Parse(p.Fecha),
                    p.Moneda, p.Monto, p.TipoCambioOperacion, p.Metodo, p.Referencia,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Pagos",
                p.Referencia ?? numeroFactura, "Creación",
                valorNuevo: $"{p.Moneda} {p.Monto}" + (esExterna ? $" · Factura SoftlandERP {numeroFactura}" : ""));
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapDelete("/pagos/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SoloAdministrador();
            using var cn = db.Abrir();
            var referencia = cn.QueryFirstOrDefault<string?>(
                "SELECT Referencia FROM flujo.Pago WHERE PagoId=@id", new { id = Id(id) });
            var filas = cn.Execute("DELETE FROM flujo.Pago WHERE PagoId=@id", new { id = Id(id) });
            if (filas == 0) return Results.NotFound(new { mensaje = "Pago inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Pagos",
                referencia ?? $"Pago {id}", "Eliminación");
            return Results.Ok(new { mensaje = "Pago eliminado." });
        });

        /* ---------------------------- Erogaciones --------------------------- */
        g.MapPost("/erogaciones", (NuevaErogacion e, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            if (cn.ExecuteScalar<int>(
                    "SELECT COUNT(1) FROM flujo.Erogacion WHERE CompaniaId=@c AND NumeroTransferencia=@t",
                    new { c = Id(e.CompaniaId), t = e.NumeroTransferencia }) > 0)
                return Results.BadRequest(new { mensaje = "El número de transferencia ya fue registrado." });

            var proveedorId = Db.ObtenerProveedor(cn, e.Proveedor);
            // Solo los documentos internos tienen identificador numérico; los del
            // sistema externo se guardan únicamente como número de referencia.
            int? documentoId = int.TryParse(e.DocumentoPagoId, out var docId) ? docId : null;
            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.Erogacion (CompaniaId, CuentaBancariaId, NumeroTransferencia, ProveedorId, Fecha, Moneda, Monto, Notas, DocumentoPorPagarId, DocumentoPagoNumero)
                OUTPUT INSERTED.ErogacionId
                VALUES (@CompaniaId, @BancoId, @NumeroTransferencia, @ProveedorId, @Fecha, @Moneda, @Monto, @Notas, @DocumentoId, @DocumentoNumero)
                """,
                new
                {
                    CompaniaId = Id(e.CompaniaId), BancoId = Id(e.BancoId), e.NumeroTransferencia,
                    ProveedorId = proveedorId, Fecha = DateTime.Parse(e.Fecha), e.Moneda, e.Monto, e.Notas,
                    DocumentoId = documentoId, DocumentoNumero = e.DocumentoPagoNumero,
                });

            // El pago rebaja el saldo del documento interno asociado.
            if (documentoId is not null)
                cn.Execute(
                    """
                    UPDATE flujo.DocumentoPorPagar
                    SET Saldo = CASE WHEN Saldo - @monto < 0 THEN 0 ELSE Saldo - @monto END
                    WHERE DocumentoPorPagarId = @id
                    """, new { monto = e.Monto, id = documentoId });


            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Erogaciones",
                e.NumeroTransferencia, "Creación", valorNuevo: $"{e.Moneda} {e.Monto}");
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/erogaciones/{id}", (string id, NuevaErogacion e, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            var puedeEditarErogaciones = ctx.User.EsAdministrador() || cn.ExecuteScalar<bool>(
                "SELECT ISNULL(EditarErogaciones, 0) FROM flujo.Usuario WHERE UsuarioId=@id",
                new { id = ctx.User.UsuarioId() });
            if (!puedeEditarErogaciones)
                return Results.Json(new { mensaje = "No tiene el privilegio para editar erogaciones." }, statusCode: 403);

            var erogacionId = Id(id);
            var anterior = cn.QueryFirstOrDefault<FilaErogacion>(
                "SELECT NumeroTransferencia, DocumentoPorPagarId, Monto, Moneda FROM flujo.Erogacion WHERE ErogacionId=@id",
                new { id = erogacionId });
            if (anterior is null) return Results.NotFound(new { mensaje = "Erogación inexistente." });
            if (cn.ExecuteScalar<int>(
                    "SELECT COUNT(1) FROM flujo.Erogacion WHERE CompaniaId=@c AND NumeroTransferencia=@t AND ErogacionId<>@id",
                    new { c = Id(e.CompaniaId), t = e.NumeroTransferencia, id = erogacionId }) > 0)
                return Results.BadRequest(new { mensaje = "El número de transferencia ya fue registrado." });

            var proveedorId = Db.ObtenerProveedor(cn, e.Proveedor);
            int? documentoId = int.TryParse(e.DocumentoPagoId, out var docId) ? docId : null;
            using var tx = cn.BeginTransaction();
            if (anterior.DocumentoPorPagarId is not null)
                cn.Execute(
                    "UPDATE flujo.DocumentoPorPagar SET Saldo = CASE WHEN Saldo + @monto > Monto THEN Monto ELSE Saldo + @monto END WHERE DocumentoPorPagarId=@id",
                    new { monto = anterior.Monto, id = anterior.DocumentoPorPagarId }, tx);

            var filas = cn.Execute(
                """
                UPDATE flujo.Erogacion SET
                    CompaniaId=@CompaniaId, CuentaBancariaId=@BancoId,
                    NumeroTransferencia=@NumeroTransferencia, ProveedorId=@ProveedorId,
                    Fecha=@Fecha, Moneda=@Moneda, Monto=@Monto, Notas=@Notas,
                    DocumentoPorPagarId=@DocumentoId, DocumentoPagoNumero=@DocumentoNumero
                WHERE ErogacionId=@Id
                """,
                new
                {
                    Id = erogacionId, CompaniaId = Id(e.CompaniaId), BancoId = Id(e.BancoId),
                    e.NumeroTransferencia, ProveedorId = proveedorId, Fecha = DateTime.Parse(e.Fecha),
                    e.Moneda, e.Monto, e.Notas, DocumentoId = documentoId,
                    DocumentoNumero = e.DocumentoPagoNumero,
                }, tx);
            if (filas == 0) return Results.NotFound(new { mensaje = "Erogación inexistente." });

            if (documentoId is not null)
                cn.Execute(
                    "UPDATE flujo.DocumentoPorPagar SET Saldo = CASE WHEN Saldo - @monto < 0 THEN 0 ELSE Saldo - @monto END WHERE DocumentoPorPagarId=@id",
                    new { monto = e.Monto, id = documentoId }, tx);

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Erogaciones",
                e.NumeroTransferencia, "Modificación",
                valorAnterior: $"{anterior.NumeroTransferencia}; {anterior.Moneda} {anterior.Monto}",
                valorNuevo: $"{e.NumeroTransferencia}; {e.Moneda} {e.Monto}", tx: tx);
            tx.Commit();
            return Results.Ok(new { mensaje = "Erogación actualizada." });
        });

        g.MapDelete("/erogaciones/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SoloAdministrador();
            using var cn = db.Abrir();
            var numero = cn.QueryFirstOrDefault<string>(
                "SELECT NumeroTransferencia FROM flujo.Erogacion WHERE ErogacionId=@id", new { id = Id(id) });
            var filas = cn.Execute("DELETE FROM flujo.Erogacion WHERE ErogacionId=@id", new { id = Id(id) });
            if (filas == 0) return Results.NotFound(new { mensaje = "Erogación inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Erogaciones",
                numero ?? id, "Eliminación");
            return Results.Ok(new { mensaje = "Erogación eliminada." });
        });

        /* ------------------------ Documentos por pagar ---------------------- */
        g.MapPost("/documentos-pagar", (NuevoDocumentoPorPagar d, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            if (cn.ExecuteScalar<int>(
                    "SELECT COUNT(1) FROM flujo.DocumentoPorPagar WHERE CompaniaId=@c AND Numero=@n AND Tipo=@t",
                    new { c = Id(d.CompaniaId), n = d.Numero, t = d.Tipo }) > 0)
                return Results.BadRequest(new { mensaje = "El documento ya fue registrado." });

            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.DocumentoPorPagar (CompaniaId, Proveedor, Numero, Tipo, Fecha, FechaVence, Moneda, Monto, Saldo, Notas)
                OUTPUT INSERTED.DocumentoPorPagarId
                VALUES (@CompaniaId, @Proveedor, @Numero, @Tipo, @Fecha, @FechaVence, @Moneda, @Monto, @Saldo, @Notas)
                """,
                new
                {
                    CompaniaId = Id(d.CompaniaId), d.Proveedor, d.Numero, d.Tipo,
                    Fecha = DateTime.Parse(d.Fecha),
                    FechaVence = string.IsNullOrWhiteSpace(d.FechaVence) ? (DateTime?)null : DateTime.Parse(d.FechaVence),
                    d.Moneda, d.Monto, d.Saldo, d.Notas,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Documentos por pagar",
                d.Numero, "Creación", valorNuevo: $"{d.Moneda} {d.Monto} (saldo {d.Saldo})");
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/documentos-pagar/{id}", (string id, NuevoDocumentoPorPagar d, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            var filas = cn.Execute(
                """
                UPDATE flujo.DocumentoPorPagar
                SET CompaniaId=@CompaniaId, Proveedor=@Proveedor, Numero=@Numero, Tipo=@Tipo,
                    Fecha=@Fecha, FechaVence=@FechaVence, Moneda=@Moneda, Monto=@Monto,
                    Saldo=@Saldo, Notas=@Notas
                WHERE DocumentoPorPagarId=@Id
                """,
                new
                {
                    Id = Id(id), CompaniaId = Id(d.CompaniaId), d.Proveedor, d.Numero, d.Tipo,
                    Fecha = DateTime.Parse(d.Fecha),
                    FechaVence = string.IsNullOrWhiteSpace(d.FechaVence) ? (DateTime?)null : DateTime.Parse(d.FechaVence),
                    d.Moneda, d.Monto, d.Saldo, d.Notas,
                });
            if (filas == 0) return Results.NotFound(new { mensaje = "Documento inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Documentos por pagar",
                d.Numero, "Modificación", valorNuevo: $"{d.Moneda} {d.Monto} (saldo {d.Saldo})");
            return Results.Ok(new { mensaje = "Documento actualizado." });
        });

        g.MapDelete("/documentos-pagar/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SoloAdministrador();
            using var cn = db.Abrir();
            var numero = cn.QueryFirstOrDefault<string>(
                "SELECT Numero FROM flujo.DocumentoPorPagar WHERE DocumentoPorPagarId=@id", new { id = Id(id) });
            var filas = cn.Execute(
                "DELETE FROM flujo.DocumentoPorPagar WHERE DocumentoPorPagarId=@id", new { id = Id(id) });
            if (filas == 0) return Results.NotFound(new { mensaje = "Documento inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Documentos por pagar",
                numero ?? id, "Eliminación");
            return Results.Ok(new { mensaje = "Documento eliminado." });
        });

        /* ----------------------- Documentos por cobrar ---------------------- */
        g.MapPost("/documentos-cobrar", (NuevoDocumentoPorCobrar d, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            if (cn.ExecuteScalar<int>(
                    "SELECT COUNT(1) FROM flujo.DocumentoPorCobrar WHERE CompaniaId=@c AND Numero=@n AND Tipo=@t",
                    new { c = Id(d.CompaniaId), n = d.Numero, t = d.Tipo }) > 0)
                return Results.BadRequest(new { mensaje = "El documento ya fue registrado." });

            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.DocumentoPorCobrar (CompaniaId, Cliente, Numero, Tipo, Fecha, FechaVence, Moneda, Monto, Saldo, Notas)
                OUTPUT INSERTED.DocumentoPorCobrarId
                VALUES (@CompaniaId, @Cliente, @Numero, @Tipo, @Fecha, @FechaVence, @Moneda, @Monto, @Saldo, @Notas)
                """,
                new
                {
                    CompaniaId = Id(d.CompaniaId), d.Cliente, d.Numero, d.Tipo,
                    Fecha = DateTime.Parse(d.Fecha),
                    FechaVence = string.IsNullOrWhiteSpace(d.FechaVence) ? (DateTime?)null : DateTime.Parse(d.FechaVence),
                    d.Moneda, d.Monto, d.Saldo, d.Notas,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Documentos por cobrar",
                d.Numero, "Creación", valorNuevo: $"{d.Moneda} {d.Monto} (saldo {d.Saldo})");
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/documentos-cobrar/{id}", (string id, NuevoDocumentoPorCobrar d, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            var filas = cn.Execute(
                """
                UPDATE flujo.DocumentoPorCobrar
                SET CompaniaId=@CompaniaId, Cliente=@Cliente, Numero=@Numero, Tipo=@Tipo,
                    Fecha=@Fecha, FechaVence=@FechaVence, Moneda=@Moneda, Monto=@Monto,
                    Saldo=@Saldo, Notas=@Notas
                WHERE DocumentoPorCobrarId=@Id
                """,
                new
                {
                    Id = Id(id), CompaniaId = Id(d.CompaniaId), d.Cliente, d.Numero, d.Tipo,
                    Fecha = DateTime.Parse(d.Fecha),
                    FechaVence = string.IsNullOrWhiteSpace(d.FechaVence) ? (DateTime?)null : DateTime.Parse(d.FechaVence),
                    d.Moneda, d.Monto, d.Saldo, d.Notas,
                });
            if (filas == 0) return Results.NotFound(new { mensaje = "Documento inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Documentos por cobrar",
                d.Numero, "Modificación", valorNuevo: $"{d.Moneda} {d.Monto} (saldo {d.Saldo})");
            return Results.Ok(new { mensaje = "Documento actualizado." });
        });

        g.MapDelete("/documentos-cobrar/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SoloAdministrador();
            using var cn = db.Abrir();
            var numero = cn.QueryFirstOrDefault<string>(
                "SELECT Numero FROM flujo.DocumentoPorCobrar WHERE DocumentoPorCobrarId=@id", new { id = Id(id) });
            var filas = cn.Execute(
                "DELETE FROM flujo.DocumentoPorCobrar WHERE DocumentoPorCobrarId=@id", new { id = Id(id) });
            if (filas == 0) return Results.NotFound(new { mensaje = "Documento inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Documentos por cobrar",
                numero ?? id, "Eliminación");
            return Results.Ok(new { mensaje = "Documento eliminado." });
        });

        /* ----------------------------- Contratos ---------------------------- */
        g.MapPost("/contratos", (NuevoContrato c, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            var clienteId = Db.ObtenerCliente(cn, c.Cliente);
            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.Contrato (CompaniaId, Numero, ClienteId, Periodicidad, ProximaFacturacion, PlazoDias, Moneda, Monto, Facturado, Estado, Notas)
                OUTPUT INSERTED.ContratoId
                VALUES (@CompaniaId, @Numero, @ClienteId, @Periodicidad, @ProximaFacturacion, @PlazoDias, @Moneda, @Monto, @Facturado, @Estado, @Notas)
                """,
                new
                {
                    CompaniaId = Id(c.CompaniaId), c.Numero, ClienteId = clienteId, c.Periodicidad,
                    ProximaFacturacion = DateTime.Parse(c.ProximaFacturacion), c.PlazoDias, c.Moneda,
                    c.Monto, c.Facturado, c.Estado, c.Notas,
                });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Contratos", c.Numero, "Creación");
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/contratos/{id}", (string id, CambioContrato c, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            var filas = cn.Execute(
                """
                UPDATE flujo.Contrato SET
                    Periodicidad = ISNULL(@Periodicidad, Periodicidad),
                    ProximaFacturacion = ISNULL(@ProximaFacturacion, ProximaFacturacion),
                    PlazoDias = ISNULL(@PlazoDias, PlazoDias),
                    Moneda = ISNULL(@Moneda, Moneda),
                    Monto = ISNULL(@Monto, Monto),
                    Facturado = ISNULL(@Facturado, Facturado),
                    Estado = ISNULL(@Estado, Estado),
                    Notas = ISNULL(@Notas, Notas)
                WHERE ContratoId = @id
                """,
                new
                {
                    id = Id(id), c.Periodicidad,
                    ProximaFacturacion = c.ProximaFacturacion is null ? (DateTime?)null : DateTime.Parse(c.ProximaFacturacion),
                    c.PlazoDias, c.Moneda, c.Monto, c.Facturado, c.Estado, c.Notas,
                });
            if (filas == 0) return Results.NotFound(new { mensaje = "Contrato inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Contratos", id, "Modificación",
                valorNuevo: System.Text.Json.JsonSerializer.Serialize(c));
            return Results.Ok(new { mensaje = "Contrato actualizado." });
        });

        g.MapDelete("/contratos/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SoloAdministrador();
            using var cn = db.Abrir();
            var filas = cn.Execute("DELETE FROM flujo.Contrato WHERE ContratoId=@id", new { id = Id(id) });
            if (filas == 0) return Results.NotFound(new { mensaje = "Contrato inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Contratos", id, "Eliminación");
            return Results.Ok(new { mensaje = "Contrato eliminado." });
        });

        /* ------------------------------ Pedidos ----------------------------- */
        g.MapPost("/pedidos", (NuevoPedido p, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            var clienteId = Db.ObtenerCliente(cn, p.Cliente);
            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.Pedido (CompaniaId, Numero, ClienteId, FechaCreacion, PlazoDias, Moneda, Monto, Estado)
                OUTPUT INSERTED.PedidoId
                VALUES (@CompaniaId, @Numero, @ClienteId, @FechaCreacion, @PlazoDias, @Moneda, @Monto, @Estado)
                """,
                new
                {
                    CompaniaId = Id(p.CompaniaId), p.Numero, ClienteId = clienteId,
                    FechaCreacion = DateTime.Parse(p.FechaCreacion), p.PlazoDias, p.Moneda, p.Monto, p.Estado,
                });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Pedidos", p.Numero, "Creación");
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/pedidos/{id}", (string id, CambioPedido p, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();

            // Pedido de SoftlandERP: solo se admite el paso a Facturado y se refleja en el ERP.
            if (id.StartsWith(Softland.PrefijoId, StringComparison.Ordinal))
            {
                var numero = id[Softland.PrefijoId.Length..];
                if (!string.Equals(p.Estado, "Facturado", StringComparison.OrdinalIgnoreCase))
                    return Results.BadRequest(new { mensaje = "Los pedidos de SoftlandERP solo pueden pasar a Facturado desde esta aplicación." });
                var cfg = Softland.Leer(cn);
                if (cfg is null) return Results.BadRequest(new { mensaje = "No hay credenciales de SoftlandERP registradas." });
                int afectados;
                try { afectados = Softland.MarcarFacturado(cfg, config["Jwt:Llave"] ?? "", numero); }
                catch (Exception ex) { return Results.Json(new { mensaje = "SoftlandERP: " + ex.Message }, statusCode: 502); }
                if (afectados == 0) return Results.NotFound(new { mensaje = "El pedido no existe en SoftlandERP o ya no está en estado Normal." });
                Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Pedidos", numero, "Modificación",
                    "SoftlandERP: N (Normal)", "SoftlandERP: F (Facturado)");
                return Results.Ok(new { mensaje = "Pedido facturado en SoftlandERP." });
            }

            var filas = cn.Execute(
                """
                UPDATE flujo.Pedido SET
                    PlazoDias = ISNULL(@PlazoDias, PlazoDias),
                    Monto = ISNULL(@Monto, Monto),
                    Moneda = ISNULL(@Moneda, Moneda),
                    Estado = ISNULL(@Estado, Estado)
                WHERE PedidoId = @id
                """,
                new { id = Id(id), p.PlazoDias, p.Monto, p.Moneda, p.Estado });
            if (filas == 0) return Results.NotFound(new { mensaje = "Pedido inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Pedidos", id, "Modificación",
                valorNuevo: System.Text.Json.JsonSerializer.Serialize(p));
            return Results.Ok(new { mensaje = "Pedido actualizado." });
        });

        g.MapDelete("/pedidos/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SoloAdministrador();
            if (id.StartsWith(Softland.PrefijoId, StringComparison.Ordinal))
                return Results.BadRequest(new { mensaje = "Los pedidos de SoftlandERP no se eliminan desde esta aplicación." });
            using var cn = db.Abrir();
            var filas = cn.Execute("DELETE FROM flujo.Pedido WHERE PedidoId=@id", new { id = Id(id) });
            if (filas == 0) return Results.NotFound(new { mensaje = "Pedido inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Pedidos", id, "Eliminación");
            return Results.Ok(new { mensaje = "Pedido eliminado." });
        });

        /* -------------------- Cuentas bancarias (catálogo) ------------------- */
        g.MapPost("/bancos", (NuevoBanco b, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            using var cn = db.Abrir();
            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.CuentaBancaria (CompaniaId, Nombre, SaldoInicialUSD, SaldoInicialCRC, Activo)
                OUTPUT INSERTED.CuentaBancariaId
                VALUES (@CompaniaId, @Nombre, @SaldoInicialUSD, @SaldoInicialCRC, @Activo)
                """,
                new { CompaniaId = Id(b.CompaniaId), b.Nombre, b.SaldoInicialUSD, b.SaldoInicialCRC, b.Activo });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Catálogos", b.Nombre, "Creación");
            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/bancos/{id}", (string id, CambioBanco b, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            using var cn = db.Abrir();
            var filas = cn.Execute(
                """
                UPDATE flujo.CuentaBancaria SET
                    Nombre = ISNULL(@Nombre, Nombre),
                    SaldoInicialUSD = ISNULL(@SaldoInicialUSD, SaldoInicialUSD),
                    SaldoInicialCRC = ISNULL(@SaldoInicialCRC, SaldoInicialCRC),
                    Activo = ISNULL(@Activo, Activo)
                WHERE CuentaBancariaId = @id
                """,
                new { id = Id(id), b.Nombre, b.SaldoInicialUSD, b.SaldoInicialCRC, b.Activo });
            if (filas == 0) return Results.NotFound(new { mensaje = "Cuenta inexistente." });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Catálogos", id, "Modificación",
                valorNuevo: System.Text.Json.JsonSerializer.Serialize(b));
            return Results.Ok(new { mensaje = "Cuenta actualizada." });
        });

        /* --------------------------- Tipo de cambio -------------------------- */
        g.MapPost("/tipos-cambio", (NuevoTipoCambio t, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            if (t.Valor <= 0) return Results.BadRequest(new { mensaje = "El tipo de cambio debe ser mayor que cero." });
            using var cn = db.Abrir();
            var anterior = cn.ExecuteScalar<decimal?>(
                "SELECT TOP 1 Valor FROM flujo.TipoCambio ORDER BY VigenteDesde DESC, TipoCambioId DESC");
            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.TipoCambio (Valor, VigenteDesde, UsuarioId, Nota)
                OUTPUT INSERTED.TipoCambioId VALUES (@valor, SYSUTCDATETIME(), @usuarioId, @nota)
                """,
                new { valor = t.Valor, usuarioId = ctx.User.UsuarioId(), nota = string.IsNullOrWhiteSpace(t.Nota) ? null : t.Nota!.Trim() });
            var detalle = string.IsNullOrWhiteSpace(t.Nota)
                ? t.Valor.ToString()
                : $"{t.Valor} ({t.Nota!.Trim()})";
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Parámetros", "Tipo de cambio",
                "Modificación", anterior?.ToString(), detalle);
            return Results.Ok(new { id = id.ToString() });
        });

        /* ------------------------ Parámetros generales ----------------------- */
        g.MapPut("/parametros/{clave}", (string clave, CambioParametro p, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            if (string.IsNullOrWhiteSpace(clave) || clave.Length > 60)
                return Results.BadRequest(new { mensaje = "Clave de parámetro inválida." });
            var valor = (p.Valor ?? "").Trim();
            if (valor.Length > 200)
                return Results.BadRequest(new { mensaje = "El valor del parámetro es demasiado largo." });
            using var cn = db.Abrir();
            var anterior = cn.ExecuteScalar<string?>(
                "SELECT Valor FROM flujo.Parametro WHERE Clave = @clave", new { clave });
            cn.Execute(
                """
                MERGE flujo.Parametro AS destino
                USING (SELECT @clave AS Clave) AS origen ON destino.Clave = origen.Clave
                WHEN MATCHED THEN
                    UPDATE SET Valor = @valor, Actualizado = SYSUTCDATETIME(), UsuarioId = @usuarioId
                WHEN NOT MATCHED THEN
                    INSERT (Clave, Valor, UsuarioId) VALUES (@clave, @valor, @usuarioId);
                """,
                new { clave, valor, usuarioId = ctx.User.UsuarioId() });
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Parámetros", clave,
                "Modificación", anterior, valor);
            return Results.Ok(new { mensaje = "Parámetro actualizado." });
        });

        /* ------------------ Preferencias personales por usuario ---------------- */
        g.MapPut("/preferencias/{clave}", (string clave, CambioParametro p, HttpContext ctx, Db db) =>
        {
            if (string.IsNullOrWhiteSpace(clave) || clave.Length > 60)
                return Results.BadRequest(new { mensaje = "Clave de preferencia inválida." });
            var valor = (p.Valor ?? "").Trim();
            if (valor.Length > 400)
                return Results.BadRequest(new { mensaje = "El valor de la preferencia es demasiado largo." });
            using var cn = db.Abrir();
            cn.Execute(
                """
                MERGE flujo.PreferenciaUsuario AS destino
                USING (SELECT @usuarioId AS UsuarioId, @clave AS Clave) AS origen
                    ON destino.UsuarioId = origen.UsuarioId AND destino.Clave = origen.Clave
                WHEN MATCHED THEN
                    UPDATE SET Valor = @valor, Actualizado = SYSUTCDATETIME()
                WHEN NOT MATCHED THEN
                    INSERT (UsuarioId, Clave, Valor) VALUES (@usuarioId, @clave, @valor);
                """,
                new { usuarioId = ctx.User.UsuarioId(), clave, valor });
            return Results.Ok(new { mensaje = "Preferencia guardada." });
        });

        /* --------- Histórico de contratos por facturar (meses cerrados) -------- */
        // Tabla dedicada flujo.ContratoMesHistorico: la lista activa se mantiene
        // pequeña y el histórico se consulta aparte, sin afectar el rendimiento.
        g.MapGet("/contratos-mes-historico", (Db db) =>
        {
            using var cn = db.Abrir();
            var filas = cn.Query<ContratoMesHistoricoDto>(
                """
                SELECT Mes, CONVERT(CHAR(10), ArchivadoEn, 23) AS ArchivadoEn,
                       ContratoId, CompaniaId, Numero, Cliente, Periodicidad,
                       CONVERT(CHAR(10), Fecha, 23) AS Fecha,
                       Moneda, Monto, Pagado, Documento
                FROM flujo.ContratoMesHistorico
                ORDER BY Mes DESC, Fecha, Numero
                """);
            return Results.Ok(filas);
        });

        g.MapPost("/contratos-mes-historico", (ArchivoContratosMes a, HttpContext ctx, Db db) =>
        {
            var mes = (a.Mes ?? "").Trim();
            if (mes.Length != 7) return Results.BadRequest(new { mensaje = "Mes inválido (formato AAAA-MM)." });
            var lineas = a.Lineas ?? [];
            var archivadoEn = string.IsNullOrWhiteSpace(a.ArchivadoEn)
                ? DateTime.UtcNow.ToString("yyyy-MM-dd")
                : a.ArchivadoEn!.Trim();

            using var cn = db.Abrir();
            using var tx = cn.BeginTransaction();
            // Se reemplaza el mes completo para que reintentos no dupliquen filas.
            cn.Execute("DELETE FROM flujo.ContratoMesHistorico WHERE Mes = @mes", new { mes }, tx);
            foreach (var l in lineas)
            {
                cn.Execute(
                    """
                    INSERT INTO flujo.ContratoMesHistorico
                        (Mes, ArchivadoEn, ContratoId, CompaniaId, Numero, Cliente,
                         Periodicidad, Fecha, Moneda, Monto, Pagado, Documento)
                    VALUES (@mes, @archivadoEn, @contratoId, @companiaId, @numero, @cliente,
                            @periodicidad, @fecha, @moneda, @monto, @pagado, @documento)
                    """,
                    new
                    {
                        mes,
                        archivadoEn,
                        contratoId = l.ContratoId,
                        companiaId = l.CompaniaId,
                        numero = l.Numero,
                        cliente = l.Cliente,
                        periodicidad = l.Periodicidad,
                        fecha = l.Fecha,
                        moneda = l.Moneda,
                        monto = l.Monto,
                        pagado = l.Pagado,
                        documento = l.Documento,
                    }, tx);
            }
            // Depuración: se conservan los últimos 24 meses archivados.
            cn.Execute(
                """
                DELETE FROM flujo.ContratoMesHistorico
                WHERE Mes NOT IN (SELECT TOP (24) Mes FROM flujo.ContratoMesHistorico GROUP BY Mes ORDER BY Mes DESC)
                """, transaction: tx);
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Contratos",
                $"Histórico {mes}", "Archivo", null, $"{lineas.Count} líneas", tx);
            tx.Commit();
            return Results.Ok(new { mensaje = "Mes archivado en el histórico.", lineas = lineas.Count });
        });



        /* ----------------------- Fuente externa: SoftlandERP ------------------ */
        g.MapGet("/pedidos/{id}/lineas", (string id, Db db, IConfiguration config) =>
        {
            if (!id.StartsWith(Softland.PrefijoId, StringComparison.Ordinal))
                return Results.Ok(Array.Empty<LineaPedidoDto>());
            using var cn = db.Abrir();
            var cfg = Softland.Leer(cn);
            if (cfg is null) return Results.BadRequest(new { mensaje = "No hay credenciales de SoftlandERP registradas." });
            try
            {
                return Results.Ok(Softland.Lineas(cfg, config["Jwt:Llave"] ?? "", id[Softland.PrefijoId.Length..]));
            }
            catch (Exception ex)
            {
                return Results.Json(new { mensaje = "SoftlandERP: " + ex.Message }, statusCode: 502);
            }
        });

        g.MapGet("/contratos/{id}/lineas", (string id, Db db, IConfiguration config) =>
        {
            const string prefijo = Softland.PrefijoId + "ct-";
            if (!id.StartsWith(prefijo, StringComparison.Ordinal))
                return Results.Ok(Array.Empty<LineaContratoDto>());
            using var cn = db.Abrir();
            var cfg = Softland.Leer(cn);
            if (cfg is null) return Results.BadRequest(new { mensaje = "No hay credenciales de SoftlandERP registradas." });
            try
            {
                return Results.Ok(Softland.LineasContrato(cfg, config["Jwt:Llave"] ?? "", id[prefijo.Length..]));
            }
            catch (Exception ex)
            {
                return Results.Json(new { mensaje = "SoftlandERP: " + ex.Message }, statusCode: 502);
            }
        });

        g.MapGet("/facturas/{id}/lineas", (string id, Db db, IConfiguration config) =>
        {
            if (!id.StartsWith(Softland.PrefijoId, StringComparison.Ordinal))
                return Results.Ok(Array.Empty<LineaFacturaDto>());
            using var cn = db.Abrir();
            var cfg = Softland.Leer(cn);
            if (cfg is null) return Results.BadRequest(new { mensaje = "No hay credenciales de SoftlandERP registradas." });
            try
            {
                return Results.Ok(Softland.LineasFactura(cfg, config["Jwt:Llave"] ?? "", id[Softland.PrefijoId.Length..]));
            }
            catch (Exception ex)
            {
                return Results.Json(new { mensaje = "SoftlandERP: " + ex.Message }, statusCode: 502);
            }
        });

        // {fuente} admite "softland" (conexión 1) y "softland2" (conexión 2).
        g.MapGet("/fuentes-externas/{fuente}", (string fuente, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            var nombre = Softland.NombreFuente(fuente);
            if (nombre is null) return Results.NotFound(new { mensaje = "Fuente externa desconocida." });
            using var cn = db.Abrir();
            var c = Softland.Leer(cn, nombre);
            return Results.Ok(c is null
                ? new FuenteExternaDto(nombre, "", "", "", "", false, null, true)
                : new FuenteExternaDto(nombre, c.Servidor, c.BaseDatos, c.Esquema, c.Usuario,
                    !string.IsNullOrEmpty(c.ClaveCifrada), c.CompaniaId?.ToString(), c.Encriptar));
        });

        static ConfigSoftland Combinar(ConfigSoftland? actual, CambioFuenteExterna f, string secreto)
        {
            var clave = f.Clave is null ? (actual?.ClaveCifrada ?? "")
                : f.Clave.Length == 0 ? "" : Softland.Cifrar(f.Clave, secreto);
            return new ConfigSoftland
            {
                Servidor = f.Servidor.Trim(),
                BaseDatos = f.BaseDatos.Trim(),
                Esquema = f.Esquema.Trim(),
                Usuario = (f.Usuario ?? "").Trim(),
                ClaveCifrada = clave,
                CompaniaId = int.TryParse(f.CompaniaId, out var cid) ? cid : actual?.CompaniaId,
                Encriptar = f.Encriptar ?? actual?.Encriptar ?? true,
            };
        }

        g.MapPut("/fuentes-externas/{fuente}", (string fuente, CambioFuenteExterna f, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            var nombre = Softland.NombreFuente(fuente);
            if (nombre is null) return Results.NotFound(new { mensaje = "Fuente externa desconocida." });
            if (string.IsNullOrWhiteSpace(f.Servidor) || string.IsNullOrWhiteSpace(f.BaseDatos) || string.IsNullOrWhiteSpace(f.Esquema))
                return Results.BadRequest(new { mensaje = "Servidor, base de datos y esquema son obligatorios." });
            try { Softland.ValidarEsquema(f.Esquema.Trim()); }
            catch (ArgumentException ex) { return Results.BadRequest(new { mensaje = ex.Message }); }
            using var cn = db.Abrir();
            var actual = Softland.Leer(cn, nombre);
            var nuevo = Combinar(actual, f, config["Jwt:Llave"] ?? "");
            try
            {
                // Evita confirmar una configuración que conserva una clave cifrada
                // con una llave anterior. Al escribir una clave nueva, también
                // comprueba que el valor recién cifrado pueda recuperarse.
                if (!string.IsNullOrEmpty(nuevo.Usuario) && !string.IsNullOrEmpty(nuevo.ClaveCifrada))
                    _ = Softland.Descifrar(nuevo.ClaveCifrada, config["Jwt:Llave"] ?? "");
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new
                {
                    mensaje = "La contraseña guardada pertenece a otra llave de seguridad. Escriba nuevamente la contraseña SQL de la fuente externa antes de guardar."
                });
            }
            Softland.Guardar(cn, nuevo, ctx.User.UsuarioId(), nombre);
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Parámetros", "Conexión " + nombre,
                "Modificación",
                actual is null ? null : $"{actual.Servidor}/{actual.BaseDatos}.{actual.Esquema} ({actual.Usuario})",
                $"{nuevo.Servidor}/{nuevo.BaseDatos}.{nuevo.Esquema} ({nuevo.Usuario})");
            return Results.Ok(new { mensaje = $"Conexión {nombre} guardada." });
        });

        g.MapPost("/fuentes-externas/{fuente}/probar", (string fuente, CambioFuenteExterna f, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            var nombre = Softland.NombreFuente(fuente);
            if (nombre is null) return Results.NotFound(new { mensaje = "Fuente externa desconocida." });
            using var cn = db.Abrir();
            var secreto = config["Jwt:Llave"] ?? "";
            ConfigSoftland cfg;
            try { cfg = Combinar(Softland.Leer(cn, nombre), f, secreto); Softland.ValidarEsquema(cfg.Esquema); }
            catch (ArgumentException ex) { return Results.BadRequest(new { mensaje = ex.Message }); }
            var (ok, mensaje, pedidos) = Softland.Probar(cfg, secreto);
            return ok ? Results.Ok(new { mensaje, pedidos }) : Results.BadRequest(new { mensaje });
        });

        // Documentos del Comparativo anual leídos de una fuente externa concreta (solo FACTURA).
        g.MapGet("/documentos-cobrar/comparativo/{fuente}", (string fuente, HttpContext ctx, Db db, IConfiguration config) =>
        {
            var nombre = Softland.NombreFuente(fuente);
            if (nombre is null) return Results.NotFound(new { mensaje = "Fuente externa desconocida." });
            using var cn = db.Abrir();
            var cfg = Softland.Leer(cn, nombre);
            if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                return Results.BadRequest(new { mensaje = $"La conexión {nombre} aún no tiene credenciales registradas." });
            try
            {
                var companiaId = cfg.CompaniaId?.ToString() ?? "0";
                return Results.Ok(Softland.DocumentosPorCobrar(
                    cfg, config["Jwt:Llave"] ?? "", companiaId, soloFactura: true));
            }
            catch (Exception ex)
            {
                return Results.Json(new { mensaje = nombre + ": " + ex.Message }, statusCode: 502);
            }
        });

        /* ------------------------ Servidor de correo ------------------------- */

        static ConfigCorreo CombinarCorreo(ConfigCorreo? actual, CambioCorreoSmtp f, string secreto) =>
            new()
            {
                Servidor = f.Servidor.Trim(),
                Puerto = f.Puerto is > 0 and < 65536 ? f.Puerto.Value : actual?.Puerto ?? 587,
                Ssl = f.Ssl ?? actual?.Ssl ?? true,
                Usuario = (f.Usuario ?? "").Trim(),
                ClaveCifrada = f.Clave is null
                    ? actual?.ClaveCifrada ?? ""
                    : f.Clave.Length == 0 ? "" : Softland.Cifrar(f.Clave, secreto),
                Remitente = f.Remitente.Trim(),
                NombreRemitente = (f.NombreRemitente ?? "").Trim(),
                CopiaOculta = (f.CopiaOculta ?? "").Trim(),
            };

        g.MapGet("/correo/smtp", (HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            using var cn = db.Abrir();
            var c = Correo.Leer(cn);
            return Results.Ok(c is null
                ? new CorreoSmtpDto("", 587, true, "", false, "", "", "")
                : new CorreoSmtpDto(c.Servidor, c.Puerto, c.Ssl, c.Usuario,
                    !string.IsNullOrEmpty(c.ClaveCifrada), c.Remitente, c.NombreRemitente, c.CopiaOculta));
        });

        g.MapPut("/correo/smtp", (CambioCorreoSmtp f, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            if (string.IsNullOrWhiteSpace(f.Servidor) || string.IsNullOrWhiteSpace(f.Remitente))
                return Results.BadRequest(new { mensaje = "El servidor SMTP y el correo remitente son obligatorios." });
            using var cn = db.Abrir();
            var actual = Correo.Leer(cn);
            var nuevo = CombinarCorreo(actual, f, config["Jwt:Llave"] ?? "");
            Correo.Guardar(cn, nuevo, ctx.User.UsuarioId());
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Parámetros", "Servidor de correo",
                "Modificación",
                actual is null ? null : $"{actual.Servidor}:{actual.Puerto} ({actual.Remitente})",
                $"{nuevo.Servidor}:{nuevo.Puerto} ({nuevo.Remitente})");
            return Results.Ok(new { mensaje = "Servidor de correo guardado." });
        });

        g.MapPost("/correo/smtp/probar", (CambioCorreoSmtp f, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            using var cn = db.Abrir();
            var secreto = config["Jwt:Llave"] ?? "";
            var cfg = CombinarCorreo(Correo.Leer(cn), f, secreto);
            var destino = string.IsNullOrWhiteSpace(f.Destinatario) ? cfg.Remitente : f.Destinatario.Trim();
            var (ok, mensaje) = Correo.Enviar(cfg, secreto, destino,
                "Prueba de correo · Aplix Cash Flow Insights",
                """
                <p>Este es un mensaje de prueba enviado desde <strong>Aplix Cash Flow Insights</strong>.</p>
                <p>Si lo recibió, el servidor de correo está configurado correctamente y ya es posible
                enviar los estados de cuenta.</p>
                """);
            return ok ? Results.Ok(new { mensaje }) : Results.BadRequest(new { mensaje });
        });

        // Envío del estado de cuenta de un cliente con el PDF generado en el navegador.
        g.MapPost("/correo/estado-cuenta", (EnvioEstadoCuenta e, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (string.IsNullOrWhiteSpace(e.Destinatario) || string.IsNullOrWhiteSpace(e.Cliente))
                return Results.BadRequest(new { mensaje = "Indique el cliente y el correo del destinatario." });

            byte[] pdf;
            try { pdf = Convert.FromBase64String(e.ArchivoBase64 ?? ""); }
            catch (FormatException) { return Results.BadRequest(new { mensaje = "El documento adjunto no es válido." }); }
            if (pdf.Length == 0)
                return Results.BadRequest(new { mensaje = "El estado de cuenta está vacío." });

            using var cn = db.Abrir();
            var cfg = Correo.Leer(cn);
            if (cfg is null || string.IsNullOrWhiteSpace(cfg.Servidor))
                return Results.BadRequest(new
                {
                    mensaje = "Falta configurar el servidor de correo en Parámetros → Servidor de correo.",
                });

            var nombre = string.IsNullOrWhiteSpace(e.NombreArchivo) ? "estado-cuenta.pdf" : e.NombreArchivo!;
            // El saludo usa el nombre de la persona indicada; si no se digitó, se dirige al cliente.
            var dirigido = string.IsNullOrWhiteSpace(e.Dirigido)
                ? $"Estimado cliente <strong>{System.Net.WebUtility.HtmlEncode(e.Cliente)}</strong>"
                : $"Estimado(a) <strong>{System.Net.WebUtility.HtmlEncode(e.Dirigido!.Trim())}</strong>";
            var cuerpo =
                $"<p>{dirigido},</p>" +
                "<p>Adjunto encontrará su estado de cuenta con el desglose de las facturas pendientes " +
                $"al {DateTime.Now:dd/MM/yyyy}.</p>" +
                "<p>Cordialmente,<br/><strong>Administración Aplix</strong><br/>Theronix, S. A.</p>";

            var (ok, mensaje) = Correo.Enviar(cfg, config["Jwt:Llave"] ?? "", e.Destinatario.Trim(),
                $"Estado de cuenta · {e.Cliente}", cuerpo, (nombre, pdf));

            if (!ok) return Results.BadRequest(new { mensaje });

            // La bitácora solo admite las operaciones de CK_Bitacora_Operacion; el envío se registra como Exportación.
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Facturas", "Estado de cuenta",
                "Exportación", null,
                $"Envío por correo: {e.Cliente} → {e.Destinatario} ({e.Documentos ?? 0} documentos)");
            return Results.Ok(new { mensaje });
        });

        /* --------------------------- Carga inicial --------------------------- */
        g.MapPost("/importacion/lote", (LoteImportacion lote, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            using var tx = cn.BeginTransaction();
            var insertadas = 0;

            foreach (var f in lote.Facturas ?? [])
            {
                var clienteId = Db.ObtenerCliente(cn, f.Cliente, tx);
                insertadas += cn.Execute(
                    """
                    INSERT INTO flujo.Factura (CompaniaId, Numero, ClienteId, FechaEmision, PlazoDias, Moneda, Monto, Notas)
                    SELECT @CompaniaId, @Numero, @ClienteId, @FechaEmision, @PlazoDias, @Moneda, @Monto, @Notas
                    WHERE NOT EXISTS (SELECT 1 FROM flujo.Factura WHERE CompaniaId=@CompaniaId AND Numero=@Numero)
                    """,
                    new
                    {
                        CompaniaId = Id(f.CompaniaId), f.Numero, ClienteId = clienteId,
                        FechaEmision = DateTime.Parse(f.FechaEmision), f.PlazoDias, f.Moneda, f.Monto, f.Notas,
                    }, tx);
            }

            foreach (var p in lote.Pagos ?? [])
                insertadas += cn.Execute(
                    """
                    INSERT INTO flujo.Pago (FacturaId, CuentaBancariaId, Fecha, Moneda, Monto, TipoCambioOperacion, Metodo, Referencia)
                    VALUES (@FacturaId, @BancoId, @Fecha, @Moneda, @Monto, @TipoCambioOperacion, @Metodo, @Referencia)
                    """,
                    new
                    {
                        FacturaId = Id(p.FacturaId), BancoId = Id(p.BancoId), Fecha = DateTime.Parse(p.Fecha),
                        p.Moneda, p.Monto, p.TipoCambioOperacion, p.Metodo, p.Referencia,
                    }, tx);

            foreach (var e in lote.Erogaciones ?? [])
            {
                var proveedorId = Db.ObtenerProveedor(cn, e.Proveedor, tx);
                insertadas += cn.Execute(
                    """
                    INSERT INTO flujo.Erogacion (CompaniaId, CuentaBancariaId, NumeroTransferencia, ProveedorId, Fecha, Moneda, Monto, Notas)
                    SELECT @CompaniaId, @BancoId, @NumeroTransferencia, @ProveedorId, @Fecha, @Moneda, @Monto, @Notas
                    WHERE NOT EXISTS (SELECT 1 FROM flujo.Erogacion WHERE CompaniaId=@CompaniaId AND NumeroTransferencia=@NumeroTransferencia)
                    """,
                    new
                    {
                        CompaniaId = Id(e.CompaniaId), BancoId = Id(e.BancoId), e.NumeroTransferencia,
                        ProveedorId = proveedorId, Fecha = DateTime.Parse(e.Fecha), e.Moneda, e.Monto, e.Notas,
                    }, tx);
            }

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Carga inicial", "Importación",
                "Importación", valorNuevo: $"{insertadas} registros incorporados", tx: tx);
            tx.Commit();
            return Results.Ok(new { insertadas });
        });
    }
}
