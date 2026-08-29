import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoBadge } from "@/components/comunes/EstadoBadge";
import { TarjetaIndicador } from "@/components/comunes/TarjetaIndicador";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { Moneda } from "@/data/tipos";
import {
  calcularSaldoProyectado,
  calcularSaldosPorBanco,
  indicadoresPorMoneda,
  inicioDePeriodo,
  proyeccionPorTramos,
} from "@/lib/calculos";
import { formatearFecha, formatearMoneda, formatearPorcentaje } from "@/lib/formato";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tablero de flujo de efectivo | Aplix" },
      {
        name: "description",
        content:
          "Tablero con saldos bancarios, cuentas por cobrar, facturas vencidas y proyección de cobros para THERONIX y APLIX.",
      },
      { property: "og:title", content: "Tablero de flujo de efectivo | Aplix" },
      {
        property: "og:description",
        content:
          "Vista semanal o mensual del efectivo disponible, cobrado y por cobrar en dólares y colones.",
      },
    ],
  }),
  component: Tablero,
});

function Tablero() {
  const {
    facturasCalculadas,
    bancos,
    pagos,
    erogaciones,
    pedidos,
    contratos,
    companiaActiva,
    tipoCambio,
    hoy,
  } = useApp();

  const [periodo, setPeriodo] = useState<"semanal" | "mensual">("mensual");
  const [moneda, setMoneda] = useState<Moneda>("USD");

  const facturas = filtrarPorCompania(facturasCalculadas, companiaActiva);
  const inicio = inicioDePeriodo(hoy, periodo);

  const indicadores = useMemo(() => indicadoresPorMoneda(facturas, moneda), [facturas, moneda]);

  const proyeccion = useMemo(() => {
    const visibles = filtrarPorCompania(bancos, companiaActiva).filter((b) => b.activo);
    return calcularSaldoProyectado(
      calcularSaldosPorBanco(visibles, pagos, erogaciones, "USD"),
      calcularSaldosPorBanco(visibles, pagos, erogaciones, "CRC"),
      facturas,
      filtrarPorCompania(pedidos, companiaActiva),
      tipoCambio,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancos, pagos, erogaciones, facturas, pedidos, companiaActiva, tipoCambio]);

  const tramos = useMemo(() => proyeccionPorTramos(facturas, moneda), [facturas, moneda]);

  const pagosPeriodo = pagos.filter(
    (p) => p.fecha >= inicio && p.fecha <= hoy && p.moneda === moneda,
  );
  const totalPagosPeriodo = pagosPeriodo.reduce((s, p) => s + p.monto, 0);
  const erogacionesPeriodo = filtrarPorCompania(erogaciones, companiaActiva).filter(
    (e) => e.fecha >= inicio && e.fecha <= hoy && e.moneda === moneda,
  );
  const totalErogacionesPeriodo = erogacionesPeriodo.reduce((s, e) => s + e.monto, 0);

  const distribucion = [
    { nombre: "Pagadas", valor: indicadores.pagadas, color: "var(--exito)" },
    { nombre: "Pendientes", valor: indicadores.pendientes, color: "var(--advertencia)" },
    { nombre: "Vencidas", valor: indicadores.vencidas, color: "var(--destructive)" },
  ].filter((d) => d.valor > 0);

  const proximas = [...facturas]
    .filter((f) => f.saldoPendiente > 0.009)
    .sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0))
    .slice(0, 6);

  const contratosProximos = filtrarPorCompania(contratos, companiaActiva)
    .filter((c) => c.estado === "Activo" && !c.facturado)
    .sort((a, b) => a.proximaFacturacion.localeCompare(b.proximaFacturacion))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Tablero de flujo de efectivo"
        requerimiento="RF-013"
        descripcion={`Fecha de corte ${formatearFecha(hoy)}. El período ${
          periodo === "semanal" ? "semanal" : "mensual"
        } inicia el ${formatearFecha(inicio)}.`}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as "semanal" | "mensual")}>
              <TabsList>
                <TabsTrigger value="semanal">Semanal</TabsTrigger>
                <TabsTrigger value="mensual">Mensual</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
              <TabsList>
                <TabsTrigger value="USD">USD</TabsTrigger>
                <TabsTrigger value="CRC">CRC</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          titulo={`Disponible en bancos (${moneda})`}
          valor={formatearMoneda(
            moneda === "USD" ? proyeccion.saldoActualUSD : proyeccion.saldoActualCRC,
            moneda,
          )}
          detalle="Saldo inicial + pagos − erogaciones"
          icono={<Wallet className="size-4" />}
        />
        <TarjetaIndicador
          titulo={`Por cobrar (${moneda})`}
          valor={formatearMoneda(indicadores.saldoPorCobrar, moneda)}
          detalle={`${formatearPorcentaje(indicadores.porcentajeCobrado)} ya cobrado`}
          icono={<CircleDollarSign className="size-4" />}
          tono="primario"
        />
        <TarjetaIndicador
          titulo={`Vencido sin cobrar (${moneda})`}
          valor={formatearMoneda(indicadores.saldoVencido, moneda)}
          detalle={`${indicadores.vencidas} facturas vencidas`}
          icono={<AlertTriangle className="size-4" />}
          tono={indicadores.saldoVencido > 0 ? "peligro" : "exito"}
        />
        <TarjetaIndicador
          titulo="Proyectado consolidado (USD)"
          valor={formatearMoneda(proyeccion.consolidadoUSD, "USD")}
          detalle={`Con pedidos: ${formatearMoneda(proyeccion.consolidadoConPedidosUSD, "USD")}`}
          icono={<TrendingUp className="size-4" />}
          tono="exito"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TarjetaIndicador
          titulo={`Cobrado en el período (${moneda})`}
          valor={formatearMoneda(totalPagosPeriodo, moneda)}
          detalle={`${pagosPeriodo.length} pagos desde ${formatearFecha(inicio)}`}
          icono={<Banknote className="size-4" />}
          tono="exito"
        />
        <TarjetaIndicador
          titulo={`Erogaciones del período (${moneda})`}
          valor={formatearMoneda(totalErogacionesPeriodo, moneda)}
          detalle={`${erogacionesPeriodo.length} salidas desde ${formatearFecha(inicio)}`}
          icono={<Banknote className="size-4" />}
          tono={totalErogacionesPeriodo > 0 ? "advertencia" : "neutro"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Cobros esperados por tramo ({moneda})</p>
            <Link to="/proyeccion" className="text-xs text-primary hover:underline">
              Ver proyección
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tramos.filas} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
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
                <Bar dataKey="monto" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Estado de las facturas ({moneda})</p>
          {distribucion.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribucion}
                    dataKey="valor"
                    nameKey="nombre"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {distribucion.map((d) => (
                      <Cell key={d.nombre} fill={d.color} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No hay facturas registradas en {moneda}.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Próximas facturas por cobrar</p>
            <Link to="/facturas" className="text-xs text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proximas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.numero}</TableCell>
                  <TableCell className="max-w-[12rem] truncate">{f.cliente}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatearFecha(f.fechaVencimiento)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {f.diasParaVencer}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatearMoneda(f.saldoPendiente, f.moneda)}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={f.estado} />
                  </TableCell>
                </TableRow>
              ))}
              {proximas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No hay facturas con saldo pendiente.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="size-4 text-muted-foreground" />
              Contratos por facturar
            </p>
            <Link to="/contratos" className="text-xs text-primary hover:underline">
              Ver contratos
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {contratosProximos.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.numero} · {c.periodicidad} · {formatearFecha(c.proximaFacturacion)}
                  </p>
                </div>
                <p className="font-mono text-sm tabular-nums">
                  {formatearMoneda(c.monto, c.moneda)}
                </p>
              </li>
            ))}
            {contratosProximos.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No hay contratos activos pendientes de facturar.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
