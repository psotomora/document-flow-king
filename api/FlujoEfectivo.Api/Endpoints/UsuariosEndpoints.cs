using Dapper;
using FlujoEfectivo.Api.Datos;
using FlujoEfectivo.Api.Modelos;
using FlujoEfectivo.Api.Seguridad;
using Microsoft.Data.SqlClient;

namespace FlujoEfectivo.Api.Endpoints;

/// <summary>Mantenimiento de usuarios (RF-015). Solo el perfil administrador.</summary>
public static class UsuariosEndpoints
{
    private static bool EsAdmin(HttpContext ctx) =>
        string.Equals(ctx.User.Perfil(), "administrador", StringComparison.OrdinalIgnoreCase);

    private static int? PerfilId(System.Data.IDbConnection cn, string codigo) =>
        cn.QueryFirstOrDefault<int?>("SELECT PerfilId FROM flujo.Perfil WHERE Codigo = @codigo",
            new { codigo });

    /// <summary>Inquilino del administrador de la sesión; null si aún no existe el esquema SaaS.</summary>
    private static Saas.ContextoUsuario? Ambito(System.Data.IDbConnection cn, HttpContext ctx) =>
        Saas.Contexto(cn, ctx.User.UsuarioId());

    /// <summary>Filtro SQL (entero, sin parámetros de usuario) para acotar a la empresa de la sesión.</summary>
    private static string Filtro(Saas.ContextoUsuario? c) =>
        c is null ? "" : $" AND u.InquilinoId = {c.InquilinoId}";

    /// <summary>Rechazo cuando el cupo de la empresa o la licencia no admiten otro usuario activo.</summary>
    private static string? LimiteUsuarios(System.Data.IDbConnection cn, IConfiguration config, int? excluir, Saas.ContextoUsuario? c)
    {
        if (c is not null)
        {
            var cupo = Saas.CupoExcedido(c.MaxUsuarios, Saas.Activos(cn, c.InquilinoId, excluir));
            if (cupo is not null) return cupo;
            // Las demás empresas se rigen solo por su cupo; la licencia .lic aplica a la principal.
            if (!c.EsPrincipal) return null;
        }
        var estado = Licencias.Estado(cn, config);
        if (!estado.Requerida || estado.MaxUsuarios <= 0) return null;
        var activos = cn.ExecuteScalar<int>(
            "SELECT COUNT(1) FROM flujo.Usuario u WHERE u.Activo = 1 AND (@e IS NULL OR u.UsuarioId <> @e)" + Filtro(c),
            new { e = excluir });
        return activos + 1 > estado.MaxUsuarios
            ? $"La licencia permite {estado.MaxUsuarios} usuarios activos y ya hay {activos}. "
              + "Inactive un usuario o solicite la ampliación de la licencia."
            : null;
    }

    public static void MapUsuarios(this IEndpointRouteBuilder grupo)
    {
        var g = grupo.MapGroup("").RequireAuthorization();

        g.MapGet("/usuarios", (HttpContext ctx, Db db) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            using var cn = db.Abrir();
            return Results.Ok(cn.Query<UsuarioAdminDto>(Consultas.Lista + Filtro(Ambito(cn, ctx))));
        });

        g.MapPost("/usuarios", (NuevoUsuario datos, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            if (string.IsNullOrWhiteSpace(datos.Nombre) || string.IsNullOrWhiteSpace(datos.NombreUsuario))
                return Results.BadRequest(new { mensaje = "Nombre y nombre de usuario son obligatorios." });
            if (!string.IsNullOrEmpty(datos.Contrasena) && datos.Contrasena.Length < 8)
                return Results.BadRequest(new { mensaje = "La contraseña debe tener al menos 8 caracteres." });

            using var cn = db.Abrir();
            var perfilId = PerfilId(cn, datos.Perfil);
            if (perfilId is null) return Results.BadRequest(new { mensaje = "Perfil no válido." });

            var ambito = Ambito(cn, ctx);
            if (datos.Activo)
            {
                var limite = LimiteUsuarios(cn, config, null, ambito);
                if (limite is not null) return Results.BadRequest(new { mensaje = limite });
            }


            if (cn.QueryFirstOrDefault<int?>(
                    "SELECT UsuarioId FROM flujo.Usuario WHERE NombreUsuario = @n",
                    new { n = datos.NombreUsuario }) is not null)
                return Results.BadRequest(new { mensaje = "Ya existe un usuario con ese nombre de inicio de sesión." });

            var id = cn.QuerySingle<int>(
                """
                INSERT INTO flujo.Usuario
                    (NombreUsuario, NombreCompleto, CorreoElectronico, HashContrasena, PerfilId, Activo,
                      VerBancos, VerConsolidado, VerErogaciones, VerProyeccion, VerCatalogos, VerTablero, EditarErogaciones, AsignarFacturaContrato, TrasladarContratosHistorico, EditarTransferencias, EditarCatalogos)
                OUTPUT INSERTED.UsuarioId
                VALUES (@NombreUsuario, @Nombre, @Correo, @Hash, @PerfilId, @Activo,
                        @VerBancos, @VerConsolidado, @VerErogaciones, @VerProyeccion, @VerCatalogos, @VerTablero, @EditarErogaciones, @AsignarFacturaContrato, @TrasladarContratosHistorico, @EditarTransferencias, @EditarCatalogos)
                """,
                new
                {
                    datos.NombreUsuario,
                    datos.Nombre,
                    Correo = string.IsNullOrWhiteSpace(datos.Correo) ? null : datos.Correo,
                    Hash = string.IsNullOrEmpty(datos.Contrasena) ? null : Contrasenas.Crear(datos.Contrasena),
                    PerfilId = perfilId,
                    Activo = datos.Activo,
                    VerBancos = datos.VerBancos ?? true,
                    VerConsolidado = datos.VerConsolidado ?? true,
                    VerErogaciones = datos.VerErogaciones ?? true,
                    VerProyeccion = datos.VerProyeccion ?? true,
                    VerCatalogos = datos.VerCatalogos ?? true,
                    VerTablero = datos.VerTablero ?? true,
                    EditarErogaciones = datos.EditarErogaciones ?? true,
                    AsignarFacturaContrato = datos.AsignarFacturaContrato ?? false,
                    TrasladarContratosHistorico = datos.TrasladarContratosHistorico ?? false,
                    EditarTransferencias = datos.EditarTransferencias ?? false,
                    EditarCatalogos = datos.EditarCatalogos ?? false,
                });

            // El usuario nuevo pertenece a la empresa del administrador que lo crea.
            if (ambito is not null)
                cn.Execute("UPDATE flujo.Usuario SET InquilinoId = @i WHERE UsuarioId = @id",
                    new { i = ambito.InquilinoId, id });

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Seguridad",
                datos.NombreUsuario, "Creación",
                valorNuevo: $"Perfil: {datos.Perfil}; Activo: {datos.Activo}; "
                    + $"Saldo por banco: {(datos.VerBancos ?? true ? "Sí" : "No")}; "
                    + $"Saldo consolidado: {(datos.VerConsolidado ?? true ? "Sí" : "No")}; "
                    + $"Erogaciones: {(datos.VerErogaciones ?? true ? "Sí" : "No")}; "
                    + $"Proyección de cobros: {(datos.VerProyeccion ?? true ? "Sí" : "No")}; "
                    + $"Catálogos: {(datos.VerCatalogos ?? true ? "Sí" : "No")}; "
                    + $"Tablero: {(datos.VerTablero ?? true ? "Sí" : "No")}; "
                    + $"Editar erogaciones: {(datos.EditarErogaciones ?? true ? "Sí" : "No")}; "
                    + $"Asignar factura a contratos: {(datos.AsignarFacturaContrato ?? false ? "Sí" : "No")}; "
                    + $"Trasladar contratos al histórico: {(datos.TrasladarContratosHistorico ?? false ? "Sí" : "No")}; "
                    + $"Editar transferencias: {(datos.EditarTransferencias ?? false ? "Sí" : "No")}; "
                    + $"Modificar catálogos: {(datos.EditarCatalogos ?? false ? "Sí" : "No")}");

            return Results.Ok(new { id = id.ToString() });
        });

        g.MapPut("/usuarios/{id}", (string id, CambioUsuario datos, HttpContext ctx, Db db, IConfiguration config) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            if (!int.TryParse(id, out var usuarioId))
                return Results.BadRequest(new { mensaje = "Identificador no válido." });
            if (!string.IsNullOrEmpty(datos.Contrasena) && datos.Contrasena.Length < 8)
                return Results.BadRequest(new { mensaje = "La contraseña debe tener al menos 8 caracteres." });

            using var cn = db.Abrir();
            var ambito = Ambito(cn, ctx);
            var actual = cn.QueryFirstOrDefault<UsuarioAdminDto>(
                Consultas.Lista + Filtro(ambito) + " AND u.UsuarioId = @usuarioId", new { usuarioId });
            if (actual is null) return Results.NotFound(new { mensaje = "Usuario no encontrado." });

            int? perfilId = null;
            if (!string.IsNullOrWhiteSpace(datos.Perfil))
            {
                perfilId = PerfilId(cn, datos.Perfil);
                if (perfilId is null) return Results.BadRequest(new { mensaje = "Perfil no válido." });
            }

            if (datos.Activo == true && !actual.Activo)
            {
                var limite = LimiteUsuarios(cn, config, usuarioId, ambito);
                if (limite is not null) return Results.BadRequest(new { mensaje = limite });

            }

            // Evita dejar el sistema sin administradores activos.
            var quedaSinAdmin =
                (datos.Activo == false || (perfilId is not null && datos.Perfil != "administrador"))
                && actual.Perfil == "administrador"
                && cn.QuerySingle<int>(
                    """
                    SELECT COUNT(*) FROM flujo.Usuario u
                    INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
                    WHERE p.Codigo = 'administrador' AND u.Activo = 1 AND u.UsuarioId <> @usuarioId
                    """ + Filtro(ambito), new { usuarioId }) == 0;
            if (quedaSinAdmin)
                return Results.BadRequest(new { mensaje = "Debe existir al menos un administrador activo." });

            cn.Execute(
                """
                UPDATE flujo.Usuario SET
                    NombreCompleto    = ISNULL(@Nombre, NombreCompleto),
                    NombreUsuario     = ISNULL(@NombreUsuario, NombreUsuario),
                    CorreoElectronico = CASE WHEN @Correo IS NULL THEN CorreoElectronico ELSE NULLIF(@Correo, '') END,
                    PerfilId          = ISNULL(@PerfilId, PerfilId),
                    Activo            = ISNULL(@Activo, Activo),
                    HashContrasena    = ISNULL(@Hash, HashContrasena),
                    VerBancos         = ISNULL(@VerBancos, VerBancos),
                    VerConsolidado    = ISNULL(@VerConsolidado, VerConsolidado),
                    VerErogaciones    = ISNULL(@VerErogaciones, VerErogaciones),
                    VerProyeccion     = ISNULL(@VerProyeccion, VerProyeccion),
                    VerCatalogos      = ISNULL(@VerCatalogos, VerCatalogos),
                    VerTablero        = ISNULL(@VerTablero, VerTablero),
                    EditarErogaciones = ISNULL(@EditarErogaciones, EditarErogaciones),
                    AsignarFacturaContrato = ISNULL(@AsignarFacturaContrato, AsignarFacturaContrato),
                    TrasladarContratosHistorico = ISNULL(@TrasladarContratosHistorico, TrasladarContratosHistorico),
                    EditarTransferencias = ISNULL(@EditarTransferencias, EditarTransferencias),
                    EditarCatalogos = ISNULL(@EditarCatalogos, EditarCatalogos)
                WHERE UsuarioId = @usuarioId
                """,
                new
                {
                    datos.Nombre,
                    datos.NombreUsuario,
                    datos.Correo,
                    PerfilId = perfilId,
                    datos.Activo,
                    Hash = string.IsNullOrEmpty(datos.Contrasena) ? null : Contrasenas.Crear(datos.Contrasena),
                    datos.VerBancos,
                    datos.VerConsolidado,
                    datos.VerErogaciones,
                    datos.VerProyeccion,
                    datos.VerCatalogos,
                    datos.VerTablero,
                    datos.EditarErogaciones,
                    datos.AsignarFacturaContrato,
                    datos.TrasladarContratosHistorico,
                    datos.EditarTransferencias,
                    datos.EditarCatalogos,
                    usuarioId,
                });

            static string Si(bool valor) => valor ? "Sí" : "No";
            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Seguridad",
                actual.NombreUsuario, "Modificación",
                valorAnterior: $"Perfil: {actual.Perfil}; Activo: {actual.Activo}; "
                    + $"Saldo por banco: {Si(actual.VerBancos)}; Saldo consolidado: {Si(actual.VerConsolidado)}; "
                    + $"Erogaciones: {Si(actual.VerErogaciones)}; Proyección de cobros: {Si(actual.VerProyeccion)}; "
                    + $"Catálogos: {Si(actual.VerCatalogos)}; Tablero: {Si(actual.VerTablero)}; Editar erogaciones: {Si(actual.EditarErogaciones)}; "
                    + $"Asignar factura a contratos: {Si(actual.AsignarFacturaContrato)}; "
                    + $"Trasladar contratos al histórico: {Si(actual.TrasladarContratosHistorico)}; "
                    + $"Editar transferencias: {Si(actual.EditarTransferencias)}; Modificar catálogos: {Si(actual.EditarCatalogos)}",
                valorNuevo: $"Perfil: {datos.Perfil ?? actual.Perfil}; Activo: {datos.Activo ?? actual.Activo}; "
                    + $"Saldo por banco: {Si(datos.VerBancos ?? actual.VerBancos)}; "
                    + $"Saldo consolidado: {Si(datos.VerConsolidado ?? actual.VerConsolidado)}; "
                    + $"Erogaciones: {Si(datos.VerErogaciones ?? actual.VerErogaciones)}; "
                    + $"Proyección de cobros: {Si(datos.VerProyeccion ?? actual.VerProyeccion)}; "
                    + $"Catálogos: {Si(datos.VerCatalogos ?? actual.VerCatalogos)}; "
                    + $"Tablero: {Si(datos.VerTablero ?? actual.VerTablero)}; "
                    + $"Editar erogaciones: {Si(datos.EditarErogaciones ?? actual.EditarErogaciones)}; "
                    + $"Asignar factura a contratos: {Si(datos.AsignarFacturaContrato ?? actual.AsignarFacturaContrato)}; "
                    + $"Trasladar contratos al histórico: {Si(datos.TrasladarContratosHistorico ?? actual.TrasladarContratosHistorico)}; "
                    + $"Editar transferencias: {Si(datos.EditarTransferencias ?? actual.EditarTransferencias)}; "
                    + $"Modificar catálogos: {Si(datos.EditarCatalogos ?? actual.EditarCatalogos)}");

            return Results.Ok(new { mensaje = "Usuario actualizado." });
        });

        g.MapDelete("/usuarios/{id}", (string id, HttpContext ctx, Db db) =>
        {
            if (!EsAdmin(ctx)) return Results.Forbid();
            if (!int.TryParse(id, out var usuarioId))
                return Results.BadRequest(new { mensaje = "Identificador no válido." });
            if (usuarioId == ctx.User.UsuarioId())
                return Results.BadRequest(new { mensaje = "No puede eliminar el usuario de la sesión activa." });

            using var cn = db.Abrir();
            var ambito = Ambito(cn, ctx);
            var actual = cn.QueryFirstOrDefault<UsuarioAdminDto>(
                Consultas.Lista + Filtro(ambito) + " AND u.UsuarioId = @usuarioId", new { usuarioId });
            if (actual is null) return Results.NotFound(new { mensaje = "Usuario no encontrado." });

            var referencias = cn.QuerySingle<int>(
                """
                SELECT (SELECT COUNT(*) FROM flujo.TipoCambio WHERE UsuarioId = @usuarioId)
                     + (SELECT COUNT(*) FROM flujo.Bitacora   WHERE UsuarioId = @usuarioId)
                """, new { usuarioId });
            if (referencias > 0)
                return Results.BadRequest(new
                {
                    mensaje = "No se puede eliminar: el usuario tiene movimientos o bitácora asociados. Inactívelo en su lugar.",
                });

            try
            {
                cn.Execute("DELETE FROM flujo.Usuario WHERE UsuarioId = @usuarioId", new { usuarioId });
            }
            catch (SqlException ex) when (ex.Number is 547)
            {
                return Results.BadRequest(new
                {
                    mensaje = "No se puede eliminar: existen registros que dependen de este usuario. Inactívelo en su lugar.",
                });
            }

            Db.Auditar(cn, ctx.User.UsuarioId(), ctx.User.NombreUsuario(), "Seguridad",
                actual.NombreUsuario, "Eliminación", valorAnterior: $"Perfil: {actual.Perfil}");

            return Results.Ok(new { mensaje = "Usuario eliminado." });
        });
    }

    private static class Consultas
    {
        public const string Lista =
            """
            SELECT CAST(u.UsuarioId AS NVARCHAR(20)) AS Id, u.NombreCompleto AS Nombre,
                   u.NombreUsuario, u.CorreoElectronico AS Correo, p.Codigo AS Perfil, u.Activo,
                    u.VerBancos, u.VerConsolidado, u.VerErogaciones, u.VerProyeccion, u.VerCatalogos, u.VerTablero,
                    u.EditarErogaciones, u.AsignarFacturaContrato, u.TrasladarContratosHistorico, u.EditarTransferencias, u.EditarCatalogos
            FROM flujo.Usuario u
            INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
            WHERE 1 = 1
            """;
    }
}
