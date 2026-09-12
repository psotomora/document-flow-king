using System.Text.Json;
using System.Reflection;
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
    p.WithOrigins(origenes)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("X-FlujoEfectivo-Api-Version", "X-FlujoEfectivo-Request-Id")));

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
var versionApi = Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "desconocida";

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.Use(async (ctx, next) =>
{
    var requestId = ctx.TraceIdentifier;
    ctx.Response.Headers["X-FlujoEfectivo-Api-Version"] = versionApi;
    ctx.Response.Headers["X-FlujoEfectivo-Request-Id"] = requestId;
    app.Logger.LogInformation("Solicitud {RequestId}: {Metodo} {Ruta}",
        requestId, ctx.Request.Method, ctx.Request.Path);
    await next();
});
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
        var raiz = ex;
        while (raiz.InnerException is not null) raiz = raiz.InnerException;
        var sql = raiz as Microsoft.Data.SqlClient.SqlException;
        await ctx.Response.WriteAsJsonAsync(new
        {
            mensaje = $"Error en {ctx.Request.Path}: {raiz.Message}",
            tipo = raiz.GetType().Name,
            codigoSql = sql?.Number,
            detalle = raiz.Message,
        });
    }
});

// Licenciamiento: si la licencia está vencida (sin gracia), es de otro servidor o falta,
// la API responde 402 y solo deja pasar salud, autenticación y las rutas de licencia.
app.Use(async (ctx, next) =>
{
    var ruta = ctx.Request.Path.Value ?? "";
    var exenta = !ruta.StartsWith("/api", StringComparison.OrdinalIgnoreCase)
        || ruta.StartsWith("/api/salud", StringComparison.OrdinalIgnoreCase)
        || ruta.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase)
        || ruta.StartsWith("/api/licencia", StringComparison.OrdinalIgnoreCase)
        || HttpMethods.IsOptions(ctx.Request.Method);

    if (!exenta)
    {
        try
        {
            var estado = LicenciaEndpoints.EstadoCacheado(
                ctx.RequestServices.GetRequiredService<Db>(), app.Configuration);
            if (estado.Bloquea)
            {
                ctx.Response.StatusCode = 402;
                await ctx.Response.WriteAsJsonAsync(new
                {
                    mensaje = estado.Mensaje,
                    licencia = estado,
                });
                return;
            }
        }
        catch (Exception ex)
        {
            // Un fallo al leer la licencia nunca debe dejar el sistema inoperante.
            app.Logger.LogWarning(ex, "No fue posible verificar la licencia");
        }
    }

    await next();
});




// Auto-reparación de esquema: cada paso corre por separado para que el fallo de uno
// (por ejemplo, una tabla ausente en una base antigua) no impida los siguientes.
string[] pasosEsquema =
[
    """
    IF OBJECT_ID('flujo.TipoCambio', 'U') IS NOT NULL
       AND COL_LENGTH('flujo.TipoCambio', 'Nota') IS NULL
        ALTER TABLE flujo.TipoCambio ADD Nota NVARCHAR(200) NULL;
    """,
    """
    IF OBJECT_ID('flujo.Parametro', 'U') IS NULL
        CREATE TABLE flujo.Parametro
        (
            Clave        NVARCHAR(60)  NOT NULL CONSTRAINT PK_Parametro PRIMARY KEY,
            Valor        NVARCHAR(200) NOT NULL,
            Descripcion  NVARCHAR(200) NULL,
            Actualizado  DATETIME2(0)  NOT NULL CONSTRAINT DF_Parametro_Actualizado DEFAULT SYSUTCDATETIME(),
            UsuarioId    INT           NULL
        );
    """,
    """
    IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'pedidosFuenteExterna')
        INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
        VALUES ('pedidosFuenteExterna', '0', 'Usar datos de pedidos de fuente externa (SoftlandERP)');
    """,
    """
    IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'pedidosFuenteOrigen')
        INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
        VALUES ('pedidosFuenteOrigen', 'SoftlandERP', 'Fuente externa de pedidos (subparámetro de pedidosFuenteExterna)');
    """,
    """
    IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'facturasFuenteExterna')
        INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
        VALUES ('facturasFuenteExterna', '0', 'Usar datos de facturas de fuente externa (SoftlandERP)');
    """,
    """
    -- Pagos aplicados a facturas de una fuente externa (SoftlandERP): FacturaId pasa a NULL
    -- y el número externo se guarda en FacturaExterna.
    IF OBJECT_ID('flujo.Pago', 'U') IS NOT NULL
       AND COL_LENGTH('flujo.Pago', 'FacturaExterna') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Pago_Factura' AND object_id = OBJECT_ID('flujo.Pago'))
            DROP INDEX IX_Pago_Factura ON flujo.Pago;
        IF OBJECT_ID('flujo.FK_Pago_Factura', 'F') IS NOT NULL
            ALTER TABLE flujo.Pago DROP CONSTRAINT FK_Pago_Factura;
        ALTER TABLE flujo.Pago ALTER COLUMN FacturaId INT NULL;
        ALTER TABLE flujo.Pago ADD FacturaExterna NVARCHAR(60) NULL;
        ALTER TABLE flujo.Pago ADD CONSTRAINT FK_Pago_Factura FOREIGN KEY (FacturaId) REFERENCES flujo.Factura(FacturaId);
        CREATE INDEX IX_Pago_Factura ON flujo.Pago (FacturaId);
        CREATE INDEX IX_Pago_FacturaExterna ON flujo.Pago (FacturaExterna);
    END
    """,
    """
    IF OBJECT_ID('flujo.FuenteExterna', 'U') IS NULL
        CREATE TABLE flujo.FuenteExterna
        (
            Fuente        NVARCHAR(40)  NOT NULL CONSTRAINT PK_FuenteExterna PRIMARY KEY,
            Servidor      NVARCHAR(200) NOT NULL,
            BaseDatos     NVARCHAR(128) NOT NULL,
            Esquema       NVARCHAR(128) NOT NULL,
            Usuario       NVARCHAR(128) NOT NULL CONSTRAINT DF_FuenteExterna_Usuario DEFAULT '',
            ClaveCifrada  NVARCHAR(400) NOT NULL CONSTRAINT DF_FuenteExterna_Clave DEFAULT '',
            CompaniaId    INT           NULL,
            Encriptar     BIT           NOT NULL CONSTRAINT DF_FuenteExterna_Encriptar DEFAULT 1,
            Actualizado   DATETIME2(0)  NOT NULL CONSTRAINT DF_FuenteExterna_Actualizado DEFAULT SYSUTCDATETIME(),
            UsuarioId     INT           NULL
        );
    """,
    """
    -- Permisos de visibilidad por usuario (07_permisos_usuario.sql).
    IF COL_LENGTH('flujo.Usuario', 'VerBancos') IS NULL
        ALTER TABLE flujo.Usuario ADD VerBancos BIT NOT NULL
            CONSTRAINT DF_Usuario_VerBancos DEFAULT 1;
    IF COL_LENGTH('flujo.Usuario', 'VerConsolidado') IS NULL
        ALTER TABLE flujo.Usuario ADD VerConsolidado BIT NOT NULL
            CONSTRAINT DF_Usuario_VerConsolidado DEFAULT 1;
    IF COL_LENGTH('flujo.Usuario', 'VerErogaciones') IS NULL
        ALTER TABLE flujo.Usuario ADD VerErogaciones BIT NOT NULL
            CONSTRAINT DF_Usuario_VerErogaciones DEFAULT 1;
    IF COL_LENGTH('flujo.Usuario', 'VerProyeccion') IS NULL
        ALTER TABLE flujo.Usuario ADD VerProyeccion BIT NOT NULL
            CONSTRAINT DF_Usuario_VerProyeccion DEFAULT 1;
    IF COL_LENGTH('flujo.Usuario', 'VerCatalogos') IS NULL
        ALTER TABLE flujo.Usuario ADD VerCatalogos BIT NOT NULL
            CONSTRAINT DF_Usuario_VerCatalogos DEFAULT 1;
    IF COL_LENGTH('flujo.Usuario', 'EditarErogaciones') IS NULL
        ALTER TABLE flujo.Usuario ADD EditarErogaciones BIT NOT NULL
            CONSTRAINT DF_Usuario_EditarErogaciones DEFAULT 1;
    IF COL_LENGTH('flujo.Usuario', 'AsignarFacturaContrato') IS NULL
        ALTER TABLE flujo.Usuario ADD AsignarFacturaContrato BIT NOT NULL
            CONSTRAINT DF_Usuario_AsignarFacturaContrato DEFAULT 0;

    IF COL_LENGTH('flujo.Usuario', 'TrasladarContratosHistorico') IS NULL
        ALTER TABLE flujo.Usuario ADD TrasladarContratosHistorico BIT NOT NULL
            CONSTRAINT DF_Usuario_TrasladarContratosHistorico DEFAULT 0;
    """,
    """
    -- Fecha de creación en contratos (v1.20.4).
    IF OBJECT_ID('flujo.Contrato', 'U') IS NOT NULL
       AND COL_LENGTH('flujo.Contrato', 'CreadoEn') IS NULL
        ALTER TABLE flujo.Contrato ADD CreadoEn DATETIME2(0) NOT NULL
            CONSTRAINT DF_Contrato_CreadoEn DEFAULT SYSUTCDATETIME();
    """,
    """
    -- Preferencias personales por usuario (08_preferencias_usuario.sql).
    IF OBJECT_ID('flujo.PreferenciaUsuario', 'U') IS NULL
        CREATE TABLE flujo.PreferenciaUsuario
        (
            UsuarioId   INT           NOT NULL,
            Clave       NVARCHAR(60)  NOT NULL,
            Valor       NVARCHAR(400) NOT NULL,
            Actualizado DATETIME2(0)  NOT NULL
                CONSTRAINT DF_PreferenciaUsuario_Actualizado DEFAULT SYSUTCDATETIME(),
            CONSTRAINT PK_PreferenciaUsuario PRIMARY KEY (UsuarioId, Clave),
            CONSTRAINT FK_PreferenciaUsuario_Usuario FOREIGN KEY (UsuarioId)
                REFERENCES flujo.Usuario(UsuarioId) ON DELETE CASCADE
        );
    """,
    """
    -- Preferencias sin límite de longitud (v1.36.1): las asignaciones de
    -- factura por contrato superan fácilmente los 400 caracteres.
    IF OBJECT_ID('flujo.PreferenciaUsuario', 'U') IS NOT NULL
       AND COL_LENGTH('flujo.PreferenciaUsuario', 'Valor') <> -1
        ALTER TABLE flujo.PreferenciaUsuario ALTER COLUMN Valor NVARCHAR(MAX) NOT NULL;
    """,
    """
    -- Documentos por pagar internos (09_documentos_por_pagar.sql).
    IF OBJECT_ID('flujo.DocumentoPorPagar', 'U') IS NULL
        CREATE TABLE flujo.DocumentoPorPagar
        (
            DocumentoPorPagarId INT IDENTITY(1,1) PRIMARY KEY,
            CompaniaId          INT           NOT NULL,
            Proveedor           NVARCHAR(150) NOT NULL,
            Numero              NVARCHAR(50)  NOT NULL,
            Tipo                NVARCHAR(10)  NOT NULL CONSTRAINT DF_DocPorPagar_Tipo DEFAULT ('FAC'),
            Fecha               DATE          NOT NULL,
            FechaVence          DATE          NULL,
            Moneda              CHAR(3)       NOT NULL,
            Monto               DECIMAL(18,2) NOT NULL,
            Saldo               DECIMAL(18,2) NOT NULL,
            Anulado             BIT           NOT NULL CONSTRAINT DF_DocPorPagar_Anulado DEFAULT (0),
            Notas               NVARCHAR(500) NULL,
            CreadoEn            DATETIME2(0)  NOT NULL CONSTRAINT DF_DocPorPagar_Creado DEFAULT (SYSUTCDATETIME()),
            CONSTRAINT UQ_DocumentoPorPagar UNIQUE (CompaniaId, Tipo, Numero)
        );
    """,
    """
    IF OBJECT_ID('flujo.Erogacion', 'U') IS NOT NULL
       AND COL_LENGTH('flujo.Erogacion', 'DocumentoPorPagarId') IS NULL
        ALTER TABLE flujo.Erogacion ADD DocumentoPorPagarId INT NULL;
    """,
    """
    IF OBJECT_ID('flujo.Erogacion', 'U') IS NOT NULL
       AND COL_LENGTH('flujo.Erogacion', 'DocumentoPagoNumero') IS NULL
        ALTER TABLE flujo.Erogacion ADD DocumentoPagoNumero NVARCHAR(50) NULL;
    """,
    """
    IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'documentosPagoFuenteExterna')
        INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
        VALUES ('documentosPagoFuenteExterna', '0',
                'Usar datos de documentos pendientes de pago de fuente externa');
    """,
    """
    -- Documentos por cobrar internos, FAC y DEV (10_documentos_por_cobrar.sql).
    IF OBJECT_ID('flujo.DocumentoPorCobrar', 'U') IS NULL
        CREATE TABLE flujo.DocumentoPorCobrar
        (
            DocumentoPorCobrarId INT IDENTITY(1,1) PRIMARY KEY,
            CompaniaId           INT           NOT NULL,
            Cliente              NVARCHAR(150) NOT NULL,
            Numero               NVARCHAR(50)  NOT NULL,
            Tipo                 NVARCHAR(10)  NOT NULL CONSTRAINT DF_DocPorCobrar_Tipo DEFAULT ('FAC'),
            Fecha                DATE          NOT NULL,
            FechaVence           DATE          NULL,
            Moneda               CHAR(3)       NOT NULL,
            Monto                DECIMAL(18,2) NOT NULL,
            Saldo                DECIMAL(18,2) NOT NULL,
            Anulado              BIT           NOT NULL CONSTRAINT DF_DocPorCobrar_Anulado DEFAULT (0),
            Notas                NVARCHAR(500) NULL,
            CreadoEn             DATETIME2(0)  NOT NULL CONSTRAINT DF_DocPorCobrar_Creado DEFAULT (SYSUTCDATETIME()),
            CONSTRAINT UQ_DocumentoPorCobrar UNIQUE (CompaniaId, Tipo, Numero)
        );
    """,
    """
    IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'documentosCobroFuenteExterna')
        INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
        VALUES ('documentosCobroFuenteExterna', '0',
                'Usar datos de documentos por cobrar (FAC y DEV) de fuente externa');
    """,
    """
    IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'contratosFuenteExterna')
        INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
        VALUES ('contratosFuenteExterna', '0',
                'Usar datos de contratos recurrentes de fuente externa (SoftlandERP)');
    """,
    """
    -- Histórico de contratos por facturar de meses cerrados (12_contratos_mes_historico.sql).
    IF OBJECT_ID('flujo.ContratoMesHistorico', 'U') IS NULL
    BEGIN
        CREATE TABLE flujo.ContratoMesHistorico
        (
            ContratoMesHistoricoId INT IDENTITY(1,1) PRIMARY KEY,
            Mes             CHAR(7)       NOT NULL,
            ArchivadoEn     DATE          NOT NULL,
            ContratoId      NVARCHAR(40)  NOT NULL,
            CompaniaId      NVARCHAR(20)  NOT NULL,
            Numero          NVARCHAR(60)  NOT NULL,
            Cliente         NVARCHAR(150) NOT NULL,
            Periodicidad    NVARCHAR(20)  NOT NULL,
            Fecha           DATE          NOT NULL,
            Moneda          CHAR(3)       NOT NULL,
            Monto           DECIMAL(18,2) NOT NULL,
            Pagado          BIT           NOT NULL
                CONSTRAINT DF_ContratoMesHistorico_Pagado DEFAULT (0),
            Documento       NVARCHAR(60)  NULL,
            CreadoEn        DATETIME2(0)  NOT NULL
                CONSTRAINT DF_ContratoMesHistorico_Creado DEFAULT (SYSUTCDATETIME()),
            CONSTRAINT UQ_ContratoMesHistorico UNIQUE (Mes, ContratoId, Fecha)
        );
        CREATE INDEX IX_ContratoMesHistorico_Mes ON flujo.ContratoMesHistorico (Mes);
    END
    """,
    FlujoEfectivo.Api.Datos.Correo.SqlTabla,
    FlujoEfectivo.Api.Seguridad.Licencias.SqlTabla,

];

try
{
    using var cnMig = app.Services.GetRequiredService<Db>().Abrir();
    foreach (var paso in pasosEsquema)
    {
        try
        {
            cnMig.Execute(paso);
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Paso de esquema omitido: {Paso}", paso.Split('\n')[0]);
        }
    }
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
api.MapLicencia();


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
            return Results.Ok(new
            {
                estado = "ok",
                versionApi,
                hora = DateTime.UtcNow,
                operaciones = new { crearUsuarios = true },
            });

        return Results.Json(new
            {
                estado = "error",
                mensaje = "La base de datos no tiene la estructura requerida. Ejecute en orden los scripts 01_esquema.sql, 02_datos_iniciales.sql, 04_seguridad.sql y 05_parametros.sql."
            }, statusCode: 503);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "No fue posible validar la conexión con SQL Server");
        var raiz = ex;
        while (raiz.InnerException is not null) raiz = raiz.InnerException;
        var sql = raiz as Microsoft.Data.SqlClient.SqlException;
        var causa = sql?.Number switch
        {
            53 or -1 or 40615 => "No se encontró el servidor SQL o no acepta conexiones remotas (revise el nombre de la instancia, TCP/IP y el firewall).",
            18456 => "El usuario o la contraseña de SQL Server no son válidos, o el usuario no tiene acceso a esa base.",
            4060 => "El usuario se autenticó, pero no puede abrir la base indicada (no existe o no tiene permiso).",
            2 or 258 => "Tiempo de espera agotado al contactar SQL Server.",
            _ => "No fue posible abrir la base de datos.",
        };
        return Results.Json(new
        {
            estado = "error",
            mensaje = $"{causa} Conexión configurada: {db.Descripcion()}. Detalle: {raiz.Message}",
            tipo = raiz.GetType().Name,
            codigoSql = sql?.Number,
            detalle = raiz.Message,
        }, statusCode: 503);
    }

}).AllowAnonymous();

// Una ruta API desconocida siempre responde JSON. Si el cliente recibe HTML,
// la solicitud fue atendida por IIS/proxy y nunca alcanzó esta aplicación.
app.MapFallback("/api/{**ruta}", (HttpContext ctx) => Results.NotFound(new
{
    mensaje = $"La operación {ctx.Request.Method} {ctx.Request.Path} no existe en esta versión de la API.",
    versionApi,
    requestId = ctx.TraceIdentifier,
}));

app.Run();
