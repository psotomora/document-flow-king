using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Endpoints;
using FlujoEfectivo.Api.Seguridad;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddSingleton<Db>();
builder.Services.AddSingleton<TokenServicio>();
builder.Services.AddAuthorization();
await using var app = builder.Build();
app.MapGroup("/api").MapAuth();
await app.StartAsync();
var direcciones = app.Services.GetRequiredService<IServer>().Features
    .Get<IServerAddressesFeature>()?.Addresses;
using var cliente = new HttpClient
{
    BaseAddress = new Uri(direcciones?.Single() ?? throw new Exception("Sin dirección")),
};

static void Exigir(bool condicion, string regla)
{
    if (!condicion) throw new Exception(regla);
}
async Task<HttpStatusCode> Login(string contrasena)
{
    using var respuesta = await cliente.PostAsJsonAsync("/api/auth/login",
        new { Usuario = "prueba", Contrasena = contrasena });
    return respuesta.StatusCode;
}

foreach (var excepcion in new[] { false, true })
{
    Db.Reiniciar();
    var hashAnterior = Db.Hash;
    Correo.Ok = false;
    Correo.Lanzar = excepcion;
    using var respuesta = await cliente.PostAsJsonAsync("/api/auth/recuperar", new { Usuario = "prueba" });
    Exigir(respuesta.StatusCode == (excepcion ? HttpStatusCode.InternalServerError : HttpStatusCode.BadRequest),
        "El envío fallido debe reportar error");
    Exigir(Db.Hash == hashAnterior && Db.Cambios == 0, "Un envío fallido no debe cambiar la contraseña");
    Exigir(Db.Recuperaciones == 0, "Un envío fallido no debe auditar una recuperación exitosa");
    Exigir(await Login(Db.Anterior) == HttpStatusCode.OK, "La contraseña anterior debe seguir permitiendo ingresar");
    Console.WriteLine($"PASS: {(excepcion ? "excepción" : "rechazo")} conserva la contraseña y permite iniciar sesión");
}

Db.Reiniciar();
Correo.Ok = true;
Correo.Lanzar = false;
using (var respuesta = await cliente.PostAsJsonAsync("/api/auth/recuperar", new { Usuario = "prueba" }))
    Exigir(respuesta.StatusCode == HttpStatusCode.OK, "Un envío exitoso debe completar la recuperación");
var temporal = Regex.Match(Correo.Cuerpo, "font-size:16px\">([^<]+)").Groups[1].Value;
Exigir(temporal.Length == 10, "Debe enviarse una contraseña temporal");
Exigir(Db.Cambios == 1 && Db.Recuperaciones == 1, "Debe guardar y auditar una sola recuperación");
Exigir(Db.Pasos.SequenceEqual(new[] { "enviar", "guardar" }), "Debe enviar antes de guardar");
Exigir(await Login(temporal) == HttpStatusCode.OK, "La contraseña enviada debe permitir ingresar");
Exigir(await Login(Db.Anterior) == HttpStatusCode.Unauthorized, "La contraseña temporal debe reemplazar la anterior");
Console.WriteLine("PASS: envío exitoso guarda después de enviar y permite ingresar con la temporal");
await app.StopAsync();