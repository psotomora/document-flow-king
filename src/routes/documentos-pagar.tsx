import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { SelectorFilas } from "@/components/comunes/SelectorFilas";
import { useFilasVisibles } from "@/lib/preferencias";
import { useCompaniaValida } from "@/hooks/use-compania-valida";
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
import type { DocumentoPorPagar, Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/documentos-pagar")({
  head: () => ({
    meta: [
      { title: "Documentos por pagar | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Documentos pendientes de pago a proveedores, con saldo, vencimiento y filtros por proveedor y periodo.",
      },
      { property: "og:title", content: "Documentos por pagar | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Cuentas por pagar con saldo pendiente, del registro interno o del sistema externo.",
      },
    ],
  }),
  component: PaginaDocumentosPorPagar,
});

function PaginaDocumentosPorPagar() {
  const {
    filas: filasVisibles,
    estiloTabla,
    establecer: establecerFilas,
  } = useFilasVisibles("documentos-pagar");
  const {
    documentosPorPagar,
    documentosPagoFuenteExterna,
    companias,
    companiaActiva,
    puedeEditar,
    esAdministrador,
    eliminarDocumentoPorPagar,
    tipoCambio,
    usuario,
    hoy,
  } = useApp();

  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [numeroBusqueda, setNumeroBusqueda] = useState("");
  const [moneda, setMoneda] = useState<Moneda | "todas">("todas");
  const [periodo, setPeriodo] = useState<"mes" | "todos" | "rango">("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [enEdicion, setEnEdicion] = useState<DocumentoPorPagar | null>(null);

  const mesActual = hoy.slice(0, 7);
  const proveedorTexto = proveedorBusqueda.trim().toLowerCase();
  const numeroTexto = numeroBusqueda.trim().toLowerCase();
  const soloLectura = documentosPagoFuenteExterna;

  const filtrados = useMemo(
    () =>
      filtrarPorCompania(documentosPorPagar, companiaActiva).filter((d) => {
        if (d.saldo <= 0) return false;
        if (moneda !== "todas" && d.moneda !== moneda) return false;
        if (proveedorTexto && !d.proveedor.toLowerCase().includes(proveedorTexto))
          return false;
        if (numeroTexto && !d.numero.toLowerCase().includes(numeroTexto)) return false;
        const fecha = d.fecha.slice(0, 10);
        if (periodo === "mes" && fecha.slice(0, 7) !== mesActual) return false;
        if (periodo === "rango") {
          if (fechaInicio && fecha < fechaInicio) return false;
          if (fechaFin && fecha > fechaFin) return false;
        }
        return true;
      }),
    [
      documentosPorPagar,
      companiaActiva,
      moneda,
      proveedorTexto,
      numeroTexto,
      periodo,
      fechaInicio,
      fechaFin,
      mesActual,
    ],
  );

  const totalUSD = filtrados.filter((d) => d.moneda === "USD").reduce((s, d) => s + d.saldo, 0);
  const totalCRC = filtrados.filter((d) => d.moneda === "CRC").reduce((s, d) => s + d.saldo, 0);
  const totalConsolidadoUSD = totalUSD + (tipoCambio > 0 ? totalCRC / tipoCambio : 0);

  const exportar = () =>
    exportarExcel(
      "documentos-por-pagar",
      "Documentos por pagar",
      filtrados.map((d) => ({
        Compañía: companias.find((c) => c.id === d.companiaId)?.codigo ?? "",
        Proveedor: d.proveedor,
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
      <EncabezadoPagina
        titulo="Documentos por pagar"
        requerimiento="RF-006"
        descripcion="Documentos de proveedores con saldo pendiente de pago. Solo se muestran los que aún no están cancelados."
        acciones={
          <>
            <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
              <FileDown className="size-4" /> Exportar Excel
            </Button>
            {puedeEditar && !soloLectura ? (
              <Button size="sm" className="gap-1.5" onClick={() => setNuevo(true)}>
                <Plus className="size-4" /> Nuevo documento
              </Button>
            ) : null}
          </>
        }
      />

      {soloLectura ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Los documentos por pagar se están leyendo del sistema externo (SoftlandERP). En este modo
          la información es de solo lectura.
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="dp-proveedor">Proveedor</Label>
          <Input
            id="dp-proveedor"
            className="w-56"
            placeholder="Buscar proveedor…"
            value={proveedorBusqueda}
            onChange={(e) => setProveedorBusqueda(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dp-numero">N.º de documento</Label>
          <Input
            id="dp-numero"
            className="w-56"
            placeholder="Buscar n.º de documento…"
            value={numeroBusqueda}
            onChange={(e) => setNumeroBusqueda(e.target.value)}
          />
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
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as "mes" | "todos" | "rango")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="todos">Todos los registros</SelectItem>
              <SelectItem value="rango">Rango de fechas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodo === "rango" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="dp-ini">Fecha inicio</Label>
              <Input
                id="dp-ini"
                type="date"
                className="w-44"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dp-fin">Fecha fin</Label>
              <Input
                id="dp-fin"
                type="date"
                className="w-44"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </>
        ) : null}
        <div className="ml-auto flex gap-6 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Saldo USD</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(totalUSD, "USD")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo CRC</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(totalCRC, "CRC")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Consolidado USD</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(totalConsolidadoUSD, "USD")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SelectorFilas id="filas-documentos-pagar" filas={filasVisibles} onCambio={establecerFilas} />
      </div>

      <div
        style={estiloTabla}
        className="max-h-[var(--alto-tabla)] overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card shadow-sm [&_th]:bg-card">
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {companias.find((c) => c.id === d.companiaId)?.codigo}
                </TableCell>
                <TableCell>{d.proveedor}</TableCell>
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
                <TableCell className="whitespace-nowrap">
                  {puedeEditar && !soloLectura ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar documento"
                      onClick={() => setEnEdicion(d)}
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                  {esAdministrador && !soloLectura ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar documento"
                      onClick={() => {
                        eliminarDocumentoPorPagar(d.id);
                        toast.success("Documento eliminado");
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
                  No hay documentos pendientes de pago para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {nuevo ? <DialogoDocumento abierto onCerrar={() => setNuevo(false)} /> : null}
      {enEdicion ? (
        <DialogoDocumento abierto documento={enEdicion} onCerrar={() => setEnEdicion(null)} />
      ) : null}
    </div>
  );
}

function DialogoDocumento({
  abierto,
  documento,
  onCerrar,
}: {
  abierto: boolean;
  documento?: DocumentoPorPagar;
  onCerrar: () => void;
}) {
  const { companias, hoy, agregarDocumentoPorPagar, actualizarDocumentoPorPagar } = useApp();
  const [companiaId, setCompaniaId] = useState(documento?.companiaId ?? companias[0]?.id ?? "");
  useCompaniaValida(companias, companiaId, setCompaniaId);
  const [proveedor, setProveedor] = useState(documento?.proveedor ?? "");
  const [numero, setNumero] = useState(documento?.numero ?? "");
  const [tipo, setTipo] = useState(documento?.tipo ?? "FAC");
  const [fecha, setFecha] = useState(documento?.fecha ?? hoy);
  const [fechaVence, setFechaVence] = useState(documento?.fechaVence ?? hoy);
  const [moneda, setMoneda] = useState<Moneda>(documento?.moneda ?? "USD");
  const [monto, setMonto] = useState(documento ? String(documento.monto) : "");
  const [saldo, setSaldo] = useState(documento ? String(documento.saldo) : "");
  const [notas, setNotas] = useState(documento?.notas ?? "");

  const guardar = () => {
    if (!proveedor.trim() || !numero.trim()) {
      toast.error("Indique el proveedor y el número de documento.");
      return;
    }
    if (!(Number(monto) > 0)) {
      toast.error("El monto debe ser mayor que cero.");
      return;
    }
    const saldoFinal = saldo === "" ? Number(monto) : Number(saldo);
    if (!(saldoFinal >= 0)) {
      toast.error("El saldo no puede ser negativo.");
      return;
    }
    const datos = {
      companiaId,
      proveedor: proveedor.trim(),
      numero: numero.trim(),
      tipo: tipo.trim() || "FAC",
      fecha,
      fechaVence,
      moneda,
      monto: Number(monto),
      saldo: saldoFinal,
      notas: notas.trim() || null,
    };
    if (documento) {
      actualizarDocumentoPorPagar(documento.id, datos);
      toast.success("Documento actualizado");
    } else {
      agregarDocumentoPorPagar(datos);
      toast.success("Documento registrado");
    }
    onCerrar();
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {documento ? "Editar documento por pagar" : "Registrar documento por pagar"}
          </DialogTitle>
          <DialogDescription>
            El saldo pendiente es el monto que aún no se le ha pagado al proveedor.
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
            <Label htmlFor="dp-prov">Proveedor</Label>
            <Input id="dp-prov" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-num">N.º de documento</Label>
            <Input id="dp-num" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-tipo">Tipo</Label>
            <Input id="dp-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-fecha">Fecha</Label>
            <Input
              id="dp-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-vence">Vence</Label>
            <Input
              id="dp-vence"
              type="date"
              value={fechaVence}
              onChange={(e) => setFechaVence(e.target.value)}
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
            <Label htmlFor="dp-monto">Monto</Label>
            <Input
              id="dp-monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-saldo">Saldo pendiente</Label>
            <Input
              id="dp-saldo"
              type="number"
              value={saldo}
              placeholder="Igual al monto si se deja vacío"
              onChange={(e) => setSaldo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dp-notas">Notas</Label>
            <Textarea id="dp-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar documento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
