import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { FiltroFechas } from "@/components/comunes/FiltroFechas";
import { ConciliacionEstadoCuenta } from "@/components/pagos/ConciliacionEstadoCuenta";
import {
  ConciliacionErogaciones,
  type ContextoSinDocumento,
  type Movimiento,
} from "@/components/erogaciones/ConciliacionErogaciones";
import { DialogoErogacion } from "@/components/erogaciones/DialogoErogacion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { Moneda } from "@/data/tipos";
import { fechaEnPeriodo, type PeriodoFecha } from "@/lib/filtros-fecha";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { useFiltroGuardado } from "@/lib/preferencias";

export const Route = createFileRoute("/movimientos")({
  head: () => ({
    meta: [
      { title: "Movimientos bancarios | Aplix Cash Flow Insights" },
      { name: "description", content: "Cobros y erogaciones por banco y fechas, con conciliación de estados de cuenta en una sola pantalla." },
      { property: "og:title", content: "Movimientos bancarios | Aplix Cash Flow Insights" },
      { property: "og:description", content: "Concilie créditos y débitos del estado de cuenta por banco." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaMovimientos,
});

function TarjetaContraible({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  const [abierta, setAbierta] = useFiltroGuardado("movimientos", `tarjeta-${id}`, true);
  return (
    <Collapsible open={abierta} onOpenChange={setAbierta} className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left font-medium">
        {titulo}
        <ChevronDown className={`h-4 w-4 transition-transform ${abierta ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border p-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function PaginaMovimientos() {
  const { pagos, erogaciones, bancos, companiaActiva, puedeEditar, hoy } = useApp();
  const [bancoId, setBancoId] = useFiltroGuardado("movimientos", "bancoId", "todos");
  const [moneda, setMoneda] = useFiltroGuardado<Moneda | "todas">("movimientos", "moneda", "todas");
  const [periodo, setPeriodo] = useFiltroGuardado<PeriodoFecha>("movimientos", "periodo", "mes");
  const [fechaInicio, setFechaInicio] = useFiltroGuardado("movimientos", "fechaInicio", "");
  const [fechaFin, setFechaFin] = useFiltroGuardado("movimientos", "fechaFin", "");
  const [mostrarPagadas, setMostrarPagadas] = useFiltroGuardado("movimientos", "mostrarPagadas", false);
  const [precarga, setPrecarga] = useState<{ m: Movimiento; ctx: ContextoSinDocumento } | null>(null);

  const bancosCompania = useMemo(() => filtrarPorCompania(bancos, companiaActiva), [bancos, companiaActiva]);
  const nombreBanco = (id: string) => bancos.find((b) => b.id === id)?.nombre ?? "—";

  const filas = useMemo(() => {
    const ok = (f: { fecha: string; bancoId: string; moneda: Moneda }) =>
      (bancoId === "todos" || f.bancoId === bancoId) &&
      (moneda === "todas" || f.moneda === moneda) &&
      fechaEnPeriodo(f.fecha, periodo, hoy, fechaInicio, fechaFin);
    const idsBanco = new Set(bancosCompania.map((b) => b.id));
    const creditos = pagos.filter((p) => idsBanco.has(p.bancoId)).filter(ok).map((p) => ({
      id: `p-${p.id}`, fecha: p.fecha, bancoId: p.bancoId, moneda: p.moneda, tipo: "Crédito" as const,
      referencia: p.referencia ?? "", detalle: p.metodo ?? "", monto: p.monto,
    }));
    const debitos = filtrarPorCompania(erogaciones, companiaActiva).filter(ok).map((e) => ({
      id: `e-${e.id}`, fecha: e.fecha, bancoId: e.bancoId, moneda: e.moneda, tipo: "Débito" as const,
      referencia: e.numeroTransferencia ?? "", detalle: e.proveedor ?? "", monto: -e.monto,
    }));
    return [...creditos, ...debitos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [pagos, erogaciones, bancosCompania, companiaActiva, bancoId, moneda, periodo, hoy, fechaInicio, fechaFin]);

  const totales = (["USD", "CRC"] as Moneda[]).map((m) => {
    const de = filas.filter((f) => f.moneda === m);
    const cred = de.filter((f) => f.monto > 0).reduce((s, f) => s + f.monto, 0);
    const deb = de.filter((f) => f.monto < 0).reduce((s, f) => s - f.monto, 0);
    return { m, cred, deb, neto: cred - deb };
  });

  return (
    <div className="space-y-4">
      <EncabezadoPagina titulo="Movimientos bancarios" descripcion="Cobros y erogaciones por banco, y conciliación de estados de cuenta." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Banco</Label>
          <Select value={bancoId} onValueChange={setBancoId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los bancos</SelectItem>
              {bancosCompania.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Moneda</Label>
          <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda | "todas")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CRC">CRC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FiltroFechas id="mov-fechas" periodo={periodo} onPeriodoCambio={setPeriodo} desde={fechaInicio} hasta={fechaFin} onDesdeCambio={setFechaInicio} onHastaCambio={setFechaFin} />
      </div>

      {puedeEditar && (
        <>
          <TarjetaContraible id="cobros" titulo="Cargar estado de cuenta · Conciliar cobros (créditos)">
            <div className="mb-3 flex items-center gap-2">
              <Checkbox id="mov-pagadas" checked={mostrarPagadas} onCheckedChange={(v) => setMostrarPagadas(v === true)} />
              <Label htmlFor="mov-pagadas" className="cursor-pointer font-normal">Mostrar facturas en estado pagado</Label>
            </div>
            <ConciliacionEstadoCuenta mostrarPagadas={mostrarPagadas} />
          </TarjetaContraible>
          <TarjetaContraible id="erogaciones" titulo="Cargar estado de cuenta · Conciliar erogaciones (débitos)">
            <ConciliacionErogaciones onSinDocumento={(m, ctx) => setPrecarga({ m, ctx })} />
          </TarjetaContraible>
        </>
      )}

      <TarjetaContraible id="lista" titulo={`Movimientos registrados (${filas.length})`}>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {totales.map((t) => (
            <div key={t.m} className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">{t.m}</p>
              <p>Créditos: <span className="font-mono tabular-nums">{formatearMoneda(t.cred, t.m)}</span></p>
              <p>Débitos: <span className="font-mono tabular-nums">{formatearMoneda(t.deb, t.m)}</span></p>
              <p className="font-semibold">Neto: <span className="font-mono tabular-nums">{formatearMoneda(t.neto, t.m)}</span></p>
            </div>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin movimientos para los filtros elegidos.</TableCell></TableRow>
              ) : filas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{formatearFecha(f.fecha)}</TableCell>
                  <TableCell>{nombreBanco(f.bancoId)}</TableCell>
                  <TableCell>{f.tipo}</TableCell>
                  <TableCell>{f.referencia}</TableCell>
                  <TableCell>{f.detalle}</TableCell>
                  <TableCell className={`text-right font-mono tabular-nums ${f.monto < 0 ? "text-destructive" : ""}`}>{formatearMoneda(f.monto, f.moneda)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TarjetaContraible>

      {precarga ? (
        <DialogoErogacion
          key={precarga.m.clave}
          abierto={true}
          setAbierto={(v) => { if (!v) setPrecarga(null); }}
          precarga={precarga.m}
          contexto={precarga.ctx}
        />
      ) : null}
    </div>
  );
}
