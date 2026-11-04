using System.Data;
using Dapper;
using FlujoEfectivo.Api.Modelos;

namespace FlujoEfectivo.Api.Datos;

/// <summary>Marca «Pagado (Cash Flow)» de documentos por pagar. Vive solo en la base de
/// Flujo de Efectivo (flujo.DocumentoPagarMarca) y nunca escribe en el ERP. La clave es
/// compañía + proveedor + tipo + número, igual en modo directo, agente o registro interno.
/// La compañía pertenece a la empresa, por lo que el filtro de CompaniaId aísla inquilinos.</summary>
public static class MarcasPagoCashFlow
{
    public static bool Disponible(IDbConnection cn) =>
        cn.ExecuteScalar<int>("SELECT CASE WHEN OBJECT_ID('flujo.DocumentoPagarMarca','U') IS NULL THEN 0 ELSE 1 END") == 1;

    private sealed class Fila
    {
        public string CompaniaId { get; set; } = "";
        public string Proveedor { get; set; } = "";
        public string Tipo { get; set; } = "";
        public string Numero { get; set; } = "";
        public string? FechaPago { get; set; }
        public string? Nota { get; set; }
        public string? MarcadoPor { get; set; }
    }

    private static string Clave(string compania, string proveedor, string tipo, string numero) =>
        $"{compania.Trim()}|{proveedor.Trim().ToUpperInvariant()}|{tipo.Trim().ToUpperInvariant()}|{numero.Trim().ToUpperInvariant()}";

    public static List<DocumentoPorPagarDto> Aplicar(IDbConnection cn, List<DocumentoPorPagarDto> docs)
    {
        if (docs.Count == 0 || !Disponible(cn)) return docs;
        var marcas = cn.Query<Fila>(
            """
            SELECT CAST(CompaniaId AS NVARCHAR(20)) AS CompaniaId, Proveedor, Tipo, Numero,
                   CONVERT(CHAR(10), FechaPago, 23) AS FechaPago, Nota, MarcadoPor
            FROM flujo.DocumentoPagarMarca
            """).GroupBy(m => Clave(m.CompaniaId, m.Proveedor, m.Tipo, m.Numero))
            .ToDictionary(g => g.Key, g => g.First());
        foreach (var d in docs)
        {
            if (!marcas.TryGetValue(Clave(d.CompaniaId, d.Proveedor, d.Tipo, d.Numero), out var m)) continue;
            d.PagadoCashFlow = true;
            d.SaldoOrigen = d.Saldo;
            d.Saldo = 0;
            d.FechaPagoCashFlow = m.FechaPago;
            d.NotaPagoCashFlow = m.Nota;
            d.MarcadoPor = m.MarcadoPor;
        }
        return docs;
    }

    public static void Marcar(IDbConnection cn, MarcaPagoDocumento m, string usuario)
    {
        Quitar(cn, m);
        cn.Execute(
            """
            INSERT INTO flujo.DocumentoPagarMarca (CompaniaId, Proveedor, Tipo, Numero, FechaPago, Nota, MarcadoPor)
            VALUES (@CompaniaId, @Proveedor, @Tipo, @Numero, @FechaPago, @Nota, @Usuario)
            """,
            new
            {
                CompaniaId = int.Parse(m.CompaniaId), Proveedor = m.Proveedor.Trim(), Tipo = m.Tipo.Trim(),
                Numero = m.Numero.Trim(),
                FechaPago = string.IsNullOrWhiteSpace(m.FechaPago) ? DateTime.Today : DateTime.Parse(m.FechaPago),
                Nota = string.IsNullOrWhiteSpace(m.Nota) ? null : m.Nota.Trim(),
                Usuario = usuario,
            });
    }

    public static void Quitar(IDbConnection cn, MarcaPagoDocumento m) =>
        cn.Execute(
            """
            DELETE FROM flujo.DocumentoPagarMarca
            WHERE CompaniaId=@c AND UPPER(Proveedor)=UPPER(@p) AND UPPER(Tipo)=UPPER(@t) AND UPPER(Numero)=UPPER(@n)
            """,
            new { c = int.Parse(m.CompaniaId), p = m.Proveedor.Trim(), t = m.Tipo.Trim(), n = m.Numero.Trim() });
}
