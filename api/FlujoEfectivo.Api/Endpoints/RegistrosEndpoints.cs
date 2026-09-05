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
        g.MapPost("/pagos", (NuevoPago p, HttpContext ctx, Db db) =>
        {
            if (!ctx.User.PuedeEditar()) return SinPermiso();
            using var cn = db.Abrir();
            var factura = cn.QueryFirstOrDefault<FilaFactura>(
                "SELECT Numero, Moneda FROM flujo.Factura WHERE FacturaId=@id", new { id = Id(p.FacturaId) });
            if (factura is null) return Results.BadRequest(new { mensaje = "La factura indicada no existe." });

            if (!string.Equals(factura.Moneda.Trim(), p.Moneda, StringComparison.OrdinalIgnoreCase)
                && (p.TipoCambioOperacion is null or <= 0))
                return Results.BadRequest(new
                {
                    mensaje = "Debe indicar el tipo de cambio de la operación cuando la moneda del pago difiere de la factura.",
                });

            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.Pago (FacturaId, CuentaBancariaId, Fecha, Moneda, Monto, TipoCambioOperacion, Metodo, Referencia)
                OUTPUT INSERTED.PagoId
                VALUES (@FacturaId, @BancoId, @Fecha, @Moneda, @Monto, @TipoCambioOperacion, @Metodo, @Referencia)
                """,
                new
                {
                    FacturaId = Id(p.FacturaId), BancoId = Id(p.BancoId), Fecha = DateTime.Parse(p.Fecha),
                    p.Moneda, p.Monto, p.TipoCambioOperacion, p.Metodo, p.Referencia,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Pagos",
                p.Referencia ?? factura.Numero, "Creación", valorNuevo: $"{p.Moneda} {p.Monto}");
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
            var id = cn.ExecuteScalar<int>(
                """
                INSERT INTO flujo.Erogacion (CompaniaId, CuentaBancariaId, NumeroTransferencia, ProveedorId, Fecha, Moneda, Monto, Notas)
                OUTPUT INSERTED.ErogacionId
                VALUES (@CompaniaId, @BancoId, @NumeroTransferencia, @ProveedorId, @Fecha, @Moneda, @Monto, @Notas)
                """,
                new
                {
                    CompaniaId = Id(e.CompaniaId), BancoId = Id(e.BancoId), e.NumeroTransferencia,
                    ProveedorId = proveedorId, Fecha = DateTime.Parse(e.Fecha), e.Moneda, e.Monto, e.Notas,
                });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Erogaciones",
                e.NumeroTransferencia, "Creación", valorNuevo: $"{e.Moneda} {e.Monto}");
            return Results.Ok(new { id = id.ToString() });
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

        g.MapGet("/fuentes-externas/softland", (HttpContext ctx, Db db) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            using var cn = db.Abrir();
            var c = Softland.Leer(cn);
            return Results.Ok(c is null
                ? new FuenteExternaDto(Softland.Fuente, "", "", "", "", false, null, true)
                : new FuenteExternaDto(Softland.Fuente, c.Servidor, c.BaseDatos, c.Esquema, c.Usuario,
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

        g.MapPut("/fuentes-externas/softland", (CambioFuenteExterna f, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            if (string.IsNullOrWhiteSpace(f.Servidor) || string.IsNullOrWhiteSpace(f.BaseDatos) || string.IsNullOrWhiteSpace(f.Esquema))
                return Results.BadRequest(new { mensaje = "Servidor, base de datos y esquema son obligatorios." });
            try { Softland.ValidarEsquema(f.Esquema.Trim()); }
            catch (ArgumentException ex) { return Results.BadRequest(new { mensaje = ex.Message }); }
            using var cn = db.Abrir();
            var actual = Softland.Leer(cn);
            var nuevo = Combinar(actual, f, config["Jwt:Llave"] ?? "");
            Softland.Guardar(cn, nuevo, ctx.User.UsuarioId());
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Parámetros", "Conexión SoftlandERP",
                "Modificación",
                actual is null ? null : $"{actual.Servidor}/{actual.BaseDatos}.{actual.Esquema} ({actual.Usuario})",
                $"{nuevo.Servidor}/{nuevo.BaseDatos}.{nuevo.Esquema} ({nuevo.Usuario})");
            return Results.Ok(new { mensaje = "Conexión a SoftlandERP guardada." });
        });

        g.MapPost("/fuentes-externas/softland/probar", (CambioFuenteExterna f, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!ctx.User.EsAdministrador()) return SinPermiso();
            using var cn = db.Abrir();
            var secreto = config["Jwt:Llave"] ?? "";
            ConfigSoftland cfg;
            try { cfg = Combinar(Softland.Leer(cn), f, secreto); Softland.ValidarEsquema(cfg.Esquema); }
            catch (ArgumentException ex) { return Results.BadRequest(new { mensaje = ex.Message }); }
            var (ok, mensaje, pedidos) = Softland.Probar(cfg, secreto);
            return ok ? Results.Ok(new { mensaje, pedidos }) : Results.BadRequest(new { mensaje });
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
