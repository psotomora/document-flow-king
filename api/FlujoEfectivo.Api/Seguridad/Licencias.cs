using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;

namespace FlujoEfectivo.Api.Seguridad;

/// <summary>Contenido firmado de un archivo de licencia (.lic).</summary>
public sealed class ContenidoLicencia
{
    public string Producto { get; set; } = "FlujoEfectivo";
    public string ClienteCodigo { get; set; } = "";
    public string ClienteNombre { get; set; } = "";
    public string Emitida { get; set; } = "";
    public string Vence { get; set; } = "";
    public List<string> Companias { get; set; } = [];
    public int MaxUsuarios { get; set; }
    public string Huella { get; set; } = "";
    public int DiasGracia { get; set; } = 15;
    public string? Notas { get; set; }
    public string Serie { get; set; } = "";
}

/// <summary>Estado calculado de la licencia instalada.</summary>
public sealed class EstadoLicencia
{
    /// <summary>vigente | porVencer | gracia | bloqueada | ausente | libre</summary>
    public string Estado { get; set; } = "ausente";
    public bool Requerida { get; set; }
    public bool Bloquea { get; set; }
    public string Mensaje { get; set; } = "";
    public string Huella { get; set; } = "";
    public bool Emisor { get; set; }
    public bool HayLlavePublica { get; set; }
    public string? ClienteNombre { get; set; }
    public string? ClienteCodigo { get; set; }
    public string? Producto { get; set; }
    public string? Vence { get; set; }
    public int? DiasRestantes { get; set; }
    public List<string> Companias { get; set; } = [];
    public int MaxUsuarios { get; set; }
    public int UsuariosActivos { get; set; }
    public string? Serie { get; set; }
    public string? CargadaEn { get; set; }
}

/// <summary>
/// Emisión y verificación de licencias. El archivo es un JSON firmado con RSA-SHA256:
/// FLUJO-LIC-1.{contenidoBase64Url}.{firmaBase64Url}
/// La llave pública se configura en Licencia:LlavePublica; la privada solo existe
/// en el servidor emisor interno (Licencia:LlavePrivada).
/// </summary>
public static class Licencias
{
    public const string Prefijo = "FLUJO-LIC-1";
    public const string ParamRequerida = "licenciaRequerida";
    private const int AvisoDias = 30;

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public const string SqlTabla =
        """
        IF SCHEMA_ID('flujo') IS NULL EXEC('CREATE SCHEMA flujo');
        IF OBJECT_ID('flujo.Licencia', 'U') IS NULL
            CREATE TABLE flujo.Licencia
            (
                Id            INT            NOT NULL CONSTRAINT PK_Licencia PRIMARY KEY,
                Archivo       NVARCHAR(MAX)  NOT NULL,
                ClienteNombre NVARCHAR(200)  NOT NULL CONSTRAINT DF_Licencia_Cliente DEFAULT '',
                Serie         NVARCHAR(60)   NOT NULL CONSTRAINT DF_Licencia_Serie DEFAULT '',
                Vence         DATE           NULL,
                CargadaEn     DATETIME2(0)   NOT NULL CONSTRAINT DF_Licencia_Cargada DEFAULT SYSUTCDATETIME(),
                UsuarioId     INT            NULL
            );
        IF OBJECT_ID('flujo.LicenciaEmitida', 'U') IS NULL
            CREATE TABLE flujo.LicenciaEmitida
            (
                LicenciaEmitidaId INT IDENTITY(1,1) CONSTRAINT PK_LicenciaEmitida PRIMARY KEY,
                Serie             NVARCHAR(60)  NOT NULL,
                Producto          NVARCHAR(60)  NOT NULL,
                ClienteCodigo     NVARCHAR(60)  NOT NULL,
                ClienteNombre     NVARCHAR(200) NOT NULL,
                Huella            NVARCHAR(80)  NOT NULL,
                Companias         NVARCHAR(400) NOT NULL CONSTRAINT DF_LicEmitida_Comp DEFAULT '',
                MaxUsuarios       INT           NOT NULL CONSTRAINT DF_LicEmitida_Max DEFAULT (0),
                Vence             DATE          NOT NULL,
                DiasGracia        INT           NOT NULL CONSTRAINT DF_LicEmitida_Gracia DEFAULT (15),
                Notas             NVARCHAR(400) NULL,
                Archivo           NVARCHAR(MAX) NOT NULL,
                EmitidaEn         DATETIME2(0)  NOT NULL CONSTRAINT DF_LicEmitida_Fecha DEFAULT SYSUTCDATETIME(),
                EmitidaPor        NVARCHAR(120) NOT NULL CONSTRAINT DF_LicEmitida_Por DEFAULT ''
            );
        IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'licenciaRequerida')
            INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
            VALUES ('licenciaRequerida', '0', 'Exigir un archivo de licencia válido para usar el sistema');
        """;

    public static void Asegurar(IDbConnection cn)
    {
        try
        {
            cn.Execute(SqlTabla);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                "No fue posible crear las tablas de licenciamiento. Ejecute el script " +
                "database/14_licencia.sql en SQL Server o conceda permisos de creación de tablas. " +
                "Detalle: " + ex.Message, ex);
        }
    }

    /// <summary>Huella del servidor: nombre del equipo + identificador de la máquina.</summary>
    public static string Huella()
    {
        var partes = new StringBuilder(Environment.MachineName.ToUpperInvariant());
        try
        {
            if (OperatingSystem.IsWindows())
            {
                using var llave = Microsoft.Win32.Registry.LocalMachine
                    .OpenSubKey(@"SOFTWARE\Microsoft\Cryptography", false);
                partes.Append('|').Append(llave?.GetValue("MachineGuid")?.ToString() ?? "");
            }
            else if (File.Exists("/etc/machine-id"))
            {
                partes.Append('|').Append(File.ReadAllText("/etc/machine-id").Trim());
            }
        }
        catch
        {
            // Sin identificador de máquina la huella usa solo el nombre del equipo.
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(partes.ToString()));
        return Convert.ToHexString(hash)[..16];
    }

    private static string Base64Url(byte[] datos) =>
        Convert.ToBase64String(datos).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] DeBase64Url(string texto)
    {
        var s = texto.Replace('-', '+').Replace('_', '/');
        s = s.PadRight(s.Length + (4 - s.Length % 4) % 4, '=');
        return Convert.FromBase64String(s);
    }

    /// <summary>
    /// Acepta la llave en cualquier formato: PEM con saltos de línea reales, PEM con "\n"
    /// escritos literalmente, o solo el contenido Base64 en una sola línea (sin encabezados).
    /// Siempre devuelve un PEM válido para RSA.ImportFromPem.
    /// </summary>
    public static string NormalizarLlave(string? llave, bool privada)
    {
        var texto = (llave ?? "").Trim();
        if (texto.Length == 0) return "";

        // Saltos de línea escritos como texto dentro del JSON de configuración.
        texto = texto.Replace("\\r\\n", "\n").Replace("\\n", "\n").Replace("\r\n", "\n").Replace('\r', '\n');

        if (texto.Contains("-----BEGIN"))
        {
            // PEM completo pero posiblemente en una sola línea: se reconstruye.
            var inicio = texto.IndexOf("-----BEGIN", StringComparison.Ordinal);
            var finEncabezado = texto.IndexOf("-----", inicio + 10, StringComparison.Ordinal);
            if (finEncabezado < 0) return texto;
            var encabezado = texto[inicio..(finEncabezado + 5)];
            var etiqueta = encabezado.Replace("-----BEGIN ", "").Replace("-----", "").Trim();
            var resto = texto[(finEncabezado + 5)..];
            var finCuerpo = resto.IndexOf("-----END", StringComparison.Ordinal);
            var cuerpo = finCuerpo >= 0 ? resto[..finCuerpo] : resto;
            return ArmarPem(etiqueta, LimpiarBase64(cuerpo));
        }

        // Solo Base64 en una sola línea.
        return ArmarPem(privada ? "PRIVATE KEY" : "PUBLIC KEY", LimpiarBase64(texto));
    }

    private static string LimpiarBase64(string texto) =>
        new(texto.Where(c => !char.IsWhiteSpace(c)).ToArray());

    private static string ArmarPem(string etiqueta, string base64)
    {
        var sb = new StringBuilder();
        sb.Append("-----BEGIN ").Append(etiqueta).Append("-----\n");
        for (var i = 0; i < base64.Length; i += 64)
            sb.Append(base64, i, Math.Min(64, base64.Length - i)).Append('\n');
        sb.Append("-----END ").Append(etiqueta).Append("-----\n");
        return sb.ToString();
    }

    /// <summary>Devuelve la llave en una sola línea (solo Base64), para copiar y pegar sin errores.</summary>
    public static string EnUnaLinea(string pem)
    {
        var limpio = pem;
        var inicio = limpio.IndexOf("-----BEGIN", StringComparison.Ordinal);
        if (inicio >= 0)
        {
            var finEncabezado = limpio.IndexOf("-----", inicio + 10, StringComparison.Ordinal);
            if (finEncabezado >= 0)
            {
                limpio = limpio[(finEncabezado + 5)..];
                var fin = limpio.IndexOf("-----END", StringComparison.Ordinal);
                if (fin >= 0) limpio = limpio[..fin];
            }
        }
        return LimpiarBase64(limpio);
    }

    /// <summary>Firma un contenido y devuelve el texto del archivo .lic.</summary>
    public static string Firmar(ContenidoLicencia contenido, string llavePrivadaPem)
    {
        var cuerpo = JsonSerializer.SerializeToUtf8Bytes(contenido, Json);
        using var rsa = RSA.Create();
        rsa.ImportFromPem(NormalizarLlave(llavePrivadaPem, true));
        var firma = rsa.SignData(cuerpo, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return $"{Prefijo}.{Base64Url(cuerpo)}.{Base64Url(firma)}";
    }

    /// <summary>Genera un par de llaves nuevo (privada para el emisor, pública para las aplicaciones).</summary>
    public static (string privada, string publica) GenerarLlaves()
    {
        using var rsa = RSA.Create(3072);
        // Se entregan en una sola línea: así se pegan en appsettings.json sin romper el archivo.
        return (EnUnaLinea(rsa.ExportPkcs8PrivateKeyPem()), EnUnaLinea(rsa.ExportSubjectPublicKeyInfoPem()));
    }


    /// <summary>Verifica firma y formato. Devuelve el contenido o el motivo del rechazo.</summary>
    public static (ContenidoLicencia? contenido, string? error) Verificar(string archivo, string llavePublicaPem)
    {
        if (string.IsNullOrWhiteSpace(llavePublicaPem))
            return (null, "Esta instalación no tiene configurada la llave pública de licencias (Licencia:LlavePublica).");

        var texto = (archivo ?? "").Trim();
        var partes = texto.Split('.');
        if (partes.Length != 3 || partes[0] != Prefijo)
            return (null, "El archivo no es una licencia válida de Aplix.");

        try
        {
            var cuerpo = DeBase64Url(partes[1]);
            var firma = DeBase64Url(partes[2]);
            using var rsa = RSA.Create();
            rsa.ImportFromPem(llavePublicaPem);
            if (!rsa.VerifyData(cuerpo, firma, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1))
                return (null, "La firma de la licencia no es válida: el archivo fue alterado o proviene de otro emisor.");

            var contenido = JsonSerializer.Deserialize<ContenidoLicencia>(cuerpo, Json);
            return contenido is null
                ? (null, "El contenido de la licencia no se pudo leer.")
                : (contenido, null);
        }
        catch (Exception ex)
        {
            return (null, "No fue posible leer la licencia: " + ex.Message);
        }
    }

    /// <summary>Calcula el estado actual a partir de la base de datos y la configuración.</summary>
    public static EstadoLicencia Estado(IDbConnection cn, IConfiguration config)
    {
        var estado = new EstadoLicencia
        {
            Huella = Huella(),
            Emisor = string.Equals(config["Licencia:Emisor"], "true", StringComparison.OrdinalIgnoreCase)
                     && !string.IsNullOrWhiteSpace(config["Licencia:LlavePrivada"]),
            HayLlavePublica = !string.IsNullOrWhiteSpace(config["Licencia:LlavePublica"]),
        };

        Asegurar(cn);

        estado.Requerida = cn.QueryFirstOrDefault<string>(
            "SELECT Valor FROM flujo.Parametro WHERE Clave = @c", new { c = ParamRequerida }) == "1";
        estado.UsuariosActivos = cn.ExecuteScalar<int>("SELECT COUNT(1) FROM flujo.Usuario WHERE Activo = 1");

        var fila = cn.QueryFirstOrDefault<(string Archivo, DateTime CargadaEn)>(
            "SELECT Archivo, CargadaEn FROM flujo.Licencia WHERE Id = 1");

        if (string.IsNullOrWhiteSpace(fila.Archivo))
        {
            estado.Estado = estado.Requerida ? "ausente" : "libre";
            estado.Bloquea = estado.Requerida;
            estado.Mensaje = estado.Requerida
                ? "No hay una licencia instalada. Cargue el archivo entregado por Aplix."
                : "Esta instalación no exige licencia. Actívela en Parámetros cuando corresponda.";
            return estado;
        }

        estado.CargadaEn = fila.CargadaEn.ToString("yyyy-MM-dd HH:mm");
        var (contenido, error) = Verificar(fila.Archivo, config["Licencia:LlavePublica"] ?? "");
        if (contenido is null)
        {
            estado.Estado = "bloqueada";
            estado.Bloquea = estado.Requerida;
            estado.Mensaje = error ?? "Licencia no válida.";
            return estado;
        }

        estado.ClienteNombre = contenido.ClienteNombre;
        estado.ClienteCodigo = contenido.ClienteCodigo;
        estado.Producto = contenido.Producto;
        estado.Vence = contenido.Vence;
        estado.Companias = contenido.Companias;
        estado.MaxUsuarios = contenido.MaxUsuarios;
        estado.Serie = contenido.Serie;

        if (!string.IsNullOrWhiteSpace(contenido.Huella)
            && !string.Equals(contenido.Huella, estado.Huella, StringComparison.OrdinalIgnoreCase))
        {
            estado.Estado = "bloqueada";
            estado.Bloquea = estado.Requerida;
            estado.Mensaje =
                $"La licencia fue emitida para otro servidor (huella {contenido.Huella}). " +
                $"La huella de este servidor es {estado.Huella}: solicite la reemisión a Aplix.";
            return estado;
        }

        var hoy = DateTime.Today;
        if (!DateTime.TryParse(contenido.Vence, out var vence))
        {
            estado.Estado = "bloqueada";
            estado.Bloquea = estado.Requerida;
            estado.Mensaje = "La licencia no tiene una fecha de vencimiento válida.";
            return estado;
        }

        var dias = (int)(vence.Date - hoy).TotalDays;
        estado.DiasRestantes = dias;

        if (dias >= 0)
        {
            estado.Estado = dias <= AvisoDias ? "porVencer" : "vigente";
            estado.Mensaje = dias <= AvisoDias
                ? $"La licencia vence el {vence:dd/MM/yyyy} (faltan {dias} días). Solicite la renovación a Aplix."
                : $"Licencia vigente hasta el {vence:dd/MM/yyyy}.";
        }
        else if (-dias <= contenido.DiasGracia)
        {
            estado.Estado = "gracia";
            estado.Mensaje =
                $"La licencia venció el {vence:dd/MM/yyyy}. Quedan {contenido.DiasGracia + dias} días de gracia " +
                "antes de que el sistema deje de permitir el ingreso.";
        }
        else
        {
            estado.Estado = "bloqueada";
            estado.Bloquea = estado.Requerida;
            estado.Mensaje =
                $"La licencia venció el {vence:dd/MM/yyyy} y terminó el periodo de gracia. " +
                "Cargue una licencia vigente para continuar.";
        }

        if (estado.MaxUsuarios > 0 && estado.UsuariosActivos > estado.MaxUsuarios)
            estado.Mensaje +=
                $" Además, hay {estado.UsuariosActivos} usuarios activos y la licencia permite {estado.MaxUsuarios}: " +
                "inactive usuarios o amplíe la licencia.";

        return estado;
    }
}
