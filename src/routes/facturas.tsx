import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Database, FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoBadge } from "@/components/comunes/EstadoBadge";
import { DialogoLineasFactura } from "@/components/facturas/DialogoLineasFactura";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { EstadoFactura, Factura, Moneda } from "@/data/tipos";

const ESTADOS_FACTURA: EstadoFactura[] = ["Pendiente", "Vencida", "Pagada"];
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/facturas")({
  head: () => ({
    meta: [
      { title: "Facturas por cobrar | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Registro y consulta de facturas por cobrar con vencimiento, saldo pendiente y estado calculados automáticamente.",
      },
      { property: "og:title", content: "Facturas por cobrar | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Cuentas por cobrar de THERONIX y APLIX con estado y saldo pendiente.",
      },
    ],
  }),
  component: PaginaFacturas,
});

function PaginaFacturas() {
  const {
    facturasCalculadas,
    companias,
    companiaActiva,
    puedeEditar,
    esAdministrador,
    agregarFactura,
    eliminarFactura,
    usuario,
    modoApi,
    facturasFuenteExterna,
    pedidosFuenteOrigen,
    avisoFuenteExterna,
  } = useApp();
  const fuenteExterna = modoApi && facturasFuenteExterna;

  const [cliente, setCliente] = useState("");
  const [moneda, setMoneda] = useState<Moneda | "todas">("todas");
  /** Estados marcados; vacío equivale a "todos". */
  const [estados, setEstados] = useState<EstadoFactura[]>([]);
  const [facturaDetalle, setFacturaDetalle] = useState<Factura | null>(null);
  const alternarEstado = (e: EstadoFactura, marcado: boolean) =>
    setEstados((prev) => (marcado ? [...prev, e] : prev.filter((x) => x !== e)));
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [abierto, setAbierto] = useState(false);

  const filtradas = useMemo(() => {
    return filtrarPorCompania(facturasCalculadas, companiaActiva).filter((f) => {
      if (cliente && !f.cliente.toLowerCase().includes(cliente.toLowerCase())) return false;
      if (moneda !== "todas" && f.moneda !== moneda) return false;
      if (estados.length > 0 && !estados.includes(f.estado)) return false;
      if (desde && f.fechaEmision < desde) return false;
      if (hasta && f.fechaEmision > hasta) return false;
      return true;
    });
  }, [facturasCalculadas, companiaActiva, cliente, moneda, estados, desde, hasta]);

  const totales = useMemo(() => {
    const acumular = (m: Moneda) => ({
      facturado: filtradas.filter((f) => f.moneda === m).reduce((s, f) => s + f.monto, 0),
      saldo: filtradas
        .filter((f) => f.moneda === m)
        .reduce((s, f) => s + Math.max(f.saldoPendiente, 0), 0),
    });
    return { USD: acumular("USD"), CRC: acumular("CRC") };
  }, [filtradas]);

  const exportar = () =>
    exportarExcel(
      "facturas-por-cobrar",
      "Facturas",
      filtradas.map((f) => ({
        Compañía: companias.find((c) => c.id === f.companiaId)?.codigo ?? "",
        Factura: f.numero,
        Cliente: f.cliente,
        Emisión: formatearFecha(f.fechaEmision),
        "Plazo (días)": f.plazoDias,
        Vencimiento: formatearFecha(f.fechaVencimiento),
        "Días para vencer": f.diasParaVencer ?? "",
        Moneda: f.moneda,
        Facturado: f.monto,
        Pagado: f.totalPagado,
        Saldo: f.saldoPendiente,
        Estado: f.estado,
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Facturas por cobrar"
        requerimiento="RF-002 · RF-003 · RF-004 · RF-014"
        descripcion="Las columnas de vencimiento, días para vencer, total pagado, saldo pendiente y estado son calculadas por el sistema y no pueden editarse."
        acciones={
          <>
            <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
              <FileDown className="size-4" /> Exportar Excel
            </Button>
            {puedeEditar && !fuenteExterna ? (
              <DialogoFactura abierto={abierto} setAbierto={setAbierto} onGuardar={agregarFactura} />
            ) : null}
          </>
        }
      />

      {fuenteExterna ? (
        <div
          className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
            avisoFuenteExterna
              ? "border-advertencia/40 bg-advertencia-suave text-advertencia-foreground"
              : "border-primary/30 bg-primary/5 text-foreground"
          }`}
        >
          <Database className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Origen de las facturas: {pedidosFuenteOrigen}</p>
            <p className="text-xs text-muted-foreground">
              {avisoFuenteExterna ??
                "Se muestran las facturas vigentes (no anuladas) leídas directamente de las tablas FACTURA y FACTURA_LINEA. Use el ícono de cada fila para ver sus líneas."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="f-cliente">Cliente</Label>
          <Input
            id="f-cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Buscar cliente"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda | "todas")}>
            <SelectTrigger>
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
          <Label htmlFor="f-desde">Emisión desde</Label>
          <Input id="f-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-hasta">Emisión hasta</Label>
          <Input id="f-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-4">
          <Label>Estado</Label>
          <div className="flex min-h-9 flex-wrap items-center justify-start gap-x-6 gap-y-1 rounded-md border border-input bg-background px-3 py-1.5">
            {ESTADOS_FACTURA.map((e) => (
              <label key={e} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <Checkbox
                  checked={estados.includes(e)}
                  onCheckedChange={(v) => alternarEstado(e, v === true)}
                  aria-label={`Filtrar ${e}`}
                />
                {e}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Emisión</TableHead>
              <TableHead className="text-right">Plazo</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Días</TableHead>
              <TableHead className="text-right">Facturado</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((f) => (
              <TableRow
                key={f.id}
                className={f.origen ? "cursor-pointer" : undefined}
                title={f.origen ? "Doble clic para ver las líneas" : undefined}
                onDoubleClick={() => {
                  if (f.origen) setFacturaDetalle(f);
                }}
              >
                <TableCell className="text-xs text-muted-foreground">
                  {companias.find((c) => c.id === f.companiaId)?.codigo}
                </TableCell>
                <TableCell className="font-medium">
                  {f.numero}
                  {f.origen ? (
                    <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {f.origen}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{f.cliente}</TableCell>
                <TableCell className="whitespace-nowrap">{formatearFecha(f.fechaEmision)}</TableCell>
                <TableCell className="text-right tabular-nums">{f.plazoDias}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatearFecha(f.fechaVencimiento)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {f.diasParaVencer === null ? "—" : f.diasParaVencer}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(f.monto, f.moneda)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {formatearMoneda(f.totalPagado, f.moneda)}
                </TableCell>
                <TableCell className="text-right font-mono font-medium tabular-nums">
                  {formatearMoneda(Math.max(f.saldoPendiente, 0), f.moneda)}
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={f.estado} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {f.origen ? (
                    <DialogoLineasFactura factura={f} />
                  ) : esAdministrador ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar factura ${f.numero}`}
                      onClick={() => {
                        eliminarFactura(f.id);
                        toast.success(`Factura ${f.numero} eliminada`);
                      }}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                  No hay facturas para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {facturaDetalle ? (
          <DialogoLineasFactura
            key={facturaDetalle.id}
            factura={facturaDetalle}
            abierto
            sinDisparador
            onAbiertoChange={(v) => {
              if (!v) setFacturaDetalle(null);
            }}
          />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["USD", "CRC"] as Moneda[]).map((m) => (
          <div key={m} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Totales en {m}
            </p>
            <div className="mt-2 flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Facturado</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatearMoneda(totales[m].facturado, m)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo por cobrar</p>
                <p className="font-mono text-lg font-semibold tabular-nums text-primary">
                  {formatearMoneda(totales[m].saldo, m)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DialogoFactura({
  abierto,
  setAbierto,
  onGuardar,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  onGuardar: ReturnType<typeof useApp>["agregarFactura"];
}) {
  const { companias, facturas, pedidos, actualizarPedido, hoy } = useApp();
  const [companiaId, setCompaniaId] = useState(companias[0]?.id ?? "");
  const [pedidoId, setPedidoId] = useState<string>("ninguno");
  const [numero, setNumero] = useState("");
  const [cliente, setCliente] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [plazoDias, setPlazoDias] = useState("30");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");

  // RF-011: los pedidos pendientes pueden convertirse en factura.
  const pedidosPendientes = useMemo(
    () => pedidos.filter((p) => p.estado === "Pendiente"),
    [pedidos],
  );

  const tomarPedido = (id: string) => {
    setPedidoId(id);
    if (id === "ninguno") return;
    const p = pedidos.find((x) => x.id === id);
    if (!p) return;
    setCompaniaId(p.companiaId);
    setCliente(p.cliente);
    setMoneda(p.moneda);
    setMonto(String(p.monto));
    setPlazoDias(String(p.plazoDias));
    if (!fechaEmision) setFechaEmision(hoy);
    setNotas(`Generada del pedido ${p.numero}`);
  };

  const guardar = () => {
    if (!numero || !cliente || !fechaEmision) {
      toast.error("Complete compañía, número, cliente y fecha de emisión.");
      return;
    }
    if (Number(monto) <= 0 || Number.isNaN(Number(monto))) {
      toast.error("El monto facturado debe ser mayor que cero.");
      return;
    }
    // RF-002.2: número único dentro de la misma compañía.
    if (facturas.some((f) => f.companiaId === companiaId && f.numero === numero)) {
      toast.error("Ya existe una factura con ese número en la compañía seleccionada.");
      return;
    }
    onGuardar({
      companiaId,
      numero,
      cliente,
      fechaEmision,
      plazoDias: Number(plazoDias) || 0,
      moneda,
      monto: Number(monto),
      notas,
    });
    const pedido = pedidoId !== "ninguno" ? pedidos.find((p) => p.id === pedidoId) : undefined;
    if (pedido) {
      actualizarPedido(pedido.id, { estado: "Facturado" });
      toast.success(`Factura ${numero} registrada · pedido ${pedido.numero} facturado`);
    } else {
      toast.success(`Factura ${numero} registrada`);
    }
    setAbierto(false);
    setPedidoId("ninguno");
    setNumero("");
    setCliente("");
    setMonto("");
    setNotas("");
  };


  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Nueva factura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva factura por cobrar</DialogTitle>
          <DialogDescription>
            Puede generarla desde un pedido pendiente o capturarla manualmente. El vencimiento, el
            saldo y el estado se calculan automáticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Pedido de origen</Label>
            <Select value={pedidoId} onValueChange={tomarPedido}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un pedido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Sin pedido (captura manual)</SelectItem>
                {pedidosPendientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.numero} · {p.cliente} · {formatearMoneda(p.monto, p.moneda)}
                    {p.origen ? ` · ${p.origen}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Al guardar, el pedido seleccionado pasa de Pendiente a Facturado
              {pedidosPendientes.some((p) => p.origen)
                ? " (en los pedidos de SoftlandERP el estado se actualiza de N a F en el ERP)"
                : ""}
              .
            </p>
          </div>

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
            <Label htmlFor="n-numero">Número de factura</Label>
            <Input id="n-numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="n-cliente">Cliente</Label>
            <Input id="n-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-fecha">Fecha de emisión</Label>
            <Input
              id="n-fecha"
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-plazo">Plazo en días</Label>
            <Input
              id="n-plazo"
              type="number"
              value={plazoDias}
              onChange={(e) => setPlazoDias(e.target.value)}
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
            <Label htmlFor="n-monto">Monto facturado</Label>
            <Input
              id="n-monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="n-notas">Notas o condiciones</Label>
            <Textarea id="n-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar factura</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
