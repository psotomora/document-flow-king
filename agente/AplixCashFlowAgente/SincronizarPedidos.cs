using System.Diagnostics;
using System.Net.Http.Json;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using Microsoft.Data.SqlClient;

internal static class SincronizarPedidos
{
    internal sealed class Trabajo
    {
        public int CompaniaId { get; set; }
        public Guid TrabajoId { get; set; }
    }
    internal sealed class LatidoRespuesta
    {
        public List<Trabajo> Trabajos { get; set; } = [];
        public List<FlujoEfectivo.Api.Datos.PruebaSolicitud> Pruebas { get; set; } = [];
    }
    internal sealed class Fila
    {
        public PedidoDto Pedido { get; set; } = new();
        public List<LineaPedidoDto> Detalle { get; set; } = [];
    }
    internal static async Task Ejecutar(HttpClient http, string api, IConfiguration config, Trabajo trabajo, ILogger log, CancellationToken ct)
    {
        // Primero facturas y contratos (no liberan la reserva); al final Pedidos cierra el trabajo.
        try { await EnviarDocumentos(http, api, config, trabajo, log, ct); }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            log.LogWarning("La nube no aceptó Facturas/Contratos de la compañía {Compania}; se continúa con Pedidos.", trabajo.CompaniaId);
        }

        var reloj = Stopwatch.StartNew();
        List<Fila>? pedidos = null;
        var ok = false;
        try
        {
            var local = config.GetSection("Agente:Companias").GetChildren()
                .FirstOrDefault(c => c.GetValue<int>("CompaniaId") == trabajo.CompaniaId);
            if (local is null) throw new InvalidOperationException("Configure el mapeo local Agente:Companias para esta compañía.");
            var esquema = local["Esquema"] ?? "";
            Softland.ValidarEsquema(esquema);
            var cadena = local["Softland"] ?? config["Agente:Softland"] ?? "";
            using var cn = new SqlConnection(cadena);
            await cn.OpenAsync(ct);
            pedidos = [];
            // Exactamente la misma consulta y mapeo del modo directo; nunca escribe al ERP.
            foreach (var p in Softland.Pedidos(cn, esquema, trabajo.CompaniaId.ToString()).ToList())
            {
                ct.ThrowIfCancellationRequested();
                pedidos.Add(new Fila { Pedido = p, Detalle = Softland.Lineas(cn, esquema, p.Numero).ToList() });
            }
            ok = true;
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            // No registrar cadenas SQL, contraseñas o mensajes de conexión privados.
            log.LogWarning("No se pudo leer Pedidos de la compañía {Compania}; revise el mapeo local y permisos SELECT.", trabajo.CompaniaId);
        }
        var respuesta = await http.PostAsJsonAsync($"{api}/public/agente/pedidos", new
        {
            trabajo.TrabajoId, trabajo.CompaniaId, ok,
            duracionMs = (int)Math.Min(int.MaxValue, reloj.ElapsedMilliseconds), pedidos = ok ? pedidos : null
        }, ct);
        await Verificar(respuesta, "Pedidos", log, ct);
        log.LogInformation("Pedidos compañía {Compania}: {Ok}; {Registros} registros aceptados por la nube.", trabajo.CompaniaId, ok, ok ? pedidos?.Count : 0);
    }

    private static (string esquema, string cadena) Local(IConfiguration config, int compania)
    {
        var local = config.GetSection("Agente:Companias").GetChildren()
            .FirstOrDefault(c => c.GetValue<int>("CompaniaId") == compania)
            ?? throw new InvalidOperationException("Configure el mapeo local Agente:Companias para esta compañía.");
        var esquema = local["Esquema"] ?? "";
        Softland.ValidarEsquema(esquema);
        return (esquema, local["Softland"] ?? config["Agente:Softland"] ?? "");
    }

    private static async Task EnviarDocumentos(HttpClient http, string api, IConfiguration config, Trabajo trabajo, ILogger log, CancellationToken ct)
    {
        var reloj = Stopwatch.StartNew();
        List<object>? facturas = null, contratos = null;
        try
        {
            var (esquema, cadena) = Local(config, trabajo.CompaniaId);
            using var cn = new SqlConnection(cadena);
            await cn.OpenAsync(ct);
            // Mismas consultas y mapeo del modo directo; solo SELECT. El detalle de facturas se
            // replica para las pendientes y las de los últimos 12 meses para acotar el volumen.
            var desde = DateTime.Today.AddMonths(-12).ToString("yyyy-MM-dd");
            facturas = [];
            foreach (var f in Softland.Facturas(cn, esquema, trabajo.CompaniaId.ToString()))
            {
                ct.ThrowIfCancellationRequested();
                var conDetalle = !f.Cobrada || string.CompareOrdinal(f.FechaEmision, desde) >= 0;
                facturas.Add(new { factura = f, detalle = conDetalle ? Softland.LineasFactura(cn, esquema, f.Numero).ToList() : null });
            }
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            facturas = null;
            log.LogWarning("No se pudo leer Facturas de la compañía {Compania}; revise el mapeo local y permisos SELECT.", trabajo.CompaniaId);
        }
        try
        {
            var (esquema, cadena) = Local(config, trabajo.CompaniaId);
            using var cn = new SqlConnection(cadena);
            await cn.OpenAsync(ct);
            contratos = [];
            foreach (var c in Softland.Contratos(cn, esquema, trabajo.CompaniaId.ToString()))
            {
                ct.ThrowIfCancellationRequested();
                contratos.Add(new { contrato = c, detalle = Softland.LineasContrato(cn, esquema, c.Numero).ToList() });
            }
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            contratos = null;
            log.LogWarning("No se pudo leer Contratos de la compañía {Compania}; revise el mapeo local y permisos SELECT.", trabajo.CompaniaId);
        }
        List<DocumentoPorPagarDto>? documentosPagar = null;
        try
        {
            var (esquema, cadena) = Local(config, trabajo.CompaniaId);
            using var cn = new SqlConnection(cadena);
            await cn.OpenAsync(ct);
            documentosPagar = Softland.DocumentosPorPagar(cn, esquema, trabajo.CompaniaId.ToString()).ToList();
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            documentosPagar = null;
            log.LogWarning("No se pudo leer Documentos por pagar de la compañía {Compania}; revise permisos SELECT sobre DOCUMENTOS_CP.", trabajo.CompaniaId);
        }
        var respuesta = await http.PostAsJsonAsync($"{api}/public/agente/documentos", new
        {
            trabajo.TrabajoId, trabajo.CompaniaId,
            facturasOk = facturas is not null, contratosOk = contratos is not null,
            duracionMs = (int)Math.Min(int.MaxValue, reloj.ElapsedMilliseconds), facturas, contratos,
            documentosPagarOk = documentosPagar is not null, documentosPagar
        }, ct);
        await Verificar(respuesta, "Facturas/Contratos/Documentos por pagar", log, ct);
        log.LogInformation("Compañía {Compania}: {Facturas} facturas, {Contratos} contratos y {Pagar} documentos por pagar aceptados por la nube.", trabajo.CompaniaId, facturas?.Count, contratos?.Count, documentosPagar?.Count);
    }

    /// <summary>Muestra en consola el motivo exacto del rechazo de la nube (sin datos privados).</summary>
    private static async Task Verificar(HttpResponseMessage r, string que, ILogger log, CancellationToken ct)
    {
        if (r.IsSuccessStatusCode) return;
        var cuerpo = await r.Content.ReadAsStringAsync(ct);
        if (cuerpo.Length > 500) cuerpo = cuerpo[..500];
        log.LogWarning("La nube rechazó {Que}: HTTP {Codigo} {Cuerpo}", que, (int)r.StatusCode, cuerpo);
        r.EnsureSuccessStatusCode();
    }
}
