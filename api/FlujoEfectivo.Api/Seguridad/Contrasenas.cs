using System.Security.Cryptography;

namespace FlujoEfectivo.Api.Seguridad;

/// <summary>Hash de contraseñas con PBKDF2-SHA256.
/// Formato almacenado en flujo.Usuario.HashContrasena:
/// <c>pbkdf2:sha256:{iteraciones}:{saltBase64}:{hashBase64}</c></summary>
public static class Contrasenas
{
    private const int Iteraciones = 120_000;
    private const int TamanoSalt = 16;
    private const int TamanoHash = 32;

    public static string Crear(string contrasena)
    {
        var salt = RandomNumberGenerator.GetBytes(TamanoSalt);
        var hash = Rfc2898DeriveBytes.Pbkdf2(contrasena, salt, Iteraciones, HashAlgorithmName.SHA256, TamanoHash);
        return $"pbkdf2:sha256:{Iteraciones}:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    public static bool Verificar(string contrasena, string? almacenado)
    {
        if (string.IsNullOrWhiteSpace(almacenado)) return false;

        var partes = almacenado.Split(':');
        if (partes.Length != 5 || partes[0] != "pbkdf2" || partes[1] != "sha256") return false;
        if (!int.TryParse(partes[2], out var iteraciones)) return false;

        byte[] salt, esperado;
        try
        {
            salt = Convert.FromBase64String(partes[3]);
            esperado = Convert.FromBase64String(partes[4]);
        }
        catch (FormatException) { return false; }

        var calculado = Rfc2898DeriveBytes.Pbkdf2(
            contrasena, salt, iteraciones, HashAlgorithmName.SHA256, esperado.Length);
        return CryptographicOperations.FixedTimeEquals(calculado, esperado);
    }
}
