import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { BotonActualizar } from "@/components/comunes/BotonActualizar";
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
import type { DocumentoPorCobrar, Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/documentos-cobrar")({
  head: () => ({
    meta: [
      { title: "Documentos por cobrar | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Vista de consulta de los documentos de cuentas por cobrar tipo FAC y DEV, con monto, saldo y filtros por cliente, moneda y fechas.",
      },
      { property: "og:title", content: "Documentos por cobrar | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content:
          "Facturas y devoluciones de clientes, del registro interno o del sistema externo, con exportación a Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaDocumentosPorCobrar,
});

function PaginaDocumentosPorCobrar() {
  const {
    filas: filasVisibles,
    estiloTabla,
    establecer: establecerFilas,
  } = useFilasVisibles("documentos-cobrar");
  const {
    documentosPorCobrar,
    documentosCobroFuenteExterna,
    modoApi,
    companias,
    companiaActiva,
    puedeEditar,
    esAdministrador,
    eliminarDocumentoPorCobrar,
    tipoCambio,
    usuario,
  } = useApp();

  const [cliente, setCliente] = useState("");
  const [numeroBusqueda, setNumeroBusqueda] = useState("");
  const [tipo, setTipo] = useState<"todos" | "FAC" | "DEV">("todos");
  const [moneda, setMoneda] = useState<Moneda | "todas">("todas");
  const [periodo, setPeriodo] = useState<"mes" | "anio" | "rango">("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [enEdicion, setEnEdicion] = useState<DocumentoPorCobrar | null>(null);

  const clienteTexto = cliente.trim().toLowerCase();
  const numeroTexto = numeroBusqueda.trim().toLowerCase();
  const soloLectura = modoApi && documentosCobroFuenteExterna;

  const hoyIso = new Date().toISOString().slice(0, 10);
  const mesActual = hoyIso.slice(0, 7);
  const anioActual = hoyIso.slice(0, 4);

  const filtrados = useMemo(
    () =>
      filtrarPorCompania(documentosPorCobrar, companiaActiva).filter((d) => {
        if (clienteTexto && !d.cliente.toLowerCase().includes(clienteTexto)) return false;
        if (numeroTexto && !d.numero.toLowerCase().includes(numeroTexto)) return false;
        if (tipo !== "todos" && d.tipo.toUpperCase() !== tipo) return false;
        if (moneda !== "todas" && d.moneda !== moneda) return false;
        const fecha = d.fecha.slice(0, 10);
        if (periodo === "mes" && fecha.slice(0, 7) !== mesActual) return false;
        if (periodo === "anio" && (fecha.slice(0, 4) !== anioActual || fecha > hoyIso)) return false;
        if (periodo === "rango") {
          if (desde && fecha < desde) return false;
          if (hasta && fecha > hasta) return false;
        }
        return true;
      }),
    [
      documentosPorCobrar,
      companiaActiva,
      clienteTexto,
      numeroTexto,
      tipo,
      moneda,
      periodo,
      desde,
      hasta,
      mesActual,
      anioActual,
      hoyIso,
    ],
  );

  const sumar = (m: Moneda, campo: "monto" | "saldo") =>
    filtrados.filter((d) => d.moneda === m).reduce((s, d) => s + d[campo], 0);
  const montoUSD = sumar("USD", "monto");
  const montoCRC = sumar("CRC", "monto");
  const saldoUSD = sumar("USD", "saldo");
  const saldoCRC = sumar("CRC", "saldo");
  const saldoConsolidadoUSD = saldoUSD + (tipoCambio > 0 ? saldoCRC / tipoCambio : 0);

  const exportar = () =>
    exportarExcel(
      "documentos-por-cobrar",
      "Documentos por cobrar",
      filtrados.map((d) => ({
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
      <EncabezadoPagina
        titulo="Documentos por cobrar"
        requerimiento="RF-006"
        descripcion="Vista de consulta de los documentos de cuentas por cobrar de tipo FAC (facturas) y DEV (devoluciones). Se muestran los cobrados y los pendientes; los anulados quedan fuera."
        acciones={
          <>
            <BotonActualizar />
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
          Los documentos por cobrar se están leyendo del sistema externo (SoftlandERP). En este modo
          la información es de solo lectura.
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="dc-cliente">Cliente</Label>
          <Input
            id="dc-cliente"
            className="w-56"
            placeholder="Buscar cliente…"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dc-numero">N.º de documento</Label>
          <Input
            id="dc-numero"
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
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as "mes" | "anio" | "rango")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="anio">Acumulado del año a la fecha</SelectItem>
              <SelectItem value="rango">Rango de fechas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodo === "rango" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="dc-desde">Fecha inicio</Label>
              <Input
                id="dc-desde"
                type="date"
                className="w-44"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-hasta">Fecha fin</Label>
              <Input
                id="dc-hasta"
                type="date"
                className="w-44"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-6 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Monto USD</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(montoUSD, "USD")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monto CRC</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(montoCRC, "CRC")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo USD</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(saldoUSD, "USD")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo CRC</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(saldoCRC, "CRC")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo consolidado USD</p>
            <p className="font-mono font-semibold tabular-nums">
              {formatearMoneda(saldoConsolidadoUSD, "USD")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SelectorFilas
          id="filas-documentos-cobrar"
          filas={filasVisibles}
          onCambio={establecerFilas}
        />
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
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((d) => (
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
                        eliminarDocumentoPorCobrar(d.id);
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
                  No hay documentos por cobrar para los filtros aplicados.
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
  documento?: DocumentoPorCobrar;
  onCerrar: () => void;
}) {
  const { companias, hoy, agregarDocumentoPorCobrar, actualizarDocumentoPorCobrar } = useApp();
  const [companiaId, setCompaniaId] = useState(documento?.companiaId ?? companias[0]?.id ?? "");
  useCompaniaValida(companias, companiaId, setCompaniaId);
  const [cliente, setCliente] = useState(documento?.cliente ?? "");
  const [numero, setNumero] = useState(documento?.numero ?? "");
  const [tipo, setTipo] = useState(documento?.tipo ?? "FAC");
  const [fecha, setFecha] = useState(documento?.fecha ?? hoy);
  const [fechaVence, setFechaVence] = useState(documento?.fechaVence ?? hoy);
  const [moneda, setMoneda] = useState<Moneda>(documento?.moneda ?? "USD");
  const [monto, setMonto] = useState(documento ? String(documento.monto) : "");
  const [saldo, setSaldo] = useState(documento ? String(documento.saldo) : "");
  const [notas, setNotas] = useState(documento?.notas ?? "");

  const guardar = () => {
    if (!cliente.trim() || !numero.trim()) {
      toast.error("Indique el cliente y el número de documento.");
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
      cliente: cliente.trim(),
      numero: numero.trim(),
      tipo: (tipo.trim() || "FAC").toUpperCase(),
      fecha,
      fechaVence,
      moneda,
      monto: Number(monto),
      saldo: saldoFinal,
      notas: notas.trim() || null,
    };
    if (documento) {
      actualizarDocumentoPorCobrar(documento.id, datos);
      toast.success("Documento actualizado");
    } else {
      agregarDocumentoPorCobrar(datos);
      toast.success("Documento registrado");
    }
    onCerrar();
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {documento ? "Editar documento por cobrar" : "Registrar documento por cobrar"}
          </DialogTitle>
          <DialogDescription>
            El saldo es el monto que el cliente aún no ha cancelado. En las devoluciones (DEV)
            representa el crédito pendiente de aplicar.
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
            <Label htmlFor="dc-cli">Cliente</Label>
            <Input id="dc-cli" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-num">N.º de documento</Label>
            <Input id="dc-num" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FAC">FAC — Factura</SelectItem>
                <SelectItem value="DEV">DEV — Devolución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-fecha">Fecha</Label>
            <Input
              id="dc-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-vence">Vence</Label>
            <Input
              id="dc-vence"
              type="date"
              value={fechaVence ?? ""}
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
            <Label htmlFor="dc-monto">Monto</Label>
            <Input
              id="dc-monto"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-saldo">Saldo pendiente</Label>
            <Input
              id="dc-saldo"
              inputMode="decimal"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dc-notas">Notas</Label>
            <Textarea id="dc-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
