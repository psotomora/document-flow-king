using System.Text.Json;
using Dapper;
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

// Auto-reparación de esquema: agrega columnas nuevas si la base viene de una versión previa.
try
{
    using var cnMig = app.Services.GetRequiredService<Db>().Abrir();
    cnMig.Execute(
        """
        IF OBJECT_ID('flujo.TipoCambio', 'U') IS NOT NULL
           AND COL_LENGTH('flujo.TipoCambio', 'Nota') IS NULL
            ALTER TABLE flujo.TipoCambio ADD Nota NVARCHAR(200) NULL;

        IF OBJECT_ID('flujo.Parametro', 'U') IS NULL
            CREATE TABLE flujo.Parametro
            (
                Clave        NVARCHAR(60)  NOT NULL CONSTRAINT PK_Parametro PRIMARY KEY,
                Valor        NVARCHAR(200) NOT NULL,
                Descripcion  NVARCHAR(200) NULL,
                Actualizado  DATETIME2(0)  NOT NULL CONSTRAINT DF_Parametro_Actualizado DEFAULT SYSUTCDATETIME(),
                UsuarioId    INT           NULL
            );

        IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'pedidosFuenteExterna')
            INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
            VALUES ('pedidosFuenteExterna', '0', 'Usar datos de pedidos de fuente externa (SoftlandERP)');

        IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'pedidosFuenteOrigen')
            INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
            VALUES ('pedidosFuenteOrigen', 'SoftlandERP', 'Fuente externa de pedidos (subparámetro de pedidosFuenteExterna)');
        """);
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "No fue posible verificar/actualizar el esquema al iniciar");
}

var api = app.MapGroup("/api").RequireAuthorization();
api.MapAuth();
api.MapEstado();
api.MapUsuarios();
api.MapRegistros();

app.MapGet("/api/salud", (Db db) =>
{
    try
    {
        using var cn = db.Abrir();
        var esquemaCompleto = cn.ExecuteScalar<int>(
            """
            SELECT CASE WHEN
                OBJECT_ID('flujo.Compania', 'U') IS NOT NULL AND
                OBJECT_ID('flujo.Usuario', 'U') IS NOT NULL AND
                OBJECT_ID('flujo.TipoCambio', 'U') IS NOT NULL AND
                COL_LENGTH('flujo.TipoCambio', 'Nota') IS NOT NULL
            THEN 1 ELSE 0 END
            """) == 1;

        if (esquemaCompleto)
            return Results.Ok(new { estado = "ok", hora = DateTime.UtcNow });

        return Results.Json(new
            {
                estado = "error",
                mensaje = "La base de datos no tiene la estructura requerida. Ejecute en orden los scripts 01_esquema.sql, 02_datos_iniciales.sql, 04_seguridad.sql y 05_parametros.sql."
            }, statusCode: 503);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "No fue posible validar la conexión con SQL Server");
        return Results.Json(new
        {
            estado = "error",
            mensaje = "La API está activa, pero no puede abrir la base FlujoEfectivo. Revise la cadena de conexión, el nombre de la instancia y los permisos de SQL Server."
        }, statusCode: 503);
    }
}).AllowAnonymous();

app.Run();
