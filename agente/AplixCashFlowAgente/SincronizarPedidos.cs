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
    }
    internal sealed class Fila
    {
        public PedidoDto Pedido { get; set; } = new();
        public List<LineaPedidoDto> Detalle { get; set; } = [];
    }
    internal static async Task Ejecutar(HttpClient http, string api, IConfiguration config, Trabajo trabajo, ILogger log, CancellationToken ct)
    {
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
        respuesta.EnsureSuccessStatusCode();
        log.LogInformation("Pedidos compañía {Compania}: {Ok}; {Registros} registros aceptados por la nube.", trabajo.CompaniaId, ok, ok ? pedidos?.Count : 0);
    }
}