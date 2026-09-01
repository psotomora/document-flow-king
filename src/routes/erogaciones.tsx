import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
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
import type { Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/erogaciones")({
  head: () => ({
    meta: [
      { title: "Erogaciones | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Salidas de efectivo por banco y moneda, con número de transferencia y proveedor.",
      },
      { property: "og:title", content: "Erogaciones | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Control de pagos a proveedores y su efecto en el saldo bancario.",
      },
    ],
  }),
  component: PaginaErogaciones,
});

function PaginaErogaciones() {
  const { erogaciones, bancos, companias, companiaActiva, puedeEditar, esAdministrador, eliminarErogacion, usuario } =
    useApp();
  const [moneda, setMoneda] = useState<Moneda | "todas">("todas");
  const [abierto, setAbierto] = useState(false);

  const filtradas = useMemo(
    () =>
      filtrarPorCompania(erogaciones, companiaActiva).filter(
        (e) => moneda === "todas" || e.moneda === moneda,
      ),
    [erogaciones, companiaActiva, moneda],
  );

  const totalUSD = filtradas.filter((e) => e.moneda === "USD").reduce((s, e) => s + e.monto, 0);
  const totalCRC = filtradas.filter((e) => e.moneda === "CRC").reduce((s, e) => s + e.monto, 0);

  const exportar = () =>
    exportarExcel(
      "erogaciones",
      "Erogaciones",
      filtradas.map((e) => ({
        Compañía: companias.find((c) => c.id === e.companiaId)?.codigo ?? "",
        "N.º transferencia": e.numeroTransferencia,
        Proveedor: e.proveedor,
        Fecha: formatearFecha(e.fecha),
        Banco: bancos.find((b) => b.id === e.bancoId)?.nombre ?? "",
        Moneda: e.moneda,
        Monto: e.monto,
        Notas: e.notas ?? "",
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Erogaciones"
        requerimiento="RF-006"
        descripcion="Cada erogación reduce el saldo disponible del banco y la moneda correspondientes."
        acciones={
          <>
            <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
              <FileDown className="size-4" /> Exportar Excel
            </Button>
            {puedeEditar ? <DialogoErogacion abierto={abierto} setAbierto={setAbierto} /> : null}
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda | "todas")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CRC">CRC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-6 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Total USD</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(totalUSD, "USD")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total CRC</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(totalCRC, "CRC")}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>N.º transferencia</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {companias.find((c) => c.id === e.companiaId)?.codigo}
                </TableCell>
                <TableCell className="font-medium">{e.numeroTransferencia}</TableCell>
                <TableCell>{e.proveedor}</TableCell>
                <TableCell className="whitespace-nowrap">{formatearFecha(e.fecha)}</TableCell>
                <TableCell>{bancos.find((b) => b.id === e.bancoId)?.nombre ?? "—"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(e.monto, e.moneda)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {e.notas ?? "—"}
                </TableCell>
                <TableCell>
                  {esAdministrador ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar erogación"
                      onClick={() => {
                        eliminarErogacion(e.id);
                        toast.success("Erogación eliminada");
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
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay erogaciones registradas para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DialogoErogacion({
  abierto,
  setAbierto,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
}) {
  const { companias, bancos, agregarErogacion, erogaciones, hoy } = useApp();
  const [companiaId, setCompaniaId] = useState(companias[0]?.id ?? "");
  const [numeroTransferencia, setNumero] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [bancoId, setBancoId] = useState(bancos[0]?.id ?? "");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");

  const bancosCompania = bancos.filter((b) => b.companiaId === companiaId);

  const guardar = () => {
    if (!numeroTransferencia || !proveedor || !bancoId) {
      toast.error("Complete número de transferencia, proveedor y banco.");
      return;
    }
    if (!(Number(monto) > 0)) {
      toast.error("El monto debe ser mayor que cero.");
      return;
    }
    if (erogaciones.some((e) => e.numeroTransferencia === numeroTransferencia)) {
      toast.error("El número de transferencia ya fue registrado.");
      return;
    }
    agregarErogacion({
      companiaId,
      bancoId,
      numeroTransferencia,
      proveedor,
      fecha,
      moneda,
      monto: Number(monto),
      notas,
    });
    toast.success("Erogación registrada");
    setAbierto(false);
    setNumero("");
    setProveedor("");
    setMonto("");
    setNotas("");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Nueva erogación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar erogación</DialogTitle>
          <DialogDescription>
            Se descontará del saldo del banco seleccionado en la moneda indicada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Compañía</Label>
            <Select
              value={companiaId}
              onValueChange={(v) => {
                setCompaniaId(v);
                setBancoId(bancos.find((b) => b.companiaId === v)?.id ?? "");
              }}
            >
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
            <Label>Banco</Label>
            <Select value={bancoId} onValueChange={setBancoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bancosCompania.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-num">N.º de transferencia</Label>
            <Input
              id="e-num"
              value={numeroTransferencia}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-prov">Proveedor</Label>
            <Input id="e-prov" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-fecha">Fecha</Label>
            <Input
              id="e-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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
            <Label htmlFor="e-monto">Monto</Label>
            <Input
              id="e-monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="e-notas">Notas</Label>
            <Textarea id="e-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar erogación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
