import { useEffect, useMemo, useState } from "react";
import { FileDown, Info } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { api } from "@/lib/api";
import { toast } from "sonner";

type Periodo = "mes" | "anio" | "rango";
interface Rango {
  desde: string;
  hasta: string;
}

interface Props {
  cliente: string;
  numeroBusqueda: string;
  tipo: "todos" | "FAC" | "DEV" | "NC";
  moneda: Moneda | "todas";
  periodo: Periodo;
  desde: string;
  hasta: string;
  /** Si es verdadero, devoluciones y notas de crédito restan de los totales. */
  neto: boolean;
  onNetoCambio: (v: boolean) => void;
}

/** Normaliza el tipo del documento (NC y N/C se tratan igual). */
const normalizarTipo = (t: string) => t.toUpperCase().replace("/", "").trim();
/** Devoluciones y notas de crédito restan del monto neto. */
const esCredito = (t: string) => normalizarTipo(t) === "DEV" || normalizarTipo(t) === "NC";

/** Resta un año a una fecha ISO, ajustando el 29 de febrero. */
const restarAnio = (iso: string) => {
  const anio = Number(iso.slice(0, 4)) - 1;
  const resto = iso.slice(4);
  if (resto === "-02-29") return `${anio}-02-28`;
  return `${anio}${resto}`;
};

function calcularRangos(periodo: Periodo, hoyIso: string, desde: string, hasta: string) {
  const anio = hoyIso.slice(0, 4);
  const mes = hoyIso.slice(5, 7);
  let actual: Rango;
  if (periodo === "mes") actual = { desde: `${anio}-${mes}-01`, hasta: hoyIso };
  else if (periodo === "anio") actual = { desde: `${anio}-01-01`, hasta: hoyIso };
  else actual = { desde: desde || `${anio}-01-01`, hasta: hasta || hoyIso };
  return {
    actual,
    anterior: { desde: restarAnio(actual.desde), hasta: restarAnio(actual.hasta) },
  };
}

export function VistaComparativa({
  cliente,
  numeroBusqueda,
  tipo,
  moneda,
  periodo,
  desde,
  hasta,
  neto,
  onNetoCambio,
}: Props) {
  const {
    filas: filasVisibles,
    estiloTabla,
    establecer: establecerFilas,
  } = useFilasVisibles("documentos-cobrar-comparativo");
  const {
    documentosPorCobrarComparativo,
    companias,
    companiaActiva,
    tipoCambio,
    usuario,
    modoApi,
  } = useApp();

  const [monedaConsolidado, setMonedaConsolidado] = useState<Moneda>("USD");
  // Fuente externa usada para los documentos del año anterior.
  const [fuenteAnterior, setFuenteAnterior] = useState<"softland" | "softland2">("softland");
  const [docsFuente2, setDocsFuente2] = useState<DocumentoPorCobrar[] | null>(null);
  const [cargandoFuente, setCargandoFuente] = useState(false);

  useEffect(() => {
    if (fuenteAnterior !== "softland2" || !modoApi || docsFuente2 !== null) return;
    setCargandoFuente(true);
    api<DocumentoPorCobrar[]>("/documentos-cobrar/comparativo/softland2")
      .then((d) => setDocsFuente2(d))
      .catch((e: unknown) => {
        setDocsFuente2([]);
        toast.error(
          e instanceof Error ? e.message : "No fue posible leer la conexión 2 a fuente externa",
        );
      })
      .finally(() => setCargandoFuente(false));
  }, [fuenteAnterior, modoApi, docsFuente2]);


  const clienteTexto = cliente.trim().toLowerCase();
  const numeroTexto = numeroBusqueda.trim().toLowerCase();
  const hoyIso = new Date().toISOString().slice(0, 10);

  const { actual, anterior } = useMemo(
    () => calcularRangos(periodo, hoyIso, desde, hasta),
    [periodo, hoyIso, desde, hasta],
  );

  const base = useMemo(
    () =>
      filtrarPorCompania(documentosPorCobrarComparativo, companiaActiva).filter((d) => {
        if (clienteTexto && !d.cliente.toLowerCase().includes(clienteTexto)) return false;
        if (numeroTexto && !d.numero.toLowerCase().includes(numeroTexto)) return false;
        if (tipo !== "todos" && normalizarTipo(d.tipo) !== tipo) return false;
        if (moneda !== "todas" && d.moneda !== moneda) return false;
        return true;
      }),
    [documentosPorCobrarComparativo, companiaActiva, clienteTexto, numeroTexto, tipo, moneda],
  );

  const enRango = (lista: DocumentoPorCobrar[], r: Rango) =>
    lista.filter((d) => {
      const f = d.fecha.slice(0, 10);
      return f >= r.desde && f <= r.hasta;
    });

  // El año anterior puede leerse de la conexión 2, para comparar ambos orígenes.
  const baseAnterior = useMemo(() => {
    if (fuenteAnterior === "softland" || docsFuente2 === null) return base;
    return filtrarPorCompania(docsFuente2, companiaActiva).filter((d) => {
      if (clienteTexto && !d.cliente.toLowerCase().includes(clienteTexto)) return false;
      if (numeroTexto && !d.numero.toLowerCase().includes(numeroTexto)) return false;
      if (tipo !== "todos" && normalizarTipo(d.tipo) !== tipo) return false;
      if (moneda !== "todas" && d.moneda !== moneda) return false;
      return true;
    });
  }, [fuenteAnterior, docsFuente2, base, companiaActiva, clienteTexto, numeroTexto, tipo, moneda]);

  const docsActual = useMemo(() => enRango(base, actual), [base, actual]);
  const docsAnterior = useMemo(() => enRango(baseAnterior, anterior), [baseAnterior, anterior]);

  const porMoneda = (lista: DocumentoPorCobrar[], m: Moneda) =>
    lista.filter((d) => d.moneda === m).reduce((s, d) => s + d.monto, 0);

  const netoPorMoneda = (lista: DocumentoPorCobrar[], m: Moneda) =>
    lista
      .filter((d) => d.moneda === m)
      .reduce((s, d) => s + (neto && esCredito(d.tipo) ? -d.monto : d.monto), 0);

  const consolidado = (lista: DocumentoPorCobrar[], campo: "monto" | "saldo") =>
    lista.reduce(
      (s, d) => s + (d.moneda === "USD" ? d[campo] : tipoCambio > 0 ? d[campo] / tipoCambio : 0),
      0,
    );

  const consolidadoNeto = (lista: DocumentoPorCobrar[], campo: "monto" | "saldo") =>
    lista.reduce(
      (s, d) => {
        const factor = neto && esCredito(d.tipo) ? -1 : 1;
        const valor = d.moneda === "USD" ? d[campo] : tipoCambio > 0 ? d[campo] / tipoCambio : 0;
        return s + factor * valor;
      },
      0,
    );

  const consolidadoEn = (lista: DocumentoPorCobrar[], m: Moneda) => {
    const usd = consolidadoNeto(lista, "monto");
    return m === "USD" ? usd : usd * tipoCambio;
  };

  const crcActual = netoPorMoneda(docsActual, "CRC");
  const crcAnterior = netoPorMoneda(docsAnterior, "CRC");
  const usdActual = netoPorMoneda(docsActual, "USD");
  const usdAnterior = netoPorMoneda(docsAnterior, "USD");

  const consActual = consolidadoEn(docsActual, monedaConsolidado);
  const consAnterior = consolidadoEn(docsAnterior, monedaConsolidado);

  const totalActual = consolidadoNeto(docsActual, "monto");
  const totalAnterior = consolidadoNeto(docsAnterior, "monto");
  const variacion = totalAnterior !== 0 ? (totalActual - totalAnterior) / totalAnterior : 0;

  const porcentaje = (act: number, ant: number) =>
    ant !== 0 ? `${(((act - ant) / ant) * 100).toFixed(1)}%` : "—";

  const porTipo = (lista: DocumentoPorCobrar[], t: string) =>
    consolidado(
      lista.filter((d) => normalizarTipo(d.tipo) === t),
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
    {
      tipo: "NC",
      "Año actual": porTipo(docsActual, "NC"),
      "Año anterior": porTipo(docsAnterior, "NC"),
    },
  ];

  // El grid muestra el detalle del año anterior según el filtro seleccionado.
  const docsGrid = docsAnterior;

  // Diagnóstico según los filtros aplicados. No atribuye el resultado a una tabla concreta,
  // porque el API combina el histórico de FACTURA con saldo/vencimiento de DOCUMENTOS_CC.
  const fechaMasAntigua = useMemo(() => {
    const fechas = base.map((d) => d.fecha.slice(0, 10)).sort();
    return fechas[0] ?? "";
  }, [base]);
  const sinDatosDelAnioAnterior =
    docsAnterior.length === 0 && fechaMasAntigua !== "" && fechaMasAntigua > anterior.hasta;

  const exportar = () =>
    exportarExcel(
      "reporte-documentos-comparativo",
      "Comparativo de documentos",
      docsGrid.map((d) => ({
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Año presente vs año anterior</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Año anterior desde</span>
              <Select
                value={fuenteAnterior}
                onValueChange={(v) => setFuenteAnterior(v as "softland" | "softland2")}
                disabled={!modoApi || cargandoFuente}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="softland">Fuente externa 1</SelectItem>
                  <SelectItem value="softland2">Fuente externa 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatearFecha(actual.desde)} – {formatearFecha(actual.hasta)} contra{" "}
            {formatearFecha(anterior.desde)} – {formatearFecha(anterior.hasta)}.
          </p>
          {sinDatosDelAnioAnterior ? (
            <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
              Con los filtros aplicados, el documento más antiguo recibido tiene fecha{" "}
              {formatearFecha(fechaMasAntigua)}. No se recibieron documentos del periodo{" "}
              {formatearFecha(anterior.desde)} – {formatearFecha(anterior.hasta)}. Verifique que la
              API instalada sea la versión 1.34.4 o posterior y que FACTURA contenga ese periodo.
            </div>
          ) : null}

          {[

            { titulo: "Moneda local (CRC)", act: crcActual, ant: crcAnterior, m: "CRC" as Moneda },
            { titulo: "Dólares (USD)", act: usdActual, ant: usdAnterior, m: "USD" as Moneda },
          ].map((fila) => (
            <div key={fila.titulo} className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {fila.titulo}
              </p>
              <div className="mt-1 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Año actual</p>
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {formatearMoneda(fila.act, fila.m)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Año anterior</p>
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {formatearMoneda(fila.ant, fila.m)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Variación</p>
                  <p
                    className={`font-mono text-base font-semibold tabular-nums ${
                      fila.act - fila.ant >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {formatearMoneda(fila.act - fila.ant, fila.m)}
                  </p>
                  <p className="text-xs text-muted-foreground">{porcentaje(fila.act, fila.ant)}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Consolidado
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  T.C. {tipoCambio.toLocaleString("es-CR")}
                </span>
                <Select
                  value={monedaConsolidado}
                  onValueChange={(v) => setMonedaConsolidado(v as Moneda)}
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CRC">CRC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Año actual</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatearMoneda(consActual, monedaConsolidado)}
                </p>
                <p className="text-xs text-muted-foreground">{docsActual.length} documentos</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Año anterior</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatearMoneda(consAnterior, monedaConsolidado)}
                </p>
                <p className="text-xs text-muted-foreground">{docsAnterior.length} documentos</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variación</p>
                <p
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    consActual - consAnterior >= 0 ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {formatearMoneda(consActual - consAnterior, monedaConsolidado)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalAnterior !== 0 ? `${(variacion * 100).toFixed(1)}%` : "—"}
                </p>
              </div>
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

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          Se aplican los mismos filtros de la pestaña Documentos. El detalle muestra el año
          anterior: {formatearFecha(anterior.desde)} – {formatearFecha(anterior.hasta)}.
        </p>
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
            {docsGrid.map((d) => (
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
            {docsGrid.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No hay documentos del año anterior para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
