import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { EstadoPedido, Moneda } from "@/data/tipos";
import { equivalenteEnDolares } from "@/lib/calculos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";
import {
  MESES_POR_PERIODICIDAD,
  numeroPedidoDeContrato,
  sumarMeses,
} from "@/lib/contratos";


export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos pendientes | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Pedidos aún no facturados que representan ingresos futuros probables, independientes de los contratos.",
      },
      { property: "og:title", content: "Pedidos pendientes | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Seguimiento de pedidos por estado y su aporte al flujo proyectado.",
      },
    ],
  }),
  component: PaginaPedidos,
});

const ESTADOS: EstadoPedido[] = ["Pendiente", "Facturado", "Anulado"];

function PaginaPedidos() {
  const {
    pedidos,
    companias,
    companiaActiva,
    puedeEditar,
    actualizarPedido,
    tipoCambio,
    usuario,
  } = useApp();
  const [estado, setEstado] = useState<EstadoPedido | "todos">("todos");
  const [abierto, setAbierto] = useState(false);

  const filtrados = filtrarPorCompania(pedidos, companiaActiva).filter(
    (p) => estado === "todos" || p.estado === estado,
  );

  const pendientesUSD = filtrados
    .filter((p) => p.estado === "Pendiente")
    .reduce((s, p) => s + equivalenteEnDolares(p.monto, p.moneda, tipoCambio), 0);

  const exportar = () =>
    exportarExcel(
      "pedidos",
      "Pedidos",
      filtrados.map((p) => ({
        Compañía: companias.find((c) => c.id === p.companiaId)?.codigo ?? "",
        Pedido: p.numero,
        Cliente: p.cliente,
        Creación: formatearFecha(p.fechaCreacion),
        "Plazo (días)": p.plazoDias,
        Moneda: p.moneda,
        Monto: p.monto,
        "Equivalente USD": equivalenteEnDolares(p.monto, p.moneda, tipoCambio),
        Estado: p.estado,
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Pedidos pendientes"
        requerimiento="RF-012"
        descripcion="Los pedidos son ingresos probables aún no facturados. No incluyen contratos, que se administran por separado."
        acciones={
          <>
            <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
              <FileDown className="size-4" /> Exportar Excel
            </Button>
            {puedeEditar ? <DialogoPedido abierto={abierto} setAbierto={setAbierto} /> : null}
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select value={estado} onValueChange={(v) => setEstado(v as EstadoPedido | "todos")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">
            Pedidos pendientes y en proceso (equivalente en USD)
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums text-primary">
            {formatearMoneda(pendientesUSD, "USD")}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Creación</TableHead>
              <TableHead className="text-right">Plazo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Equivalente USD</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {companias.find((c) => c.id === p.companiaId)?.codigo}
                </TableCell>
                <TableCell className="font-medium">{p.numero}</TableCell>
                <TableCell>{p.cliente}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatearFecha(p.fechaCreacion)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.plazoDias}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(p.monto, p.moneda)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {formatearMoneda(
                    equivalenteEnDolares(p.monto, p.moneda, tipoCambio),
                    "USD",
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={p.estado}
                    disabled={!puedeEditar}
                    onValueChange={(v) => {
                      actualizarPedido(p.id, { estado: v as EstadoPedido });
                      toast.success(`Pedido ${p.numero}: ${v}`);
                    }}
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay pedidos para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DialogoPedido({
  abierto,
  setAbierto,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
}) {
  const { companias, contratos, agregarPedido, actualizarContrato, hoy } = useApp();
  const [origen, setOrigen] = useState<"manual" | "contrato">("manual");
  const [contratoId, setContratoId] = useState("");
  const [companiaId, setCompaniaId] = useState(companias[0]?.id ?? "");
  const [numero, setNumero] = useState("");
  const [cliente, setCliente] = useState("");
  const [fechaCreacion, setFecha] = useState(hoy);
  const [plazoDias, setPlazo] = useState("30");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [monto, setMonto] = useState("");

  const contratosActivos = contratos.filter((c) => c.estado === "Activo");

  const tomarContrato = (id: string) => {
    setContratoId(id);
    const c = contratos.find((x) => x.id === id);
    if (!c) return;
    setCompaniaId(c.companiaId);
    setNumero(numeroPedidoDeContrato(c.numero, c.proximaFacturacion));
    setCliente(c.cliente);
    setFecha(c.proximaFacturacion.slice(0, 10));
    setPlazo(String(c.plazoDias));
    setMoneda(c.moneda);
    setMonto(String(c.monto));
  };

  const guardar = () => {
    if (!numero || !cliente || !(Number(monto) > 0)) {
      toast.error("Complete número, cliente y un monto mayor que cero.");
      return;
    }
    agregarPedido({
      companiaId,
      numero,
      cliente,
      fechaCreacion,
      plazoDias: Number(plazoDias) || 0,
      moneda,
      monto: Number(monto),
      estado: "Pendiente",
    });
    if (origen === "contrato" && contratoId) {
      const c = contratos.find((x) => x.id === contratoId);
      if (c) {
        actualizarContrato(c.id, {
          proximaFacturacion: sumarMeses(
            fechaCreacion,
            MESES_POR_PERIODICIDAD[c.periodicidad] ?? 1,
          ),
          facturado: false,
        });
      }
    }
    toast.success(`Pedido ${numero} registrado`);
    setAbierto(false);
    setNumero("");
    setCliente("");
    setMonto("");
    setContratoId("");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Nuevo pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo pedido</DialogTitle>
          <DialogDescription>
            Regístrelo manualmente o genérelo a partir de un contrato activo. Los pedidos
            pendientes se suman al saldo proyectado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Origen del pedido</Label>
            <Select
              value={origen}
              onValueChange={(v) => {
                setOrigen(v as "manual" | "contrato");
                setContratoId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="contrato">Desde contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {origen === "contrato" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Contrato</Label>
              <Select value={contratoId} onValueChange={tomarContrato}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un contrato activo" />
                </SelectTrigger>
                <SelectContent>
                  {contratosActivos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero} — {c.cliente} ({c.periodicidad})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

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
            <Label htmlFor="pd-num">Número de pedido</Label>
            <Input id="pd-num" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pd-cli">Cliente</Label>
            <Input id="pd-cli" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-fecha">Fecha de creación</Label>
            <Input
              id="pd-fecha"
              type="date"
              value={fechaCreacion}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-plazo">Plazo en días</Label>
            <Input
              id="pd-plazo"
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
          <div className="space-y-1.5">
            <Label htmlFor="pd-monto">Monto</Label>
            <Input
              id="pd-monto"
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
          <Button onClick={guardar}>Guardar pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
