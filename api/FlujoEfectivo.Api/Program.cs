using System.Text.Json;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Endpoints;
using FlujoEfectivo.Api.Seguridad;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<Db>();
builder.Services.AddSingleton<TokenServicio>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.PropertyNameCaseInsensitive = true;
});

// Orígenes permitidos para el sitio React publicado en IIS.
var origenes = builder.Configuration.GetSection("Cors:Origenes").Get<string[]>() ?? ["http://localhost:8080"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));

var tokens = new TokenServicio(builder.Configuration);
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = tokens.Emisor,
            ValidAudience = tokens.Audiencia,
            IssuerSigningKey = tokens.Llave,
            ClockSkew = TimeSpan.FromMinutes(2),
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Errores controlados: nunca se devuelve el detalle interno de SQL Server al cliente.
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Error no controlado en {Ruta}", ctx.Request.Path);
        ctx.Response.StatusCode = 500;
        await ctx.Response.WriteAsJsonAsync(new { mensaje = "Ocurrió un error procesando la solicitud." });
    }
});

var api = app.MapGroup("/api").RequireAuthorization();
api.MapAuth();
api.MapEstado();
api.MapRegistros();

app.MapGet("/api/salud", () => Results.Ok(new { estado = "ok", hora = DateTime.UtcNow }))
   .AllowAnonymous();

app.Run();
