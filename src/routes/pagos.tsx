import { FiltroFechas } from "@/components/comunes/FiltroFechas";
import { fechaEnPeriodo, type PeriodoFecha } from "@/lib/filtros-fecha";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { SelectorFilas } from "@/components/comunes/SelectorFilas";
import { useFiltroGuardado, useFilasVisibles } from "@/lib/preferencias";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import type { Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda, formatearNumero } from "@/lib/formato";
import { montoPagoEnMonedaFactura } from "@/lib/calculos";
import { exportarExcel } from "@/lib/exportar";
import { DialogoPago } from "@/components/pagos/DialogoPago";
import { ConciliacionEstadoCuenta } from "@/components/pagos/ConciliacionEstadoCuenta";

export const Route = createFileRoute("/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos recibidos | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Registro de pagos aplicados a facturas, incluidos pagos en moneda distinta con tipo de cambio de la operación.",
      },
      { property: "og:title", content: "Pagos recibidos | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Aplicación de pagos por banco, moneda y factura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaPagos,
});

function PaginaPagos() {
  const {
    filas: filasVisibles,
    estiloTabla,
    establecer: establecerFilas,
  } = useFilasVisibles("pagos");
  const {
    hoy,
    pagos,
    facturasCalculadas,
    bancos,
    companiaActiva,
    puedeEditar,
    esAdministrador,
    eliminarPago,
    usuario,
  } = useApp();

  const facturasVisibles = filtrarPorCompania(facturasCalculadas, companiaActiva);
  const idsVisibles = new Set(facturasVisibles.map((f) => f.id));
  const [banco, setBanco] = useFiltroGuardado("pagos", "banco", "todos");
  const [busqueda, setBusqueda] = useFiltroGuardado("pagos", "busqueda", "");
  const [periodo, setPeriodo] = useFiltroGuardado<PeriodoFecha>("pagos", "periodo", "rango");
  const [fechaInicio, setFechaInicio] = useFiltroGuardado("pagos", "fechaInicio", "");
  const [fechaFin, setFechaFin] = useFiltroGuardado("pagos", "fechaFin", "");
  const [abierto, setAbierto] = useState(false);
  const [mostrarPagadas, setMostrarPagadas] = useFiltroGuardado("pagos", "mostrarPagadas", false);

  const texto = busqueda.trim().toLowerCase();

  const filas = useMemo(
    () =>
      pagos
        .filter((p) => idsVisibles.has(p.facturaId))
        .filter((p) => banco === "todos" || p.bancoId === banco)
        .filter((p) => {
          return fechaEnPeriodo(p.fecha, periodo, hoy, fechaInicio, fechaFin);
        })
        .map((p) => {
          const factura = facturasCalculadas.find((f) => f.id === p.facturaId);
          return {
            pago: p,
            factura,
            aplicado:
              factura && p.aplicaFactura !== false
                ? montoPagoEnMonedaFactura(p, factura.moneda)
                : 0,
          };
        })
        .filter(({ factura }) =>
          texto
            ? `${factura?.numero ?? ""} ${factura?.cliente ?? ""}`.toLowerCase().includes(texto)
            : true,
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pagos, facturasCalculadas, companiaActiva, banco, texto, periodo, hoy, fechaInicio, fechaFin],
  );


  const totales = useMemo(() => {
    const total = (m: Moneda) =>
      filas.filter(({ pago }) => pago.moneda === m).reduce((s, { pago }) => s + pago.monto, 0);
    return { USD: total("USD"), CRC: total("CRC") };
  }, [filas]);

  const exportar = () =>
    exportarExcel(
      "pagos-recibidos",
      "Pagos",
      filas.map(({ pago, factura, aplicado }) => ({
        Fecha: formatearFecha(pago.fecha),
        Factura: factura?.numero ?? "",
        Cliente: factura?.cliente ?? "",
        Banco: bancos.find((b) => b.id === pago.bancoId)?.nombre ?? "",
        Moneda: pago.moneda,
        Monto: pago.monto,
        "Tipo de cambio": pago.tipoCambioOperacion ?? "",
        "Aplicado a la factura": aplicado,
        Método: pago.metodo,
        Referencia: pago.referencia ?? "",
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Pagos recibidos"
        requerimiento="RF-005"
        descripcion="Un pago siempre se asocia a una factura. Si la moneda del pago difiere de la de la factura, se registra el tipo de cambio de la operación y el sistema convierte el monto aplicado."
        acciones={
          <>
            <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
              <FileDown className="size-4" /> Exportar Excel
            </Button>
            {puedeEditar ? (
              <DialogoPago
                key={mostrarPagadas ? "con-pagadas" : "solo-pendientes"}
                abierto={abierto}
                setAbierto={setAbierto}
                mostrarPagadas={mostrarPagadas}
              />
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Banco</Label>
          <Select value={banco} onValueChange={setBanco}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los bancos</SelectItem>
              {bancos.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-busca">Cliente o número de factura</Label>
          <Input
            id="p-busca"
            className="w-64"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <FiltroFechas id="p-fechas" periodo={periodo} onPeriodoCambio={setPeriodo} desde={fechaInicio} hasta={fechaFin} onDesdeCambio={setFechaInicio} onHastaCambio={setFechaFin} />
        <div className="flex h-9 items-center gap-2 self-end">
          <Checkbox
            id="p-mostrar-pagadas"
            checked={mostrarPagadas}
            onCheckedChange={(valor) => setMostrarPagadas(valor === true)}
          />
          <Label htmlFor="p-mostrar-pagadas" className="cursor-pointer font-normal">
            Mostrar facturas en estado pagado
          </Label>
        </div>
      </div>

      {puedeEditar && <ConciliacionEstadoCuenta mostrarPagadas={mostrarPagadas} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["USD", "CRC"] as Moneda[]).map((m) => (
          <div key={m} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Total pagado en {m}
            </p>
            <p className="mt-2 font-mono text-lg font-semibold tabular-nums">
              {formatearMoneda(totales[m], m)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <SelectorFilas id="filas-pagos" filas={filasVisibles} onCambio={establecerFilas} />
      </div>

      <div
        style={estiloTabla}
        className="max-h-[var(--alto-tabla)] overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card shadow-sm">
            <TableRow>
              <TableHead className="bg-card">Fecha</TableHead>
              <TableHead className="bg-card">Factura</TableHead>
              <TableHead className="bg-card">Cliente</TableHead>
              <TableHead className="bg-card">Banco</TableHead>
              <TableHead className="bg-card text-right">Monto del pago</TableHead>
              <TableHead className="bg-card text-right">Tipo de cambio</TableHead>
              <TableHead className="bg-card text-right">Aplicado a la factura</TableHead>
              <TableHead className="bg-card">Método</TableHead>
              <TableHead className="bg-card">Referencia</TableHead>
              <TableHead className="bg-card" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map(({ pago, factura, aplicado }) => (
              <TableRow key={pago.id}>
                <TableCell className="whitespace-nowrap">{formatearFecha(pago.fecha)}</TableCell>
                <TableCell className="font-medium">{factura?.numero ?? "—"}</TableCell>
                <TableCell>{factura?.cliente ?? "—"}</TableCell>
                <TableCell>{bancos.find((b) => b.id === pago.bancoId)?.nombre ?? "—"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(pago.monto, pago.moneda)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {pago.tipoCambioOperacion ? formatearNumero(pago.tipoCambioOperacion) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {pago.aplicaFactura === false
                    ? "No aplica"
                    : factura
                      ? formatearMoneda(aplicado, factura.moneda)
                      : "—"}
                </TableCell>
                <TableCell>{pago.metodo}</TableCell>
                <TableCell className="text-muted-foreground">{pago.referencia ?? "—"}</TableCell>
                <TableCell>
                  {esAdministrador ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar pago"
                      onClick={() => {
                        eliminarPago(pago.id);
                        toast.success("Pago eliminado");
                      }}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No hay pagos registrados para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

