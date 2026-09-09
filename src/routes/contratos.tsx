import { createFileRoute } from "@tanstack/react-router";
import { useCompaniaValida } from "@/hooks/use-compania-valida";
import { useEffect, useMemo, useState } from "react";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  filtrarPorCompania,
  useApp,
  PREF_CONTRATOS_MES_FILTROS,
} from "@/contexto/AppContexto";
import type { Contrato, EstadoContrato, Moneda, Periodicidad } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos recurrentes | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Contratos con facturación periódica, próxima fecha de facturación y estado Activo o Cancelado.",
      },
      { property: "og:title", content: "Contratos recurrentes | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Ingresos recurrentes esperados por contrato, separados de los pedidos.",
      },
    ],
  }),
  component: PaginaContratos,
});

const PERIODICIDADES: Periodicidad[] = [
  "Mensual",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Anual",
];

function PaginaContratos() {
  const {
    contratos,
    companias,
    companiaActiva,
    puedeEditar,
    esAdministrador,
    actualizarContrato,
    eliminarContrato,
    usuario,
  } = useApp();
  const [estado, setEstado] = useState<EstadoContrato | "todos">("todos");
  const [abierto, setAbierto] = useState(false);

  const filtrados = filtrarPorCompania(contratos, companiaActiva).filter(
    (c) => estado === "todos" || c.estado === estado,
  );

  const exportar = () =>
    exportarExcel(
      "contratos",
      "Contratos",
      filtrados.map((c) => ({
        Compañía: companias.find((x) => x.id === c.companiaId)?.codigo ?? "",
        Contrato: c.numero,
        Cliente: c.cliente,
        Periodicidad: c.periodicidad,
        "Próxima facturación": formatearFecha(c.proximaFacturacion),
        "Plazo (días)": c.plazoDias,
        Moneda: c.moneda,
        Monto: c.monto,
        Facturado: c.facturado ? "Sí" : "No",
        Estado: c.estado,
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Contratos recurrentes"
        requerimiento="RF-011"
        descripcion="Los contratos son ingresos recurrentes y se administran en un módulo propio: no son pedidos ni se clasifican como tales. Cada contrato tiene estado Activo o Cancelado."
        acciones={
          <>
            <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
              <FileDown className="size-4" /> Exportar Excel
            </Button>
            {puedeEditar ? <DialogoContrato abierto={abierto} setAbierto={setAbierto} /> : null}
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select value={estado} onValueChange={(v) => setEstado(v as EstadoContrato | "todos")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Periodicidad</TableHead>
              <TableHead>Próxima facturación</TableHead>
              <TableHead className="text-right">Plazo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Facturado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((c) => (
              <TableRow key={c.id} className={cn(c.estado === "Cancelado" && "opacity-60")}>
                <TableCell className="text-xs text-muted-foreground">
                  {companias.find((x) => x.id === c.companiaId)?.codigo}
                </TableCell>
                <TableCell className="font-medium">{c.numero}</TableCell>
                <TableCell>{c.cliente}</TableCell>
                <TableCell>{c.periodicidad}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatearFecha(c.proximaFacturacion)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.plazoDias}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(c.monto, c.moneda)}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={c.facturado}
                    disabled={!puedeEditar || c.estado === "Cancelado"}
                    aria-label={`Marcar contrato ${c.numero} como facturado`}
                    onCheckedChange={(v) => actualizarContrato(c.id, { facturado: v })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={c.estado}
                    disabled={!puedeEditar}
                    onValueChange={(v) => {
                      actualizarContrato(c.id, { estado: v as EstadoContrato });
                      toast.success(`Contrato ${c.numero}: ${v}`);
                    }}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {esAdministrador ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar contrato ${c.numero}`}
                      onClick={() => {
                        eliminarContrato(c.id);
                        toast.success(`Contrato ${c.numero} eliminado`);
                      }}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No hay contratos para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <ContratosDelMes />
    </div>
  );
}

/** Subsección: contratos que deben facturarse en el mes corriente. */
function ContratosDelMes() {
  const {
    contratosDelMes,
    contratos,
    companias,
    companiaActiva,
    tipoCambio,
    hoy,
    usuario,
    puedeEditar,
    esAdministrador,
    actualizarContrato,
    eliminarContrato,
    preferencias,
    actualizarPreferencia,
  } = useApp();
  const [enEdicion, setEnEdicion] = useState<string | null>(null);

  const guardados = useMemo(() => {
    try {
      const bruto = preferencias[PREF_CONTRATOS_MES_FILTROS];
      if (!bruto) return { busqueda: "", fechaInicio: "", fechaFin: "" };
      const p = JSON.parse(bruto) as Record<string, unknown>;
      return {
        busqueda: typeof p["busqueda"] === "string" ? p["busqueda"] : "",
        fechaInicio: typeof p["fechaInicio"] === "string" ? p["fechaInicio"] : "",
        fechaFin: typeof p["fechaFin"] === "string" ? p["fechaFin"] : "",
      };
    } catch {
      return { busqueda: "", fechaInicio: "", fechaFin: "" };
    }
  }, [preferencias]);

  const [busqueda, setBusqueda] = useState(guardados.busqueda);
  const [fechaInicio, setFechaInicio] = useState(guardados.fechaInicio);
  const [fechaFin, setFechaFin] = useState(guardados.fechaFin);
  const [listo, setListo] = useState(false);

  // Toma los filtros recordados cuando llegan del servidor.
  useEffect(() => {
    setBusqueda(guardados.busqueda);
    setFechaInicio(guardados.fechaInicio);
    setFechaFin(guardados.fechaFin);
    setListo(true);
  }, [guardados]);

  // Guarda los filtros del usuario para la próxima vez que entre.
  useEffect(() => {
    if (!listo) return;
    const actual = JSON.stringify({ busqueda, fechaInicio, fechaFin });
    if (actual === JSON.stringify(guardados)) return;
    const id = window.setTimeout(() => actualizarPreferencia(PREF_CONTRATOS_MES_FILTROS, actual), 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, fechaInicio, fechaFin, listo]);

  const texto = busqueda.trim().toLowerCase();
  const filtrados = filtrarPorCompania(contratosDelMes, companiaActiva).filter((c) => {
    if (texto && !`${c.numero} ${c.cliente}`.toLowerCase().includes(texto)) return false;
    if (fechaInicio && c.fecha < fechaInicio) return false;
    if (fechaFin && c.fecha > fechaFin) return false;
    return true;
  });

  const pendientes = filtrados.filter((c) => !c.yaDocumentado);
  const totalUSD = pendientes
    .filter((c) => c.moneda === "USD")
    .reduce((s, c) => s + c.monto, 0);
  const totalCRC = pendientes
    .filter((c) => c.moneda === "CRC")
    .reduce((s, c) => s + c.monto, 0);
  const totalEnUsd = totalUSD + (tipoCambio > 0 ? totalCRC / tipoCambio : 0);

  const exportar = () =>
    exportarExcel(
      "contratos-por-facturar-mes",
      "Contratos por facturar del mes",
      filtrados.map((c) => ({
        Compañía: companias.find((x) => x.id === c.companiaId)?.codigo ?? "",
        Contrato: c.numero,
        Cliente: c.cliente,
        Periodicidad: c.periodicidad,
        "Fecha esperada": formatearFecha(c.fecha),
        Moneda: c.moneda,
        Monto: c.monto,
        Documento: c.documento ?? "",
        Situación: c.yaDocumentado ? "Ya facturado o con pedido" : "Por facturar",
      })),
      usuario.nombre,
    );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Contratos por facturar este mes</h2>
          <p className="text-sm text-muted-foreground">
            Lista de consulta generada al primer ingreso del mes ({hoy.slice(0, 7)}). Los contratos
            que ya tienen pedido o factura se muestran marcados y no suman en el saldo proyectado.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
          <FileDown className="size-4" /> Exportar Excel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <TotalMes titulo="Por facturar en dólares" valor={formatearMoneda(totalUSD, "USD")} />
        <TotalMes titulo="Por facturar en colones" valor={formatearMoneda(totalCRC, "CRC")} />
        <TotalMes titulo="Total equivalente en USD" valor={formatearMoneda(totalEnUsd, "USD")} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="cm-busca">Cliente o número de contrato</Label>
          <Input
            id="cm-busca"
            value={busqueda}
            placeholder="Buscar…"
            className="w-64"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cm-ini">Fecha inicio</Label>
          <Input
            id="cm-ini"
            type="date"
            value={fechaInicio}
            className="w-44"
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cm-fin">Fecha fin</Label>
          <Input
            id="cm-fin"
            type="date"
            value={fechaFin}
            className="w-44"
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        {busqueda || fechaInicio || fechaFin ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBusqueda("");
              setFechaInicio("");
              setFechaFin("");
            }}
          >
            Limpiar
          </Button>
        ) : null}
      </div>

      <div className="max-h-[26rem] overflow-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Periodicidad</TableHead>
              <TableHead>Fecha esperada</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Situación</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((c) => (
              <TableRow
                key={`${c.contratoId}-${c.fecha}`}
                className={cn(c.yaDocumentado && "opacity-60")}
              >
                <TableCell className="text-xs text-muted-foreground">
                  {companias.find((x) => x.id === c.companiaId)?.codigo}
                </TableCell>
                <TableCell className="font-medium">{c.numero}</TableCell>
                <TableCell>{c.cliente}</TableCell>
                <TableCell>{c.periodicidad}</TableCell>
                <TableCell className="whitespace-nowrap">{formatearFecha(c.fecha)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(c.monto, c.moneda)}
                </TableCell>
                <TableCell className="text-xs">
                  {c.yaDocumentado
                    ? `Ya documentado${c.documento ? ` (${c.documento})` : ""}`
                    : "Por facturar"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {puedeEditar ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar contrato ${c.numero}`}
                        onClick={() => setEnEdicion(c.contratoId)}
                      >
                        <Pencil className="size-4 text-muted-foreground" />
                      </Button>
                    ) : null}
                    {esAdministrador ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar contrato ${c.numero}`}
                        onClick={() => {
                          eliminarContrato(c.contratoId);
                          toast.success(`Contrato ${c.numero} eliminado`);
                        }}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay contratos por facturar este mes con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <DialogoEditarContrato
        contrato={contratos.find((c) => c.id === enEdicion) ?? null}
        cerrar={() => setEnEdicion(null)}
        guardar={(cambios) => {
          if (enEdicion) actualizarContrato(enEdicion, cambios);
          setEnEdicion(null);
          toast.success("Contrato actualizado");
        }}
      />
    </section>
  );
}

/** Edición rápida de un contrato desde la lista del mes. */
function DialogoEditarContrato({
  contrato,
  cerrar,
  guardar,
}: {
  contrato: Contrato | null;
  cerrar: () => void;
  guardar: (cambios: Partial<Contrato>) => void;
}) {
  const [cliente, setCliente] = useState("");
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>("Mensual");
  const [proximaFacturacion, setProxima] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [monto, setMonto] = useState("");

  useEffect(() => {
    if (!contrato) return;
    setCliente(contrato.cliente);
    setPeriodicidad(contrato.periodicidad);
    setProxima(contrato.proximaFacturacion.slice(0, 10));
    setMoneda(contrato.moneda);
    setMonto(String(contrato.monto));
  }, [contrato]);

  return (
    <Dialog open={contrato !== null} onOpenChange={(v) => (!v ? cerrar() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar contrato {contrato?.numero}</DialogTitle>
          <DialogDescription>
            Los cambios afectan el contrato completo y la lista de facturación del mes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="e-cli">Cliente</Label>
            <Input id="e-cli" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Periodicidad</Label>
            <Select value={periodicidad} onValueChange={(v) => setPeriodicidad(v as Periodicidad)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODICIDADES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-prox">Próxima facturación</Label>
            <Input
              id="e-prox"
              type="date"
              value={proximaFacturacion}
              onChange={(e) => setProxima(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CRC">CRC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-monto">Monto por período</Label>
            <Input
              id="e-monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!cliente || !(Number(monto) > 0)) {
                toast.error("Indique el cliente y un monto mayor que cero.");
                return;
              }
              guardar({
                cliente,
                periodicidad,
                proximaFacturacion,
                moneda,
                monto: Number(monto),
              });
            }}
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TotalMes({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

function DialogoContrato({
  abierto,
  setAbierto,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
}) {
  const { companias, agregarContrato, hoy } = useApp();
  const [companiaId, setCompaniaId] = useState(companias[0]?.id ?? "");
  useCompaniaValida(companias, companiaId, setCompaniaId);
  const [numero, setNumero] = useState("");
  const [cliente, setCliente] = useState("");
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>("Mensual");
  const [proximaFacturacion, setProxima] = useState(hoy);
  const [plazoDias, setPlazo] = useState("30");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [monto, setMonto] = useState("");

  const guardar = () => {
    if (!numero || !cliente || !(Number(monto) > 0)) {
      toast.error("Complete número, cliente y un monto mayor que cero.");
      return;
    }
    agregarContrato({
      companiaId,
      numero,
      cliente,
      periodicidad,
      proximaFacturacion,
      plazoDias: Number(plazoDias) || 0,
      moneda,
      monto: Number(monto),
      facturado: false,
      estado: "Activo",
    });
    toast.success(`Contrato ${numero} registrado`);
    setAbierto(false);
    setNumero("");
    setCliente("");
    setMonto("");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Nuevo contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo contrato recurrente</DialogTitle>
          <DialogDescription>
            El contrato nace en estado Activo y sin facturar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Compañía</Label>
            <Select value={companiaId} onValueChange={setCompaniaId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-num">Número de contrato</Label>
            <Input id="c-num" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-cli">Cliente</Label>
            <Input id="c-cli" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Periodicidad</Label>
            <Select
              value={periodicidad}
              onValueChange={(v) => setPeriodicidad(v as Periodicidad)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODICIDADES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-prox">Próxima facturación</Label>
            <Input
              id="c-prox"
              type="date"
              value={proximaFacturacion}
              onChange={(e) => setProxima(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-plazo">Plazo en días</Label>
            <Input
              id="c-plazo"
              type="number"
              value={plazoDias}
              onChange={(e) => setPlazo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CRC">CRC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-monto">Monto por período</Label>
            <Input
              id="c-monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar contrato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
