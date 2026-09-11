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
        try { cn.Execute(SqlTabla); } catch { /* sin permisos de DDL: se reporta al leer */ }
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
            return (false, ex.Message);
        }
        catch (SmtpFailedRecipientException ex)
        {
            return (false, $"El servidor rechazó el destinatario: {ex.Message}");
        }
        catch (SmtpException ex)
        {
            var texto = ex.Message + " " + (ex.InnerException?.Message ?? "");
            var detalle = "";
            if (texto.Contains("5.7.139") || texto.Contains("535") || texto.Contains("not authenticated"))
                detalle =
                    " Microsoft 365 rechazó la autenticación. Pida al administrador de Microsoft 365 que: " +
                    "1) habilite SMTP AUTH en el buzón (Set-CASMailbox -SmtpClientAuthenticationDisabled $false); " +
                    "2) verifique que el usuario y la contraseña sean los del buzón remitente; " +
                    "3) si la cuenta tiene autenticación multifactor, use una contraseña de aplicación; " +
                    "4) revise que las políticas de acceso condicional no bloqueen el envío desde este servidor. " +
                    "Como alternativa, use un conector SMTP interno de Exchange (puerto 25, sin usuario) desde una IP autorizada.";
            else if (ex.StatusCode == SmtpStatusCode.MustIssueStartTlsFirst)
                detalle = " Active la opción de conexión segura (TLS) o use el puerto 587.";
            return (false, $"No fue posible enviar el correo: {ex.Message}{detalle}");
        }
        catch (Exception ex)
        {
            return (false, "No fue posible enviar el correo: " + ex.Message);
        }
    }

    private static IEnumerable<string> Separar(string? lista) =>
        (lista ?? "").Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
