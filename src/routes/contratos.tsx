import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, Plus } from "lucide-react";
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
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { EstadoContrato, Moneda, Periodicidad } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos recurrentes | Flujo de Efectivo Aplix" },
      {
        name: "description",
        content:
          "Contratos con facturación periódica, próxima fecha de facturación y estado Activo o Cancelado.",
      },
      { property: "og:title", content: "Contratos recurrentes | Flujo de Efectivo Aplix" },
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
    actualizarContrato,
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
              </TableRow>
            ))}
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No hay contratos para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
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
