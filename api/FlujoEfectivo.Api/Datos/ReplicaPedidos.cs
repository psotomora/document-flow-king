using System.Data;
using System.Text.Json;
using Dapper;
using FlujoEfectivo.Api.Modelos;

namespace FlujoEfectivo.Api.Datos;

public static class ReplicaPedidos
{
    public const string Prefijo = "sl:ag:";
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public sealed class Fila
    {
        public PedidoDto Pedido { get; set; } = new();
        public List<LineaPedidoDto> Detalle { get; set; } = [];
    }
    public sealed class Conexion
    {
        public int CompaniaId { get; set; }
        public string Modo { get; set; } = "directa";
        public int IntervaloMinutos { get; set; } = 5;
        public Guid? TrabajoId { get; set; }
    }
    public static bool Lista(IDbConnection cn) => cn.ExecuteScalar<int>(
        "SELECT CASE WHEN OBJECT_ID('flujo.ConexionErpCompania','U') IS NOT NULL AND OBJECT_ID('flujo.ReplicaPedidos','U') IS NOT NULL THEN 1 ELSE 0 END") == 1;
    // Fases 1-3: usuarios existentes son de principal. No habilitar otros tenants
    // hasta incorporar identidad de usuario por inquilino en la Fase 5.
    public static int Principal(IDbConnection cn) => cn.ExecuteScalar<int>(
        "SELECT InquilinoId FROM flujo.Inquilino WHERE Codigo='principal' AND Activo=1");
    public static List<Conexion> Conexiones(IDbConnection cn) => !Lista(cn) ? [] : cn.Query<Conexion>(
        "SELECT CompaniaId, Modo, IntervaloMinutos FROM flujo.ConexionErpCompania WHERE InquilinoId=@id", new { id = Principal(cn) }).ToList();
    public static List<Fila> Leer(IDbConnection cn, int compania) => JsonSerializer.Deserialize<List<Fila>>(
        cn.QueryFirstOrDefault<string>("SELECT Datos FROM flujo.ReplicaPedidos WHERE InquilinoId=@id AND CompaniaId=@compania", new { id = Principal(cn), compania }) ?? "[]", Json) ?? [];
    public static string? Validar(List<Fila>? filas)
    {
        if (filas is null || filas.Count > 50000) return "El envío debe contener una instantánea completa de hasta 50000 pedidos.";
        if (filas.Any(f => f is null || f.Pedido is null || f.Detalle is null)) return "Pedido o detalle ausente.";
        if (filas.Select(f => f.Pedido.Numero).Distinct(StringComparer.Ordinal).Count() != filas.Count) return "Números de pedido duplicados.";
        foreach (var f in filas)
        {
            var p = f.Pedido;
            if (string.IsNullOrWhiteSpace(p.Numero) || p.Numero.Length > 100 || string.IsNullOrWhiteSpace(p.Cliente)
                || !DateOnly.TryParseExact(p.FechaCreacion, "yyyy-MM-dd", out _) || p.Estado != "Pendiente"
                || p.Moneda is not ("USD" or "CRC") || p.Monto < 0 || p.PlazoDias < 0 || f.Detalle.Count > 10000)
                return "Datos de pedido inválidos; no se reemplazó la réplica.";
        }
        return null;
    }
    public static void Normalizar(List<Fila> filas, int compania)
    {
        foreach (var f in filas)
        {
            f.Pedido.Id = $"{Prefijo}{compania}:{f.Pedido.Numero}";
            f.Pedido.CompaniaId = compania.ToString();
            f.Pedido.Origen = Softland.Fuente;
            f.Pedido.Lineas = f.Detalle.Count;
        }
    }
    public static void RegistrarVerificacion(IDbConnection cn, string entidad, int compania, bool ok)
    {
        if (!Lista(cn)) return;
        cn.Execute("""
            UPDATE flujo.SincronizacionEstado SET UltimaVerificacion=SYSUTCDATETIME(), Resultado=@resultado
            WHERE InquilinoId=@id AND CompaniaId=@compania AND Entidad=@entidad;
            IF @@ROWCOUNT=0 INSERT INTO flujo.SincronizacionEstado (InquilinoId,CompaniaId,Entidad,UltimaVerificacion,Resultado)
            VALUES (@id,@compania,@entidad,SYSUTCDATETIME(),@resultado);
            """, new { id = Principal(cn), compania, entidad, resultado = ok ? "ok" : "error" });
    }
}