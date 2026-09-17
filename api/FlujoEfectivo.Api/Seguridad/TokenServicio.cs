using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FlujoEfectivo.Api.Modelos;
using Microsoft.IdentityModel.Tokens;

namespace FlujoEfectivo.Api.Seguridad;

public sealed class TokenServicio(IConfiguration configuracion)
{
    public string Emisor => configuracion["Jwt:Emisor"] ?? "FlujoEfectivo";
    public string Audiencia => configuracion["Jwt:Audiencia"] ?? "FlujoEfectivoApp";
    public int HorasVigencia => int.TryParse(configuracion["Jwt:Horas"], out var h) ? h : 8;

    public SymmetricSecurityKey Llave => new(Encoding.UTF8.GetBytes(
        configuracion["Jwt:Llave"]
        ?? throw new InvalidOperationException("Falta la configuración Jwt:Llave (mínimo 32 caracteres).")));

    public (string token, DateTime expira) Crear(UsuarioDto usuario)
    {
        var expira = DateTime.UtcNow.AddHours(HorasVigencia);
        var credenciales = new SigningCredentials(Llave, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Id),
            new Claim(ClaimTypes.NameIdentifier, usuario.Id),
            new Claim(ClaimTypes.Name, usuario.Nombre),
            new Claim(ClaimTypes.Role, usuario.Perfil),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: Emisor,
            audience: Audiencia,
            claims: claims,
            expires: expira,
            signingCredentials: credenciales);

        return (new JwtSecurityTokenHandler().WriteToken(token), expira);
    }
}

/// <summary>Datos del usuario autenticado tomados del token.</summary>
public static class ClaimsExtensiones
{
    public static int UsuarioId(this ClaimsPrincipal p) =>
        int.TryParse(p.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    public static string NombreUsuario(this ClaimsPrincipal p) =>
        p.FindFirstValue(ClaimTypes.Name) ?? "desconocido";

    public static string Perfil(this ClaimsPrincipal p) =>
        p.FindFirstValue(ClaimTypes.Role) ?? "consulta";

    public static bool PuedeEditar(this ClaimsPrincipal p) => p.Perfil() != "consulta";

    public static bool EsAdministrador(this ClaimsPrincipal p) => p.Perfil() == "administrador";
}
