// Test doubles: only this isolated project compiles these types.
using FlujoEfectivo.Api.Endpoints;
using FlujoEfectivo.Api.Seguridad;

namespace FlujoEfectivo.Api.Datos
{
    public sealed class Conexion : IDisposable
    {
        public void Dispose() { }
    }
    public sealed class Db
    {
        public const string Anterior = "Anterior-123";
        public static string Hash = "";
        public static int Cambios;
        public static int Recuperaciones;
        public static readonly List<string> Pasos = [];
        public Conexion Abrir() => new();
        public static void Reiniciar()
        {
            Hash = Contrasenas.Crear(Anterior);
            Cambios = Recuperaciones = 0;
            Pasos.Clear();
            Correo.Cuerpo = "";
        }
        public static void Auditar(Conexion cn, int id, string nombre, string modulo,
            string registro, string accion, string? valorNuevo = null)
        {
            if (accion == "Modificación") Recuperaciones++;
        }
    }
    public sealed class ConfigCorreo { public string Servidor { get; set; } = "smtp.test"; }
    public static class Correo
    {
        public static bool Ok;
        public static bool Lanzar;
        public static string Cuerpo = "";
        public static ConfigCorreo Leer(Conexion cn) => new();
        public static (bool ok, string mensaje) Enviar(ConfigCorreo cfg, string secreto,
            string destinatario, string asunto, string cuerpo)
        {
            Db.Pasos.Add("enviar");
            Cuerpo = cuerpo;
            if (Lanzar) throw new InvalidOperationException("Fallo simulado");
            return (Ok, Ok ? "Enviado" : "Envío rechazado");
        }
    }
}
namespace Dapper
{
    using FlujoEfectivo.Api.Datos;
    public static class SqlMapper
    {
        public static T? QueryFirstOrDefault<T>(this Conexion cn, string sql, object parametros)
        {
            object valor = typeof(T) == typeof(AuthEndpoints.FilaRecuperacion)
                ? new AuthEndpoints.FilaRecuperacion
                {
                    UsuarioId = 1, NombreCompleto = "Prueba", Activo = true,
                    CorreoElectronico = "prueba@example.invalid",
                }
                : typeof(T) == typeof(AuthEndpoints.FilaUsuario)
                ? new AuthEndpoints.FilaUsuario
                {
                    UsuarioId = 1, NombreCompleto = "Prueba", Activo = true,
                    Perfil = "Administrador", HashContrasena = Db.Hash,
                }
                : Db.Hash;
            return (T)valor;
        }
        public static int Execute(this Conexion cn, string sql, object parametros)
        {
            Db.Hash = (string)(parametros.GetType().GetProperty("hash")?.GetValue(parametros)
                ?? throw new Exception("Falta hash"));
            Db.Cambios++;
            Db.Pasos.Add("guardar");
            return 1;
        }
    }
}
namespace FlujoEfectivo.Api.Modelos
{
    public record LoginRequest(string Usuario, string Contrasena);
    public record UsuarioDto(string Id, string Nombre, string Perfil);
    public record LoginResponse(string Token, UsuarioDto Usuario, DateTime Expira);
}
namespace FlujoEfectivo.Api.Seguridad
{
    using FlujoEfectivo.Api.Modelos;
    public sealed class TokenServicio
    {
        public (string, DateTime) Crear(UsuarioDto usuario) => ("test-token", DateTime.UtcNow);
    }
    public static class ClaimsPrueba
    {
        public static int UsuarioId(this System.Security.Claims.ClaimsPrincipal usuario) => 1;
        public static string NombreUsuario(this System.Security.Claims.ClaimsPrincipal usuario) => "Prueba";
        public static string Perfil(this System.Security.Claims.ClaimsPrincipal usuario) => "Administrador";
    }
}