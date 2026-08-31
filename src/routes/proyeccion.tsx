import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { FileDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
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
import { proyeccionPorTramos, saldoPorCliente } from "@/lib/calculos";
import { formatearMoneda, formatearPorcentaje } from "@/lib/formato";
import { exportarPdf } from "@/lib/exportar";

export const Route = createFileRoute("/proyeccion")({
  head: () => ({
    meta: [
      { title: "Proyección de cobros | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Facturas por cobrar agrupadas en tramos de vencimiento: vencido, 0-7, 8-15, 16-30, 31-60 y más de 60 días.",
      },
      { property: "og:title", content: "Proyección de cobros | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Cuándo entra el efectivo esperado, por tramo de vencimiento y por cliente.",
      },
    ],
  }),
  component: PaginaProyeccion,
});

const COLORES: Record<string, string> = {
  vencido: "var(--destructive)",
  "0-7": "var(--advertencia)",
  "8-15": "var(--chart-3)",
  "16-30": "var(--chart-2)",
  "31-60": "var(--chart-1)",
  "60+": "var(--chart-5)",
};

function PaginaProyeccion() {
  const { facturasCalculadas, companiaActiva, usuario } = useApp();
  const visibles = filtrarPorCompania(facturasCalculadas, companiaActiva);

  const datos = useMemo(
    () => ({
      USD: proyeccionPorTramos(visibles, "USD"),
      CRC: proyeccionPorTramos(visibles, "CRC"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facturasCalculadas, companiaActiva],
  );

  const exportar = (moneda: Moneda) =>
    exportarPdf(
      `proyeccion-cobros-${moneda.toLowerCase()}`,
      "Proyección de cobros por tramo de vencimiento",
      `Moneda: ${moneda}`,
      ["Tramo", "Facturas", "Monto por cobrar", "Participación"],
      datos[moneda].filas.map((f) => [
        f.etiqueta,
        f.cantidad,
        formatearMoneda(f.monto, moneda),
        formatearPorcentaje(f.porcentaje),
      ]),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Proyección de cobros"
        requerimiento="RF-010"
        descripcion="Solo se incluyen facturas con saldo pendiente. Los tramos se calculan con los días para vencer a la fecha de corte."
      />

      <Tabs defaultValue="USD">
        <TabsList>
          <TabsTrigger value="USD">Dólares (USD)</TabsTrigger>
          <TabsTrigger value="CRC">Colones (CRC)</TabsTrigger>
        </TabsList>
        {(["USD", "CRC"] as Moneda[]).map((moneda) => {
          const { filas, total, cantidadTotal } = datos[moneda];
          const clientes = saldoPorCliente(visibles, moneda).slice(0, 8);
          return (
            <TabsContent key={moneda} value={moneda} className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => exportar(moneda)}
                >
                  <FileDown className="size-4" /> Exportar PDF
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-sm font-medium">Monto por cobrar según tramo ({moneda})</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filas} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="etiqueta"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        interval={0}
                        angle={-12}
                        height={50}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        width={80}
                        tickFormatter={(v: number) => formatearMoneda(v, moneda)}
                      />
                      <Tooltip
                        formatter={(v: number) => formatearMoneda(v, moneda)}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                        {filas.map((f) => (
                          <Cell key={f.clave} fill={COLORES[f.clave] ?? "var(--primary)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tramo</TableHead>
                        <TableHead className="text-right">Facturas</TableHead>
                        <TableHead className="text-right">Monto por cobrar</TableHead>
                        <TableHead className="text-right">Participación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filas.map((f) => (
                        <TableRow key={f.clave}>
                          <TableCell className="flex items-center gap-2 font-medium">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ background: COLORES[f.clave] }}
                              aria-hidden
                            />
                            {f.etiqueta}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{f.cantidad}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatearMoneda(f.monto, moneda)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatearPorcentaje(f.porcentaje)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell>Total por cobrar</TableCell>
                        <TableCell className="text-right tabular-nums">{cantidadTotal}</TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">
                          {formatearMoneda(total, moneda)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">100 %</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-3 text-sm font-medium">Saldo por cliente ({moneda})</p>
                  {clientes.length ? (
                    <ul className="space-y-2.5">
                      {clientes.map((c) => (
                        <li key={c.cliente} className="space-y-1">
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="truncate">{c.cliente}</span>
                            <span className="font-mono tabular-nums">
                              {formatearMoneda(c.saldo, moneda)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded bg-muted">
                            <div
                              className="h-1.5 rounded bg-primary"
                              style={{ width: `${total > 0 ? (c.saldo / total) * 100 : 0}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No hay saldos pendientes en {moneda}.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
