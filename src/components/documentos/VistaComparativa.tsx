import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SelectorFilas } from "@/components/comunes/SelectorFilas";
import { useFilasVisibles } from "@/lib/preferencias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { DocumentoPorCobrar, Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

type Periodo = "mes-anterior" | "acumulado-anterior" | "rango";
interface Rango {
  desde: string;
  hasta: string;
}

const restarAnio = (iso: string) => `${Number(iso.slice(0, 4)) - 1}${iso.slice(4)}`;

function calcularRangos(periodo: Periodo, hoyIso: string, desde: string, hasta: string) {
  const anio = hoyIso.slice(0, 4);
  const mes = hoyIso.slice(5, 7);
  const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate();
  if (periodo === "mes-anterior") {
    const actual: Rango = {
      desde: `${anio}-${mes}-01`,
      hasta: `${anio}-${mes}-${String(ultimoDia).padStart(2, "0")}`,
    };
    return { actual, anterior: { desde: restarAnio(actual.desde), hasta: restarAnio(actual.hasta) } };
  }
  if (periodo === "acumulado-anterior") {
    const actual: Rango = { desde: `${anio}-01-01`, hasta: hoyIso };
    return { actual, anterior: { desde: restarAnio(actual.desde), hasta: restarAnio(actual.hasta) } };
  }
  const actual: Rango = { desde: desde || "0000-01-01", hasta: hasta || "9999-12-31" };
  return {
    actual,
    anterior: {
      desde: desde ? restarAnio(desde) : "0000-01-01",
      hasta: hasta ? restarAnio(hasta) : "9999-12-31",
    },
  };
}

export function VistaComparativa() {
  const {
    filas: filasVisibles,
    estiloTabla,
    establecer: establecerFilas,
  } = useFilasVisibles("documentos-cobrar-comparativo");
  const { documentosPorCobrar, companias, companiaActiva, tipoCambio, usuario } = useApp();

  const [cliente, setCliente] = useState("");
  const [numeroBusqueda, setNumeroBusqueda] = useState("");
  const [tipo, setTipo] = useState<"todos" | "FAC" | "DEV">("todos");
  const [moneda, setMoneda] = useState<Moneda | "todas">("todas");
  const [periodo, setPeriodo] = useState<Periodo>("mes-anterior");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const clienteTexto = cliente.trim().toLowerCase();
  const numeroTexto = numeroBusqueda.trim().toLowerCase();
  const hoyIso = new Date().toISOString().slice(0, 10);

  const { actual, anterior } = useMemo(
    () => calcularRangos(periodo, hoyIso, desde, hasta),
    [periodo, hoyIso, desde, hasta],
  );

  const base = useMemo(
    () =>
      filtrarPorCompania(documentosPorCobrar, companiaActiva).filter((d) => {
        if (clienteTexto && !d.cliente.toLowerCase().includes(clienteTexto)) return false;
        if (numeroTexto && !d.numero.toLowerCase().includes(numeroTexto)) return false;
        if (tipo !== "todos" && d.tipo.toUpperCase() !== tipo) return false;
        if (moneda !== "todas" && d.moneda !== moneda) return false;
        return true;
      }),
    [documentosPorCobrar, companiaActiva, clienteTexto, numeroTexto, tipo, moneda],
  );

  const enRango = (lista: DocumentoPorCobrar[], r: Rango) =>
    lista.filter((d) => {
      const f = d.fecha.slice(0, 10);
      return f >= r.desde && f <= r.hasta;
    });

  const docsActual = useMemo(() => enRango(base, actual), [base, actual]);
  const docsAnterior = useMemo(() => enRango(base, anterior), [base, anterior]);

  const consolidado = (lista: DocumentoPorCobrar[], campo: "monto" | "saldo") =>
    lista.reduce(
      (s, d) => s + (d.moneda === "USD" ? d[campo] : tipoCambio > 0 ? d[campo] / tipoCambio : 0),
      0,
    );

  const totalActual = consolidado(docsActual, "monto");
  const totalAnterior = consolidado(docsAnterior, "monto");
  const variacion = totalAnterior !== 0 ? (totalActual - totalAnterior) / totalAnterior : 0;

  const porTipo = (lista: DocumentoPorCobrar[], t: string) =>
    consolidado(
      lista.filter((d) => d.tipo.toUpperCase() === t),
      "monto",
    );

  const datosGrafico = [
    {
      tipo: "FAC",
      "Año actual": porTipo(docsActual, "FAC"),
      "Año anterior": porTipo(docsAnterior, "FAC"),
    },
    {
      tipo: "DEV",
      "Año actual": porTipo(docsActual, "DEV"),
      "Año anterior": porTipo(docsAnterior, "DEV"),
    },
  ];

  const exportar = () =>
    exportarExcel(
      "reporte-documentos-comparativo",
      "Comparativo de documentos",
      docsAnterior.map((d) => ({
        Compañía: companias.find((c) => c.id === d.companiaId)?.codigo ?? "",
        Cliente: d.cliente,
        Documento: d.numero,
        Tipo: d.tipo,
        Fecha: formatearFecha(d.fecha),
        Vence: d.fechaVence ? formatearFecha(d.fechaVence) : "",
        Moneda: d.moneda,
        Monto: d.monto,
        Saldo: d.saldo,
        Notas: d.notas ?? "",
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold">Año presente vs año anterior</p>
          <p className="text-xs text-muted-foreground">
            {formatearFecha(actual.desde)} – {formatearFecha(actual.hasta)} contra{" "}
            {formatearFecha(anterior.desde)} – {formatearFecha(anterior.hasta)} (valores
            consolidados en USD).
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Año actual</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {formatearMoneda(totalActual, "USD")}
              </p>
              <p className="text-xs text-muted-foreground">{docsActual.length} documentos</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Año anterior</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {formatearMoneda(totalAnterior, "USD")}
              </p>
              <p className="text-xs text-muted-foreground">{docsAnterior.length} documentos</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variación</p>
              <p
                className={`font-mono text-lg font-semibold tabular-nums ${
                  totalActual - totalAnterior >= 0 ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {formatearMoneda(totalActual - totalAnterior, "USD")}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalAnterior !== 0 ? `${(variacion * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold">Documentos por tipo</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafico} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={70} />
                <Tooltip
                  formatter={(v: number) => formatearMoneda(Number(v), "USD")}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Año actual" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Año anterior" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="dcc-cliente">Cliente</Label>
          <Input
            id="dcc-cliente"
            className="w-56"
            placeholder="Buscar cliente…"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dcc-numero">N.º de documento</Label>
          <Input
            id="dcc-numero"
            className="w-56"
            placeholder="Buscar n.º de documento…"
            value={numeroBusqueda}
            onChange={(e) => setNumeroBusqueda(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as "todos" | "FAC" | "DEV")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="FAC">FAC</SelectItem>
              <SelectItem value="DEV">DEV</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda | "todas")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CRC">CRC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Periodo</Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes-anterior">Mes (periodo anterior)</SelectItem>
              <SelectItem value="acumulado-anterior">
                Acumulado a la fecha de hoy (periodo anterior)
              </SelectItem>
              <SelectItem value="rango">Rango de fechas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodo === "rango" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="dcc-desde">Fecha inicio</Label>
              <Input
                id="dcc-desde"
                type="date"
                className="w-44"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dcc-hasta">Fecha fin</Label>
              <Input
                id="dcc-hasta"
                type="date"
                className="w-44"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </>
        ) : null}
        <div className="ml-auto flex items-end gap-3">
          <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
            <FileDown className="size-4" /> Exportar Excel
          </Button>
          <SelectorFilas
            id="filas-documentos-comparativo"
            filas={filasVisibles}
            onCambio={establecerFilas}
          />
        </div>
      </div>

      <div
        style={estiloTabla}
        className="max-h-[var(--alto-tabla)] overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card shadow-sm [&_th]:bg-card">
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docsAnterior.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {companias.find((c) => c.id === d.companiaId)?.codigo}
                </TableCell>
                <TableCell>{d.cliente}</TableCell>
                <TableCell className="font-medium">{d.numero}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.tipo}</TableCell>
                <TableCell className="whitespace-nowrap">{formatearFecha(d.fecha)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.fechaVence ? formatearFecha(d.fechaVence) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(d.monto, d.moneda)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatearMoneda(d.saldo, d.moneda)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {d.notas ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {docsAnterior.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No hay documentos del periodo anterior para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
