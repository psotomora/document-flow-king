import { FiltroFechas } from "@/components/comunes/FiltroFechas";
import { fechaEnPeriodo, type PeriodoFecha } from "@/lib/filtros-fecha";
import { Checkbox } from "@/components/ui/checkbox";
import { createFileRoute } from "@tanstack/react-router";
import { useCompaniaValida } from "@/hooks/use-compania-valida";
import { useMemo, useState } from "react";
import { normalizarReferencia, siguienteReferenciaConSufijo } from "@/lib/referencias-en-uso";
import { Check, ChevronsUpDown, FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { ContextoSinDocumento, Movimiento } from "@/components/erogaciones/ConciliacionErogaciones";
import { DialogoErogacion } from "@/components/erogaciones/DialogoErogacion";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { SelectorFilas } from "@/components/comunes/SelectorFilas";
import { useFiltroGuardado, useFilasVisibles } from "@/lib/preferencias";
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
import type { Erogacion, Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/erogaciones")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const {
    filas: filasVisibles,
    estiloTabla,
    establecer: establecerFilas,
  } = useFilasVisibles("erogaciones");
  const { erogaciones, bancos, companias, companiaActiva, puedeEditar, esAdministrador, eliminarErogacion, usuario, hoy } =
    useApp();
  const [moneda, setMoneda] = useFiltroGuardado<Moneda | "todas">("erogaciones", "moneda", "todas");
  const [proveedor, setProveedor] = useFiltroGuardado("erogaciones", "proveedor", "");
  const [periodo, setPeriodo] = useFiltroGuardado<PeriodoFecha>("erogaciones", "periodo", "mes");
  const [fechaInicio, setFechaInicio] = useFiltroGuardado("erogaciones", "fechaInicio", "");
  const [fechaFin, setFechaFin] = useFiltroGuardado("erogaciones", "fechaFin", "");
  const [abierto, setAbierto] = useState(false);
  const [mostrarPagados, setMostrarPagados] = useFiltroGuardado("erogaciones", "mostrarPagados", false);
  const [editando, setEditando] = useState<Erogacion | null>(null);
  const [precarga, setPrecarga] = useState<{ m: Movimiento; ctx: ContextoSinDocumento } | null>(null);
  const puedeEditarErogaciones = esAdministrador || (puedeEditar && usuario.editarErogaciones !== false);

  const textoProveedor = proveedor.trim().toLowerCase();

  const filtradas = useMemo(
    () =>
      filtrarPorCompania(erogaciones, companiaActiva).filter((e) => {
        if (moneda !== "todas" && e.moneda !== moneda) return false;
        if (textoProveedor && !e.proveedor.toLowerCase().includes(textoProveedor)) return false;
        if (!fechaEnPeriodo(e.fecha, periodo, hoy, fechaInicio, fechaFin)) return false;
        return true;
      }),
    [erogaciones, companiaActiva, moneda, textoProveedor, periodo, fechaInicio, fechaFin, hoy],
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
            {puedeEditar ? <DialogoErogacion abierto={abierto} setAbierto={setAbierto} mostrarPagados={mostrarPagados} /> : null}
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
        <div className="space-y-1.5">
          <Label htmlFor="f-prov">Proveedor</Label>
          <Input
            id="f-prov"
            className="w-56"
            placeholder="Buscar proveedor…"
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
          />
        </div>
        <FiltroFechas id="e-fechas" periodo={periodo} onPeriodoCambio={setPeriodo} desde={fechaInicio} hasta={fechaFin} onDesdeCambio={setFechaInicio} onHastaCambio={setFechaFin} />
        <div className="flex h-9 items-center gap-2 self-end">
          <Checkbox
            id="f-pagados"
            checked={mostrarPagados}
            onCheckedChange={(v) => setMostrarPagados(v === true)}
          />
          <Label htmlFor="f-pagados" className="cursor-pointer font-normal">
            Mostrar facturas en estado pagado
          </Label>
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

      {puedeEditar ? (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm"><Link to="/movimientos">Conciliar estado de cuenta en Movimientos bancarios</Link></Button>
        </div>
      ) : null}

      <div className="flex justify-end">
        <SelectorFilas id="filas-erogaciones" filas={filasVisibles} onCambio={establecerFilas} />
      </div>

      <div
        style={estiloTabla}
        className="max-h-[var(--alto-tabla)] overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card shadow-sm [&_th]:bg-card">

            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>N.º transferencia</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-24" />
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
                  <div className="flex justify-end">
                  {puedeEditarErogaciones ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar erogación"
                      onClick={() => setEditando(e)}
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                  ) : null}
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
                  </div>
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
      {editando ? (
        <DialogoErogacion
          key={editando.id}
          abierto={true}
          setAbierto={(valor) => {
            if (!valor) setEditando(null);
          }}
          erogacion={editando}
        />
      ) : null}
      {precarga ? (
        <DialogoErogacion
          key={precarga.m.clave}
          abierto={true}
          setAbierto={(valor) => {
            if (!valor) setPrecarga(null);
          }}
          precarga={precarga.m}
          contexto={precarga.ctx}
        />
      ) : null}
    </div>
  );
}

