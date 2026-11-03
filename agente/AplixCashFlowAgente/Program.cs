using System.Diagnostics;
using System.Net.Http.Json;
using System.Reflection;
using Microsoft.Data.SqlClient;

// Agente local de Aplix Cash Flow (Fase 2): corre en la red del cliente, solo hace
// llamadas salientes HTTPS a la nube y prueba la conexión con el SQL Server de Softland.
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(o => o.ServiceName = "AplixCashFlowAgente");
builder.Services.AddHttpClient();
builder.Services.AddHostedService<Agente>();
builder.Build().Run();

sealed class Agente(IConfiguration config, IHttpClientFactory http, ILogger<Agente> log) : BackgroundService
{
    private static readonly string Version =
        Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0";

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var apiUrl = (config["Agente:ApiUrl"] ?? "").TrimEnd('/');
        var token = config["Agente:Token"] ?? "";
        var softland = config["Agente:Softland"] ?? "";
        var intervalo = TimeSpan.FromSeconds(Math.Max(15, config.GetValue("Agente:IntervaloSegundos", 60)));
        var cadaDiagnostico = Math.Max(1, config.GetValue("Agente:DiagnosticoCadaLatidos", 5));

        if (apiUrl == "" || token == "")
        {
            log.LogError("Configure Agente:ApiUrl y Agente:Token en appsettings.json.");
            return;
        }

        var cliente = http.CreateClient();
        cliente.Timeout = TimeSpan.FromSeconds(30);
        cliente.DefaultRequestHeaders.Add("x-agent-token", token);
        log.LogInformation("Agente {Version} iniciado. Nube: {Api}", Version, apiUrl);

        var ciclo = 0;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                if (ciclo % cadaDiagnostico == 0)
                {
                    var d = await ProbarSoftland(softland, ct);
                    var r = await cliente.PostAsJsonAsync($"{apiUrl}/public/agente/diagnostico", d, ct);
                    log.LogInformation("Diagnóstico Softland: {Ok} ({Ms} ms) -> nube {Estado}", d.ok, d.latenciaMs, (int)r.StatusCode);
                }
                var resp = await cliente.PostAsJsonAsync($"{apiUrl}/public/agente/latido",
                    new { version = Version, equipo = Environment.MachineName }, ct);
                if (!resp.IsSuccessStatusCode)
                    log.LogWarning("Latido rechazado: {Estado} {Cuerpo}", (int)resp.StatusCode, await resp.Content.ReadAsStringAsync(ct));
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                log.LogWarning("No fue posible contactar la nube: {Mensaje}", ex.Message);
            }
            ciclo++;
            try { await Task.Delay(intervalo, ct); } catch (TaskCanceledException) { }
        }
    }

    private static async Task<DiagnosticoSoftland> ProbarSoftland(string cadena, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cadena))
            return new(false, null, null, "Falta la cadena Agente:Softland en appsettings.json.");
        var reloj = Stopwatch.StartNew();
        try
        {
            await using var cn = new SqlConnection(cadena);
            await cn.OpenAsync(ct);
            await using var cmd = new SqlCommand("SELECT @@VERSION", cn);
            var version = (await cmd.ExecuteScalarAsync(ct))?.ToString()?.Split('\n')[0].Trim();
            return new(true, (int)reloj.ElapsedMilliseconds, version, "Conexión a Softland verificada.");
        }
        catch (Exception ex)
        {
            return new(false, (int)reloj.ElapsedMilliseconds, null, ex.Message);
        }
    }

    private sealed record DiagnosticoSoftland(bool ok, int? latenciaMs, string? versionSql, string mensaje);
}
