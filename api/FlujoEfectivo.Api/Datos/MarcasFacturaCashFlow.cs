using System.Data;
using Dapper;
using FlujoEfectivo.Api.Modelos;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Marca «Saldada / N/C (Cash Flow)» de facturas por cobrar: cubre notas de crédito
/// emitidas en el ERP pero aún no aplicadas en cuentas por cobrar. Vive solo en
/// flujo.FacturaMarca y nunca escribe en el ERP. Clave: compañía + número de factura.</summary>
public static class MarcasFacturaCashFlow
{
    public static bool Disponible(IDbConnection cn) =>
        cn.ExecuteScalar<int>("SELECT CASE WHEN OBJECT_ID('flujo.FacturaMarca','U') IS NULL THEN 0 ELSE 1 END") == 1;

    private sealed class Fila
    {
        public string CompaniaId { get; set; } = "";
        public string Numero { get; set; } = "";
        public string? Fecha { get; set; }
        public string? Nota { get; set; }
        public string? MarcadoPor { get; set; }
    }

    private static string Clave(string compania, string numero) =>
        $"{compania.Trim()}|{numero.Trim().ToUpperInvariant()}";

    public static List<FacturaDto> Aplicar(IDbConnection cn, List<FacturaDto> facturas)
    {
        if (facturas.Count == 0 || !Disponible(cn)) return facturas;
        var marcas = cn.Query<Fila>(
            """
            SELECT CAST(CompaniaId AS NVARCHAR(20)) AS CompaniaId, Numero,
                   CONVERT(CHAR(10), Fecha, 23) AS Fecha, Nota, MarcadoPor
            FROM flujo.FacturaMarca
            """).GroupBy(m => Clave(m.CompaniaId, m.Numero)).ToDictionary(g => g.Key, g => g.First());
        foreach (var f in facturas)
        {
            if (!marcas.TryGetValue(Clave(f.CompaniaId, f.Numero), out var m)) continue;
            f.SaldadaCashFlow = true;
            f.SaldoErpOrigen = f.SaldoErp;
            f.CobradaOrigen = f.Cobrada;
            f.SaldoErp = 0;
            f.Cobrada = true;
            f.FechaSaldadaCashFlow = m.Fecha;
            f.NotaSaldadaCashFlow = m.Nota;
            f.SaldadaPor = m.MarcadoPor;
        }
        return facturas;
    }

    public static void Marcar(IDbConnection cn, MarcaSaldadaFactura m, string usuario)
    {
        Quitar(cn, m);
        cn.Execute(
            """
            INSERT INTO flujo.FacturaMarca (CompaniaId, Numero, Fecha, Nota, MarcadoPor)
            VALUES (@CompaniaId, @Numero, @Fecha, @Nota, @Usuario)
            """,
            new
            {
                CompaniaId = int.Parse(m.CompaniaId), Numero = m.Numero.Trim(),
                Fecha = string.IsNullOrWhiteSpace(m.Fecha) ? DateTime.Today : DateTime.Parse(m.Fecha),
                Nota = string.IsNullOrWhiteSpace(m.Nota) ? null : m.Nota.Trim(),
                Usuario = usuario,
            });
    }

    public static void Quitar(IDbConnection cn, MarcaSaldadaFactura m) =>
        cn.Execute(
            "DELETE FROM flujo.FacturaMarca WHERE CompaniaId=@c AND UPPER(Numero)=UPPER(@n)",
            new { c = int.Parse(m.CompaniaId), n = m.Numero.Trim() });
}
