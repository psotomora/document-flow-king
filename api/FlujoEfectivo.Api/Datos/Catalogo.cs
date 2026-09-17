using System.Collections.Concurrent;
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Ficha de un cliente (empresa) del catálogo multicliente.</summary>
public sealed class ClienteTenant
{
    public int ClienteId { get; set; }
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Servidor { get; set; } = "";
    public string BaseDatos { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string ClaveCifrada { get; set; } = "";
    public bool Encriptar { get; set; } = true;
    public bool Activo { get; set; } = true;
}

/// <summary>
/// Catálogo de clientes del modo SaaS. Vive en su propia base de datos y solo
/// guarda la ubicación de la base de cada cliente; ningún dato de negocio se
/// comparte entre empresas porque cada sesión abre la conexión de su cliente.
/// </summary>
public sealed class Catalogo(IConfiguration configuracion)
{
    private readonly ConcurrentDictionary<string, (ClienteTenant Cliente, DateTime Expira)> _cache = new();
    private static readonly TimeSpan Vigencia = TimeSpan.FromMinutes(2);

    private string Secreto => configuracion["Jwt:Llave"]
        ?? throw new InvalidOperationException("Falta la configuración Jwt:Llave.");

    /// <summary>Cadena de conexión de la base de catálogo.</summary>
    public string CadenaCatalogo
    {
        get
        {
            var directa = configuracion.GetConnectionString("Catalogo");
            if (!string.IsNullOrWhiteSpace(directa)) return directa;

            var basePrincipal = configuracion.GetConnectionString("FlujoEfectivo")
                ?? throw new InvalidOperationException(
                    "Falta la cadena de conexión 'FlujoEfectivo' o 'Catalogo' en appsettings.json.");
            var b = new SqlConnectionStringBuilder(basePrincipal)
            {
                InitialCatalog = "FlujoEfectivoCatalogo",
            };
            return b.ConnectionString;
        }
    }

    public IDbConnection AbrirCatalogo()
    {
        var cn = new SqlConnection(CadenaCatalogo);
        cn.Open();
        return cn;
    }

    /// <summary>Crea la base y las tablas del catálogo si faltan, y registra la instalación actual.</summary>
    public void Preparar(ILogger log)
    {
        try
        {
            var destino = new SqlConnectionStringBuilder(CadenaCatalogo);
            var baseCatalogo = destino.InitialCatalog;
            var maestro = new SqlConnectionStringBuilder(CadenaCatalogo) { InitialCatalog = "master" };
            using (var cnMaster = new SqlConnection(maestro.ConnectionString))
            {
                cnMaster.Open();
                cnMaster.Execute(
                    $"IF DB_ID(@base) IS NULL EXEC('CREATE DATABASE [{baseCatalogo.Replace("]", "]]")}]')",
                    new { basePar = baseCatalogo, @base = baseCatalogo });
            }

            using var cn = AbrirCatalogo();
            foreach (var paso in Pasos)
            {
                try { cn.Execute(paso); }
                catch (Exception ex) { log.LogWarning(ex, "Paso de catálogo omitido."); }
            }

            // Migración: la instalación existente se registra como primer cliente.
            var hay = cn.ExecuteScalar<int>("SELECT COUNT(1) FROM catalogo.Cliente");
            if (hay == 0)
            {
                var actual = new SqlConnectionStringBuilder(
                    configuracion.GetConnectionString("FlujoEfectivo") ?? "");
                cn.Execute(
                    """
                    INSERT INTO catalogo.Cliente
                        (Codigo, Nombre, Servidor, BaseDatos, Usuario, ClaveCifrada, Encriptar, Activo)
                    VALUES (@codigo, @nombre, @servidor, @baseDatos, @usuario, @clave, @encriptar, 1)
                    """,
                    new
                    {
                        codigo = "PRINCIPAL",
                        nombre = "Instalación principal",
                        servidor = actual.DataSource,
                        baseDatos = actual.InitialCatalog,
                        usuario = actual.IntegratedSecurity ? "" : actual.UserID,
                        clave = actual.IntegratedSecurity || string.IsNullOrEmpty(actual.Password)
                            ? ""
                            : Softland.Cifrar(actual.Password, Secreto),
                        encriptar = actual.Encrypt,
                    });
                log.LogInformation("Catálogo creado: la base actual quedó registrada con el código PRINCIPAL.");
            }

            SembrarUsuariosAplix(cn, log);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "No fue posible preparar la base de catálogo de clientes.");
        }
    }

    /// <summary>
    /// Si aún no hay usuarios de Aplix, copia los administradores activos de la
    /// base principal para que puedan entrar con el código APLIX usando la misma
    /// contraseña que ya tenían.
    /// </summary>
    private void SembrarUsuariosAplix(IDbConnection cn, ILogger log)
    {
        try
        {
            var hay = cn.ExecuteScalar<int>("SELECT COUNT(1) FROM catalogo.UsuarioAplix");
            if (hay > 0) return;

            var principal = configuracion.GetConnectionString("FlujoEfectivo");
            if (string.IsNullOrWhiteSpace(principal)) return;

            using var cnPrincipal = new SqlConnection(principal);
            cnPrincipal.Open();
            var admins = cnPrincipal.Query<(string NombreUsuario, string NombreCompleto, string HashContrasena)>(
                """
                SELECT u.NombreUsuario, u.NombreCompleto, u.HashContrasena
                FROM flujo.Usuario u
                INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
                WHERE u.Activo = 1 AND p.Codigo = 'administrador'
                  AND u.HashContrasena IS NOT NULL AND LEN(u.HashContrasena) > 0
                """).ToList();

            foreach (var a in admins)
                cn.Execute(
                    """
                    IF NOT EXISTS (SELECT 1 FROM catalogo.UsuarioAplix WHERE NombreUsuario = @nombreUsuario)
                        INSERT INTO catalogo.UsuarioAplix (NombreUsuario, NombreCompleto, HashContrasena)
                        VALUES (@nombreUsuario, @nombreCompleto, @hash)
                    """,
                    new { nombreUsuario = a.NombreUsuario, nombreCompleto = a.NombreCompleto, hash = a.HashContrasena });

            if (admins.Count > 0)
                log.LogInformation("Catálogo: se habilitaron {n} usuarios de Aplix a partir de los administradores.",
                    admins.Count);
            else
                log.LogWarning("Catálogo: no hay administradores activos para habilitar el acceso con el código APLIX.");
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "No fue posible sembrar los usuarios de Aplix.");
        }
    }

    private static readonly string[] Pasos =
    [
        "IF SCHEMA_ID('catalogo') IS NULL EXEC('CREATE SCHEMA catalogo');",
        """
        IF OBJECT_ID('catalogo.Cliente', 'U') IS NULL
            CREATE TABLE catalogo.Cliente
            (
                ClienteId    INT IDENTITY(1,1) CONSTRAINT PK_CatalogoCliente PRIMARY KEY,
                Codigo       NVARCHAR(30)  NOT NULL CONSTRAINT UQ_CatalogoCliente_Codigo UNIQUE,
                Nombre       NVARCHAR(150) NOT NULL,
                Servidor     NVARCHAR(200) NOT NULL,
                BaseDatos    NVARCHAR(128) NOT NULL,
                Usuario      NVARCHAR(128) NOT NULL CONSTRAINT DF_CatalogoCliente_Usuario DEFAULT '',
                ClaveCifrada NVARCHAR(400) NOT NULL CONSTRAINT DF_CatalogoCliente_Clave DEFAULT '',
                Encriptar    BIT           NOT NULL CONSTRAINT DF_CatalogoCliente_Encriptar DEFAULT 1,
                Activo       BIT           NOT NULL CONSTRAINT DF_CatalogoCliente_Activo DEFAULT 1,
                Creado       DATETIME2(0)  NOT NULL CONSTRAINT DF_CatalogoCliente_Creado DEFAULT SYSUTCDATETIME()
            );
        """,
        """
        IF OBJECT_ID('catalogo.UsuarioAplix', 'U') IS NULL
            CREATE TABLE catalogo.UsuarioAplix
            (
                UsuarioId      INT IDENTITY(1,1) CONSTRAINT PK_UsuarioAplix PRIMARY KEY,
                NombreUsuario  NVARCHAR(60)  NOT NULL CONSTRAINT UQ_UsuarioAplix UNIQUE,
                NombreCompleto NVARCHAR(150) NOT NULL,
                HashContrasena NVARCHAR(400) NOT NULL,
                Activo         BIT           NOT NULL CONSTRAINT DF_UsuarioAplix_Activo DEFAULT 1,
                Creado         DATETIME2(0)  NOT NULL CONSTRAINT DF_UsuarioAplix_Creado DEFAULT SYSUTCDATETIME()
            );
        """,
        // Auto-reparación: completa columnas faltantes si la tabla se creó con una versión anterior.
        """
        IF OBJECT_ID('catalogo.UsuarioAplix', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('catalogo.UsuarioAplix', 'NombreUsuario') IS NULL
                ALTER TABLE catalogo.UsuarioAplix ADD NombreUsuario NVARCHAR(60) NOT NULL CONSTRAINT DF_UsuarioAplix_Nombre DEFAULT '';
            IF COL_LENGTH('catalogo.UsuarioAplix', 'NombreCompleto') IS NULL
                ALTER TABLE catalogo.UsuarioAplix ADD NombreCompleto NVARCHAR(150) NOT NULL CONSTRAINT DF_UsuarioAplix_Completo DEFAULT '';
            IF COL_LENGTH('catalogo.UsuarioAplix', 'HashContrasena') IS NULL
                ALTER TABLE catalogo.UsuarioAplix ADD HashContrasena NVARCHAR(400) NOT NULL CONSTRAINT DF_UsuarioAplix_Hash DEFAULT '';
            IF COL_LENGTH('catalogo.UsuarioAplix', 'Activo') IS NULL
                ALTER TABLE catalogo.UsuarioAplix ADD Activo BIT NOT NULL CONSTRAINT DF_UsuarioAplix_Activo2 DEFAULT 1;
            IF COL_LENGTH('catalogo.UsuarioAplix', 'Creado') IS NULL
                ALTER TABLE catalogo.UsuarioAplix ADD Creado DATETIME2(0) NOT NULL CONSTRAINT DF_UsuarioAplix_Creado2 DEFAULT SYSUTCDATETIME();
        END
        """,
        """
        IF OBJECT_ID('catalogo.Bitacora', 'U') IS NULL
            CREATE TABLE catalogo.Bitacora
            (
                BitacoraId    INT IDENTITY(1,1) CONSTRAINT PK_CatalogoBitacora PRIMARY KEY,
                Fecha         DATETIME2(0)  NOT NULL CONSTRAINT DF_CatalogoBitacora_Fecha DEFAULT SYSUTCDATETIME(),
                NombreUsuario NVARCHAR(150) NOT NULL,
                Operacion     NVARCHAR(40)  NOT NULL,
                Registro      NVARCHAR(150) NOT NULL,
                Detalle       NVARCHAR(MAX) NULL
            );
        """,
    ];

    /* ------------------------------ Consultas ------------------------------- */

    public ClienteTenant? PorCodigo(string codigo)
    {
        var clave = "c:" + codigo.Trim().ToUpperInvariant();
        if (_cache.TryGetValue(clave, out var g) && g.Expira > DateTime.UtcNow) return g.Cliente;

        using var cn = AbrirCatalogo();
        var fila = cn.QueryFirstOrDefault<ClienteTenant>(
            "SELECT * FROM catalogo.Cliente WHERE Codigo = @codigo", new { codigo = codigo.Trim() });
        if (fila is not null) _cache[clave] = (fila, DateTime.UtcNow.Add(Vigencia));
        return fila;
    }

    public ClienteTenant? PorId(int clienteId)
    {
        var clave = "i:" + clienteId;
        if (_cache.TryGetValue(clave, out var g) && g.Expira > DateTime.UtcNow) return g.Cliente;

        using var cn = AbrirCatalogo();
        var fila = cn.QueryFirstOrDefault<ClienteTenant>(
            "SELECT * FROM catalogo.Cliente WHERE ClienteId = @clienteId", new { clienteId });
        if (fila is not null) _cache[clave] = (fila, DateTime.UtcNow.Add(Vigencia));
        return fila;
    }

    public IReadOnlyList<ClienteTenant> Activos()
    {
        using var cn = AbrirCatalogo();
        return [.. cn.Query<ClienteTenant>("SELECT * FROM catalogo.Cliente WHERE Activo = 1 ORDER BY Nombre")];
    }

    public IReadOnlyList<ClienteTenant> Todos()
    {
        using var cn = AbrirCatalogo();
        return [.. cn.Query<ClienteTenant>("SELECT * FROM catalogo.Cliente ORDER BY Nombre")];
    }

    public void LimpiarCache() => _cache.Clear();

    /* ------------------------------- Conexión -------------------------------- */

    public string CadenaDe(ClienteTenant c)
    {
        var b = new SqlConnectionStringBuilder
        {
            DataSource = c.Servidor,
            InitialCatalog = c.BaseDatos,
            TrustServerCertificate = true,
            Encrypt = c.Encriptar,
            ConnectTimeout = 15,
            MultipleActiveResultSets = true,
            ApplicationName = "Aplix Cash Flow Insights",
        };
        if (string.IsNullOrWhiteSpace(c.Usuario)) b.IntegratedSecurity = true;
        else
        {
            b.UserID = c.Usuario;
            b.Password = Softland.Descifrar(c.ClaveCifrada, Secreto);
        }
        return b.ConnectionString;
    }

    public IDbConnection Abrir(ClienteTenant c)
    {
        var cn = new SqlConnection(CadenaDe(c));
        cn.Open();
        return cn;
    }

    public string Cifrar(string texto) => Softland.Cifrar(texto, Secreto);

    public static void Auditar(IDbConnection cn, string usuario, string operacion, string registro,
        string? detalle = null) =>
        cn.Execute(
            """
            INSERT INTO catalogo.Bitacora (NombreUsuario, Operacion, Registro, Detalle)
            VALUES (@usuario, @operacion, @registro, @detalle)
            """,
            new { usuario, operacion, registro, detalle });
}
