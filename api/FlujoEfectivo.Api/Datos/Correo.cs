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
    public static ConfigCorreo? Leer(IDbConnection cn) =>
        cn.QueryFirstOrDefault<ConfigCorreo>(
            """
            SELECT Servidor, Puerto, Ssl, Usuario, ClaveCifrada, Remitente, NombreRemitente, CopiaOculta
            FROM flujo.ConfiguracionCorreo WHERE Id = 1
            """);

    public static void Guardar(IDbConnection cn, ConfigCorreo c, int usuarioId) =>
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

    /// <summary>Envía un mensaje HTML. Devuelve (ok, mensaje) sin lanzar excepciones.</summary>
    public static (bool ok, string mensaje) Enviar(
        ConfigCorreo c, string secreto, string destinatario, string asunto, string cuerpoHtml)
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
            var detalle = ex.StatusCode == SmtpStatusCode.MustIssueStartTlsFirst
                ? " Active la opción de conexión segura (TLS) o use el puerto 587."
                : "";
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
