using System.Data;
using System.Text.Json;
using Dapper;
using FlujoEfectivo.Api.Modelos;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Fase 3: instantáneas de Facturas y Contratos enviadas por el agente.
/// Conservan los mismos IDs del modo directo (sl:NUM y sl:ct-NUM) para que pagos,
/// conciliación y la coincidencia de contratos del mes no cambien.</summary>
public static class ReplicaDocumentos
{
    public sealed class FilaFactura
    {
        public FacturaDto Factura { get; set; } = new();
        public List<LineaFacturaDto>? Detalle { get; set; }
    }
    public sealed class FilaContrato
    {
        public ContratoDto Contrato { get; set; } = new();
        public List<LineaContratoDto> Detalle { get; set; } = [];
    }

    public static bool Lista(IDbConnection cn) => ReplicaPedidos.Lista(cn) && cn.ExecuteScalar<int>(
        "SELECT CASE WHEN OBJECT_ID('flujo.ReplicaErp','U') IS NOT NULL THEN 1 ELSE 0 END") == 1;

    private static string? Datos(IDbConnection cn, int compania, string entidad) => cn.QueryFirstOrDefault<string>(
        "SELECT Datos FROM flujo.ReplicaErp WHERE InquilinoId=@id AND CompaniaId=@compania AND Entidad=@entidad",
        new { id = ReplicaPedidos.Principal(cn), compania, entidad });

    public static bool Existe(IDbConnection cn, int compania, string entidad) => Lista(cn) && Datos(cn, compania, entidad) is not null;

    public static List<FilaFactura> Facturas(IDbConnection cn, int compania) => !Lista(cn) ? [] :
        JsonSerializer.Deserialize<List<FilaFactura>>(Datos(cn, compania, "facturas") ?? "[]", ReplicaPedidos.Json) ?? [];

    public static List<FilaContrato> Contratos(IDbConnection cn, int compania) => !Lista(cn) ? [] :
        JsonSerializer.Deserialize<List<FilaContrato>>(Datos(cn, compania, "contratos") ?? "[]", ReplicaPedidos.Json) ?? [];

    /// <summary>Documentos por pagar requieren el script 22 (amplía la restricción de entidades).</summary>
    public static bool ListaPagar(IDbConnection cn) => Lista(cn) && cn.ExecuteScalar<int>(
        "SELECT COUNT(*) FROM sys.check_constraints WHERE name='CK_ReplicaErp_Entidad' AND definition LIKE '%documentosPagar%'") == 1;

    public static List<DocumentoPorPagarDto> DocumentosPagar(IDbConnection cn, int compania) => !ListaPagar(cn) ? [] :
        JsonSerializer.Deserialize<List<DocumentoPorPagarDto>>(Datos(cn, compania, "documentosPagar") ?? "[]", ReplicaPedidos.Json) ?? [];

    public static string? ValidarDocumentosPagar(List<DocumentoPorPagarDto>? filas)
    {
        if (filas is null || filas.Count > 200000) return "El envío debe contener una instantánea completa de hasta 200000 documentos por pagar.";
        if (filas.Any(f => f is null)) return "Documento por pagar ausente.";
        // La clave en Softland es proveedor + tipo + documento: proveedores distintos pueden repetir número.
        var dup = filas.GroupBy(f => f.Proveedor + "|" + f.Tipo + "-" + f.Numero, StringComparer.Ordinal).FirstOrDefault(g => g.Count() > 1);
        if (dup is not null) return $"Documento por pagar duplicado: {dup.First().Tipo}-{dup.First().Numero}.";
        foreach (var x in filas)
            if (string.IsNullOrWhiteSpace(x.Numero) || x.Numero.Length > 100 || !Fecha(x.Fecha) || !Moneda(x.Moneda) || x.Saldo <= 0)
                return $"Documento por pagar {x.Tipo}-{x.Numero} inválido (fecha, moneda o saldo); no se reemplazó la réplica.";
        return null;
    }

    public static void Normalizar(List<DocumentoPorPagarDto> filas, int compania)
    {
        foreach (var x in filas)
        {
            x.Id = Softland.PrefijoId + x.Tipo + "-" + x.Numero;
            if (filas.Count(o => o.Tipo == x.Tipo && o.Numero == x.Numero) > 1) x.Id += "-" + x.Proveedor;
            x.CompaniaId = compania.ToString();
            x.Origen = Softland.Fuente;
        }
    }

    private static bool Moneda(string? m) => m is "USD" or "CRC";
    private static bool Fecha(string? f) => DateOnly.TryParseExact(f, "yyyy-MM-dd", out _);

    public static string? ValidarFacturas(List<FilaFactura>? filas)
    {
        if (filas is null || filas.Count > 200000) return "El envío debe contener una instantánea completa de hasta 200000 facturas.";
        if (filas.Any(f => f is null || f.Factura is null)) return "Factura ausente.";
        var dupF = filas.GroupBy(f => f.Factura.Numero, StringComparer.Ordinal).FirstOrDefault(g => g.Count() > 1);
        if (dupF is not null) return $"Número de factura duplicado: {dupF.Key}.";
        foreach (var f in filas)
        {
            var x = f.Factura;
            if (string.IsNullOrWhiteSpace(x.Numero) || x.Numero.Length > 100 || !Fecha(x.FechaEmision) || !Moneda(x.Moneda)
                || x.Monto < 0 || x.PlazoDias < 0 || (f.Detalle?.Count ?? 0) > 10000)
                return $"Factura {x.Numero} inválida (fecha {x.FechaEmision}, moneda {x.Moneda}, monto o plazo); no se reemplazó la réplica.";
        }
        return null;
    }

    public static string? ValidarContratos(List<FilaContrato>? filas)
    {
        if (filas is null || filas.Count > 50000) return "El envío debe contener una instantánea completa de hasta 50000 contratos.";
        if (filas.Any(f => f is null || f.Contrato is null || f.Detalle is null)) return "Contrato o detalle ausente.";
        var dupC = filas.GroupBy(f => f.Contrato.Numero, StringComparer.Ordinal).FirstOrDefault(g => g.Count() > 1);
        if (dupC is not null) return $"Número de contrato duplicado: {dupC.Key}.";
        foreach (var f in filas)
        {
            var x = f.Contrato;
            if (string.IsNullOrWhiteSpace(x.Numero) || x.Numero.Length > 100 || (x.ProximaFacturacion.Length > 0 && !Fecha(x.ProximaFacturacion)) || !Moneda(x.Moneda)
                || x.Monto < 0 || x.PlazoDias < 0 || x.Estado is not ("Activo" or "Cancelado") || f.Detalle.Count > 10000)
                return $"Contrato {x.Numero} inválido (fecha, moneda {x.Moneda}, estado {x.Estado}, monto o plazo); no se reemplazó la réplica.";
        }
        return null;
    }

    /// <summary>La compañía, el ID y el origen los asigna el servidor, nunca el agente.</summary>
    public static void Normalizar(List<FilaFactura> filas, int compania)
    {
        foreach (var f in filas)
        {
            f.Factura.Id = Softland.PrefijoId + f.Factura.Numero;
            f.Factura.CompaniaId = compania.ToString();
            f.Factura.Origen = Softland.Fuente;
        }
    }
    public static void Normalizar(List<FilaContrato> filas, int compania)
    {
        foreach (var f in filas)
        {
            f.Contrato.Id = Softland.PrefijoId + "ct-" + f.Contrato.Numero;
            f.Contrato.CompaniaId = compania.ToString();
            f.Contrato.Origen = Softland.Fuente;
            f.Contrato.Lineas = f.Detalle.Count;
        }
    }

    /// <summary>Compañías en modo agente con la fuente Softland activa.</summary>
    public static List<int> CompaniasAgente(IDbConnection cn) =>
        ReplicaPedidos.Conexiones(cn).Where(x => x.Modo == "agente").Select(x => x.CompaniaId).ToList();
}
