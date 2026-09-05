import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Coins, FileDown } from "lucide-react";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaIndicador } from "@/components/comunes/TarjetaIndicador";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { Moneda } from "@/data/tipos";
import { calcularSaldosPorBanco, totalizarSaldos } from "@/lib/calculos";
import { formatearMoneda, formatearNumero } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/bancos")({
  head: () => ({
    meta: [
      { title: "Saldo disponible por banco | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Saldo inicial, pagos recibidos, erogaciones y saldo neto por cuenta bancaria, separado por moneda.",
      },
      { property: "og:title", content: "Saldo disponible por banco | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Disponibilidad real de efectivo en cada cuenta bancaria.",
      },
    ],
  }),
  component: PaginaBancos,
});

function PaginaBancos() {
  const { bancos, pagos, erogaciones, companiaActiva, companias, usuario, tipoCambio } = useApp();

  const visibles = filtrarPorCompania(bancos, companiaActiva).filter((b) => b.activo);

  const saldos = useMemo(
    () => ({
      USD: calcularSaldosPorBanco(visibles, pagos, erogaciones, "USD"),
      CRC: calcularSaldosPorBanco(visibles, pagos, erogaciones, "CRC"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bancos, pagos, erogaciones, companiaActiva],
  );

  const totalUSD = totalizarSaldos(saldos.USD).saldoNeto;
  const totalCRC = totalizarSaldos(saldos.CRC).saldoNeto;
  const equivalenteUSD = tipoCambio > 0 ? totalCRC / tipoCambio : 0;
  const consolidadoUSD = totalUSD + equivalenteUSD;

  const exportar = (moneda: Moneda) =>
    exportarExcel(
      `saldo-por-banco-${moneda.toLowerCase()}`,
      `Saldos ${moneda}`,
      saldos[moneda].map((s) => ({
        Compañía: companias.find((c) => c.id === s.companiaId)?.codigo ?? "",
        Banco: s.nombre,
        "Saldo inicial": s.saldoInicial,
        "Pagos recibidos": s.pagosRecibidos,
        "Saldo actual": s.saldoActual,
        Erogaciones: s.erogaciones,
        "Saldo disponible": s.saldoNeto,
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Saldo disponible por banco"
        requerimiento="RF-008"
        descripcion="Saldo disponible = saldo inicial + pagos recibidos − erogaciones. Los montos en dólares y en colones nunca se mezclan."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          titulo="Saldo disponible USD"
          valor={formatearMoneda(totalUSD, "USD")}
          detalle="Suma de cuentas en dólares"
        />
        <TarjetaIndicador
          titulo="Saldo disponible CRC"
          valor={formatearMoneda(totalCRC, "CRC")}
          detalle="Suma de cuentas en colones"
        />
        <TarjetaIndicador
          titulo="Colones en USD"
          valor={formatearMoneda(equivalenteUSD, "USD")}
          detalle={`Tipo de cambio ₡${formatearNumero(tipoCambio)}`}
        />
        <TarjetaIndicador
          titulo="Consolidado en USD"
          valor={formatearMoneda(consolidadoUSD, "USD")}
          detalle="Dólares + colones convertidos"
          tono="primario"
          icono={<Coins className="size-4" />}
        />
      </div>


      <Tabs defaultValue="USD">
        <TabsList>
          <TabsTrigger value="USD">Dólares (USD)</TabsTrigger>
          <TabsTrigger value="CRC">Colones (CRC)</TabsTrigger>
        </TabsList>
        {(["USD", "CRC"] as Moneda[]).map((moneda) => {
          const filas = saldos[moneda];
          const total = totalizarSaldos(filas);
          return (
            <TabsContent key={moneda} value={moneda} className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => exportar(moneda)}
                >
                  <FileDown className="size-4" /> Exportar Excel
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Compañía</TableHead>
                      <TableHead className="text-right">Saldo inicial</TableHead>
                      <TableHead className="text-right">Pagos recibidos</TableHead>
                      <TableHead className="text-right">Saldo actual</TableHead>
                      <TableHead className="text-right">Erogaciones</TableHead>
                      <TableHead className="text-right">Saldo disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((s) => (
                      <TableRow key={s.bancoId}>
                        <TableCell className="font-medium">{s.nombre}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {companias.find((c) => c.id === s.companiaId)?.codigo}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(s.saldoInicial, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-exito">
                          {formatearMoneda(s.pagosRecibidos, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(s.saldoActual, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-destructive">
                          −{formatearMoneda(s.erogaciones, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">
                          {formatearMoneda(s.saldoNeto, moneda)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No hay cuentas bancarias activas para la compañía seleccionada.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                  {filas.length ? (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2}>Total {moneda}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(total.saldoInicial, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(total.pagosRecibidos, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(total.saldoActual, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          −{formatearMoneda(total.erogaciones, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">
                          {formatearMoneda(total.saldoNeto, moneda)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  ) : null}
                </Table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
