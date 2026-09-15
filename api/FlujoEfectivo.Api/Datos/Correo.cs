using System.Data;
using System.Net;
using System.Net.Mail;
using Dapper;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Configuración del servidor SMTP usado para enviar estados de cuenta.</summary>
public sealed class ConfigCorreo
{
    public string Servidor { get; set; } = "";
    public int Puerto { get; set; } = 587;
    public bool Ssl { get; set; } = true;
    public string Usuario { get; set; } = "";
    public string ClaveCifrada { get; set; } = "";
    public string Remitente { get; set; } = "";
    public string NombreRemitente { get; set; } = "";
    public string CopiaOculta { get; set; } = "";
}

/// <summary>
/// Lectura, escritura y envío de correo por SMTP. La contraseña se guarda cifrada con la
/// misma llave (Jwt:Llave) que usa la conexión a SoftlandERP y nunca se devuelve al navegador.
/// </summary>
public static class Correo
{
    /// <summary>DDL de la tabla de configuración; se reutiliza en la migración de arranque.</summary>
    public const string SqlTabla =
        """
        IF SCHEMA_ID('flujo') IS NULL EXEC('CREATE SCHEMA flujo');
        IF OBJECT_ID('flujo.ConfiguracionCorreo', 'U') IS NULL
            CREATE TABLE flujo.ConfiguracionCorreo
            (
                Id              INT           NOT NULL CONSTRAINT PK_ConfiguracionCorreo PRIMARY KEY,
                Servidor        NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Servidor DEFAULT '',
                Puerto          INT           NOT NULL CONSTRAINT DF_Correo_Puerto DEFAULT (587),
                Ssl             BIT           NOT NULL CONSTRAINT DF_Correo_Ssl DEFAULT (1),
                Usuario         NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Usuario DEFAULT '',
                ClaveCifrada    NVARCHAR(400) NOT NULL CONSTRAINT DF_Correo_Clave DEFAULT '',
                Remitente       NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Remitente DEFAULT '',
                NombreRemitente NVARCHAR(200) NOT NULL CONSTRAINT DF_Correo_Nombre DEFAULT '',
                CopiaOculta     NVARCHAR(400) NOT NULL CONSTRAINT DF_Correo_Bcc DEFAULT '',
                Actualizado     DATETIME2(0)  NOT NULL CONSTRAINT DF_Correo_Actualizado DEFAULT SYSUTCDATETIME(),
                UsuarioId       INT           NULL
            );
        """;

    /// <summary>Crea la tabla si la base viene de una versión anterior a 1.32.0.</summary>
    public static void Asegurar(IDbConnection cn)
    {
        try
        {
            cn.Execute(SqlTabla);
        }
        catch (Exception ex)
        {
            // Sin permisos de DDL el mensaje "Invalid object name" no explica nada: se reporta el motivo real.
            throw new InvalidOperationException(
                "No fue posible crear la tabla flujo.ConfiguracionCorreo en la base de datos de producción. " +
                "El usuario de la aplicación necesita permisos para crear tablas, o bien ejecute el script " +
                "database/13_correo_smtp.sql en SQL Server. Detalle: " + ex.Message, ex);
        }
    }

    public static ConfigCorreo? Leer(IDbConnection cn)
    {
        Asegurar(cn);
        return cn.QueryFirstOrDefault<ConfigCorreo>(
            """
            SELECT Servidor, Puerto, Ssl, Usuario, ClaveCifrada, Remitente, NombreRemitente, CopiaOculta
            FROM flujo.ConfiguracionCorreo WHERE Id = 1
            """);
    }

    public static void Guardar(IDbConnection cn, ConfigCorreo c, int usuarioId)
    {
        Asegurar(cn);
        cn.Execute(
            """
            MERGE flujo.ConfiguracionCorreo AS d
            USING (SELECT 1 AS Id) AS o ON d.Id = o.Id
            WHEN MATCHED THEN UPDATE SET
                Servidor = @Servidor, Puerto = @Puerto, Ssl = @Ssl, Usuario = @Usuario,
                ClaveCifrada = @ClaveCifrada, Remitente = @Remitente,
                NombreRemitente = @NombreRemitente, CopiaOculta = @CopiaOculta,
                Actualizado = SYSUTCDATETIME(), UsuarioId = @usuarioId
            WHEN NOT MATCHED THEN INSERT
                (Id, Servidor, Puerto, Ssl, Usuario, ClaveCifrada, Remitente, NombreRemitente, CopiaOculta, UsuarioId)
                VALUES (1, @Servidor, @Puerto, @Ssl, @Usuario, @ClaveCifrada, @Remitente,
                        @NombreRemitente, @CopiaOculta, @usuarioId);
            """,
            new
            {
                c.Servidor, c.Puerto, c.Ssl, c.Usuario, c.ClaveCifrada, c.Remitente,
                c.NombreRemitente, c.CopiaOculta, usuarioId,
            });
    }



    /// <summary>Envía un mensaje HTML. Devuelve (ok, mensaje) sin lanzar excepciones.</summary>
    public static (bool ok, string mensaje) Enviar(
        ConfigCorreo c, string secreto, string destinatario, string asunto, string cuerpoHtml,
        (string nombre, byte[] contenido)? adjunto = null)
    {
        if (string.IsNullOrWhiteSpace(c.Servidor))
            return (false, "Falta el servidor SMTP. Complete los datos en Parámetros → Servidor de correo.");
        if (string.IsNullOrWhiteSpace(c.Remitente))
            return (false, "Falta el correo remitente.");
        if (string.IsNullOrWhiteSpace(destinatario))
            return (false, "Falta el correo destinatario.");

        try
        {
            using var cliente = new SmtpClient(c.Servidor, c.Puerto <= 0 ? 587 : c.Puerto)
            {
                EnableSsl = c.Ssl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000,
            };
            if (string.IsNullOrWhiteSpace(c.Usuario))
                cliente.UseDefaultCredentials = true;
            else
            {
                cliente.UseDefaultCredentials = false;
                cliente.Credentials = new NetworkCredential(c.Usuario, Softland.Descifrar(c.ClaveCifrada, secreto));
            }

            using var mensaje = new MailMessage
            {
                From = new MailAddress(c.Remitente,
                    string.IsNullOrWhiteSpace(c.NombreRemitente) ? c.Remitente : c.NombreRemitente),
                Subject = asunto,
                Body = cuerpoHtml,
                IsBodyHtml = true,
            };
            if (adjunto is { } a)
                mensaje.Attachments.Add(new Attachment(
                    new MemoryStream(a.contenido), a.nombre, "application/pdf"));
            foreach (var d in Separar(destinatario)) mensaje.To.Add(d);
            foreach (var d in Separar(c.CopiaOculta)) mensaje.Bcc.Add(d);

            cliente.Send(mensaje);
            return (true, $"Correo enviado a {destinatario} desde {c.Remitente}.");
        }
        catch (InvalidOperationException ex)
        {
            return (false, Redactar(
                "No se pudo preparar el envío con la configuración guardada.",
                ["Revise Parámetros → Servidor de correo y vuelva a guardar la contraseña."],
                c, destinatario, ex, null));
        }
        catch (SmtpFailedRecipientException ex)
        {
            return (false, Redactar(
                "El servidor de correo rechazó la dirección del destinatario.",
                [
                    $"Verifique que la dirección «{ex.FailedRecipient}» esté bien escrita.",
                    "Si son varios destinatarios, sepárelos con punto y coma y revise cada uno.",
                ],
                c, destinatario, ex, ex.StatusCode.ToString()));
        }
        catch (SmtpException ex)
        {
            var texto = ex.Message + " " + (ex.InnerException?.Message ?? "");
            string resumen;
            string[] acciones;

            if (texto.Contains("5.7.139") || texto.Contains("535") || texto.Contains("5.7.57") ||
                texto.Contains("not authenticated") || ex.StatusCode == SmtpStatusCode.ClientNotPermitted)
            {
                resumen = "El servidor de correo no aceptó el usuario y la contraseña configurados.";
                acciones =
                [
                    "Confirme el usuario y la contraseña del buzón remitente en Parámetros → Servidor de correo.",
                    "En Microsoft 365, pida al administrador habilitar SMTP AUTH del buzón: Set-CASMailbox -Identity <buzón> -SmtpClientAuthenticationDisabled $false",
                    "Si el buzón usa autenticación multifactor, genere y use una contraseña de aplicación.",
                    "Revise que las políticas de acceso condicional permitan el envío desde este servidor.",
                    "Alternativa: usar un conector SMTP interno de Exchange (puerto 25, sin usuario) desde una IP autorizada.",
                ];
            }
            else if (ex.StatusCode == SmtpStatusCode.MustIssueStartTlsFirst)
            {
                resumen = "El servidor de correo exige una conexión segura que no está activada.";
                acciones =
                [
                    "Active «Conexión segura (TLS)» en Parámetros → Servidor de correo.",
                    "Use el puerto 587; el puerto 465 no está soportado.",
                ];
            }
            else if (texto.Contains("timed out") || texto.Contains("Failure sending mail") ||
                     texto.Contains("No such host") || texto.Contains("actively refused"))
            {
                resumen = "No se pudo establecer la comunicación con el servidor de correo.";
                acciones =
                [
                    $"Verifique que el nombre «{c.Servidor}» y el puerto {c.Puerto} sean correctos.",
                    "Revise que el firewall del servidor permita la salida hacia ese puerto.",
                ];
            }
            else if (texto.Contains("5.7.60") || texto.Contains("send as") || texto.Contains("SendAsDenied"))
            {
                resumen = "El buzón autenticado no tiene permiso para enviar con el correo remitente configurado.";
                acciones =
                [
                    $"Use como remitente el mismo buzón del usuario, o conceda el permiso «Enviar como» sobre {c.Remitente}.",
                ];
            }
            else
            {
                resumen = "El servidor de correo rechazó el envío.";
                acciones =
                [
                    "Revise los datos en Parámetros → Servidor de correo y pruebe de nuevo.",
                    "Comparta el detalle técnico con el administrador del servidor de correo.",
                ];
            }

            return (false, Redactar(resumen, acciones, c, destinatario, ex, ex.StatusCode.ToString()));
        }
        catch (Exception ex)
        {
            return (false, Redactar(
                "Ocurrió un problema inesperado al enviar el correo.",
                ["Intente nuevamente; si persiste, comparta el detalle técnico con el administrador del sistema."],
                c, destinatario, ex, null));
        }
    }

    /// <summary>
    /// Arma un mensaje en tres bloques: qué pasó en lenguaje sencillo, qué hacer y el
    /// detalle técnico que el administrador necesita. El frontend separa por "Detalle técnico:".
    /// </summary>
    private static string Redactar(
        string resumen, string[] acciones, ConfigCorreo c, string destinatario,
        Exception ex, string? codigo)
    {
        var tecnico = new List<string>
        {
            $"Servidor: {c.Servidor}:{(c.Puerto <= 0 ? 587 : c.Puerto)} · TLS: {(c.Ssl ? "sí" : "no")}",
            $"Usuario: {(string.IsNullOrWhiteSpace(c.Usuario) ? "(sin autenticación)" : c.Usuario)} · " +
            $"Contraseña guardada: {(string.IsNullOrWhiteSpace(c.ClaveCifrada) ? "no" : "sí")}",
            $"Remitente: {c.Remitente} · Destinatario: {destinatario}",
        };
        if (!string.IsNullOrWhiteSpace(codigo) && codigo != "GeneralFailure")
            tecnico.Add($"Código SMTP: {codigo}");
        tecnico.Add($"Error: {ex.GetType().Name}: {ex.Message.Trim()}");
        if (ex.InnerException is { } inner)
            tecnico.Add($"Causa: {inner.GetType().Name}: {inner.Message.Trim()}");
        tecnico.Add($"Fecha (UTC): {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}");

        var pasos = string.Join("\n", acciones.Select(a => "• " + a));
        return $"{resumen}\n\nQué hacer:\n{pasos}\n\nDetalle técnico:\n{string.Join("\n", tecnico)}";
    }

    private static IEnumerable<string> Separar(string? lista) =>
        (lista ?? "").Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
