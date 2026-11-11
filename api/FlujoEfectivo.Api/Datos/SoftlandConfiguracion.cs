using System.Data;
using Dapper;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Lectura/guardado de la configuración Softland por inquilino. Solo API: usa Saas, que el agente no enlaza.</summary>
public static partial class Softland
{
    public static ConfigSoftland? Leer(IDbConnection cn, string? fuente = null) =>
        cn.QueryFirstOrDefault<ConfigSoftland>(
            """
            SELECT Servidor, BaseDatos, Esquema, Usuario, ClaveCifrada, CompaniaId, Encriptar
            FROM flujo.FuenteExterna WHERE Fuente = @f
            """, new { f = Saas.Fuente(cn, fuente ?? Fuente) });

    public static void Guardar(IDbConnection cn, ConfigSoftland c, int usuarioId, string? fuente = null) =>
        cn.Execute(
            """
            MERGE flujo.FuenteExterna AS d
            USING (SELECT @f AS Fuente) AS o ON d.Fuente = o.Fuente
            WHEN MATCHED THEN UPDATE SET
                Servidor = @Servidor, BaseDatos = @BaseDatos, Esquema = @Esquema, Usuario = @Usuario,
                ClaveCifrada = @ClaveCifrada, CompaniaId = @CompaniaId, Encriptar = @Encriptar,
                Actualizado = SYSUTCDATETIME(), UsuarioId = @usuarioId
            WHEN NOT MATCHED THEN INSERT
                (Fuente, Servidor, BaseDatos, Esquema, Usuario, ClaveCifrada, CompaniaId, Encriptar, UsuarioId)
                VALUES (@f, @Servidor, @BaseDatos, @Esquema, @Usuario, @ClaveCifrada, @CompaniaId, @Encriptar, @usuarioId);
            """,
            new
            {
                f = Saas.Fuente(cn, fuente ?? Fuente), c.Servidor, c.BaseDatos, c.Esquema, c.Usuario, c.ClaveCifrada,
                c.CompaniaId, c.Encriptar, usuarioId,
            });
}
